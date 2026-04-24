import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MINUTES = 10;
const LOCKOUT_MINUTES = 15;

interface LoginBody {
  email: string;
  password: string;
  captcha_token: string;
  intent: "user" | "admin";
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

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) {
    console.error("TURNSTILE_SECRET_KEY not configured");
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
    const intent: "user" | "admin" = body.intent === "admin" ? "admin" : "user";

    if (!email || !password || !captchaToken) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") ?? null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // 1. Verify Turnstile token
    const captchaOk = await verifyTurnstile(captchaToken, ip);
    if (!captchaOk) {
      return jsonResponse({ error: "CAPTCHA verification failed" }, 400);
    }

    // 2. Check lockout (by email)
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

    // 3. Attempt sign in via anon client
    const authClient = createClient(supabaseUrl, anonKey);
    const { data: authData, error: authError } =
      await authClient.auth.signInWithPassword({ email, password });

    if (authError || !authData?.session) {
      // Log failed attempt
      await adminClient.from("login_attempts").insert({
        email,
        ip_address: ip,
        user_agent: userAgent,
        success: false,
      });

      // Count failures in window for both email and IP
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

    // 4. Success path
    const userId = authData.user!.id;

    // If admin intent, verify role
    if (intent === "admin") {
      const { data: roleRow } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .in("role", ["admin", "super_admin"])
        .maybeSingle();

      if (!roleRow) {
        // Sign out and reject
        await authClient.auth.admin?.signOut?.(authData.session.access_token).catch(() => {});
        return jsonResponse(
          { error: "This account does not have admin privileges." },
          403,
        );
      }
    }

    // Record successful login + clear any lingering lockout
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
    });
  } catch (err) {
    console.error("secure-login error:", err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
