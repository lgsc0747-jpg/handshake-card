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
    const { target_user_id, interaction_type, metadata, card_id, card_serial } = await req.json();

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
      "cta_click",
      "video_play",
      "contact_form_submit",
      "page_view",
    ];
    if (!allowedTypes.includes(interaction_type)) {
      return new Response(
        JSON.stringify({ error: "Invalid interaction_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate target_user_id is a real, existing user (prevents fake-event injection)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: targetProfile, error: profileErr } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", target_user_id)
      .maybeSingle();

    if (profileErr || !targetProfile) {
      return new Response(
        JSON.stringify({ error: "Invalid target user" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
    else if (interaction_type === "cta_click") occasion = `CTA: ${metadata?.label || "unknown"}`;
    else if (interaction_type === "video_play") occasion = "Video Play";
    else if (interaction_type === "contact_form_submit") occasion = "Contact Form";
    else if (interaction_type === "page_view") occasion = `Page: ${metadata?.page_title || "unknown"}`;

    // Tag the entry method on the *first* interaction in this visitor session
    // (profile_view is always emitted first by PublicProfilePage). Possible values:
    //   "nfc"  — visitor came in via /u/<short> short link (physical card tap)
    //   "qr"   — URL had ?src=qr query param (scanned QR poster/sticker)
    //   "link" — direct/shared URL with no tap origin or src param
    if (interaction_type === "profile_view") {
      const src = (metadata?.source_method as string | undefined)?.toLowerCase();
      const hasShortCode = Boolean(metadata?.short_code);
      const hasCardRef = Boolean(card_id || card_serial);
      let method: "nfc" | "qr" | "link" = "link";
      // QR explicit param wins for QR posters/stickers (?src=qr).
      // Anything routed via /u/<short_code> is treated as NFC tap (physical
      // card or device tap), even when no card is bound to the link yet.
      if (src === "qr") method = "qr";
      else if (src === "nfc" || hasCardRef || hasShortCode) method = "nfc";

      enrichedMeta.entry_method = method;
      if (metadata?.short_code) enrichedMeta.short_code = metadata.short_code;
      const label = method === "nfc" ? "NFC Tap" : method === "qr" ? "QR Scan" : "Direct Link";
      occasion = `Entry: ${label}`;
    }

    // (supabase client already created above for user validation)


    // Build a privacy-safe context label for the `location` column.
    // We never use IP / GPS — instead we describe the digital context:
    // persona slug + page path, or referrer host if it's an external tap.
    let contextLabel: string | null = null;
    const personaSlug = metadata?.persona_slug;
    const pagePath = metadata?.page_path || metadata?.page_title;
    const referrer = metadata?.referrer;

    if (personaSlug && pagePath) {
      contextLabel = `${personaSlug} · ${pagePath}`;
    } else if (personaSlug) {
      contextLabel = personaSlug;
    } else if (pagePath) {
      contextLabel = pagePath;
    }

    if (referrer && typeof referrer === "string" && referrer.length > 0) {
      try {
        const host = new URL(referrer).hostname.replace(/^www\./, "");
        if (host) contextLabel = contextLabel ? `${contextLabel} ← ${host}` : `via ${host}`;
      } catch {
        // ignore malformed referrer
      }
    }

    // Validate card_id (if provided) belongs to the target user
    let safeCardId: string | null = null;
    let safeCardSerial: string | null = card_serial ?? null;
    if (card_id) {
      const { data: cardRow } = await supabase
        .from("nfc_cards")
        .select("id, serial_number, user_id")
        .eq("id", card_id)
        .maybeSingle();
      if (cardRow && cardRow.user_id === target_user_id) {
        safeCardId = cardRow.id;
        safeCardSerial = safeCardSerial ?? cardRow.serial_number;
      }
    }

    const { error } = await supabase.from("interaction_logs").insert({
      user_id: target_user_id,
      entity_id: metadata?.visitor_id || `visitor_${Date.now()}`,
      interaction_type,
      occasion,
      location: contextLabel,
      metadata: enrichedMeta,
      card_id: safeCardId,
      card_serial: safeCardSerial,
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
