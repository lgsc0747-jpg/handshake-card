import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();

    if (!code || typeof code !== "string") {
      return new Response(
        JSON.stringify({ error: "code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up the short link -> user_id (and optional persona_id / card_id).
    // Inactive links are treated as 404 so users can disable a card without
    // deleting the underlying short URL.
    const { data: link, error: linkErr } = await supabase
      .from("short_links")
      .select("user_id, persona_id, card_id, is_active")
      .eq("code", code)
      .single();

    if (linkErr || !link || link.is_active === false) {
      return new Response(
        JSON.stringify({ error: "Short link not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the user's current username
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", link.user_id)
      .single();

    if (!profile?.username) {
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If a persona is linked, get its slug. Otherwise fall back to the most
    // recently created persona (is_active is no longer enforced — multiple
    // personas can be live at the same time via short links).
    let personaSlug: string | null = null;
    if (link.persona_id) {
      const { data: persona } = await supabase
        .from("personas")
        .select("slug")
        .eq("id", link.persona_id)
        .single();
      personaSlug = persona?.slug ?? null;
    } else {
      const { data: anyPersona } = await supabase
        .from("personas")
        .select("slug")
        .eq("user_id", link.user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      personaSlug = anyPersona?.slug ?? null;
    }

    // Look up serial for the linked card so the client can include it in
    // interaction logs without a second round trip.
    let cardSerial: string | null = null;
    if (link.card_id) {
      const { data: card } = await supabase
        .from("nfc_cards")
        .select("serial_number")
        .eq("id", link.card_id)
        .single();
      cardSerial = card?.serial_number ?? null;
    }

    return new Response(
      JSON.stringify({
        username: profile.username,
        persona_slug: personaSlug,
        user_id: link.user_id,
        card_id: link.card_id ?? null,
        card_serial: cardSerial,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("resolve-short-link error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
