import { Lock, Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface UpgradePromptProps {
  feature: string;
  description?: string;
  compact?: boolean;
  className?: string;
}

export function UpgradePrompt({ feature, description, compact, className = "" }: UpgradePromptProps) {
  const navigate = useNavigate();

  if (compact) {
    return (
      <button
        onClick={() => navigate("/plans")}
        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors ${className}`}
      >
        <Crown className="w-3 h-3" />
        Pro
      </button>
    );
  }

  return (
    <div className={`relative rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
          <Lock className="w-4 h-4 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{feature}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => navigate("/plans")}
          className="bg-amber-500 hover:bg-amber-600 text-white shrink-0"
        >
          <Crown className="w-3 h-3 mr-1" />
          Upgrade
          <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </div>
    </div>
  );
}

export function UpgradeOverlay({ feature, description, children, className = "" }: UpgradePromptProps & { children: React.ReactNode }) {
  const navigate = useNavigate();

  return (
    <div className={`relative ${className}`}>
      <div className="opacity-40 pointer-events-none select-none blur-[1px]">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm rounded-lg">
        <div className="text-center space-y-3 p-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{feature}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <Button
            size="sm"
            onClick={() => navigate("/plans")}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            <Crown className="w-3 h-3 mr-1" />
            Upgrade to Pro
          </Button>
        </div>
      </div>
    </div>
  );
}
