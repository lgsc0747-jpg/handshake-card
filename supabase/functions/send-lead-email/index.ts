// Sends an outbound email to a lead and logs it to lead_messages.
// Auto-stamps first_response_at on the lead, writes activity, gates on persona_section_access.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) throw new Error("Email service not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const { lead_id, organization_id, subject, body } = await req.json();
    if (!lead_id || !organization_id || !body?.trim()) {
      throw new Error("lead_id, organization_id and body required");
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    const userId = claims?.claims?.sub;
    if (!userId) throw new Error("Unauthorized");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Load lead + persona + org settings + owner
    const { data: lead } = await admin
      .from("lead_captures")
      .select("id, persona_id, owner_user_id, visitor_name, visitor_email, first_response_at")
      .eq("id", lead_id)
      .single();
    if (!lead) throw new Error("Lead not found");
    if (!lead.visitor_email) throw new Error("Lead has no email");

    // Permission check (persona-section)
    const { data: hasAccess } = await admin.rpc("has_persona_section_access", {
      _user_id: userId,
      _persona_id: lead.persona_id,
      _section: "inbox",
      _required_permission: "edit",
    });
    if (!hasAccess) throw new Error("Forbidden");

    const [{ data: org }, { data: settings }, { data: persona }] = await Promise.all([
      admin.from("organizations").select("name").eq("id", organization_id).single(),
      admin.from("agency_settings").select("*").eq("organization_id", organization_id).maybeSingle(),
      admin.from("personas").select("display_name, label").eq("id", lead.persona_id).single(),
    ]);

    const senderName = settings?.sender_name || org?.name || "Handshake";
    const replyTo = settings?.reply_to_email || undefined;

    const html = `<!doctype html><html><body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
  <p style="font-size:12px;color:#94a3b8;margin:0 0 8px;text-transform:uppercase;letter-spacing:.08em">${escapeHtml(senderName)}</p>
  ${subject ? `<h1 style="font-size:20px;margin:0 0 16px;font-weight:600">${escapeHtml(subject)}</h1>` : ""}
  <div style="font-size:15px;line-height:1.6;color:#0f172a;white-space:pre-wrap">${escapeHtml(body)}</div>
  <p style="margin:32px 0 0;font-size:12px;color:#94a3b8">Sent in reply to your message${persona?.display_name ? ` to ${escapeHtml(persona.display_name)}` : ""}.</p>
</div></body></html>`;

    const resendRes = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: `${senderName} <onboarding@resend.dev>`,
        to: [lead.visitor_email],
        ...(replyTo ? { reply_to: replyTo } : {}),
        subject: subject || `Reply from ${senderName}`,
        html,
      }),
    });
    const resendJson = await resendRes.json();
    const emailId = resendJson?.id || null;
    const status = resendRes.ok ? "sent" : "failed";

    // Log message (use service role to bypass RLS for the insert; we already verified access)
    const { data: msg, error: msgErr } = await admin.from("lead_messages").insert({
      lead_id,
      persona_id: lead.persona_id,
      author_user_id: userId,
      kind: "email_out",
      subject: subject || null,
      body,
      email_message_id: emailId,
      delivery_status: status,
    }).select().single();
    if (msgErr) throw msgErr;

    // Stamp first response
    if (!lead.first_response_at && status === "sent") {
      await admin.from("lead_captures").update({ first_response_at: new Date().toISOString() }).eq("id", lead_id);
    }

    // Activity feed
    await admin.from("agency_activity").insert({
      organization_id,
      actor_user_id: userId,
      verb: "email_sent",
      target_type: "lead",
      target_id: lead_id,
      summary: `Sent email to ${lead.visitor_name || lead.visitor_email}`,
      metadata: { subject: subject || null, persona_id: lead.persona_id },
    });

    return new Response(JSON.stringify({ ok: true, message: msg, delivery_status: status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
