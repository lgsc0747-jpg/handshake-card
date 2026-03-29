import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { target_user_id, interaction_type, metadata } = await req.json();

    if (!target_user_id || !interaction_type) {
      return new Response(
        JSON.stringify({ error: "target_user_id and interaction_type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allowedTypes = ["profile_view", "cv_download", "vcard_download"];
    if (!allowedTypes.includes(interaction_type)) {
      return new Response(
        JSON.stringify({ error: "Invalid interaction_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter out bots
    const ua = metadata?.ua || "";
    const isBot = /bot|google|baidu|bing|msn|teoma|slurp|yandex|crawl|spider/i.test(ua);
    if (isBot) {
      return new Response(
        JSON.stringify({ success: true, filtered: "bot" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase.from("interaction_logs").insert({
      user_id: target_user_id,
      entity_id: `visitor_${Date.now()}`,
      interaction_type,
      occasion: interaction_type === "profile_view" ? "NFC Tap" : "CV Download",
      metadata: metadata || {},
    });

    if (error) {
      console.error("Insert error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to log interaction" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
