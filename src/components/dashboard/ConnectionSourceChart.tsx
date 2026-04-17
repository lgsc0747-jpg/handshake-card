import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Wifi } from "lucide-react";
import { useChartPalette } from "@/components/dashboard/ChartPaletteSelector";
import { ChartTitleWithInfo } from "@/components/dashboard/ChartTitleWithInfo";

interface ConnectionSourceChartProps {
  sources: { nfc: number; qr: number; direct: number };
}

const SOURCE_KEYS = ["nfc", "qr", "direct"] as const;
const SOURCE_LABELS: Record<string, string> = { nfc: "NFC Tap", qr: "QR Scan", direct: "Direct Link" };
const TITLE_INFO = "How visitors arrived at your profile: physical NFC tap, QR code scan, or direct URL. Helps you measure which channel drives the most reach.";

export function ConnectionSourceChart({ sources }: ConnectionSourceChartProps) {
  const { colors } = useChartPalette();
  const data = SOURCE_KEYS
    .map((key, i) => ({ name: SOURCE_LABELS[key], value: sources[key], color: colors[i % colors.length] }))
    .filter((d) => d.value > 0);

  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <Card className="glass-card animate-fade-in">
        <CardHeader className="pb-2">
          <ChartTitleWithInfo
            icon={<Wifi className="w-4 h-4" />}
            title="Connection Source"
            info={TITLE_INFO}
          />
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-xs text-muted-foreground">No source data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-2">
        <ChartTitleWithInfo
          icon={<Wifi className="w-4 h-4" />}
          title="Connection Source"
          info={TITLE_INFO}
        />
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value" stroke="none">
              {data.map((entry, i) => (
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
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", color: "hsl(var(--foreground))" }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
