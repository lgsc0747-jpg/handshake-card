import { useDashboardTheme, DASHBOARD_THEMES, type DashboardTheme } from "@/contexts/DashboardThemeContext";
import { Check, Paintbrush } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function DashboardThemeSwitcher() {
  const { theme, setTheme } = useDashboardTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Paintbrush className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
          Dashboard Theme
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(Object.entries(DASHBOARD_THEMES) as [DashboardTheme, typeof DASHBOARD_THEMES[DashboardTheme]][]).map(
          ([key, cfg]) => (
            <DropdownMenuItem
              key={key}
              onClick={() => setTheme(key)}
              className="flex items-center gap-3 cursor-pointer"
            >
              <span
                className="w-3 h-3 rounded-full shrink-0 border border-border"
                style={{ background: cfg.preview }}
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{cfg.label}</span>
                <p className="text-[10px] text-muted-foreground truncate">{cfg.description}</p>
              </div>
              {theme === key && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
            </DropdownMenuItem>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
