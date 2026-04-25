import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Eye } from "lucide-react";

export interface ChartOption {
  key: string;
  label: string;
}

interface ChartVisibilityManagerProps {
  /** Section -> ordered options */
  sections: { title: string; options: ChartOption[] }[];
  /** Current visibility map keyed by chart id */
  visibility: Record<string, boolean>;
  onChange: (key: string, visible: boolean) => void;
}

export function ChartVisibilityManager({ sections, visibility, onChange }: ChartVisibilityManagerProps) {
  const totalVisible = Object.values(visibility).filter(Boolean).length;
  const totalCount = sections.reduce((s, sec) => s + sec.options.length, 0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-[10px] sm:text-xs gap-1.5">
          <Eye className="w-3 h-3" />
          Charts ({totalVisible}/{totalCount})
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0 max-h-[70vh] overflow-y-auto">
        <div className="p-3 border-b border-border">
          <p className="text-xs font-display font-semibold">Visible Charts</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Toggle which cards appear on your dashboard.
          </p>
        </div>
        <div className="p-2 space-y-3">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="px-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.options.map((opt) => (
                  <label
                    key={opt.key}
                    className="flex items-center justify-between gap-3 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <span className="text-xs truncate">{opt.label}</span>
                    <Switch
                      checked={visibility[opt.key] ?? true}
                      onCheckedChange={(c) => onChange(opt.key, c)}
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
