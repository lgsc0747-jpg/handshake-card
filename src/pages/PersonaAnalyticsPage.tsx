import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, Reorder } from "framer-motion";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Page, PageHeader, PageSection, PageGrid } from "@/components/layout/Page";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { ArrowLeft, Settings2, GripVertical, Eye, MousePointerClick, Download, Mail, Filter, Share2, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { springIOS, fadeUp, staggerChildren } from "@/lib/motion";
import { Chart } from "@/components/charts/Chart";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type FunnelKey =
  | "profile_view"
  | "card_flip"
  | "link_click"
  | "cta_click"
  | "video_play"
  | "cv_download"
  | "vcard_download"
  | "contact_form_submit";

const ALL_STAGES: { key: FunnelKey; label: string; icon: any }[] = [
  { key: "profile_view", label: "Profile Views", icon: Eye },
  { key: "card_flip", label: "Card Flips", icon: Sparkles },
  { key: "link_click", label: "Link Clicks", icon: MousePointerClick },
  { key: "cta_click", label: "CTA Clicks", icon: MousePointerClick },
  { key: "video_play", label: "Video Plays", icon: Share2 },
  { key: "cv_download", label: "CV Downloads", icon: Download },
  { key: "vcard_download", label: "Contact Saves", icon: Download },
  { key: "contact_form_submit", label: "Form Submits", icon: Mail },
];

const DEFAULT_STAGES: FunnelKey[] = ["profile_view", "card_flip", "link_click", "vcard_download"];

interface LogRow {
  id: string;
  interaction_type: string | null;
  entity_id: string;
  created_at: string;
  metadata: any;
}

const PersonaAnalyticsPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [personaLabel, setPersonaLabel] = useState<string>(slug ?? "");
  const [stages, setStages] = useState<FunnelKey[]>(() => {
    try {
      const raw = localStorage.getItem(`funnel_stages_${slug}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return DEFAULT_STAGES;
  });
  const [configOpen, setConfigOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(`funnel_stages_${slug}`, JSON.stringify(stages));
  }, [stages, slug]);

  useEffect(() => {
    if (!user || !slug) return;
    let active = true;
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [logsRes, pRes] = await Promise.all([
        supabase
          .from("interaction_logs")
          .select("id, interaction_type, entity_id, created_at, metadata")
          .eq("user_id", user.id)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase.from("personas").select("label").eq("user_id", user.id).eq("slug", slug).maybeSingle(),
      ]);
      if (!active) return;
      const filtered = (logsRes.data ?? []).filter(
        (l: any) => (l.metadata?.persona_slug ?? null) === slug || l.metadata?.persona_slug == null,
      );
      setLogs(filtered as LogRow[]);
      if (pRes.data?.label) setPersonaLabel(pRes.data.label);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user, slug]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const l of logs) {
      const k = l.interaction_type ?? "tap";
      c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [logs]);

  const series = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    for (const l of logs) {
      const k = l.created_at.slice(0, 10);
      if (k in days) days[k]++;
    }
    return Object.entries(days).map(([d, taps]) => ({
      label: d.slice(5),
      taps,
    }));
  }, [logs]);

  const funnelSteps = stages.map((k) => ({
    key: k,
    label: ALL_STAGES.find((s) => s.key === k)?.label ?? k,
    value: counts[k] ?? 0,
  }));
  const maxFunnel = Math.max(...funnelSteps.map((s) => s.value), 1);

  return (
    <DashboardLayout>
      <Page>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="rounded-xl">
              <Link to="/personas"><ArrowLeft className="w-4 h-4 mr-1.5" />Personas</Link>
            </Button>
            <Badge variant="outline" className="rounded-full">/p/.../{slug}</Badge>
          </div>
          <Sheet open={configOpen} onOpenChange={setConfigOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-xl">
                <Settings2 className="w-4 h-4 mr-2" />Configure funnel
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Funnel stages</SheetTitle>
              </SheetHeader>
              <p className="text-sm text-muted-foreground mt-2">
                Drag to reorder. Toggle stages on or off to fit your conversion story.
              </p>
              <div className="mt-4 space-y-4">
                <Reorder.Group axis="y" values={stages} onReorder={setStages} className="space-y-2">
                  {stages.map((k) => {
                    const meta = ALL_STAGES.find((s) => s.key === k)!;
                    const Icon = meta.icon;
                    return (
                      <Reorder.Item
                        key={k}
                        value={k}
                        className="ios-row flex items-center gap-2 px-3 py-2 cursor-grab active:cursor-grabbing"
                      >
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium flex-1">{meta.label}</span>
                        <Switch
                          checked={true}
                          onCheckedChange={() => setStages(stages.filter((x) => x !== k))}
                        />
                      </Reorder.Item>
                    );
                  })}
                </Reorder.Group>

                <div className="pt-2 border-t border-border/50 space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Available stages</Label>
                  {ALL_STAGES.filter((s) => !stages.includes(s.key)).map((s) => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.key}
                        onClick={() => setStages([...stages, s.key])}
                        className="ios-row w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent/40 transition-colors"
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm flex-1">{s.label}</span>
                        <span className="text-xs text-muted-foreground">Add</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <PageHeader
          title={
            <span className="inline-flex items-center gap-2">
              <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-[var(--shadow-card)]">
                <Filter className="w-4 h-4 text-primary-foreground" />
              </span>
              {personaLabel || slug}
            </span>
          }
          description="Per-persona conversion analytics over the last 30 days. Reorder stages to match how you think about your funnel."
        />

        <PageSection title="Activity">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <Chart height="md" config={{ taps: { label: "Events", color: "hsl(var(--primary))" } }}>
                <AreaChart data={series} margin={{ left: 8, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="taps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border) / 0.4)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} interval={4} />
                  <YAxis hide />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="taps"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#taps)"
                  />
                </AreaChart>
              </Chart>
            </CardContent>
          </Card>
        </PageSection>

        <PageSection title="Configurable funnel" description="Drop-off between each step is shown as a percentage.">
          <Card>
            <CardContent className="p-5 sm:p-6 space-y-3">
              <motion.div variants={staggerChildren()} initial="initial" animate="animate" className="space-y-3">
                {funnelSteps.map((step, i) => {
                  const widthPct = Math.max((step.value / maxFunnel) * 100, 6);
                  const rate =
                    i > 0 && funnelSteps[i - 1].value > 0
                      ? Math.round((step.value / funnelSteps[i - 1].value) * 100)
                      : null;
                  return (
                    <motion.div key={step.key} variants={fadeUp} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{step.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold tabular-nums">{step.value.toLocaleString()}</span>
                          {rate !== null && (
                            <Badge variant="secondary" className="rounded-full text-[10px]">
                              {rate}%
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="h-7 w-full rounded-xl bg-muted/40 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${widthPct}%` }}
                          transition={{ ...springIOS, delay: i * 0.05 }}
                          className="h-full rounded-xl bg-gradient-to-r from-primary to-primary/70"
                        />
                      </div>
                    </motion.div>
                  );
                })}
                {funnelSteps.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No stages selected. Open <strong>Configure funnel</strong> to add some.
                  </p>
                )}
              </motion.div>
            </CardContent>
          </Card>
        </PageSection>

        {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
      </Page>
    </DashboardLayout>
  );
};

export default PersonaAnalyticsPage;
