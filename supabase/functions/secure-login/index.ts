import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MINUTES = 10;
const LOCKOUT_MINUTES = 15;

// Cloudflare always-pass test keys — accepted only on dev/preview hosts.
const CF_TEST_SITE_KEY = "1x00000000000000000000AA";
const CF_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";

interface LoginBody {
  email: string;
  password: string;
  captcha_token: string;
  hostname?: string; // client-supplied window.location.hostname for env detection
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
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

async function getTurnstileSecret(
  adminClient: any,
  env: "dev" | "preview" | "prod",
): Promise<string> {
  // Production: ALWAYS prefer the TURNSTILE_SECRET_KEY env var (managed via Supabase secrets).
  // This is the source of truth and avoids drift between DB config and the real Cloudflare secret.
  if (env === "prod") {
    const envSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (envSecret) return envSecret;

    // Fallback only if env var is somehow missing — try DB-managed config.
    const { data } = await adminClient
      .from("turnstile_config")
      .select("secret_key, enabled")
      .eq("environment", "prod")
      .maybeSingle();
    if (data && (data as any).enabled && (data as any).secret_key) {
      return (data as any).secret_key as string;
    }
    console.error("TURNSTILE_SECRET_KEY missing for prod environment");
    return "";
  }

  // Dev/preview: try DB config first (lets super-admins override), else use Cloudflare's test secret.
  const { data } = await adminClient
    .from("turnstile_config")
    .select("secret_key, enabled")
    .eq("environment", env)
    .maybeSingle();
  if (data && (data as any).enabled && (data as any).secret_key) {
    return (data as any).secret_key as string;
  }
  return CF_TEST_SECRET_KEY;
}

async function verifyTurnstile(token: string, ip: string, secret: string): Promise<boolean> {
  if (!secret) {
    console.error("Turnstile secret missing for environment");
    return false;
  }
  try {
    const formData = new FormData();
    formData.append("secret", secret);
    formData.append("response", token);
    formData.append("remoteip", ip);
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: formData },
    );
    const data = await res.json();
    if (!data.success) {
      console.warn("Turnstile failed:", data["error-codes"]);
    }
    return Boolean(data.success);
  } catch (err) {
    console.error("Turnstile verify error:", err);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Partial<LoginBody>;
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    const captchaToken = body.captcha_token ?? "";
    const hostname = body.hostname;

    if (!email || !password || !captchaToken) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") ?? null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // 1. Resolve env + Turnstile secret
    const env = detectEnvironment(hostname);
    const secret = await getTurnstileSecret(adminClient, env);

    // 2. Verify Turnstile token
    const captchaOk = await verifyTurnstile(captchaToken, ip, secret);
    if (!captchaOk) {
      return jsonResponse({
        error: "Security check failed. If you're on a preview link, this hostname may need to be whitelisted in Cloudflare Turnstile.",
        code: "captcha_failed",
        environment: env,
      }, 400);
    }

    // 3. Check lockout
    const { data: lockoutData } = await adminClient.rpc("check_login_lockout", {
      p_email: email,
      p_ip: ip,
    });
    if (lockoutData && (lockoutData as any).locked) {
      return jsonResponse(
        {
          error: "Account temporarily locked for security",
          locked_until: (lockoutData as any).until,
          seconds_remaining: (lockoutData as any).seconds_remaining,
        },
        423,
      );
    }

    // 4. Attempt sign in via anon client
    const authClient = createClient(supabaseUrl, anonKey);
    const { data: authData, error: authError } =
      await authClient.auth.signInWithPassword({ email, password });

    if (authError || !authData?.session) {
      await adminClient.from("login_attempts").insert({
        email,
        ip_address: ip,
        user_agent: userAgent,
        success: false,
      });

      const since = new Date(
        Date.now() - ATTEMPT_WINDOW_MINUTES * 60 * 1000,
      ).toISOString();

      const { count: emailFails } = await adminClient
        .from("login_attempts")
        .select("*", { count: "exact", head: true })
        .eq("email", email)
        .eq("success", false)
        .gte("attempted_at", since);

      const { count: ipFails } = await adminClient
        .from("login_attempts")
        .select("*", { count: "exact", head: true })
        .eq("ip_address", ip)
        .eq("success", false)
        .gte("attempted_at", since);

      const shouldLock =
        (emailFails ?? 0) >= MAX_FAILED_ATTEMPTS ||
        (ipFails ?? 0) >= MAX_FAILED_ATTEMPTS;

      if (shouldLock) {
        const lockedUntil = new Date(
          Date.now() + LOCKOUT_MINUTES * 60 * 1000,
        ).toISOString();
        await adminClient.from("account_lockouts").upsert(
          {
            email,
            ip_address: ip,
            locked_until: lockedUntil,
            reason: `${MAX_FAILED_ATTEMPTS}+ failed attempts within ${ATTEMPT_WINDOW_MINUTES} minutes`,
          },
          { onConflict: "email" },
        );
        return jsonResponse(
          {
            error: "Account temporarily locked for security",
            locked_until: lockedUntil,
            seconds_remaining: LOCKOUT_MINUTES * 60,
          },
          423,
        );
      }

      const remaining = Math.max(
        0,
        MAX_FAILED_ATTEMPTS - Math.max(emailFails ?? 0, ipFails ?? 0),
      );
      return jsonResponse(
        {
          error: "Invalid email or password",
          attempts_remaining: remaining,
        },
        401,
      );
    }

    // 5. Success path — detect role for client-side routing
    const userId = authData.user!.id;

    const { data: roleRows } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roles = (roleRows ?? []).map((r: any) => r.role as string);
    const isAdmin = roles.includes("admin") || roles.includes("super_admin");
    const isSuperAdmin = roles.includes("super_admin");

    // Record successful login + clear lingering lockout
    await adminClient.from("login_attempts").insert({
      email,
      ip_address: ip,
      user_agent: userAgent,
      success: true,
    });
    await adminClient.from("account_lockouts").delete().eq("email", email);

    return jsonResponse({
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at,
        expires_in: authData.session.expires_in,
        token_type: authData.session.token_type,
        user: authData.user,
      },
      roles: {
        is_admin: isAdmin,
        is_super_admin: isSuperAdmin,
        default_destination: isAdmin ? "choose" : "user",
      },
    });
  } catch (err) {
    console.error("secure-login error:", err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
