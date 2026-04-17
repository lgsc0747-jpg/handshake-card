import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { useChartPalette } from "@/components/dashboard/ChartPaletteSelector";
import { ChartTitleWithInfo } from "@/components/dashboard/ChartTitleWithInfo";

interface AnalyticsChartProps {
  data: { label: string; taps: number; vcards: number }[];
}

export function AnalyticsChart({ data }: AnalyticsChartProps) {
  const { colors } = useChartPalette();
  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-2">
        <ChartTitleWithInfo
          icon={<Activity className="w-4 h-4" />}
          title="The Pulse"
          info="Timeline of your profile views and contact saves over the selected timeframe. Each point is a time bucket — taller curves mean more taps in that window."
        />
      </CardHeader>
      <CardContent>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tapGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors[0]} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={colors[0]} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="vcardGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors[1]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={colors[1]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12, color: "hsl(var(--foreground))" }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                itemStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", color: "hsl(var(--foreground))" }} />
              <Area type="monotone" dataKey="taps" name="Profile Views" stroke={colors[0]} strokeWidth={2} fill="url(#tapGrad)" />
              <Area type="monotone" dataKey="vcards" name="vCard Saves" stroke={colors[1]} strokeWidth={2} fill="url(#vcardGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
