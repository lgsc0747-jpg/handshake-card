import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AnalyticsChart } from "@/components/AnalyticsChart";
import { DeviceDonutChart } from "@/components/dashboard/DeviceDonutChart";
import { ConversionFunnel } from "@/components/dashboard/ConversionFunnel";
import { PersonaBarChart } from "@/components/dashboard/PersonaBarChart";
import { ChartPaletteProvider, ChartPaletteSelector } from "@/components/dashboard/ChartPaletteSelector";
import { TimeframeSelector } from "@/components/dashboard/TimeframeSelector";
import { ExportButton } from "@/components/dashboard/ExportButton";
import { PersonaCardCarousel } from "@/components/dashboard/PersonaCardCarousel";
import { useNfcData } from "@/hooks/useNfcData";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Eye, Users, MousePointerClick, FileText, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

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
              {isPro && <ExportButton stats={stats} chartData={chartData} />}
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="Profile views" value={stats.profileViews} icon={<Eye className="w-3.5 h-3.5" />} />
            <Kpi label="Unique visitors" value={stats.uniqueVisitors} icon={<Users className="w-3.5 h-3.5" />} />
            <Kpi label="Save rate" value={`${stats.contactSaveRate}%`} icon={<FileText className="w-3.5 h-3.5" />} />
            <Kpi label="Leads" value={stats.leadGenCount} icon={<MousePointerClick className="w-3.5 h-3.5" />} />
          </div>

          {/* 3D Card carousel — front and center */}
          <PersonaCardCarousel />

          {/* Trend + funnel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2">
              <AnalyticsChart data={chartData} />
            </div>
            <ConversionFunnel
              profileViews={stats.profileViews}
              cardFlips={stats.cardFlips}
              linkClicks={totalLinkClicks}
              vcardDownloads={stats.vcardDownloads}
            />
          </div>

          {/* Personas + devices + live */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2">
              <PersonaBarChart data={stats.personaPerformance} />
            </div>
            <DeviceDonutChart data={stats.deviceBreakdown} title="Devices" />
          </div>

          {/* Recent activity */}
          <div className="rounded-sm border border-border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-eyebrow text-muted-foreground">Recent activity</p>
              <Link to="/logs" className="text-eyebrow text-accent hover:underline flex items-center gap-1">
                View all <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            {recentLogs.length === 0 ? (
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
