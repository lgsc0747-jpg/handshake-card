import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AnalyticsChart } from "@/components/AnalyticsChart";
import { WidgetManager } from "@/components/WidgetManager";
import { PersonaPieChart } from "@/components/PersonaPieChart";
import { DeviceDonutChart } from "@/components/dashboard/DeviceDonutChart";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";
import { LinkCTRChart } from "@/components/dashboard/LinkCTRChart";
import { SecurityMetrics } from "@/components/dashboard/SecurityMetrics";
import { ConnectionSourceChart } from "@/components/dashboard/ConnectionSourceChart";
import { PersonaBarChart } from "@/components/dashboard/PersonaBarChart";
import { useNfcData } from "@/hooks/useNfcData";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Dashboard = () => {
  const { user } = useAuth();
  const { stats, chartData, timeframe, setTimeframe, loading } = useNfcData();
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("interaction_logs")
      .select("id, entity_id, occasion, interaction_type, metadata, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }) => setRecentLogs(data ?? []));
  }, [user]);

  const timeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const getLogIcon = (type: string | null) => {
    switch (type) {
      case "profile_view": return "👁️";
      case "vcard_download": return "📇";
      case "cv_download": return "📄";
      case "link_click": return "🔗";
      case "security_attempt": return "🔒";
      default: return "📡";
    }
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
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Actionable intelligence from your NFC interactions
          </p>
        </div>

        {/* KPI Widgets */}
        <WidgetManager stats={stats} />

        {/* Tabs for organized sections */}
        <Tabs defaultValue="engagement" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="engagement" className="text-xs">Engagement</TabsTrigger>
            <TabsTrigger value="personas" className="text-xs">Personas</TabsTrigger>
            <TabsTrigger value="technical" className="text-xs">Technical</TabsTrigger>
            <TabsTrigger value="security" className="text-xs">Security</TabsTrigger>
          </TabsList>

          {/* ── Engagement Tab ── */}
          <TabsContent value="engagement" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <AnalyticsChart data={chartData} timeframe={timeframe} onTimeframeChange={setTimeframe} />
              </div>
              <LinkCTRChart data={stats.linkCTR} />
            </div>

            {/* Real-time Feed */}
            <div className="glass-card rounded-lg p-5 animate-fade-in">
              <h2 className="font-display font-semibold mb-4 text-sm">Live Feed — Recent Activity</h2>
              {recentLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No interactions recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentLogs.map((log: any) => {
                    const meta = (log.metadata as Record<string, any>) ?? {};
                    return (
                      <div key={log.id} className="flex items-start gap-3 group">
                        <span className="text-base mt-0.5">{getLogIcon(log.interaction_type)}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {log.occasion || log.interaction_type}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {meta.device && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {meta.device}
                              </Badge>
                            )}
                            {meta.browser && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {meta.browser}
                              </Badge>
                            )}
                            {meta.persona_slug && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {meta.persona_slug}
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground">{timeSince(log.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Personas Tab ── */}
          <TabsContent value="personas" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PersonaPieChart />
              <PersonaBarChart data={stats.personaPerformance} />
            </div>
          </TabsContent>

          {/* ── Technical Tab ── */}
          <TabsContent value="technical" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DeviceDonutChart data={stats.deviceBreakdown} title="Device Type" />
              <DeviceDonutChart data={stats.browserBreakdown} title="Browser" />
              <DeviceDonutChart data={stats.osBreakdown} title="Operating System" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ActivityHeatmap data={stats.hourlyHeat} />
              <ConnectionSourceChart sources={stats.connectionSources} />
            </div>
          </TabsContent>

          {/* ── Security Tab ── */}
          <TabsContent value="security" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SecurityMetrics
                authSuccessRate={stats.authSuccessRate}
                leadGenCount={stats.leadGenCount}
                unauthorizedAttempts={stats.unauthorizedAttempts}
              />
              <div className="glass-card rounded-lg p-5 animate-fade-in space-y-3">
                <h3 className="font-display font-semibold text-sm">Digital Handshake Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contact Save Rate</span>
                    <span className="font-bold">{stats.contactSaveRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">vCards Saved</span>
                    <span className="font-bold">{stats.vcardDownloads}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CVs Downloaded</span>
                    <span className="font-bold">{stats.cvDownloads}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg. Dwell Time</span>
                    <span className="font-bold">{stats.avgDwellTime > 0 ? `${stats.avgDwellTime}s` : "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
