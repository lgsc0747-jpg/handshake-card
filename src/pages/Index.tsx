import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AnalyticsChart } from "@/components/AnalyticsChart";
import { WidgetManager } from "@/components/WidgetManager";
import { PersonaPieChart } from "@/components/PersonaPieChart";
import { useNfcData } from "@/hooks/useNfcData";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { stats, chartData, timeframe, setTimeframe, loading } = useNfcData();
  const [accentColor, setAccentColor] = useState("#0d9488");
  const [savingColor, setSavingColor] = useState(false);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    // Fetch accent color
    supabase
      .from("profiles")
      .select("card_accent_color")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.card_accent_color) setAccentColor(data.card_accent_color);
      });

    // Fetch recent logs
    supabase
      .from("interaction_logs")
      .select("id, entity_id, occasion, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setRecentLogs(data ?? []));
  }, [user]);

  const handleColorChange = async (color: string) => {
    if (!user) return;
    setAccentColor(color);
    setSavingColor(true);
    await supabase
      .from("profiles")
      .update({ card_accent_color: color } as any)
      .eq("user_id", user.id);
    setSavingColor(false);
    toast({ title: "Theme updated", description: "Your card accent color has been saved." });
  };

  const timeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
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
          <p className="text-sm text-muted-foreground mt-1">Real-time NFC interaction overview</p>
        </div>

        {/* Widgets */}
        <WidgetManager stats={stats} />

        {/* Chart + Theme side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <AnalyticsChart data={chartData} timeframe={timeframe} onTimeframeChange={setTimeframe} />
          </div>
          <div>
            <ThemeDesigner
              currentColor={accentColor}
              onColorChange={handleColorChange}
              saving={savingColor}
            />
            <div className="mt-4">
              <PersonaPieChart />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-card rounded-lg p-5 animate-fade-in max-w-2xl">
          <h2 className="font-display font-semibold mb-4">Recent Activity</h2>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No interactions recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log: any) => (
                <div key={log.id} className="flex items-start gap-3 group">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{log.entity_id}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {log.occasion && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {log.occasion}
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">{timeSince(log.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
