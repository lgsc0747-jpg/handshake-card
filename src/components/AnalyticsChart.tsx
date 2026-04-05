import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChartPalette } from "@/components/dashboard/ChartPaletteSelector";
import type { Timeframe } from "@/hooks/useNfcData";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Timeframe } from "@/hooks/useNfcData";

interface AnalyticsChartProps {
  data: { label: string; taps: number; vcards: number }[];
  timeframe: Timeframe;
  onTimeframeChange: (t: Timeframe) => void;
}

const TIMEFRAMES: { label: string; value: Timeframe }[] = [
  { label: "24h", value: "daily" },
  { label: "7d", value: "weekly" },
  { label: "30d", value: "monthly" },
];

export function AnalyticsChart({ data, timeframe, onTimeframeChange }: AnalyticsChartProps) {
  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-sm flex items-center gap-2">
            <Activity className="w-4 h-4" /> The Pulse
          </CardTitle>
          <div className="flex gap-1">
            {TIMEFRAMES.map((t) => (
              <Button
                key={t.value}
                size="sm"
                variant={timeframe === t.value ? "default" : "ghost"}
                className={cn("h-7 text-xs px-2.5", timeframe === t.value && "gradient-primary text-primary-foreground")}
                onClick={() => onTimeframeChange(t.value)}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tapGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(174, 72%, 40%)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(174, 72%, 40%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="vcardGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: 12,
                  color: "hsl(var(--foreground))",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                itemStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", color: "hsl(var(--foreground))" }} />
              <Area type="monotone" dataKey="taps" name="Profile Views" stroke="hsl(174, 72%, 40%)" strokeWidth={2} fill="url(#tapGrad)" />
              <Area type="monotone" dataKey="vcards" name="vCard Saves" stroke="hsl(221, 83%, 53%)" strokeWidth={2} fill="url(#vcardGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
