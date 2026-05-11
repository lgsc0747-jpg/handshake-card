import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Target, Trash2, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, isPast } from "date-fns";

interface Props { orgId: string; }
interface Goal {
  id: string; title: string; description: string | null; due_at: string | null;
  persona_id: string | null; assignee_user_id: string | null; created_by: string;
  is_archived: boolean;
}
interface Item { id: string; goal_id: string; label: string; is_done: boolean; sort_order: number; }
interface Member { user_id: string; display_name: string | null; username: string | null; avatar_url: string | null; }
interface Persona { id: string; label: string; }

export function AgencyGoals({ orgId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);

  // Create form
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [personaId, setPersonaId] = useState<string>("none");
  const [assignee, setAssignee] = useState<string>("none");
  const [initialItems, setInitialItems] = useState<string>("");
  const [creating, setCreating] = useState(false);

  // New item input
  const [newItemLabel, setNewItemLabel] = useState("");

  const load = useCallback(async () => {
    const [g, i, m, p] = await Promise.all([
      supabase.from("agency_goals").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }),
      supabase.from("agency_goal_items").select("*").order("sort_order"),
      supabase.rpc("get_org_member_profiles", { _org_id: orgId }),
      supabase.from("personas").select("id, label"),
    ]);
    setGoals((g.data ?? []) as Goal[]);
    setItems((i.data ?? []) as Item[]);
    setMembers((m.data ?? []) as Member[]);
    setPersonas((p.data ?? []) as Persona[]);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const itemsFor = (goalId: string) => items.filter((x) => x.goal_id === goalId);
  const memberById = (id: string | null) => id ? members.find((m) => m.user_id === id) : undefined;

  const createGoal = async () => {
    if (!title.trim()) return;
    setCreating(true);
    const { data: g, error } = await supabase.from("agency_goals").insert({
      organization_id: orgId, title: title.trim(), description: desc.trim() || null,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      persona_id: personaId === "none" ? null : personaId,
      assignee_user_id: assignee === "none" ? null : assignee,
      created_by: user!.id,
    }).select().single();
    if (error) { setCreating(false); return toast({ title: "Failed", description: error.message, variant: "destructive" }); }

    const lines = initialItems.split("\n").map((s) => s.trim()).filter(Boolean);
    if (lines.length > 0) {
      await supabase.from("agency_goal_items").insert(lines.map((label, idx) => ({
        goal_id: g.id, label, sort_order: idx,
      })));
    }
    await supabase.from("agency_activity").insert({
      organization_id: orgId, actor_user_id: user!.id, verb: "goal_created",
      target_type: "goal", target_id: g.id, summary: `created goal "${title.trim()}"`,
    });
    setCreating(false); setCreateOpen(false);
    setTitle(""); setDesc(""); setDueAt(""); setPersonaId("none"); setAssignee("none"); setInitialItems("");
    toast({ title: "Goal created" });
    load();
  };

  const toggleItem = async (item: Item) => {
    const next = !item.is_done;
    await supabase.from("agency_goal_items").update({
      is_done: next, done_at: next ? new Date().toISOString() : null, done_by: next ? user!.id : null,
    }).eq("id", item.id);
    setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, is_done: next } : x));
    if (next) {
      await supabase.from("agency_activity").insert({
        organization_id: orgId, actor_user_id: user!.id, verb: "checklist_done",
        target_type: "goal_item", target_id: item.id, summary: `completed "${item.label}"`,
      });
    }
  };

  const addItem = async (goalId: string) => {
    if (!newItemLabel.trim()) return;
    const max = Math.max(0, ...items.filter((i) => i.goal_id === goalId).map((i) => i.sort_order));
    await supabase.from("agency_goal_items").insert({ goal_id: goalId, label: newItemLabel.trim(), sort_order: max + 1 });
    setNewItemLabel("");
    load();
  };

  const archiveGoal = async (goalId: string) => {
    await supabase.from("agency_goals").update({ is_archived: true }).eq("id", goalId);
    setActiveGoal(null);
    load();
  };

  const active = goals.filter((g) => !g.is_archived);
  const archived = goals.filter((g) => g.is_archived);

  const renderGoal = (g: Goal) => {
    const its = itemsFor(g.id);
    const done = its.filter((i) => i.is_done).length;
    const pct = its.length ? Math.round((done / its.length) * 100) : 0;
    const a = memberById(g.assignee_user_id);
    return (
      <Card key={g.id} className="hover:border-primary/40 transition-colors cursor-pointer" onClick={() => setActiveGoal(g)}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="font-medium leading-tight">{g.title}</div>
            {g.due_at && (
              <Badge variant={isPast(new Date(g.due_at)) && pct < 100 ? "destructive" : "outline"} className="text-[10px]">
                {format(new Date(g.due_at), "MMM d")}
              </Badge>
            )}
          </div>
          {g.description && <p className="text-xs text-muted-foreground line-clamp-2">{g.description}</p>}
          <div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-muted-foreground">{done}/{its.length} done</span>
              {a && (
                <Avatar className="h-5 w-5"><AvatarImage src={a.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[8px]">{(a.display_name || "?").slice(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold inline-flex items-center gap-2"><Target className="w-4 h-4" /> Goals</h2>
          <p className="text-sm text-muted-foreground">{active.length} active · {archived.length} archived</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-1.5" />New goal</Button>
      </div>

      {active.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No active goals yet.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{active.map(renderGoal)}</div>
      )}

      {archived.length > 0 && (
        <details className="mt-4">
          <summary className="text-sm text-muted-foreground cursor-pointer">Archived ({archived.length})</summary>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3 opacity-70">{archived.map(renderGoal)}</div>
        </details>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New goal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Reach 100 leads in Q1" /></div>
            <div><Label>Description (optional)</Label><Textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Due</Label><Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></div>
              <div>
                <Label>Assignee</Label>
                <Select value={assignee} onValueChange={setAssignee}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Anyone</SelectItem>
                    {members.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.display_name || m.username}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Persona (optional)</Label>
              <Select value={personaId} onValueChange={setPersonaId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Workspace-wide</SelectItem>
                  {personas.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Checklist (one per line)</Label>
              <Textarea rows={4} value={initialItems} onChange={(e) => setInitialItems(e.target.value)} placeholder={"Draft outreach\nSend follow-up\nClose deal"} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createGoal} disabled={creating || !title.trim()}>
              {creating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Goal detail dialog */}
      <Dialog open={!!activeGoal} onOpenChange={(o) => !o && setActiveGoal(null)}>
        <DialogContent className="max-w-lg">
          {activeGoal && (
            <>
              <DialogHeader>
                <DialogTitle>{activeGoal.title}</DialogTitle>
                {activeGoal.description && <p className="text-sm text-muted-foreground">{activeGoal.description}</p>}
              </DialogHeader>
              <div className="space-y-2">
                {itemsFor(activeGoal.id).map((it) => (
                  <label key={it.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/40 cursor-pointer">
                    <Checkbox checked={it.is_done} onCheckedChange={() => toggleItem(it)} />
                    <span className={it.is_done ? "line-through text-muted-foreground text-sm" : "text-sm"}>{it.label}</span>
                  </label>
                ))}
                <div className="flex gap-2 pt-2">
                  <Input placeholder="Add a checklist item" value={newItemLabel}
                    onChange={(e) => setNewItemLabel(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addItem(activeGoal.id)} />
                  <Button size="sm" onClick={() => addItem(activeGoal.id)}><Plus className="w-4 h-4" /></Button>
                </div>
              </div>
              <DialogFooter className="!justify-between">
                <Button variant="ghost" size="sm" onClick={() => archiveGoal(activeGoal.id)}>
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Archive
                </Button>
                <Button variant="outline" size="sm" onClick={() => setActiveGoal(null)}><X className="w-4 h-4 mr-1" />Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
