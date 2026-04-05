import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Wifi } from "lucide-react";

interface ConnectionSourceChartProps {
  sources: { nfc: number; qr: number; direct: number };
}

const SOURCE_DATA = [
  { key: "nfc", label: "NFC Tap", color: "#0d9488" },
  { key: "qr", label: "QR Scan", color: "#3b82f6" },
  { key: "direct", label: "Direct Link", color: "#8b5cf6" },
] as const;

export function ConnectionSourceChart({ sources }: ConnectionSourceChartProps) {
  const data = SOURCE_DATA
    .map((s) => ({ name: s.label, value: sources[s.key], color: s.color }))
    .filter((d) => d.value > 0);

  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <Card className="glass-card animate-fade-in">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm flex items-center gap-2">
            <Wifi className="w-4 h-4" /> Connection Source
          </CardTitle>
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
        <CardTitle className="font-display text-sm flex items-center gap-2">
          <Wifi className="w-4 h-4" /> Connection Source
        </CardTitle>
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
              }}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
