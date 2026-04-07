import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Timeframe } from "@/hooks/useNfcData";

const TIMEFRAMES: { label: string; value: Timeframe }[] = [
  { label: "30m", value: "thirtymin" },
  { label: "24h", value: "daily" },
  { label: "7d", value: "weekly" },
  { label: "30d", value: "monthly" },
  { label: "90d", value: "quarterly" },
];

interface TimeframeSelectorProps {
  value: Timeframe;
  onChange: (t: Timeframe) => void;
}

export function TimeframeSelector({ value, onChange }: TimeframeSelectorProps) {
  return (
    <div className="flex gap-1">
      {TIMEFRAMES.map((t) => (
        <Button
          key={t.value}
          size="sm"
          variant={value === t.value ? "default" : "ghost"}
          className={cn("h-7 text-xs px-2.5", value === t.value && "gradient-primary text-primary-foreground")}
          onClick={() => onChange(t.value)}
        >
          {t.label}
        </Button>
      ))}
    </div>
  );
}
