import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LifeBuoy, Loader2, MessageSquare } from "lucide-react";

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  admin_notes: string | null;
  created_at: string;
  user: {
    display_name: string | null;
    username: string | null;
    email_public: string | null;
  } | null;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  in_progress: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  resolved: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  closed: "bg-muted text-muted-foreground border-border",
};

export function AdminSupportTickets() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Ticket | null>(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("open");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-manage", {
      body: { action: "list_support_tickets", status: filter },
    });
    if (error) {
      toast({ title: "Error", description: "Failed to load tickets", variant: "destructive" });
    } else {
      setTickets(((data as any)?.tickets ?? []) as Ticket[]);
    }
    setLoading(false);
  }, [filter, toast]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (t: Ticket) => {
    setEditing(t);
    setNotes(t.admin_notes ?? "");
    setStatus(t.status);
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase.functions.invoke("admin-manage", {
      body: { action: "update_support_ticket", ticket_id: editing.id, status, admin_notes: notes },
    });
    setSaving(false);
    if (error) {
      toast({ title: "Failed", description: "Could not save", variant: "destructive" });
      return;
    }
    toast({ title: "Updated", description: "Ticket saved." });
    setEditing(null);
    load();
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-display flex items-center gap-2">
          <LifeBuoy className="w-4 h-4 text-primary" />
          Support Tickets
        </CardTitle>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : tickets.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No tickets in this view.</p>
        ) : (
          <ul className="space-y-2">
            {tickets.map((t) => (
              <li
                key={t.id}
                className="rounded-lg border border-border p-3 hover:bg-muted/40 cursor-pointer transition"
                onClick={() => openEdit(t)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.user?.display_name ?? t.user?.username ?? "User"}
                      {" · "}
                      {new Date(t.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className={STATUS_COLORS[t.status] ?? ""}>{t.status.replace("_", " ")}</Badge>
                    {t.priority === "high" && <Badge variant="destructive" className="text-[10px]">High</Badge>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> {editing?.subject}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                From {editing.user?.display_name ?? "User"} · {new Date(editing.created_at).toLocaleString()}
              </p>
              <div className="rounded-lg border border-border p-3 bg-muted/30 text-sm whitespace-pre-wrap">
                {editing.message}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Reply / internal notes (visible to user)</label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="gradient-primary text-primary-foreground">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
