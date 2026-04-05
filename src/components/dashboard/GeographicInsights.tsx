import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { useChartPalette } from "@/components/dashboard/ChartPaletteSelector";

interface RegionData {
  region: string;
  count: number;
}

interface GeographicInsightsProps {
  data: RegionData[];
}

export function GeographicInsights({ data }: GeographicInsightsProps) {
  const colors = useChartPalette();
  const total = data.reduce((s, d) => s + d.count, 0);
  const sorted = [...data].sort((a, b) => b.count - a.count).slice(0, 8);

  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-sm flex items-center gap-2">
          <MapPin className="w-4 h-4" /> Visitor Regions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No geographic data yet</p>
        ) : (
          <div className="space-y-2.5">
            {sorted.map((item, i) => {
              const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
              return (
                <div key={item.region} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium truncate">{item.region}</span>
                    <span className="text-muted-foreground ml-2 shrink-0">
                      {item.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: colors[i % colors.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
