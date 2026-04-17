import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useChartPalette } from "@/components/dashboard/ChartPaletteSelector";
import { ChartTitleWithInfo } from "@/components/dashboard/ChartTitleWithInfo";

interface DeviceDonutChartProps {
  data: { name: string; value: number; color: string }[];
  title: string;
}

const INFO_BY_TITLE: Record<string, string> = {
  "Device Type": "Breakdown of visitors by device — Mobile, Desktop, or Tablet — parsed from each visitor's browser. Helps you optimize the layout for whoever taps most.",
  "Browser": "Which web browsers visitors use (Chrome, Safari, Firefox, etc.). Useful when debugging visual issues that only show up in one browser.",
  "Operating System": "OS distribution of your visitors (iOS, Android, macOS, Windows, Linux). Indicates whether your audience is mobile-first or desktop-first.",
};

export function DeviceDonutChart({ data, title }: DeviceDonutChartProps) {
  const { colors: paletteColors } = useChartPalette();
  const coloredData = data.map((d, i) => ({ ...d, color: paletteColors[i % paletteColors.length] }));
  const total = data.reduce((s, d) => s + d.value, 0);
  const info = INFO_BY_TITLE[title] ?? "Distribution breakdown for this metric.";

  if (data.length === 0 || total === 0) {
    return (
      <Card className="glass-card animate-fade-in">
        <CardHeader className="pb-2">
          <ChartTitleWithInfo title={title} info={info} />
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-xs text-muted-foreground">No data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-2">
        <ChartTitleWithInfo title={title} info={info} />
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={coloredData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value" stroke="none">
              {coloredData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
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
              formatter={(value: number) => [`${value} (${Math.round((value / total) * 100)}%)`, ""]}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", color: "hsl(var(--foreground))" }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
