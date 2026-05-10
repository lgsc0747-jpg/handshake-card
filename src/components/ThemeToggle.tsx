import { Moon, Sun, MonitorSmartphone, Check } from "lucide-react";
import { useDashboardTheme, type ColorMode } from "@/contexts/DashboardThemeContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const OPTIONS: { value: ColorMode; label: string; icon: React.ElementType }[] = [
  { value: "light",  label: "Light",  icon: Sun },
  { value: "dark",   label: "Dark",   icon: Moon },
  { value: "system", label: "System", icon: MonitorSmartphone },
];

interface Props {
  className?: string;
  align?: "start" | "end" | "center";
}

export function ThemeToggle({ className, align = "end" }: Props) {
  const { colorMode, setColorMode, resolvedColorMode } = useDashboardTheme();
  const ActiveIcon = resolvedColorMode === "dark" ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={"h-8 w-8 text-muted-foreground hover:text-foreground " + (className ?? "")}
          aria-label="Toggle theme"
          title="Theme"
        >
          <ActiveIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-36">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setColorMode(value)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="flex-1 text-sm">{label}</span>
            {colorMode === value && <Check className="w-3.5 h-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
