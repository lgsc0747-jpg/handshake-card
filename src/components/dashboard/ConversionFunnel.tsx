import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Filter } from "lucide-react";
import { useChartPalette } from "@/components/dashboard/ChartPaletteSelector";
import { ChartTitleWithInfo } from "@/components/dashboard/ChartTitleWithInfo";

interface ConversionFunnelProps {
  profileViews: number;
  cardFlips: number;
  linkClicks: number;
  vcardDownloads: number;
}

export function ConversionFunnel({ profileViews, cardFlips, linkClicks, vcardDownloads }: ConversionFunnelProps) {
  const { colors } = useChartPalette();
  const steps = [
    { label: "Profile Views", value: profileViews, color: colors[0] },
    { label: "Card Flips", value: cardFlips, color: colors[1] },
    { label: "Link Clicks", value: linkClicks, color: colors[2] ?? colors[0] },
    { label: "Contact Saves", value: vcardDownloads, color: colors[3] ?? colors[1] },
  ];

  const maxVal = Math.max(...steps.map((s) => s.value), 1);

  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-2">
        <ChartTitleWithInfo
          icon={<Filter className="w-4 h-4" />}
          title="Conversion Funnel"
          info="Visitor journey from landing on your profile down to saving your contact. The percentage shows how many people made it from the previous step — drop-offs reveal where you lose attention."
        />
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
