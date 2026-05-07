import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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

    // Honor user preferences — skip if owner has lead-email notifications off
    const { data: pref } = await admin
      .from("user_preferences")
      .select("prefs")
      .eq("user_id", lead.owner_user_id)
      .maybeSingle();
    const emailLeadsEnabled = (pref?.prefs as any)?.notifPrefs?.emailLeads;
    if (emailLeadsEnabled === false) {
      return new Response(JSON.stringify({ ok: true, skipped: "preference_off" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: persona }, { data: profile }, { data: authUser }] =
      await Promise.all([
        admin.from("personas").select("label, slug").eq("id", lead.persona_id).maybeSingle(),
        admin.from("profiles").select("display_name, username").eq("user_id", lead.owner_user_id).maybeSingle(),
        admin.auth.admin.getUserById(lead.owner_user_id),
      ]);

    const ownerEmail = authUser?.user?.email;
    if (!ownerEmail) throw new Error("Owner email not found");

    const { data, error } = await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "new-lead",
        recipientEmail: ownerEmail,
        idempotencyKey: `lead-${lead.id}`,
        templateData: {
          ownerName: profile?.display_name?.split(" ")[0] ?? null,
          personaLabel: persona?.label ?? null,
          visitorName: lead.visitor_name ?? null,
          visitorEmail: lead.visitor_email ?? null,
          visitorPhone: lead.visitor_phone ?? null,
          visitorCompany: lead.visitor_company ?? null,
          visitorMessage: lead.visitor_message ?? null,
          dashboardUrl: "https://handshake-card.lovable.app/leads",
        },
      },
    });

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, queued: data }), {
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
