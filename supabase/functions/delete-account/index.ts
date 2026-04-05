import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user with their token
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify password
    const { password } = await req.json();
    if (!password) {
      return new Response(JSON.stringify({ error: "Password required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: signInError } = await userClient.auth.signInWithPassword({
      email: user.email!,
      password,
    });
    if (signInError) {
      return new Response(JSON.stringify({ error: "Incorrect password" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const userId = user.id;

    // Delete user data from all tables (order matters for foreign keys)
    await adminClient.from("lead_captures").delete().eq("owner_user_id", userId);
    await adminClient.from("interaction_logs").delete().eq("user_id", userId);
    await adminClient.from("short_links").delete().eq("user_id", userId);
    await adminClient.from("nfc_cards").delete().eq("user_id", userId);
    await adminClient.from("personas").delete().eq("user_id", userId);
    await adminClient.from("categories").delete().eq("user_id", userId);
    await adminClient.from("profiles").delete().eq("user_id", userId);
    await adminClient.from("user_roles").delete().eq("user_id", userId);

    // Delete storage files
    const { data: avatars } = await adminClient.storage.from("avatars").list(userId);
    if (avatars?.length) {
      await adminClient.storage.from("avatars").remove(avatars.map((f) => `${userId}/${f.name}`));
    }
    const { data: docs } = await adminClient.storage.from("documents").list(userId);
    if (docs?.length) {
      await adminClient.storage.from("documents").remove(docs.map((f) => `${userId}/${f.name}`));
    }

    // Delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
