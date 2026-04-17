import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useChartPalette } from "@/components/dashboard/ChartPaletteSelector";
import { Activity } from "lucide-react";
import { ChartTitleWithInfo } from "@/components/dashboard/ChartTitleWithInfo";

interface TapVelocityData {
  label: string;
  taps: number;
}

interface TapVelocityChartProps {
  data: TapVelocityData[];
}

export function TapVelocityChart({ data }: TapVelocityChartProps) {
  const { colors } = useChartPalette();
  const peak = data.reduce((max, d) => (d.taps > max.taps ? d : max), data[0] || { label: "", taps: 0 });

  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <ChartTitleWithInfo
            icon={<Activity className="w-4 h-4" />}
            title="Tap Velocity"
            info="Profile views grouped per hour, plotted over time. The peak label highlights your single busiest hour — a great clue for when your network is most active."
          />
          {peak.taps > 0 && (
            <span className="text-[10px] text-muted-foreground">
              Peak: <span className="font-bold text-foreground">{peak.taps} taps</span> at {peak.label}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 || data.every((d) => d.taps === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-8">No tap data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis
                dataKey="label"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  color: "hsl(var(--foreground))",
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="taps"
                stroke={colors[0]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: colors[0] }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
