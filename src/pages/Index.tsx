import { Suspense, lazy, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ChartPaletteProvider, ChartPaletteSelector } from "@/components/dashboard/ChartPaletteSelector";
import { TimeframeSelector } from "@/components/dashboard/TimeframeSelector";
import { ExportButton } from "@/components/dashboard/ExportButton";
import { PersonaCardCarousel } from "@/components/dashboard/PersonaCardCarousel";
import { useNfcData } from "@/hooks/useNfcData";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Users, MousePointerClick, FileText, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const AnalyticsChart = lazy(() =>
  import("@/components/AnalyticsChart").then((m) => ({ default: m.AnalyticsChart }))
);
const DeviceDonutChart = lazy(() =>
  import("@/components/dashboard/DeviceDonutChart").then((m) => ({ default: m.DeviceDonutChart }))
);
const ConversionFunnel = lazy(() =>
  import("@/components/dashboard/ConversionFunnel").then((m) => ({ default: m.ConversionFunnel }))
);
const PersonaBarChart = lazy(() =>
  import("@/components/dashboard/PersonaBarChart").then((m) => ({ default: m.PersonaBarChart }))
);

const TIMEFRAME_LABELS: Record<string, string> = {
  thirtymin: "Last 30 min",
  daily: "Last 24h",
  weekly: "Last 7 days",
  monthly: "Last 30 days",
  quarterly: "Last 90 days",
};

interface KpiProps {
  label: string;
  value: string | number;
  delta?: string;
  icon: React.ReactNode;
}

function Kpi({ label, value, delta, icon }: KpiProps) {
  return (
    <div className="rounded-sm border border-border bg-card p-4 flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-eyebrow">{label}</span>
        {icon}
      </div>
      <p className="text-2xl font-display font-semibold tracking-tight tabular-nums">{value}</p>
      {delta && <p className="text-eyebrow text-muted-foreground">{delta}</p>}
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="rounded-sm border border-border bg-card p-4 flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-muted-foreground">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3.5 w-3.5 rounded-full" />
      </div>
      <Skeleton className="h-7 w-16 mt-1" />
    </div>
  );
}

function ChartSkeleton({ height = "h-[240px]" }: { height?: string }) {
  return (
    <div className="glass-card animate-fade-in">
      <div className="px-6 pt-5 pb-2">
        <Skeleton className="h-4 w-32" />
      </div>
      <div className={`px-6 pb-6 ${height}`}>
        <Skeleton className="h-full w-full rounded-sm" />
      </div>
    </div>
  );
}

function FunnelSkeleton() {
  return (
    <div className="glass-card animate-fade-in">
      <div className="px-6 pt-5 pb-2">
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="px-6 pb-6 h-[240px]">
        <Skeleton className="h-full w-full rounded-sm" />
      </div>
    </div>
  );
}

const Dashboard = () => {
  const { user } = useAuth();
  const { stats, chartData, timeframe, setTimeframe, loading } = useNfcData();
  const { isPro } = useSubscription();
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("interaction_logs")
      .select("id, entity_id, occasion, interaction_type, metadata, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setRecentLogs(data ?? []));
  }, [user]);

  const totalLinkClicks = stats.linkCTR.reduce((s, l) => s + l.clicks, 0);

  const timeSince = (s: string) => {
    const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000);
    if (m < 1) return "now";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  return (
    <ChartPaletteProvider>
      <DashboardLayout>
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-end justify-between flex-wrap gap-3 border-b border-border pb-4">
            <div>
              <p className="text-eyebrow text-muted-foreground">Overview</p>
              <h1 className="text-display font-semibold tracking-tight">Analytics</h1>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                {TIMEFRAME_LABELS[timeframe]}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <TimeframeSelector value={timeframe} onChange={setTimeframe} />
              <ChartPaletteSelector />
              {isPro && <ExportButton stats={stats} chartData={chartData} timeframe={timeframe} />}
            </div>
          </div>

          {/* KPI Strip */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi label="Profile views" value={stats.profileViews} icon={<Eye className="w-3.5 h-3.5" />} />
              <Kpi label="Unique visitors" value={stats.uniqueVisitors} icon={<Users className="w-3.5 h-3.5" />} />
              <Kpi label="Save rate" value={`${stats.contactSaveRate}%`} icon={<FileText className="w-3.5 h-3.5" />} />
              <Kpi label="Leads" value={stats.leadGenCount} icon={<MousePointerClick className="w-3.5 h-3.5" />} />
            </div>
          )}

          {/* 3D Card carousel */}
          <PersonaCardCarousel />

          {/* Trend + funnel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2">
              {loading ? (
                <ChartSkeleton />
              ) : (
                <Suspense fallback={<ChartSkeleton />}>
                  <AnalyticsChart data={chartData} />
                </Suspense>
              )}
            </div>
            {loading ? (
              <FunnelSkeleton />
            ) : (
              <Suspense fallback={<FunnelSkeleton />}>
                <ConversionFunnel
                  profileViews={stats.profileViews}
                  cardFlips={stats.cardFlips}
                  linkClicks={totalLinkClicks}
                  vcardDownloads={stats.vcardDownloads}
                />
              </Suspense>
            )}
          </div>

          {/* Personas + devices */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2">
              {loading ? (
                <ChartSkeleton height="h-[220px]" />
              ) : (
                <Suspense fallback={<ChartSkeleton height="h-[220px]" />}>
                  <PersonaBarChart data={stats.personaPerformance} />
                </Suspense>
              )}
            </div>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <Suspense fallback={<ChartSkeleton />}>
                <DeviceDonutChart data={stats.deviceBreakdown} title="Devices" />
              </Suspense>
            )}
          </div>

          {/* Recent activity */}
          <div className="rounded-sm border border-border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-eyebrow text-muted-foreground">Recent activity</p>
              <Link to="/logs" className="text-eyebrow text-accent hover:underline flex items-center gap-1">
                View all <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            {loading ? (
              <div className="divide-y divide-border">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <Skeleton className="w-1.5 h-1.5 rounded-full shrink-0" />
                    <Skeleton className="h-3 w-40 flex-1" />
                    <Skeleton className="h-3 w-12 shrink-0" />
                  </div>
                ))}
              </div>
            ) : recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground p-6 text-center">No interactions yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {recentLogs.map((log) => {
                  const meta = (log.metadata as Record<string, any>) ?? {};
                  return (
                    <div key={log.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                      <p className="text-sm font-medium flex-1 truncate">
                        {log.occasion || log.interaction_type?.replace(/_/g, " ")}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {meta.persona_slug && (
                          <Badge variant="outline" className="rounded-sm text-eyebrow">
                            {meta.persona_slug}
                          </Badge>
                        )}
                        {meta.device && <span className="text-eyebrow text-muted-foreground">{meta.device}</span>}
                        <span className="text-eyebrow text-muted-foreground tabular-nums w-8 text-right">{timeSince(log.created_at)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ChartPaletteProvider>
  );
};

export default Dashboard;
