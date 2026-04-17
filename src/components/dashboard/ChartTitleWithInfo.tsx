import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChartTitleWithInfoProps {
  icon?: React.ReactNode;
  title: string;
  info: string;
  className?: string;
}

/**
 * Renders a chart card title with a small (i) icon that explains, on hover,
 * what the metric means and how it's calculated.
 */
export function ChartTitleWithInfo({ icon, title, info, className }: ChartTitleWithInfoProps) {
  return (
    <CardTitle className={cn("font-display text-sm flex items-center gap-2", className)}>
      {icon}
      <span>{title}</span>
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center justify-center text-muted-foreground/70 hover:text-foreground transition-colors cursor-help"
              aria-label={`What is ${title}?`}
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed">
            {info}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </CardTitle>
  );
}
