import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Lock, Loader2, Trash2 } from "lucide-react";

interface Lockout {
  id: string;
  email: string;
  ip_address: string | null;
  locked_until: string;
  reason: string | null;
  created_at: string;
}

export function AdminLockouts() {
  const { toast } = useToast();
  const [lockouts, setLockouts] = useState<Lockout[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearingEmail, setClearingEmail] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-manage", {
      body: { action: "list_lockouts" },
    });
    if (error || (data as any)?.error) {
      toast({
        title: "Error",
        description: (data as any)?.error ?? "Failed to load lockouts",
        variant: "destructive",
      });
      setLockouts([]);
    } else {
      setLockouts((data as any).lockouts ?? []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const clear = async (email: string) => {
    setClearingEmail(email);
    const { error, data } = await supabase.functions.invoke("admin-manage", {
      body: { action: "clear_lockout", email },
    });
    if (error || (data as any)?.error) {
      toast({
        title: "Error",
        description: (data as any)?.error ?? "Failed to clear lockout",
        variant: "destructive",
      });
    } else {
      toast({ title: "Lockout cleared", description: email });
      load();
    }
    setClearingEmail(null);
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-display flex items-center gap-2">
          <Lock className="w-4 h-4 text-destructive" />
          Active Lockouts
          <Badge variant="outline" className="ml-1 text-xs">
            Super-admin
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : lockouts.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            No accounts are currently locked.
          </p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">IP</TableHead>
                  <TableHead className="text-xs">Reason</TableHead>
                  <TableHead className="text-xs">Locked Until</TableHead>
                  <TableHead className="text-xs text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lockouts.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm font-medium">{l.email}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {l.ip_address ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {l.reason ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(l.locked_until).toLocaleTimeString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        disabled={clearingEmail === l.email}
                        onClick={() => clear(l.email)}
                      >
                        {clearingEmail === l.email ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3 mr-1" />
                        )}
                        Clear
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
