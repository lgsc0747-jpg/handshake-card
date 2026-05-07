import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      throw new Error("Email service not configured");
    }

    const body = await req.json().catch(() => ({}));
    const leadId: string | undefined = body?.lead_id;
    if (!leadId || typeof leadId !== "string") {
      return new Response(JSON.stringify({ error: "lead_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: lead, error: leadErr } = await admin
      .from("lead_captures")
      .select(
        "id, owner_user_id, persona_id, visitor_name, visitor_email, visitor_phone, visitor_company, visitor_message, created_at",
      )
      .eq("id", leadId)
      .maybeSingle();

    if (leadErr || !lead) throw new Error(leadErr?.message ?? "Lead not found");

    const [{ data: persona }, { data: profile }, { data: authUser }] =
      await Promise.all([
        admin.from("personas").select("label, slug").eq("id", lead.persona_id).maybeSingle(),
        admin.from("profiles").select("display_name, username").eq("user_id", lead.owner_user_id).maybeSingle(),
        admin.auth.admin.getUserById(lead.owner_user_id),
      ]);

    const ownerEmail = authUser?.user?.email;
    if (!ownerEmail) throw new Error("Owner email not found");

    const personaName = persona?.label ?? "your handshake";
    const greeting = profile?.display_name ?? "there";

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f172a;padding:32px;color:#f1f5f9;">
        <div style="max-width:560px;margin:0 auto;background:linear-gradient(180deg,#1e293b,#0f172a);border:1px solid rgba(255,255,255,0.08);border-radius:24px;padding:32px;">
          <div style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#14b8a6;margin-bottom:8px;">New Lead</div>
          <h1 style="margin:0 0 16px;font-size:24px;font-weight:600;">Hi ${escapeHtml(greeting)},</h1>
          <p style="margin:0 0 24px;color:#94a3b8;line-height:1.6;">
            Someone just connected with <strong style="color:#f1f5f9;">${escapeHtml(personaName)}</strong>.
          </p>
          <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:20px;margin-bottom:24px;">
            ${row("Name", lead.visitor_name)}
            ${row("Email", lead.visitor_email)}
            ${row("Phone", lead.visitor_phone)}
            ${row("Company", lead.visitor_company)}
            ${lead.visitor_message ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06);color:#cbd5e1;font-style:italic;">"${escapeHtml(lead.visitor_message)}"</div>` : ""}
          </div>
          <p style="font-size:13px;color:#64748b;margin:0;">Open Handshake to follow up while it's fresh.</p>
        </div>
      </div>
    `;

    const resp = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "Handshake <onboarding@resend.dev>",
        to: [ownerEmail],
        subject: `New lead from ${lead.visitor_name ?? lead.visitor_email}`,
        html,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(`Resend ${resp.status}: ${JSON.stringify(data)}`);

    return new Response(JSON.stringify({ ok: true, id: data?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-new-lead error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function row(label: string, value: string | null | undefined) {
  if (!value) return "";
  return `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px;"><span style="color:#94a3b8;">${label}</span><span style="color:#f1f5f9;font-weight:500;">${escapeHtml(value)}</span></div>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
