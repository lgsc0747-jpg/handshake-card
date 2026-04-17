import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Users } from "lucide-react";
import { useChartPalette } from "@/components/dashboard/ChartPaletteSelector";
import { ChartTitleWithInfo } from "@/components/dashboard/ChartTitleWithInfo";

interface PersonaBarChartProps {
  data: { name: string; taps: number; saveRate: number }[];
}

const TITLE_INFO = "Side-by-side comparison of each persona's taps and contact save rate. Reveals which identity (e.g. Founder vs Engineer) actually converts visitors into saved contacts.";

export function PersonaBarChart({ data }: PersonaBarChartProps) {
  const { colors } = useChartPalette();
  if (data.length === 0) {
    return (
      <Card className="glass-card animate-fade-in">
        <CardHeader className="pb-2">
          <ChartTitleWithInfo
            icon={<Users className="w-4 h-4" />}
            title="Persona Performance"
            info={TITLE_INFO}
          />
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-xs text-muted-foreground">No persona data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-2">
        <ChartTitleWithInfo
          icon={<Users className="w-4 h-4" />}
          title="Persona Performance"
          info={TITLE_INFO}
        />
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ left: -10, right: 10 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} unit="%" />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
                color: "hsl(var(--foreground))",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend wrapperStyle={{ fontSize: "11px", color: "hsl(var(--foreground))" }} />
            <Bar yAxisId="left" dataKey="taps" name="Taps" fill={colors[0]} radius={[4, 4, 0, 0]} barSize={24} />
            <Bar yAxisId="right" dataKey="saveRate" name="Save Rate %" fill={colors[1]} radius={[4, 4, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
