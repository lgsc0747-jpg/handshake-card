import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { MousePointer } from "lucide-react";
import { useChartPalette } from "@/components/dashboard/ChartPaletteSelector";
import { ChartTitleWithInfo } from "@/components/dashboard/ChartTitleWithInfo";

interface CTAClickChartProps {
  data: { label: string; clicks: number }[];
}

const TITLE_INFO = "Counts every tap on a custom call-to-action button you've placed on your landing page (e.g. 'Book a call', 'Hire me'). Reveals which prompts actually convert.";

export function CTAClickChart({ data }: CTAClickChartProps) {
  const { colors: COLORS } = useChartPalette();

  if (data.length === 0) {
    return (
      <Card className="glass-card animate-fade-in">
        <CardHeader className="pb-2">
          <ChartTitleWithInfo
            icon={<MousePointer className="w-4 h-4" />}
            title="CTA Button Clicks"
            info={TITLE_INFO}
          />
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-xs text-muted-foreground">No CTA clicks recorded yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-2">
        <ChartTitleWithInfo
          icon={<MousePointer className="w-4 h-4" />}
          title="CTA Button Clicks"
          info={TITLE_INFO}
        />
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 32 + 40)}>
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
            <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
            <YAxis dataKey="label" type="category" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={80} interval={0} />
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
              formatter={(value: number) => [`${value} clicks`, ""]}
            />
            <Bar dataKey="clicks" radius={[0, 4, 4, 0]} barSize={18}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
