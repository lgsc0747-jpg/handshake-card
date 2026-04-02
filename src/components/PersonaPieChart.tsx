import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const COLORS = ["#0d9488", "#06b6d4", "#3b82f6", "#8b5cf6", "#d946ef", "#f43f5e", "#f97316", "#10b981"];

export function PersonaPieChart() {
  const { user } = useAuth();
  const [data, setData] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      // Get all personas for labels
      const { data: personas } = await supabase
        .from("personas")
        .select("id, label")
        .eq("user_id", user.id);

      if (!personas || personas.length === 0) {
        setLoading(false);
        return;
      }

      // Get interaction logs and count by persona slug in metadata
      const { data: logs } = await supabase
        .from("interaction_logs")
        .select("metadata")
        .eq("user_id", user.id);

      const counts: Record<string, number> = {};
      personas.forEach((p) => { counts[p.id] = 0; });

      (logs ?? []).forEach((log: any) => {
        const slug = log.metadata?.persona_slug;
        if (slug) {
          const matched = personas.find((p) => p.label.toLowerCase().replace(/\s+/g, "-") === slug || p.id === slug);
          if (matched) counts[matched.id] = (counts[matched.id] || 0) + 1;
        }
      });

      const chartData = personas
        .map((p) => ({ name: p.label, value: counts[p.id] || 0 }))
        .filter((d) => d.value > 0);

      // If no data yet, show all personas with 0
      setData(chartData.length > 0 ? chartData : personas.map((p) => ({ name: p.label, value: 1 })));
      setLoading(false);
    };

    load();
  }, [user]);

  if (loading) {
    return (
      <Card className="glass-card animate-fade-in">
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return null;
  }

  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-sm">Taps by Persona</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "11px" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
