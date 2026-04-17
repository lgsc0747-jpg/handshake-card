import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MetricsBlock {
  profileViews: number;
  uniqueVisitors: number;
  vcardDownloads: number;
  cardFlips: number;
  linkClicks: number;
  ctaClicks: number;
  videoPlays: number;
  contactFormSubmissions: number;
  returnVisitors: number;
  topDevice: string | null;
  topBrowser: string | null;
  topPersona: string | null;
  topLink: string | null;
  topCTA: string | null;
}

const emptyMetrics = (): MetricsBlock => ({
  profileViews: 0, uniqueVisitors: 0, vcardDownloads: 0, cardFlips: 0,
  linkClicks: 0, ctaClicks: 0, videoPlays: 0, contactFormSubmissions: 0,
  returnVisitors: 0,
  topDevice: null, topBrowser: null, topPersona: null, topLink: null, topCTA: null,
});

function topOf(map: Map<string, number>): string | null {
  let best: string | null = null;
  let bestN = 0;
  map.forEach((v, k) => { if (v > bestN) { bestN = v; best = k; } });
  return best;
}

function aggregate(rows: Array<Record<string, any>>): MetricsBlock {
  const out = emptyMetrics();
  const visitors = new Set<string>();
  const devices = new Map<string, number>();
  const browsers = new Map<string, number>();
  const personas = new Map<string, number>();
  const links = new Map<string, number>();
  const ctas = new Map<string, number>();

  for (const log of rows) {
    const meta = (log.metadata as Record<string, any>) ?? {};
    visitors.add(log.entity_id);

    if (meta.device) devices.set(meta.device, (devices.get(meta.device) ?? 0) + 1);
    if (meta.browser) browsers.set(meta.browser, (browsers.get(meta.browser) ?? 0) + 1);
    if (meta.persona_slug) personas.set(meta.persona_slug, (personas.get(meta.persona_slug) ?? 0) + 1);

    switch (log.interaction_type) {
      case "profile_view":
        out.profileViews++;
        if (meta.is_return) out.returnVisitors++;
        break;
      case "vcard_download": out.vcardDownloads++; break;
      case "card_flip": out.cardFlips++; break;
      case "link_click": {
        out.linkClicks++;
        const lt = meta.link_type || "unknown";
        links.set(lt, (links.get(lt) ?? 0) + 1);
        break;
      }
      case "cta_click": {
        out.ctaClicks++;
        const lbl = meta.label || "Unknown CTA";
        ctas.set(lbl, (ctas.get(lbl) ?? 0) + 1);
        break;
      }
      case "video_play": out.videoPlays++; break;
      case "contact_form_submit": out.contactFormSubmissions++; break;
    }
  }

  out.uniqueVisitors = visitors.size;
  out.topDevice = topOf(devices);
  out.topBrowser = topOf(browsers);
  out.topPersona = topOf(personas);
  out.topLink = topOf(links);
  out.topCTA = topOf(ctas);
  return out;
}

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0 && curr === 0) return 0;
  if (prev === 0) return null; // undefined % change from zero baseline
  return Math.round(((curr - prev) / prev) * 100);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate the JWT and grab the user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Use service-role client for the actual queries (bypasses RLS but we already
    // verified the caller above — we always scope queries to userId).
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [currRes, prevRes, leadsRes] = await Promise.all([
      admin.from("interaction_logs")
        .select("interaction_type, metadata, entity_id, created_at")
        .eq("user_id", userId)
        .gte("created_at", sevenDaysAgo.toISOString()),
      admin.from("interaction_logs")
        .select("interaction_type, metadata, entity_id, created_at")
        .eq("user_id", userId)
        .gte("created_at", fourteenDaysAgo.toISOString())
        .lt("created_at", sevenDaysAgo.toISOString()),
      admin.from("lead_captures")
        .select("id, created_at")
        .eq("owner_user_id", userId)
        .gte("created_at", sevenDaysAgo.toISOString()),
    ]);

    if (currRes.error || prevRes.error) {
      console.error("Query error", currRes.error || prevRes.error);
      return new Response(JSON.stringify({ error: "Failed to fetch analytics" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const curr = aggregate(currRes.data ?? []);
    const prev = aggregate(prevRes.data ?? []);
    const leadsThisWeek = leadsRes.data?.length ?? 0;

    // Build a compact, structured payload for the model
    const payload = {
      window: "last_7_days_vs_previous_7_days",
      current: { ...curr, leadsCaptured: leadsThisWeek },
      previous: prev,
      changes: {
        profileViewsPct: pctChange(curr.profileViews, prev.profileViews),
        uniqueVisitorsPct: pctChange(curr.uniqueVisitors, prev.uniqueVisitors),
        vcardDownloadsPct: pctChange(curr.vcardDownloads, prev.vcardDownloads),
        linkClicksPct: pctChange(curr.linkClicks, prev.linkClicks),
        ctaClicksPct: pctChange(curr.ctaClicks, prev.ctaClicks),
      },
    };

    // If there's literally zero activity, skip the AI call and return a friendly stub.
    if (curr.profileViews === 0 && prev.profileViews === 0) {
      return new Response(JSON.stringify({
        summary: "No profile activity in the last two weeks. Share your card link or tap your NFC chip to start collecting data — your weekly insights will appear here as soon as visitors arrive.",
        bullets: [],
        suggestion: "Try sharing your public profile link in your email signature this week.",
        generatedAt: new Date().toISOString(),
        metrics: payload,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an analytics concierge for a digital business card platform.
Given week-over-week metrics, write a brief, warm, executive summary for the card owner.
- Use plain English, second person ("you").
- Reference real numbers from the data.
- Call out the biggest movers (positive or negative) and what they likely mean.
- End with one specific, actionable suggestion to grow next week.
- Tone: confident, supportive, never robotic. Avoid jargon.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here is the data:\n${JSON.stringify(payload, null, 2)}\n\nReturn a structured insight.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "weekly_insight",
            description: "Return a concise weekly insight for the card owner.",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "2-3 sentences summarizing the week's performance." },
                bullets: {
                  type: "array",
                  description: "3-4 short bullet points highlighting the biggest week-over-week changes.",
                  items: { type: "string" },
                },
                suggestion: { type: "string", description: "One actionable recommendation for next week." },
              },
              required: ["summary", "bullets", "suggestion"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "weekly_insight" } },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Workspace settings to continue." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("AI gateway error", aiRes.status, text);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: { summary: string; bullets: string[]; suggestion: string } | null = null;
    try {
      parsed = JSON.parse(toolCall?.function?.arguments ?? "{}");
    } catch {
      parsed = null;
    }

    if (!parsed?.summary) {
      return new Response(JSON.stringify({ error: "Could not parse AI response" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      ...parsed,
      generatedAt: new Date().toISOString(),
      metrics: payload,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("Insights function error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
