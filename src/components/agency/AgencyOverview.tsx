import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Activity, Users, Mail, Target, CircleAlert } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Props { orgId: string; }

interface Stat { label: string; value: string | number; icon: any; tone?: string; }

interface ActivityRow {
  id: string;
  actor_user_id: string;
  verb: string;
  summary: string;
  created_at: string;
}

export function AgencyOverview({ orgId }: Props) {
  const [stats, setStats] = useState<Stat[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { name: string; avatar?: string | null }>>({});

  const load = useCallback(async () => {
    const [leads, overdue, goals, members, acts, settingsRes] = await Promise.all([
      supabase.from("lead_captures").select("id", { count: "exact", head: true })
        .neq("stage", "won").neq("stage", "lost"),
      supabase.from("lead_captures").select("id, created_at, first_response_at"),
      supabase.from("agency_goals").select("id, is_archived").eq("organization_id", orgId).eq("is_archived", false),
      supabase.rpc("get_org_member_profiles", { _org_id: orgId }),
      supabase.from("agency_activity").select("*").eq("organization_id", orgId)
        .order("created_at", { ascending: false }).limit(20),
      supabase.from("agency_settings").select("first_response_sla_minutes").eq("organization_id", orgId).maybeSingle(),
    ]);

    const slaMin = settingsRes.data?.first_response_sla_minutes ?? 240;
    const overdueCount = (overdue.data ?? []).filter((l: any) => {
      if (l.first_response_at) return false;
      const ageMin = (Date.now() - new Date(l.created_at).getTime()) / 60000;
      return ageMin > slaMin;
    }).length;

    setStats([
      { label: "Open leads", value: leads.count ?? 0, icon: Mail },
      { label: "Overdue", value: overdueCount, icon: CircleAlert, tone: overdueCount > 0 ? "text-destructive" : undefined },
      { label: "Active goals", value: goals.data?.length ?? 0, icon: Target },
      { label: "Members", value: (members.data ?? []).length, icon: Users },
    ]);

    setActivity((acts.data ?? []) as ActivityRow[]);

    const p: Record<string, { name: string; avatar?: string | null }> = {};
    for (const m of (members.data ?? []) as any[]) {
      p[m.user_id] = { name: m.display_name || m.username || "Member", avatar: m.avatar_url };
    }
    setProfiles(p);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase.channel(`agency_activity_${orgId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "agency_activity",
        filter: `organization_id=eq.${orgId}`,
      }, (payload) => {
        setActivity((prev) => [payload.new as ActivityRow, ...prev].slice(0, 20));
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center">
                  <Icon className={`w-4 h-4 ${s.tone ?? "text-muted-foreground"}`} />
                </div>
                <div>
                  <div className={`text-2xl font-semibold tracking-tight ${s.tone ?? ""}`}>{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-5 sm:p-6 space-y-4">
          <h3 className="text-sm font-semibold inline-flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" /> Recent activity
          </h3>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing yet — activity from your team will show up here.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map((a) => {
                const p = profiles[a.actor_user_id];
                return (
                  <li key={a.id} className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      {p?.avatar && <AvatarImage src={p.avatar} />}
                      <AvatarFallback>{(p?.name ?? "?").slice(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{p?.name ?? "Someone"}</span>{" "}
                        <span className="text-muted-foreground">{a.summary}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">{a.verb.replace(/_/g," ")}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
