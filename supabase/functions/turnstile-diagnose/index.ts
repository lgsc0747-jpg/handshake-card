import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CF_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function detectEnvironment(hostname: string | undefined): "dev" | "preview" | "prod" {
  const h = (hostname ?? "").toLowerCase();
  if (!h || h === "localhost" || h === "127.0.0.1" || h.startsWith("192.168.")) return "dev";
  if (
    h.endsWith(".lovable.app") ||
    h.endsWith(".lovableproject.com") ||
    h.endsWith(".vercel.app")
  ) return "preview";
  return "prod";
}

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const hostname: string = (body as any).hostname ?? "";
    const captchaToken: string = (body as any).captcha_token ?? "";

    const env = detectEnvironment(hostname);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Look up active config row
    const { data: cfg } = await adminClient
      .from("turnstile_config")
      .select("site_key, secret_key, allowed_hostnames, enabled")
      .eq("environment", env)
      .maybeSingle();

    const configured = !!cfg && (cfg as any).enabled;
    // Production: prefer Deno env (TURNSTILE_SECRET_KEY) — single source of truth.
    // Dev/preview: prefer DB config (super-admin override), else Cloudflare test secret.
    const envSecret = Deno.env.get("TURNSTILE_SECRET_KEY") ?? "";
    const secret =
      env === "prod"
        ? envSecret || (configured ? ((cfg as any).secret_key as string) : "")
        : configured && (cfg as any).secret_key
          ? ((cfg as any).secret_key as string)
          : CF_TEST_SECRET_KEY;

    let verifyResult: any = null;
    let errorCodes: string[] = [];
    if (captchaToken && secret) {
      const formData = new FormData();
      formData.append("secret", secret);
      formData.append("response", captchaToken);
      formData.append("remoteip", getClientIp(req));
      try {
        const res = await fetch(
          "https://challenges.cloudflare.com/turnstile/v0/siteverify",
          { method: "POST", body: formData },
        );
        verifyResult = await res.json();
        errorCodes = verifyResult["error-codes"] ?? [];
      } catch (err) {
        errorCodes = [`network_error: ${(err as Error).message}`];
      }
    }

    const hostnameWhitelisted =
      configured &&
      ((cfg as any).allowed_hostnames as string[])?.some((allowed) => {
        const h = hostname.toLowerCase();
        const a = allowed.toLowerCase();
        return h === a || h.endsWith(`.${a}`);
      });

    return jsonResponse({
      ok: !!verifyResult?.success,
      detected_environment: env,
      detected_hostname: hostname,
      config_present: configured,
      hostname_whitelisted: hostnameWhitelisted ?? false,
      site_key_in_use: configured ? (cfg as any).site_key : null,
      verify_result: verifyResult,
      error_codes: errorCodes,
      hint: errorCodes.includes("invalid-input-response")
        ? "Token expired or invalid. Solve the widget again."
        : errorCodes.some((c) => c.startsWith("110") || c === "invalid-input-secret")
          ? "Hostname not whitelisted in Cloudflare Turnstile (error 110200). Add this hostname to your widget's allowed list."
          : !configured
            ? "No Turnstile config found for this environment. Add one in Admin → Turnstile Settings."
            : verifyResult?.success
              ? "Turnstile is healthy on this hostname."
              : "Run a CAPTCHA challenge first, then re-run diagnostics.",
    });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
