import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

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
    const ip = getClientIp(req);

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

    // Resolve roles for caller
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: roleRows } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roles = new Set((roleRows ?? []).map((r: any) => r.role));
    const isAdmin = roles.has("admin") || roles.has("super_admin");
    const isSuperAdmin = roles.has("super_admin");

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // Helper: write an audit entry
    const audit = async (
      auditAction: string,
      target_user_id: string | null,
      details: Record<string, unknown> = {},
    ) => {
      await adminClient.from("admin_audit_log").insert({
        admin_user_id: userId,
        action: auditAction,
        target_user_id,
        details,
        ip_address: ip,
      });
    };

    // ACTION: update_plan
    if (action === "update_plan") {
      const { target_user_id, plan } = body;
      if (!target_user_id || !["free", "pro"].includes(plan)) {
        return new Response(
          JSON.stringify({ error: "Invalid target_user_id or plan" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
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
      await audit("update_plan", target_user_id, { plan });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: assign_role — SUPER ADMIN ONLY
    if (action === "assign_role") {
      if (!isSuperAdmin) {
        return new Response(
          JSON.stringify({ error: "Super-admin only" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const { target_user_id, role } = body;
      if (!target_user_id || !["admin", "user"].includes(role)) {
        return new Response(
          JSON.stringify({ error: "Invalid target_user_id or role" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (role === "admin") {
        const { error } = await adminClient
          .from("user_roles")
          .upsert(
            { user_id: target_user_id, role: "admin" },
            { onConflict: "user_id,role" },
          );
        if (error) throw error;
        await audit("grant_admin", target_user_id, {});
      } else {
        await adminClient
          .from("user_roles")
          .delete()
          .eq("user_id", target_user_id)
          .eq("role", "admin");
        await audit("revoke_admin", target_user_id, {});
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: list_lockouts — SUPER ADMIN ONLY
    if (action === "list_lockouts") {
      if (!isSuperAdmin) {
        return new Response(JSON.stringify({ error: "Super-admin only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: lockouts } = await adminClient
        .from("account_lockouts")
        .select("*")
        .gt("locked_until", new Date().toISOString())
        .order("locked_until", { ascending: false });
      return new Response(JSON.stringify({ lockouts: lockouts ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: clear_lockout — SUPER ADMIN ONLY
    if (action === "clear_lockout") {
      if (!isSuperAdmin) {
        return new Response(JSON.stringify({ error: "Super-admin only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { email } = body;
      if (!email) {
        return new Response(JSON.stringify({ error: "Missing email" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await adminClient
        .from("account_lockouts")
        .delete()
        .eq("email", String(email).toLowerCase());
      await audit("clear_lockout", null, { email });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: list_audit_log
    if (action === "list_audit_log") {
      const { limit = 100, offset = 0 } = body;
      let query = adminClient
        .from("admin_audit_log")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      // Regular admins see only their own entries
      if (!isSuperAdmin) {
        query = query.eq("admin_user_id", userId);
      }

      const { data: entries, count } = await query;

      // Enrich with profile names for actor + target
      const ids = new Set<string>();
      for (const e of entries ?? []) {
        if (e.admin_user_id) ids.add(e.admin_user_id);
        if (e.target_user_id) ids.add(e.target_user_id);
      }
      const profilesMap: Record<string, any> = {};
      if (ids.size) {
        const { data: profiles } = await adminClient
          .from("profiles")
          .select("user_id, display_name, username, email_public")
          .in("user_id", Array.from(ids));
        for (const p of profiles ?? []) profilesMap[p.user_id] = p;
      }

      const enriched = (entries ?? []).map((e: any) => ({
        ...e,
        actor: profilesMap[e.admin_user_id] ?? null,
        target: e.target_user_id ? profilesMap[e.target_user_id] ?? null : null,
      }));

      return new Response(
        JSON.stringify({ entries: enriched, total: count ?? 0 }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ACTION: list_activity_logs (admin activity monitoring)
    if (action === "list_activity_logs") {
      const { limit = 200, offset = 0, interaction_type, search } = body;

      let filterUserIds: string[] | null = null;
      let entitySearchTerm: string | null = null;

      if (search && typeof search === "string" && search.trim()) {
        const term = `%${search.trim()}%`;

        const { data: matchedProfiles } = await adminClient
          .from("profiles")
          .select("user_id")
          .or(
            `display_name.ilike.${term},username.ilike.${term},email_public.ilike.${term}`,
          );
        filterUserIds = (matchedProfiles ?? []).map((p: any) => p.user_id);
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
          return new Response(JSON.stringify({ logs: [], total: 0 }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const { data: logs, count, error: logsError } = await query;
      if (logsError) throw logsError;

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

      return new Response(
        JSON.stringify({ logs: enrichedLogs, total: count ?? 0 }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ACTION: list_users (admin dashboard data)
    if (action === "list_users") {
      const { data: profiles } = await adminClient
        .from("profiles")
        .select(
          "user_id, username, display_name, email_public, avatar_url, created_at",
        )
        .order("created_at", { ascending: false });

      const { data: subs } = await adminClient
        .from("user_subscriptions")
        .select("user_id, plan, started_at, expires_at");

      const { data: rolesAll } = await adminClient
        .from("user_roles")
        .select("user_id, role");

      const users = (profiles ?? []).map((p: any) => ({
        ...p,
        plan: subs?.find((s: any) => s.user_id === p.user_id)?.plan ?? "free",
        started_at: subs?.find((s: any) => s.user_id === p.user_id)?.started_at,
        roles: (rolesAll ?? [])
          .filter((r: any) => r.user_id === p.user_id)
          .map((r: any) => r.role),
      }));

      return new Response(
        JSON.stringify({ users, viewer: { is_super_admin: isSuperAdmin } }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
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
