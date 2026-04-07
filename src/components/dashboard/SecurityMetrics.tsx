import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ShieldCheck, ShieldAlert, UserPlus, Clock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SecurityMetricsProps {
  authSuccessRate: number;
  leadGenCount: number;
  unauthorizedAttempts: number;
  avgDwellTime: number;
}

function MetricRow({ icon, label, value, tooltip }: { icon: React.ReactNode; label: string; value: string; tooltip: string }) {
  return (
    <div className="flex items-center justify-between">
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 text-sm cursor-help">
              {icon}
              <span className="text-muted-foreground">{label}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-[220px] text-xs">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <span className="font-display font-bold text-lg">{value}</span>
    </div>
  );
}

export function SecurityMetrics({ authSuccessRate, leadGenCount, unauthorizedAttempts, avgDwellTime }: SecurityMetricsProps) {
  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-sm flex items-center gap-2">
          <Shield className="w-4 h-4" /> Security & Privacy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <MetricRow
          icon={<ShieldCheck className="w-4 h-4 text-emerald-500" />}
          label="PIN Success Rate"
          value={authSuccessRate > 0 ? `${authSuccessRate}%` : "—"}
          tooltip="Percentage of correct PIN entries on your private personas. Only counts when Private Mode is enabled."
        />
        <MetricRow
          icon={<ShieldAlert className="w-4 h-4 text-destructive/80" />}
          label="Failed PIN Attempts"
          value={unauthorizedAttempts.toString()}
          tooltip="Number of incorrect or blocked PIN entry attempts on your private personas."
        />
        <MetricRow
          icon={<UserPlus className="w-4 h-4 text-primary" />}
          label="Leads Captured"
          value={leadGenCount.toString()}
          tooltip="Contacts collected via the Digital Handshake contact-exchange gate."
        />
        <MetricRow
          icon={<Clock className="w-4 h-4 text-primary/70" />}
          label="Avg. Dwell Time"
          value={avgDwellTime > 0 ? `${avgDwellTime}s` : "—"}
          tooltip="Average seconds visitors spend on your public profile before leaving."
        />
      </CardContent>
    </Card>
  );
}
