import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller using getClaims
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: roleCheck } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // ACTION: update_plan
    if (action === "update_plan") {
      const { target_user_id, plan } = body;
      if (!target_user_id || !["free", "pro"].includes(plan)) {
        return new Response(
          JSON.stringify({ error: "Invalid target_user_id or plan" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const { error } = await adminClient
        .from("user_subscriptions")
        .update({
          plan,
          started_at: plan === "pro" ? new Date().toISOString() : undefined,
        })
        .eq("user_id", target_user_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: assign_role
    if (action === "assign_role") {
      const { target_user_id, role } = body;
      if (!target_user_id || !["admin", "user"].includes(role)) {
        return new Response(
          JSON.stringify({ error: "Invalid target_user_id or role" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (role === "admin") {
        const { error } = await adminClient
          .from("user_roles")
          .upsert(
            { user_id: target_user_id, role: "admin" },
            { onConflict: "user_id,role" }
          );
        if (error) throw error;
      } else {
        // Remove admin role
        await adminClient
          .from("user_roles")
          .delete()
          .eq("user_id", target_user_id)
          .eq("role", "admin");
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: list_activity_logs (admin activity monitoring)
    if (action === "list_activity_logs") {
      const { limit = 200, offset = 0, interaction_type, search } = body;

      // Unified search: match against profiles (name, username, email) AND entity_id
      let filterUserIds: string[] | null = null;
      let entitySearchTerm: string | null = null;

      if (search && typeof search === "string" && search.trim()) {
        const term = `%${search.trim()}%`;

        // Search profiles
        const { data: matchedProfiles } = await adminClient
          .from("profiles")
          .select("user_id")
          .or(`display_name.ilike.${term},username.ilike.${term},email_public.ilike.${term}`);
        filterUserIds = (matchedProfiles ?? []).map((p: any) => p.user_id);

        // Also search by entity_id
        entitySearchTerm = search.trim();
      }

      let query = adminClient
        .from("interaction_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (interaction_type && interaction_type !== "all") {
        query = query.eq("interaction_type", interaction_type);
      }

      // Apply unified search: user match OR entity match
      if (search && search.trim()) {
        const conditions: string[] = [];
        if (entitySearchTerm) {
          conditions.push(`entity_id.ilike.%${entitySearchTerm}%`);
        }
        if (filterUserIds && filterUserIds.length > 0) {
          conditions.push(`user_id.in.(${filterUserIds.join(",")})`);
        }
        if (conditions.length > 0) {
          query = query.or(conditions.join(","));
        } else {
          // No matches at all
          return new Response(JSON.stringify({ logs: [], total: 0 }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const { data: logs, count, error: logsError } = await query;
      if (logsError) throw logsError;

      // Fetch profiles for the user_ids in this page
      const userIds = [...new Set((logs ?? []).map((l: any) => l.user_id))];
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await adminClient
          .from("profiles")
          .select("user_id, display_name, username, email_public")
          .in("user_id", userIds);
        for (const p of profiles ?? []) {
          profilesMap[p.user_id] = p;
        }
      }

      const enrichedLogs = (logs ?? []).map((l: any) => ({
        ...l,
        profiles: profilesMap[l.user_id] || null,
      }));

      return new Response(JSON.stringify({ logs: enrichedLogs, total: count ?? 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: list_users (admin dashboard data)
    if (action === "list_users") {
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("user_id, username, display_name, email_public, avatar_url, created_at")
        .order("created_at", { ascending: false });

      const { data: subs } = await adminClient
        .from("user_subscriptions")
        .select("user_id, plan, started_at, expires_at");

      const { data: roles } = await adminClient
        .from("user_roles")
        .select("user_id, role");

      // Merge
      const users = (profiles ?? []).map((p: any) => ({
        ...p,
        plan:
          subs?.find((s: any) => s.user_id === p.user_id)?.plan ?? "free",
        started_at: subs?.find((s: any) => s.user_id === p.user_id)
          ?.started_at,
        roles: (roles ?? [])
          .filter((r: any) => r.user_id === p.user_id)
          .map((r: any) => r.role),
      }));

      return new Response(JSON.stringify({ users }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
