import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock } from "lucide-react";
import { ChartTitleWithInfo } from "@/components/dashboard/ChartTitleWithInfo";

interface HourlyHeat {
  day: string;
  hour: number;
  count: number;
}

interface ActivityHeatmapProps {
  data: HourlyHeat[];
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const getCount = (day: string, hour: number) =>
    data.find((d) => d.day === day && d.hour === hour)?.count ?? 0;

  const getOpacity = (count: number) => {
    if (count === 0) return 0.05;
    return 0.15 + (count / maxCount) * 0.85;
  };

  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-2">
        <ChartTitleWithInfo
          icon={<Clock className="w-4 h-4" />}
          title="Peak Activity Hours"
          info="A 7-day × 24-hour grid where darker cells mean more interactions in that hour. Spot the days and times your card is tapped most."
        />
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[500px]">
            {/* Hour labels */}
            <div className="flex gap-[2px] mb-1 ml-10">
              {HOURS.filter((h) => h % 3 === 0).map((h) => (
                <span
                  key={h}
                  className="text-[9px] text-muted-foreground"
                  style={{ width: `${(100 / 8)}%`, textAlign: "center" }}
                >
                  {h.toString().padStart(2, "0")}
                </span>
              ))}
            </div>
            {/* Grid */}
            {DAYS.map((day) => (
              <div key={day} className="flex items-center gap-1 mb-[2px]">
                <span className="text-[10px] text-muted-foreground w-8 text-right shrink-0">{day}</span>
                <div className="flex gap-[2px] flex-1">
                  <TooltipProvider delayDuration={100}>
                    {HOURS.map((hour) => {
                      const count = getCount(day, hour);
                      return (
                        <Tooltip key={hour}>
                          <TooltipTrigger asChild>
                            <div
                              className="flex-1 aspect-square rounded-sm cursor-default min-w-[14px] max-w-[20px]"
                              style={{
                                backgroundColor: `hsl(var(--primary))`,
                                opacity: getOpacity(count),
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {day} {hour}:00 — {count} tap{count !== 1 ? "s" : ""}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </TooltipProvider>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
