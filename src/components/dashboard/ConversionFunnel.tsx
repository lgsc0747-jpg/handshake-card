import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Filter } from "lucide-react";
import { useChartPalette } from "@/components/dashboard/ChartPaletteSelector";

interface ConversionFunnelProps {
  profileViews: number;
  cardFlips: number;
  linkClicks: number;
  vcardDownloads: number;
}

export function ConversionFunnel({ profileViews, cardFlips, linkClicks, vcardDownloads }: ConversionFunnelProps) {
  const steps = [
    { label: "Profile Views", value: profileViews, color: "hsl(var(--primary))" },
    { label: "Card Flips", value: cardFlips, color: "hsl(180, 60%, 50%)" },
    { label: "Link Clicks", value: linkClicks, color: "hsl(200, 70%, 50%)" },
    { label: "Contact Saves", value: vcardDownloads, color: "hsl(262, 60%, 55%)" },
  ];

  const maxVal = Math.max(...steps.map((s) => s.value), 1);

  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-sm flex items-center gap-2">
          <Filter className="w-4 h-4" /> Conversion Funnel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step, i) => {
          const widthPct = Math.max((step.value / maxVal) * 100, 8);
          const rate = i > 0 && steps[i - 1].value > 0
            ? Math.round((step.value / steps[i - 1].value) * 100)
            : null;

          return (
            <div key={step.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{step.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold">{step.value.toLocaleString()}</span>
                  {rate !== null && (
                    <span className="text-[10px] text-muted-foreground">({rate}%)</span>
                  )}
                </div>
              </div>
              <div className="h-6 w-full rounded bg-muted/50 overflow-hidden">
                <div
                  className="h-full rounded transition-all duration-500 flex items-center justify-end pr-2"
                  style={{ width: `${widthPct}%`, backgroundColor: step.color }}
                >
                  {widthPct > 20 && (
                    <span className="text-[10px] font-medium text-primary-foreground">
                      {step.value}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
