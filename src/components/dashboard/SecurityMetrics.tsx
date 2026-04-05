import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ShieldCheck, ShieldAlert, UserPlus } from "lucide-react";

interface SecurityMetricsProps {
  authSuccessRate: number;
  leadGenCount: number;
  unauthorizedAttempts: number;
}

export function SecurityMetrics({ authSuccessRate, leadGenCount, unauthorizedAttempts }: SecurityMetricsProps) {
  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-sm flex items-center gap-2">
          <Shield className="w-4 h-4" /> Security & Privacy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-muted-foreground">Auth Success Rate</span>
          </div>
          <span className="font-display font-bold text-lg">
            {authSuccessRate > 0 ? `${authSuccessRate}%` : "—"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <UserPlus className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Leads Captured</span>
          </div>
          <span className="font-display font-bold text-lg">{leadGenCount}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <ShieldAlert className="w-4 h-4 text-destructive" />
            <span className="text-muted-foreground">Unauthorized Attempts</span>
          </div>
          <span className="font-display font-bold text-lg">{unauthorizedAttempts}</span>
        </div>
      </CardContent>
    </Card>
  );
}
