import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShieldCheck, User } from "lucide-react";

interface DestinationPickerProps {
  email?: string | null;
}

export function DestinationPicker({ email }: DestinationPickerProps) {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-fade-in">
      <Card className="w-full max-w-2xl glass-elevated p-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="font-display text-2xl font-bold">Where to?</h2>
          <p className="text-sm text-muted-foreground">
            {email ? <>Signed in as <span className="text-foreground font-medium">{email}</span>.</> : null}{" "}
            Pick a starting view — you can switch anytime from the sidebar.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <button
            onClick={() => navigate("/")}
            className="group glass-card p-6 rounded-2xl text-left transition-all hover:scale-[1.02] hover:border-primary/50 border border-transparent"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
              <User className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-base mb-1">Continue as User</h3>
            <p className="text-xs text-muted-foreground">
              Personal dashboard, profiles, NFC cards, and analytics.
            </p>
          </button>

          <button
            onClick={() => navigate("/admin")}
            className="group glass-card p-6 rounded-2xl text-left transition-all hover:scale-[1.02] hover:border-amber-500/50 border border-transparent"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3 group-hover:bg-amber-500/20 transition-colors">
              <ShieldCheck className="w-6 h-6 text-amber-500" />
            </div>
            <h3 className="font-display font-semibold text-base mb-1">Continue as Admin</h3>
            <p className="text-xs text-muted-foreground">
              User management, audit log, lockouts, and platform settings.
            </p>
          </button>
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          Tip: A view switcher will appear in your sidebar so you can flip without re-authenticating.
        </p>
      </Card>
    </div>
  );
}
