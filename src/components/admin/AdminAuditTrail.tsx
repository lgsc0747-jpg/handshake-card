import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { History, Loader2 } from "lucide-react";

interface AuditEntry {
  id: string;
  admin_user_id: string;
  action: string;
  target_user_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  actor: { display_name: string | null; username: string | null; email_public: string | null } | null;
  target: { display_name: string | null; username: string | null; email_public: string | null } | null;
}

const ACTION_LABEL: Record<string, { label: string; tone: string }> = {
  grant_admin: { label: "Granted Admin", tone: "text-emerald-500 border-emerald-500/40" },
  revoke_admin: { label: "Revoked Admin", tone: "text-amber-500 border-amber-500/40" },
  update_plan: { label: "Plan Updated", tone: "text-primary border-primary/40" },
  clear_lockout: { label: "Lockout Cleared", tone: "text-blue-500 border-blue-500/40" },
};

function formatActor(p: AuditEntry["actor"]) {
  if (!p) return "Unknown";
  return p.display_name || p.username || p.email_public || "Unknown";
}

export function AdminAuditTrail() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-manage", {
      body: { action: "list_audit_log", limit: 100 },
    });
    if (error || (data as any)?.error) {
      toast({
        title: "Error",
        description: (data as any)?.error ?? "Failed to load audit trail",
        variant: "destructive",
      });
      setEntries([]);
    } else {
      setEntries((data as any).entries ?? []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-display flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          Admin Audit Trail
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            No admin actions recorded yet.
          </p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Actor</TableHead>
                  <TableHead className="text-xs">Action</TableHead>
                  <TableHead className="text-xs">Target</TableHead>
                  <TableHead className="text-xs">Details</TableHead>
                  <TableHead className="text-xs">IP</TableHead>
                  <TableHead className="text-xs">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => {
                  const meta =
                    ACTION_LABEL[e.action] ?? {
                      label: e.action,
                      tone: "text-muted-foreground border-border",
                    };
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm font-medium">
                        {formatActor(e.actor)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={meta.tone}>
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {e.target ? formatActor(e.target) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono max-w-[180px] truncate">
                        {e.details && Object.keys(e.details).length
                          ? JSON.stringify(e.details)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {e.ip_address ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(e.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
