import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI service not configured");

    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const mode: string = body?.mode ?? "persona";

    let systemPrompt = "";
    let userContent = "";

    if (mode === "lead-insight") {
      const lead = body?.lead ?? {};
      systemPrompt =
        "You are a senior B2B sales coach. Given a lead's profile, output 3-5 short bullet points: " +
        "(1) why this lead is hot/warm/cold in plain English, (2) the single best next action, " +
        "(3) one suggested opening line. Be terse, no fluff, no markdown headers.";
      userContent = JSON.stringify(lead);
    } else {
      const kind: "bio" | "headline" | "rewrite" = body?.kind ?? "bio";
      const context: string = (body?.context ?? "").toString().slice(0, 1500);
      const tone: string = (body?.tone ?? "professional").toString().slice(0, 40);
      const prompts: Record<string, string> = {
        bio: `Write a concise personal bio (2-3 short sentences, max 280 chars) in a ${tone} tone. No emojis, no hashtags, no quotes. First person. Compelling and human.`,
        headline: `Write ONE punchy professional headline (max 70 chars). No quotes, no emojis, no trailing punctuation. ${tone} tone.`,
        rewrite: `Rewrite the following text to be sharper and more compelling in a ${tone} tone. Keep it the same approximate length. Return only the rewritten text, nothing else.`,
      };
      systemPrompt = prompts[kind];
      userContent = context || "Generate something inspired and unique.";
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (resp.status === 429) return json({ error: "Rate limit reached. Try again shortly." }, 429);
    if (resp.status === 402) return json({ error: "AI credits exhausted. Add credits in Settings." }, 402);
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`AI gateway ${resp.status}: ${txt}`);
    }

    const data = await resp.json();
    const text = (data?.choices?.[0]?.message?.content ?? "").trim().replace(/^["']|["']$/g, "");
    return json({ text });
  } catch (e) {
    console.error("ai-persona-assist", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
