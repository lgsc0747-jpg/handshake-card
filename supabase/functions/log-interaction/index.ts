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

    const allowedTypes = [
      "profile_view",
      "cv_download",
      "vcard_download",
      "link_click",
      "dwell_time",
      "security_attempt",
      "card_flip",
    ];
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

    // Parse device/OS/browser from UA
    const device = /iPad/i.test(ua)
      ? "Tablet"
      : /iPhone|Android.*Mobile/i.test(ua)
      ? "Mobile"
      : /Android/i.test(ua)
      ? "Tablet"
      : "Desktop";

    const os = /iPhone|iPad|Mac OS/i.test(ua)
      ? /iPhone|iPad/i.test(ua) ? "iOS" : "macOS"
      : /Android/i.test(ua)
      ? "Android"
      : /Windows/i.test(ua)
      ? "Windows"
      : /Linux/i.test(ua)
      ? "Linux"
      : "Unknown";

    // Browser detection — order matters (specific before generic)
    const browser = /Brave/i.test(ua)
      ? "Brave"
      : /Edg\//i.test(ua)
      ? "Edge"
      : /OPR|Opera/i.test(ua)
      ? "Opera"
      : /Firefox/i.test(ua)
      ? "Firefox"
      : /SamsungBrowser/i.test(ua)
      ? "Samsung Internet"
      : /CriOS/i.test(ua)
      ? "Chrome"
      : /Chrome/i.test(ua)
      ? "Chrome"
      : /Safari/i.test(ua)
      ? "Safari"
      : "Other";

    // Location tracking removed

    // Derive connection type from metadata (passed from client navigator.connection)
    const connectionType = metadata?.connection_type || "unknown";

    const enrichedMeta = {
      ...(metadata || {}),
      device,
      os,
      browser,
      city,
      connection_type: connectionType,
      timestamp: new Date().toISOString(),
    };

    // Determine occasion label
    let occasion = "NFC Tap";
    if (interaction_type === "cv_download") occasion = "CV Download";
    else if (interaction_type === "vcard_download") occasion = "vCard Save";
    else if (interaction_type === "link_click") occasion = `Link: ${metadata?.link_type || "unknown"}`;
    else if (interaction_type === "dwell_time") occasion = "Dwell Time";
    else if (interaction_type === "security_attempt") occasion = `Security: ${metadata?.result || "unknown"}`;

    // Derive location string from city + locale region
    let locationStr = city;
    if (locale) {
      const regionCode = locale.split("-")[1];
      if (regionCode && regionCode.length === 2) {
        locationStr = city ? `${city}, ${regionCode}` : regionCode;
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase.from("interaction_logs").insert({
      user_id: target_user_id,
      entity_id: metadata?.visitor_id || `visitor_${Date.now()}`,
      interaction_type,
      occasion,
      location: locationStr || null,
      metadata: enrichedMeta,
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
