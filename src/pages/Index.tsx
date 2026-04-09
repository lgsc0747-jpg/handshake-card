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
import { ConversionFunnel } from "@/components/dashboard/ConversionFunnel";
import { ExportButton } from "@/components/dashboard/ExportButton";
import { LeadGenTracker } from "@/components/dashboard/LeadGenTracker";
import { TapVelocityChart } from "@/components/dashboard/TapVelocityChart";
import { TimeframeSelector } from "@/components/dashboard/TimeframeSelector";
import { SortableChartCard } from "@/components/dashboard/SortableChartCard";

import { ChartPaletteProvider, ChartPaletteSelector } from "@/components/dashboard/ChartPaletteSelector";
import { useNfcData } from "@/hooks/useNfcData";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradeOverlay } from "@/components/UpgradePrompt";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, rectSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";

const TIMEFRAME_LABELS: Record<string, string> = {
  thirtymin: "Last 30 min",
  daily: "Last 24h",
  weekly: "Last 7 days",
  monthly: "Last 30 days",
  quarterly: "Last 90 days",
};

/* ─── Chart card keys per tab ─── */
type EngagementCard = "analytics" | "funnel" | "linkCTR" | "liveFeed";
type TechnicalCard = "deviceType" | "browser" | "os" | "tapVelocity" | "heatmap" | "connections";
type SecurityCard = "securityMetrics" | "handshake" | "leadGen";

const DEFAULT_ENGAGEMENT: EngagementCard[] = ["analytics", "funnel", "linkCTR", "liveFeed"];
const DEFAULT_TECHNICAL: TechnicalCard[] = ["deviceType", "browser", "os", "tapVelocity", "heatmap", "connections"];
const DEFAULT_SECURITY: SecurityCard[] = ["securityMetrics", "handshake", "leadGen"];

const LS_ENG = "nfc_dash_engagement_order";
const LS_TECH = "nfc_dash_technical_order";
const LS_SEC = "nfc_dash_security_order";

function loadArr<T extends string>(key: string, def: T[]): T[] {
  try { const r = localStorage.getItem(key); if (r) return JSON.parse(r); } catch {}
  return def;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { stats, chartData, timeframe, setTimeframe, loading } = useNfcData();
  const { isPro } = useSubscription();
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  const editMode = true;

  const [engOrder, setEngOrder] = useState<EngagementCard[]>(() => loadArr(LS_ENG, DEFAULT_ENGAGEMENT));
  const [techOrder, setTechOrder] = useState<TechnicalCard[]>(() => loadArr(LS_TECH, DEFAULT_TECHNICAL));
  const [secOrder, setSecOrder] = useState<SecurityCard[]>(() => loadArr(LS_SEC, DEFAULT_SECURITY));

  useEffect(() => { localStorage.setItem(LS_ENG, JSON.stringify(engOrder)); }, [engOrder]);
  useEffect(() => { localStorage.setItem(LS_TECH, JSON.stringify(techOrder)); }, [techOrder]);
  useEffect(() => { localStorage.setItem(LS_SEC, JSON.stringify(secOrder)); }, [secOrder]);

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } });
  const sensors = useSensors(pointerSensor, touchSensor);

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

  const totalLinkClicks = stats.linkCTR.reduce((s, l) => s + l.clicks, 0);

  const makeDragHandler = <T extends string>(setter: React.Dispatch<React.SetStateAction<T[]>>) =>
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setter((prev) => {
        const oi = prev.indexOf(active.id as T);
        const ni = prev.indexOf(over.id as T);
        return arrayMove(prev, oi, ni);
      });
    };

  const resetAll = () => {
    setEngOrder(DEFAULT_ENGAGEMENT);
    setTechOrder(DEFAULT_TECHNICAL);
    setSecOrder(DEFAULT_SECURITY);
    localStorage.removeItem(LS_ENG);
    localStorage.removeItem(LS_TECH);
    localStorage.removeItem(LS_SEC);
  };

  /* ─── Render helpers for each card ─── */
  const engCards: Record<EngagementCard, React.ReactNode> = {
    analytics: (
      <SortableChartCard id="analytics" editMode={editMode} className="lg:col-span-2">
        <AnalyticsChart data={chartData} />
      </SortableChartCard>
    ),
    funnel: (
      <SortableChartCard id="funnel" editMode={editMode}>
        <ConversionFunnel
          profileViews={stats.profileViews}
          cardFlips={stats.cardFlips}
          linkClicks={totalLinkClicks}
          vcardDownloads={stats.vcardDownloads}
        />
      </SortableChartCard>
    ),
    linkCTR: (
      <SortableChartCard id="linkCTR" editMode={editMode}>
        <LinkCTRChart data={stats.linkCTR} />
      </SortableChartCard>
    ),
    liveFeed: (
      <SortableChartCard id="liveFeed" editMode={editMode}>
        <div className="glass-card rounded-lg p-4 animate-fade-in">
          <h2 className="font-display font-semibold mb-3 text-xs sm:text-sm">Live Feed</h2>
          {recentLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No interactions yet.</p>
          ) : (
            <div className="space-y-2">
              {recentLogs.map((log: any) => {
                const meta = (log.metadata as Record<string, any>) ?? {};
                return (
                  <div key={log.id} className="flex items-start gap-2 group">
                    <span className="text-sm mt-0.5">{getLogIcon(log.interaction_type)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{log.occasion || log.interaction_type}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {meta.device && <Badge variant="outline" className="text-[9px] px-1 py-0">{meta.device}</Badge>}
                        {meta.browser && <Badge variant="outline" className="text-[9px] px-1 py-0">{meta.browser}</Badge>}
                        {meta.persona_slug && <Badge variant="secondary" className="text-[9px] px-1 py-0">{meta.persona_slug}</Badge>}
                        <span className="text-[9px] text-muted-foreground">{timeSince(log.created_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SortableChartCard>
    ),
  };

  const techCards: Record<TechnicalCard, React.ReactNode> = {
    deviceType: <SortableChartCard id="deviceType" editMode={editMode}><DeviceDonutChart data={stats.deviceBreakdown} title="Device Type" /></SortableChartCard>,
    browser: <SortableChartCard id="browser" editMode={editMode}><DeviceDonutChart data={stats.browserBreakdown} title="Browser" /></SortableChartCard>,
    os: <SortableChartCard id="os" editMode={editMode}><DeviceDonutChart data={stats.osBreakdown} title="Operating System" /></SortableChartCard>,
    tapVelocity: <SortableChartCard id="tapVelocity" editMode={editMode} className="col-span-full"><TapVelocityChart data={stats.tapVelocity} /></SortableChartCard>,
    heatmap: <SortableChartCard id="heatmap" editMode={editMode}><ActivityHeatmap data={stats.hourlyHeat} /></SortableChartCard>,
    connections: <SortableChartCard id="connections" editMode={editMode}><ConnectionSourceChart sources={stats.connectionSources} /></SortableChartCard>,
  };

  const secCards: Record<SecurityCard, React.ReactNode> = {
    securityMetrics: (
      <SortableChartCard id="securityMetrics" editMode={editMode}>
        <SecurityMetrics
          authSuccessRate={stats.authSuccessRate}
          leadGenCount={stats.leadGenCount}
          unauthorizedAttempts={stats.unauthorizedAttempts}
          avgDwellTime={stats.avgDwellTime}
        />
      </SortableChartCard>
    ),
    handshake: (
      <SortableChartCard id="handshake" editMode={editMode}>
        <div className="glass-card rounded-lg p-4 animate-fade-in space-y-2">
          <h3 className="font-display font-semibold text-xs sm:text-sm">Digital Handshake</h3>
          <div className="space-y-1.5 text-xs sm:text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Save Rate</span><span className="font-bold">{stats.contactSaveRate}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">vCards</span><span className="font-bold">{stats.vcardDownloads}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">CVs</span><span className="font-bold">{stats.cvDownloads}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Return</span><span className="font-bold">{stats.returnVisitorRate}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Depth</span><span className="font-bold">{stats.interactionDepthRate}%</span></div>
          </div>
        </div>
      </SortableChartCard>
    ),
    leadGen: <SortableChartCard id="leadGen" editMode={editMode} className="col-span-full"><LeadGenTracker /></SortableChartCard>,
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
      <div className="space-y-4">
        {/* Header — tighter on mobile */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-lg sm:text-2xl font-display font-bold">Dashboard</h1>
            <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5">
              {TIMEFRAME_LABELS[timeframe]}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <TimeframeSelector value={timeframe} onChange={setTimeframe} />
            <ChartPaletteSelector />
            {isPro && <ExportButton stats={stats} chartData={chartData} />}
          </div>
        </div>

        {/* KPI Widgets */}
        <WidgetManager stats={stats} />

        {/* Tabs */}
        <Tabs defaultValue="engagement" className="space-y-3">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="engagement" className="text-[10px] sm:text-xs">Engagement</TabsTrigger>
            <TabsTrigger value="personas" className="text-[10px] sm:text-xs">Personas</TabsTrigger>
            <TabsTrigger value="technical" className="text-[10px] sm:text-xs">Technical</TabsTrigger>
            <TabsTrigger value="security" className="text-[10px] sm:text-xs">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="engagement" className="space-y-3">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={makeDragHandler(setEngOrder)}>
              <SortableContext items={engOrder} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {engOrder.map(k => <div key={k}>{engCards[k]}</div>)}
                </div>
              </SortableContext>
            </DndContext>
          </TabsContent>

          <TabsContent value="personas" className="space-y-3">
            {isPro ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <PersonaPieChart />
                <PersonaBarChart data={stats.personaPerformance} />
              </div>
            ) : (
              <UpgradeOverlay feature="Persona Analytics" description="Upgrade to Pro to see detailed persona performance breakdowns.">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <PersonaPieChart />
                  <PersonaBarChart data={stats.personaPerformance} />
                </div>
              </UpgradeOverlay>
            )}
          </TabsContent>

          <TabsContent value="technical" className="space-y-3">
            {isPro ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={makeDragHandler(setTechOrder)}>
                <SortableContext items={techOrder} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {techOrder.map(k => <div key={k} className={k === "tapVelocity" || k === "heatmap" || k === "connections" ? "" : ""}>{techCards[k]}</div>)}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <UpgradeOverlay feature="Technical Analytics" description="Upgrade to Pro for device, tap velocity, and heatmap insights.">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <DeviceDonutChart data={stats.deviceBreakdown} title="Device Type" />
                  <DeviceDonutChart data={stats.browserBreakdown} title="Browser" />
                  <DeviceDonutChart data={stats.osBreakdown} title="Operating System" />
                </div>
              </UpgradeOverlay>
            )}
          </TabsContent>

          <TabsContent value="security" className="space-y-3">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={makeDragHandler(setSecOrder)}>
              <SortableContext items={secOrder} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {secOrder.map(k => <div key={k}>{secCards[k]}</div>)}
                </div>
              </SortableContext>
            </DndContext>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
    </ChartPaletteProvider>
  );
};

export default Dashboard;
