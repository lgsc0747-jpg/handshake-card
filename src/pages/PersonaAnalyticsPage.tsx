import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, Reorder } from "framer-motion";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Page, PageHeader, PageSection } from "@/components/layout/Page";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  ArrowLeft, Settings2, GripVertical, Eye, MousePointerClick,
  Download, Mail, Filter, Share2, Sparkles, Smartphone, Globe2,
  Users2, Clock, TrendingUp,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { springIOS, fadeUp, staggerChildren } from "@/lib/motion";
import { Chart } from "@/components/charts/Chart";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis,
  Bar, BarChart, Cell, PieChart, Pie,
} from "recharts";
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

interface LeadRow {
  id: string;
  visitor_name: string | null;
  visitor_email: string;
  stage: string;
  created_at: string;
}

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--muted-foreground))", "hsl(var(--success))"];

const PersonaAnalyticsPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
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
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const pRes = await supabase
        .from("personas")
        .select("id,label")
        .eq("user_id", user.id)
        .eq("slug", slug)
        .maybeSingle();
      const personaId = pRes.data?.id;
      const [logsRes, leadsRes] = await Promise.all([
        supabase
          .from("interaction_logs")
          .select("id, interaction_type, entity_id, created_at, metadata")
          .eq("user_id", user.id)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(2000),
        personaId
          ? supabase
              .from("lead_captures")
              .select("id, visitor_name, visitor_email, stage, created_at")
              .eq("owner_user_id", user.id)
              .eq("persona_id", personaId)
              .gte("created_at", since)
              .order("created_at", { ascending: false })
              .limit(50)
          : Promise.resolve({ data: [] as LeadRow[] }),
      ]);
      if (!active) return;
      const filtered = (logsRes.data ?? []).filter(
        (l: any) => (l.metadata?.persona_slug ?? null) === slug || l.metadata?.persona_slug == null,
      );
      setLogs(filtered as LogRow[]);
      setLeads((leadsRes.data ?? []) as LeadRow[]);
      if (pRes.data?.label) setPersonaLabel(pRes.data.label);
      setLoading(false);
    })();
    return () => { active = false; };
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
    return Object.entries(days).map(([d, taps]) => ({ label: d.slice(5), taps }));
  }, [logs]);

  const devices = useMemo(() => {
    const d: Record<string, number> = { Mobile: 0, Desktop: 0, Tablet: 0 };
    for (const l of logs) {
      const dev = l.metadata?.device_type as string | undefined;
      if (dev === "tablet") d.Tablet++;
      else if (dev === "desktop") d.Desktop++;
      else d.Mobile++;
    }
    return Object.entries(d).map(([name, value]) => ({ name, value }));
  }, [logs]);

  const sources = useMemo(() => {
    const s: Record<string, number> = {};
    for (const l of logs) {
      const src = (l.metadata?.source as string | undefined) ?? "direct";
      s[src] = (s[src] ?? 0) + 1;
    }
    return Object.entries(s)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
  }, [logs]);

  const totalEvents = logs.length;
  const uniqueDays = new Set(logs.map((l) => l.created_at.slice(0, 10))).size;
  const dailyAvg = uniqueDays > 0 ? Math.round(totalEvents / 30) : 0;
  const profileViews = counts["profile_view"] ?? 0;
  const conv = profileViews > 0 ? Math.round((leads.length / profileViews) * 100) : 0;

  const funnelSteps = stages.map((k) => ({
    key: k,
    label: ALL_STAGES.find((s) => s.key === k)?.label ?? k,
    value: counts[k] ?? 0,
  }));
  const maxFunnel = Math.max(...funnelSteps.map((s) => s.value), 1);

  const KPI = ({ icon: Icon, label, value, hint }: any) => (
    <div className="border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-eyebrow text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="text-2xl font-semibold tracking-tight tabular-nums mt-1">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );

  return (
    <DashboardLayout>
      <Page>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="rounded-sm">
              <Link to="/funnel"><ArrowLeft className="w-4 h-4 mr-1.5" />Funnel</Link>
            </Button>
            <Badge variant="outline" className="rounded-sm font-mono text-[10px]">/p/.../{slug}</Badge>
          </div>
          <Sheet open={configOpen} onOpenChange={setConfigOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-sm">
                <Settings2 className="w-4 h-4 mr-2" />Configure funnel
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Funnel stages</SheetTitle>
              </SheetHeader>
              <p className="text-sm text-muted-foreground mt-2">
                Drag to reorder. Toggle stages on or off.
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
                        className="border border-border bg-card flex items-center gap-2 px-3 py-2 cursor-grab active:cursor-grabbing"
                      >
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium flex-1">{meta.label}</span>
                        <Switch
                          checked
                          onCheckedChange={() => setStages(stages.filter((x) => x !== k))}
                        />
                      </Reorder.Item>
                    );
                  })}
                </Reorder.Group>

                <div className="pt-2 border-t border-border space-y-2">
                  <Label className="text-eyebrow text-muted-foreground">Available stages</Label>
                  {ALL_STAGES.filter((s) => !stages.includes(s.key)).map((s) => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.key}
                        onClick={() => setStages([...stages, s.key])}
                        className="border border-border bg-card w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent/30 transition-colors"
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
          title={personaLabel || slug}
          description="30-day analytics for this persona. KPIs, funnel, audience, and recent leads — all in one place."
        />

        <PageSection title="KPIs">
          <div className="grid gap-px bg-border border border-border sm:grid-cols-2 lg:grid-cols-4">
            <KPI icon={Eye} label="Profile views" value={profileViews.toLocaleString()} hint="Last 30 days" />
            <KPI icon={MousePointerClick} label="Total events" value={totalEvents.toLocaleString()} hint={`~${dailyAvg}/day`} />
            <KPI icon={Users2} label="Leads captured" value={leads.length.toLocaleString()} hint={`${conv}% conv. rate`} />
            <KPI icon={Clock} label="Active days" value={uniqueDays.toLocaleString()} hint="Days w/ events" />
          </div>
        </PageSection>

        <PageSection title="Activity">
          <Card className="rounded-sm">
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
                  <Area type="monotone" dataKey="taps" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#taps)" />
                </AreaChart>
              </Chart>
            </CardContent>
          </Card>
        </PageSection>

        <div className="grid gap-4 lg:grid-cols-2">
          <PageSection title="Devices">
            <Card className="rounded-sm">
              <CardContent className="p-4 sm:p-6">
                <Chart height="sm" config={{}}>
                  <PieChart>
                    <Pie data={devices} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={2}>
                      {devices.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </Chart>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  {devices.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <span className="w-2 h-2" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="ml-auto tabular-nums">{d.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </PageSection>

          <PageSection title="Sources">
            <Card className="rounded-sm">
              <CardContent className="p-4 sm:p-6">
                <Chart height="sm" config={{ value: { label: "Hits", color: "hsl(var(--accent))" } }}>
                  <BarChart data={sources} layout="vertical" margin={{ left: 8, right: 8 }}>
                    <CartesianGrid horizontal={false} stroke="hsl(var(--border) / 0.4)" />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={80} fontSize={11} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="hsl(var(--accent))" radius={0} />
                  </BarChart>
                </Chart>
                {sources.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No source data yet.</p>
                )}
              </CardContent>
            </Card>
          </PageSection>
        </div>

        <PageSection title="Configurable funnel" description="Drop-off between each step is shown as a percentage.">
          <Card className="rounded-sm">
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
                            <Badge variant="secondary" className="rounded-sm text-[10px]">{rate}%</Badge>
                          )}
                        </div>
                      </div>
                      <div className="h-7 w-full bg-muted/40 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${widthPct}%` }}
                          transition={{ ...springIOS, delay: i * 0.05 }}
                          className="h-full bg-primary"
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

        <PageSection title="Recent leads" description="Most recent 50 leads captured for this persona.">
          <div className="border border-border bg-card">
            {leads.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">No leads yet.</div>
            )}
            {leads.map((l) => (
              <Link
                to="/leads"
                key={l.id}
                className="grid grid-cols-12 px-4 py-2.5 items-center border-b border-border last:border-b-0 hover:bg-accent/30 transition-colors"
              >
                <div className="col-span-5 text-sm truncate">{l.visitor_name || "Anonymous"}</div>
                <div className="col-span-4 text-xs font-mono text-muted-foreground truncate">{l.visitor_email}</div>
                <div className="col-span-2">
                  <Badge variant="outline" className="rounded-sm text-[10px] capitalize">{l.stage}</Badge>
                </div>
                <div className="col-span-1 text-right text-[10px] text-muted-foreground tabular-nums">
                  {new Date(l.created_at).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        </PageSection>

        {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
      </Page>
    </DashboardLayout>
  );
};

export default PersonaAnalyticsPage;
