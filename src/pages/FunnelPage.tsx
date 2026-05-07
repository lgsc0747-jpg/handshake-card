import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Page, PageHeader, PageSection } from "@/components/layout/Page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowUpRight, Palette, LayoutTemplate, Users, Plus, Activity,
  CreditCard, Lock, BarChart3,
} from "lucide-react";

interface PersonaRow {
  id: string;
  slug: string;
  label: string;
  is_active: boolean;
  is_private: boolean;
  page_mode: string | null;
  accent_color: string | null;
  display_name: string | null;
  headline: string | null;
}

const FunnelPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [personas, setPersonas] = useState<PersonaRow[]>([]);
  const [counts, setCounts] = useState<Record<string, { views: number; leads: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const [pRes, lRes, leadsRes] = await Promise.all([
        supabase.from("personas").select("id,slug,label,is_active,is_private,page_mode,accent_color,display_name,headline").eq("user_id", user.id).order("created_at"),
        supabase.from("interaction_logs").select("metadata,interaction_type").eq("user_id", user.id).gte("created_at", since).limit(2000),
        supabase.from("lead_captures").select("persona_id").eq("owner_user_id", user.id).gte("created_at", since),
      ]);
      const map: Record<string, { views: number; leads: number }> = {};
      ((pRes.data ?? []) as PersonaRow[]).forEach((p) => (map[p.id] = { views: 0, leads: 0 }));
      (lRes.data ?? []).forEach((l: any) => {
        const slug = l.metadata?.persona_slug;
        const target = (pRes.data ?? []).find((p: any) => p.slug === slug);
        if (target && map[target.id]) map[target.id].views += 1;
      });
      (leadsRes.data ?? []).forEach((l: any) => {
        if (map[l.persona_id]) map[l.persona_id].leads += 1;
      });
      setPersonas((pRes.data ?? []) as PersonaRow[]);
      setCounts(map);
      setLoading(false);
    })();
  }, [user]);

  const totals = useMemo(() => {
    return Object.values(counts).reduce(
      (a, c) => ({ views: a.views + c.views, leads: a.leads + c.leads }),
      { views: 0, leads: 0 },
    );
  }, [counts]);

  return (
    <DashboardLayout>
      <Page>
        <PageHeader
          title="Funnel"
          description="Each persona is a funnel. Build identity, design the card, compose the page, and read the analytics — all from here."
        />

        <PageSection title="Workspaces">
          <div className="grid gap-px bg-border sm:grid-cols-3 border border-border">
            {[
              { to: "/personas", label: "Personas", icon: Users, hint: "Identity & access" },
              { to: "/design-studio", label: "Card Studio", icon: Palette, hint: "3D card visuals" },
              { to: "/page-builder", label: "Page Builder", icon: LayoutTemplate, hint: "Public page blocks" },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.to}
                  onClick={() => navigate(t.to)}
                  className="group bg-card hover:bg-accent/30 transition-colors text-left p-5 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="text-eyebrow text-muted-foreground">{t.hint}</div>
                    <div className="text-base font-semibold tracking-tight flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {t.label}
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
              );
            })}
          </div>
        </PageSection>

        <PageSection
          title="Personas"
          description="Per-persona analytics replace the old NFC dashboard. Click a row to dive in."
        >
          <div className="border border-border bg-card">
            <div className="grid grid-cols-12 px-4 py-2 text-eyebrow text-muted-foreground border-b border-border">
              <div className="col-span-5">Persona</div>
              <div className="col-span-2 text-right tabular-nums">Views 30d</div>
              <div className="col-span-2 text-right tabular-nums">Leads 30d</div>
              <div className="col-span-2 text-right tabular-nums">Conv.</div>
              <div className="col-span-1" />
            </div>
            {loading && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}
            {!loading && personas.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground flex items-center justify-between">
                <span>No personas yet.</span>
                <Button asChild size="sm" variant="outline" className="rounded-sm">
                  <Link to="/personas"><Plus className="w-3.5 h-3.5 mr-1" /> New persona</Link>
                </Button>
              </div>
            )}
            {personas.map((p) => {
              const c = counts[p.id] ?? { views: 0, leads: 0 };
              const conv = c.views > 0 ? Math.round((c.leads / c.views) * 100) : 0;
              return (
                <Link
                  to={`/personas/${p.slug}/analytics`}
                  key={p.id}
                  className="grid grid-cols-12 px-4 py-3 items-center border-b border-border last:border-b-0 hover:bg-accent/30 transition-colors"
                >
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <span
                      className="w-2 h-8 shrink-0"
                      style={{ background: p.accent_color ?? "hsl(var(--primary))" }}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                        {p.label}
                        {p.is_private && <Lock className="w-3 h-3 text-muted-foreground" />}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono truncate">/{p.slug}</div>
                    </div>
                    <Badge variant="outline" className="rounded-sm text-[10px] ml-auto sm:ml-2 hidden sm:inline-flex">
                      {p.page_mode === "builder" ? <><LayoutTemplate className="w-3 h-3 mr-1" />Page</> : <><CreditCard className="w-3 h-3 mr-1" />Card</>}
                    </Badge>
                  </div>
                  <div className="col-span-2 text-right text-sm tabular-nums">{c.views.toLocaleString()}</div>
                  <div className="col-span-2 text-right text-sm tabular-nums">{c.leads.toLocaleString()}</div>
                  <div className="col-span-2 text-right text-sm tabular-nums">
                    {conv}<span className="text-muted-foreground">%</span>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
              );
            })}
          </div>

          {!loading && personas.length > 0 && (
            <div className="mt-3 flex items-center gap-3 text-eyebrow text-muted-foreground">
              <Activity className="w-3.5 h-3.5" />
              <span>Total {totals.views.toLocaleString()} views · {totals.leads.toLocaleString()} leads · last 30d</span>
            </div>
          )}
        </PageSection>
      </Page>
    </DashboardLayout>
  );
};

export default FunnelPage;
