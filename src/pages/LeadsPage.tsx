import { useState, useEffect, useMemo, useCallback } from "react";
import { format } from "date-fns";
import {
  DndContext, PointerSensor, TouchSensor, useSensor, useSensors,
  closestCorners, type DragEndEvent, useDraggable, useDroppable,
  DragOverlay,
} from "@dnd-kit/core";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Page, PageHeader, PageSection } from "@/components/layout/Page";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Mail, User, Phone, Building2, MessageSquare, Loader2, Download,
  Search, Calendar as CalIcon, Tag as TagIcon, Plus, X, Flame, Snowflake,
  Sparkles, KanbanSquare, Table as TableIcon, Send, StickyNote,
  ChevronRight, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CommEntry {
  id: string;
  channel: "email" | "call" | "meeting" | "note";
  body: string;
  at: string;
}

interface Lead {
  id: string;
  visitor_name: string | null;
  visitor_email: string;
  visitor_phone: string | null;
  visitor_company: string | null;
  visitor_message: string | null;
  created_at: string;
  persona_id: string;
  stage: Stage;
  tags: string[];
  next_action_at: string | null;
  notes: string | null;
  communications: CommEntry[];
}

type Stage = "new" | "contacted" | "qualified" | "meeting" | "won" | "lost";
type Temp = "hot" | "warm" | "cold";

const STAGES: { id: Stage; label: string }[] = [
  { id: "new",       label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "qualified", label: "Qualified" },
  { id: "meeting",   label: "Meeting" },
  { id: "won",       label: "Won" },
  { id: "lost",      label: "Lost" },
];

// ────────────────────────────────────────────────────────
// Heuristic lead temperature (rules — fast, deterministic)
// ────────────────────────────────────────────────────────
function scoreLead(l: Lead): { temp: Temp; score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  const ageDays = (Date.now() - new Date(l.created_at).getTime()) / 86400000;

  if (ageDays <= 3) { score += 25; reasons.push("Fresh (<3d)"); }
  else if (ageDays <= 14) { score += 10; reasons.push("Recent (<14d)"); }
  else if (ageDays > 45) { score -= 20; reasons.push("Stale (>45d)"); }

  if (l.visitor_phone) { score += 15; reasons.push("Phone provided"); }
  if (l.visitor_company) { score += 10; reasons.push("Company"); }
  if ((l.visitor_message?.length ?? 0) > 60) { score += 15; reasons.push("Detailed message"); }

  if (l.stage === "qualified" || l.stage === "meeting") { score += 25; reasons.push(`Stage: ${l.stage}`); }
  if (l.stage === "won") { score += 40; reasons.push("Won"); }
  if (l.stage === "lost") { score -= 40; reasons.push("Lost"); }

  if (l.next_action_at) {
    const upcoming = new Date(l.next_action_at).getTime() - Date.now();
    if (upcoming > 0 && upcoming < 7 * 86400000) { score += 20; reasons.push("Upcoming action"); }
  }

  const commCount = (l.communications ?? []).length;
  if (commCount >= 3) { score += 15; reasons.push(`${commCount} touchpoints`); }
  else if (commCount === 0 && ageDays > 7) { score -= 10; reasons.push("No follow-up"); }

  if ((l.tags ?? []).length > 0) { score += 5; }

  const temp: Temp = score >= 50 ? "hot" : score >= 20 ? "warm" : "cold";
  return { temp, score, reasons };
}

const tempStyles: Record<Temp, { dot: string; chip: string; label: string; icon: any }> = {
  hot:  { dot: "bg-[hsl(var(--accent))]", chip: "bg-accent text-accent-foreground border-transparent", label: "Hot",  icon: Flame },
  warm: { dot: "bg-warning",              chip: "bg-warning/15 text-warning border-warning/30",        label: "Warm", icon: Sparkles },
  cold: { dot: "bg-muted-foreground/40",  chip: "bg-muted text-muted-foreground border-border",        label: "Cold", icon: Snowflake },
};

// ────────────────────────────────────────────────────────

const LeadsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tempFilter, setTempFilter] = useState<"all" | Temp>("all");
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Lead | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("lead_captures")
      .select("*")
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setLeads(((data ?? []) as any[]).map((l) => ({
          ...l,
          communications: Array.isArray(l.communications) ? l.communications : [],
        })) as Lead[]);
        setLoading(false);
      });

    const channel = supabase
      .channel("leads-realtime")
      .on("postgres_changes", {
        event: "*", schema: "public", table: "lead_captures",
        filter: `owner_user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.eventType === "INSERT") {
          setLeads((prev) => [payload.new as Lead, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setLeads((prev) => prev.map((l) => l.id === (payload.new as Lead).id ? { ...l, ...(payload.new as Lead) } : l));
        } else if (payload.eventType === "DELETE") {
          setLeads((prev) => prev.filter((l) => l.id !== (payload.old as Lead).id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const enriched = useMemo(
    () => leads.map((l) => ({ lead: l, ...scoreLead(l) })),
    [leads],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter(({ lead, temp }) => {
      const matchesQ = !q ||
        (lead.visitor_name ?? "").toLowerCase().includes(q) ||
        lead.visitor_email.toLowerCase().includes(q) ||
        (lead.visitor_company ?? "").toLowerCase().includes(q) ||
        (lead.visitor_message ?? "").toLowerCase().includes(q);
      const matchesTemp = tempFilter === "all" || temp === tempFilter;
      return matchesQ && matchesTemp;
    });
  }, [enriched, search, tempFilter]);

  const grouped = useMemo(() => {
    const g: Record<Stage, typeof filtered> = { new: [], contacted: [], qualified: [], meeting: [], won: [], lost: [] };
    filtered.forEach((row) => g[row.lead.stage ?? "new"].push(row));
    return g;
  }, [filtered]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );

  const updateLead = useCallback(async (id: string, patch: Partial<Lead>) => {
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, ...patch } as Lead : l));
    const { error } = await supabase.from("lead_captures").update(patch as any).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
  }, [toast]);

  const bulkMove = useCallback(async (ids: string[], stage: Stage) => {
    setLeads((prev) => prev.map((l) => ids.includes(l.id) ? { ...l, stage } : l));
    const { error } = await supabase.from("lead_captures").update({ stage }).in("id", ids);
    if (error) toast({ title: "Bulk update failed", description: error.message, variant: "destructive" });
    else toast({ title: `Moved ${ids.length} lead${ids.length > 1 ? "s" : ""}`, description: `→ ${stage}` });
  }, [toast]);

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveDragId(null);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId || !overId.startsWith("col:")) return;
    const newStage = overId.slice(4) as Stage;
    const draggedId = String(e.active.id);
    const ids = selected.has(draggedId) && selected.size > 1 ? Array.from(selected) : [draggedId];
    await bulkMove(ids, newStage);
    if (selected.size > 1) setSelected(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const exportLeadsXLSX = async () => {
    if (leads.length === 0) return;
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Leads");
    ws.addRow(["Date", "Name", "Email", "Phone", "Company", "Stage", "Temperature", "Score", "Tags", "Next action", "Message", "Notes"]);
    enriched.forEach(({ lead, temp, score }) => {
      ws.addRow([
        format(new Date(lead.created_at), "yyyy-MM-dd HH:mm"),
        lead.visitor_name || "—", lead.visitor_email,
        lead.visitor_phone || "—", lead.visitor_company || "—",
        lead.stage, temp, score, (lead.tags ?? []).join(", "),
        lead.next_action_at ? format(new Date(lead.next_action_at), "yyyy-MM-dd HH:mm") : "—",
        (lead.visitor_message || "—").replace(/\n/g, " "),
        (lead.notes || "").replace(/\n/g, " "),
      ]);
    });
    ws.columns?.forEach((c) => { c.width = 18; });
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `handshake-leads-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const counts = {
    all: enriched.length,
    hot: enriched.filter((e) => e.temp === "hot").length,
    warm: enriched.filter((e) => e.temp === "warm").length,
    cold: enriched.filter((e) => e.temp === "cold").length,
  };

  const activeLead = activeDragId ? enriched.find((r) => r.lead.id === activeDragId) : null;
  const dragCount = activeDragId && selected.has(activeDragId) ? selected.size : 1;

  return (
    <DashboardLayout>
      <Page>
        <PageHeader
          eyebrow="Pipeline"
          title="Leads"
          description="Triage hot vs cold contacts, drag through stages, and run plays from one panel."
          actions={
            leads.length > 0 ? (
              <Button size="sm" variant="outline" onClick={exportLeadsXLSX} className="rounded-sm">
                <Download className="w-4 h-4 mr-1.5" /> Export
              </Button>
            ) : null
          }
        />

        {leads.length === 0 ? (
          <Card><CardContent className="p-12 text-center">
            <Mail className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No leads yet. Enable Private Mode + Require Contact Exchange on a persona to start collecting.</p>
          </CardContent></Card>
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
              <div className="flex items-center gap-2 flex-1 rounded-sm bg-card border border-border px-3 h-9">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, company, message…"
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex items-center gap-1 p-0.5 rounded-sm border border-border bg-card">
                {(["all", "hot", "warm", "cold"] as const).map((t) => {
                  const active = tempFilter === t;
                  const Icon = t === "all" ? null : tempStyles[t].icon;
                  return (
                    <button
                      key={t}
                      onClick={() => setTempFilter(t)}
                      className={cn(
                        "h-8 px-2.5 rounded-sm text-xs font-medium inline-flex items-center gap-1.5 transition-colors",
                        active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {Icon && <Icon className="w-3 h-3" />}
                      <span className="capitalize">{t}</span>
                      <span className="font-mono text-[10px] opacity-70">{counts[t]}</span>
                    </button>
                  );
                })}
              </div>

              <Tabs value={view} onValueChange={(v) => setView(v as any)}>
                <TabsList className="rounded-sm h-9">
                  <TabsTrigger value="kanban" className="rounded-sm gap-1.5"><KanbanSquare className="w-3.5 h-3.5" />Kanban</TabsTrigger>
                  <TabsTrigger value="table" className="rounded-sm gap-1.5"><TableIcon className="w-3.5 h-3.5" />Table</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Bulk action bar */}
            {selected.size > 0 && (
              <div className="flex items-center justify-between gap-3 rounded-sm border border-foreground bg-foreground text-background px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-mono text-xs">{selected.size}</span>
                  <span>selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <Select onValueChange={(s) => bulkMove(Array.from(selected), s as Stage)}>
                    <SelectTrigger className="h-7 w-36 rounded-sm bg-background text-foreground text-xs"><SelectValue placeholder="Move to…" /></SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" className="text-background hover:bg-background/10 h-7" onClick={() => setSelected(new Set())}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {view === "kanban" ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={(e) => setActiveDragId(String(e.active.id))}
                onDragCancel={() => setActiveDragId(null)}
                onDragEnd={onDragEnd}
              >
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 auto-rows-fr">
                  {STAGES.map((s) => (
                    <KanbanColumn
                      key={s.id}
                      stage={s}
                      rows={grouped[s.id]}
                      selected={selected}
                      onToggleSelect={toggleSelect}
                      onOpen={(l) => setEditing(l)}
                    />
                  ))}
                </div>
                <DragOverlay dropAnimation={null}>
                  {activeLead && (
                    <div className="rounded-sm border-2 border-foreground bg-card p-3 shadow-lg w-[260px] rotate-1">
                      <div className="text-sm font-semibold truncate">{activeLead.lead.visitor_name || "Anonymous"}</div>
                      <div className="text-xs text-muted-foreground truncate">{activeLead.lead.visitor_email}</div>
                      {dragCount > 1 && (
                        <div className="mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-foreground text-background text-[10px] font-mono">
                          +{dragCount - 1} more
                        </div>
                      )}
                    </div>
                  )}
                </DragOverlay>
              </DndContext>
            ) : (
              <LeadsTable
                rows={filtered}
                selected={selected}
                onToggleSelect={toggleSelect}
                onSelectAll={(all) => setSelected(all ? new Set(filtered.map((r) => r.lead.id)) : new Set())}
                onOpen={(l) => setEditing(l)}
              />
            )}
          </>
        )}

        <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
            {editing && (
              <LeadEditor
                lead={editing}
                temp={scoreLead(editing).temp}
                onChange={(p) => { setEditing({ ...editing, ...p } as Lead); updateLead(editing.id, p); }}
              />
            )}
          </SheetContent>
        </Sheet>
      </Page>
    </DashboardLayout>
  );
};

// ────────────────────────────────────────────────────────
// Kanban column
// ────────────────────────────────────────────────────────
function KanbanColumn({
  stage, rows, selected, onToggleSelect, onOpen,
}: {
  stage: { id: Stage; label: string };
  rows: { lead: Lead; temp: Temp; score: number }[];
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onOpen: (l: Lead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${stage.id}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-sm border bg-card flex flex-col min-h-[400px] transition-colors",
        isOver ? "border-foreground bg-muted/40" : "border-border",
      )}
    >
      <div className="flex items-center justify-between px-3 h-9 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-eyebrow !text-[10px]">{stage.label}</span>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">{rows.length}</span>
      </div>
      <div className="p-2 space-y-2 flex-1 overflow-y-auto">
        {rows.length === 0 && (
          <div className="text-[11px] text-muted-foreground/60 text-center py-6 font-mono">— empty —</div>
        )}
        {rows.map((r) => (
          <DraggableLeadCard
            key={r.lead.id}
            row={r}
            selected={selected.has(r.lead.id)}
            onToggleSelect={() => onToggleSelect(r.lead.id)}
            onOpen={() => onOpen(r.lead)}
          />
        ))}
      </div>
    </div>
  );
}

function DraggableLeadCard({
  row, selected, onToggleSelect, onOpen,
}: {
  row: { lead: Lead; temp: Temp; score: number };
  selected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
}) {
  const { lead, temp, score } = row;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  const t = tempStyles[temp];

  return (
    <div
      ref={setNodeRef}
      style={{ opacity: isDragging ? 0.3 : 1 }}
      className={cn(
        "group rounded-sm bg-background border p-2.5 select-none transition-all",
        selected ? "border-foreground ring-1 ring-foreground" : "border-border hover:border-foreground/50",
      )}
    >
      <div className="flex items-start gap-2">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelect}
          className="mt-0.5 rounded-sm"
          onClick={(e) => e.stopPropagation()}
        />
        <div
          {...listeners}
          {...attributes}
          onClick={(e) => { if ((e.target as HTMLElement).closest("[data-no-drag]")) return; onOpen(); }}
          className="flex-1 min-w-0 cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", t.dot)} />
            <span className="text-[13px] font-semibold truncate flex-1">{lead.visitor_name || "Anonymous"}</span>
            <span className="font-mono text-[10px] text-muted-foreground">{score}</span>
          </div>
          <div className="text-[11px] text-muted-foreground truncate">{lead.visitor_email}</div>
          {lead.visitor_company && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
              <Building2 className="w-2.5 h-2.5" /><span className="truncate">{lead.visitor_company}</span>
            </div>
          )}
          {lead.next_action_at && (
            <div className="flex items-center gap-1 text-[10px] text-foreground mt-1.5 font-mono">
              <CalIcon className="w-2.5 h-2.5" />
              {format(new Date(lead.next_action_at), "MMM d, HH:mm")}
            </div>
          )}
          {lead.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {lead.tags.slice(0, 3).map((tg) => (
                <span key={tg} className="text-[9px] font-mono uppercase tracking-wider px-1 py-px rounded-sm bg-muted text-muted-foreground border border-border">{tg}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Table view
// ────────────────────────────────────────────────────────
function LeadsTable({
  rows, selected, onToggleSelect, onSelectAll, onOpen,
}: {
  rows: { lead: Lead; temp: Temp; score: number }[];
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: (all: boolean) => void;
  onOpen: (l: Lead) => void;
}) {
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.lead.id));
  return (
    <div className="rounded-sm border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr className="text-left">
              <th className="w-8 px-3 py-2"><Checkbox checked={allSelected} onCheckedChange={(c) => onSelectAll(!!c)} className="rounded-sm" /></th>
              <th className="px-2 py-2 text-eyebrow !text-[10px] font-medium">Lead</th>
              <th className="px-2 py-2 text-eyebrow !text-[10px] font-medium">Temp</th>
              <th className="px-2 py-2 text-eyebrow !text-[10px] font-medium">Stage</th>
              <th className="px-2 py-2 text-eyebrow !text-[10px] font-medium">Company</th>
              <th className="px-2 py-2 text-eyebrow !text-[10px] font-medium">Next</th>
              <th className="px-2 py-2 text-eyebrow !text-[10px] font-medium">Created</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ lead, temp, score }) => {
              const t = tempStyles[temp];
              const isSel = selected.has(lead.id);
              return (
                <tr
                  key={lead.id}
                  className={cn(
                    "border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer",
                    isSel && "bg-muted/50",
                  )}
                  onClick={() => onOpen(lead)}
                >
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={isSel} onCheckedChange={() => onToggleSelect(lead.id)} className="rounded-sm" />
                  </td>
                  <td className="px-2 py-2">
                    <div className="font-medium truncate">{lead.visitor_name || "Anonymous"}</div>
                    <div className="text-xs text-muted-foreground truncate">{lead.visitor_email}</div>
                  </td>
                  <td className="px-2 py-2">
                    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border text-[10px] font-mono uppercase", t.chip)}>
                      <t.icon className="w-2.5 h-2.5" />{t.label}<span className="opacity-60">·{score}</span>
                    </span>
                  </td>
                  <td className="px-2 py-2 text-xs capitalize">{lead.stage}</td>
                  <td className="px-2 py-2 text-xs text-muted-foreground truncate max-w-[160px]">{lead.visitor_company || "—"}</td>
                  <td className="px-2 py-2 text-xs font-mono text-muted-foreground">
                    {lead.next_action_at ? format(new Date(lead.next_action_at), "MMM d, HH:mm") : "—"}
                  </td>
                  <td className="px-2 py-2 text-xs font-mono text-muted-foreground">
                    {format(new Date(lead.created_at), "MMM d")}
                  </td>
                  <td className="px-2 py-2"><ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /></td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-sm text-muted-foreground">No leads match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Lead editor (Sheet)
// ────────────────────────────────────────────────────────
function LeadEditor({ lead, temp, onChange }: { lead: Lead; temp: Temp; onChange: (patch: Partial<Lead>) => void }) {
  const [tagInput, setTagInput] = useState("");
  const [commChannel, setCommChannel] = useState<CommEntry["channel"]>("note");
  const [commBody, setCommBody] = useState("");
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(
    lead.next_action_at ? new Date(lead.next_action_at) : undefined,
  );
  const [scheduleTime, setScheduleTime] = useState(
    lead.next_action_at ? format(new Date(lead.next_action_at), "HH:mm") : "10:00",
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  const t = tempStyles[temp];

  const addTag = () => {
    const tg = tagInput.trim();
    if (!tg || lead.tags?.includes(tg)) return;
    onChange({ tags: [...(lead.tags ?? []), tg] });
    setTagInput("");
  };
  const removeTag = (tg: string) => onChange({ tags: (lead.tags ?? []).filter((x) => x !== tg) });

  const addComm = () => {
    if (!commBody.trim()) return;
    const entry: CommEntry = {
      id: crypto.randomUUID(),
      channel: commChannel,
      body: commBody.trim(),
      at: new Date().toISOString(),
    };
    onChange({ communications: [entry, ...(lead.communications ?? [])] });
    setCommBody("");
  };
  const removeComm = (id: string) =>
    onChange({ communications: (lead.communications ?? []).filter((c) => c.id !== id) });

  const applySchedule = () => {
    if (!scheduleDate) return;
    const [h, m] = scheduleTime.split(":").map(Number);
    const d = new Date(scheduleDate);
    d.setHours(h || 0, m || 0, 0, 0);
    onChange({ next_action_at: d.toISOString() });
  };

  const explainWithAI = async () => {
    setAiLoading(true);
    setAiInsight(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-persona-assist", {
        body: {
          mode: "lead-insight",
          lead: {
            name: lead.visitor_name, email: lead.visitor_email, company: lead.visitor_company,
            phone: lead.visitor_phone, message: lead.visitor_message, stage: lead.stage,
            temperature: temp, tags: lead.tags, notes: lead.notes,
            comms_count: (lead.communications ?? []).length,
            created_at: lead.created_at, next_action_at: lead.next_action_at,
          },
        },
      });
      if (error) throw error;
      setAiInsight((data as any)?.text ?? (data as any)?.result ?? "No insight available.");
    } catch (e: any) {
      setAiInsight(`AI unavailable: ${e?.message ?? "unknown error"}`);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <>
      <SheetHeader className="px-5 pt-5 pb-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border text-[10px] font-mono uppercase", t.chip)}>
            <t.icon className="w-2.5 h-2.5" />{t.label}
          </span>
          <Button size="sm" variant="ghost" onClick={explainWithAI} disabled={aiLoading} className="h-7 text-xs gap-1.5">
            {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            AI explain
          </Button>
        </div>
        <SheetTitle className="text-xl font-bold tracking-tight">{lead.visitor_name || "Anonymous"}</SheetTitle>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><Mail className="w-3 h-3" /><a href={`mailto:${lead.visitor_email}`} className="hover:text-foreground">{lead.visitor_email}</a></div>
          {lead.visitor_phone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" /><a href={`tel:${lead.visitor_phone}`} className="hover:text-foreground">{lead.visitor_phone}</a></div>}
          {lead.visitor_company && <div className="flex items-center gap-1.5"><Building2 className="w-3 h-3" />{lead.visitor_company}</div>}
        </div>
      </SheetHeader>

      {aiInsight && (
        <div className="px-5 py-3 bg-accent/10 border-b border-border text-xs leading-relaxed">
          <div className="text-eyebrow mb-1">AI Insight</div>
          <p className="text-foreground whitespace-pre-wrap">{aiInsight}</p>
        </div>
      )}

      <Tabs defaultValue="overview" className="px-5 pt-4">
        <TabsList className="rounded-sm w-full grid grid-cols-3 h-9">
          <TabsTrigger value="overview" className="rounded-sm text-xs">Overview</TabsTrigger>
          <TabsTrigger value="schedule" className="rounded-sm text-xs">Schedule</TabsTrigger>
          <TabsTrigger value="comms" className="rounded-sm text-xs">Comms</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5 pt-4 pb-6">
          {lead.visitor_message && (
            <div>
              <div className="text-eyebrow mb-1.5">Original Message</div>
              <p className="text-sm text-foreground bg-muted/40 border border-border rounded-sm p-3">{lead.visitor_message}</p>
            </div>
          )}

          <div>
            <div className="text-eyebrow mb-2">Stage</div>
            <div className="grid grid-cols-3 gap-1.5">
              {STAGES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onChange({ stage: s.id })}
                  className={cn(
                    "text-xs rounded-sm border px-2 py-1.5 transition-colors",
                    lead.stage === s.id ? "bg-foreground text-background border-foreground font-semibold" : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-eyebrow mb-2 inline-flex items-center gap-1.5"><TagIcon className="w-3 h-3" />Tags</div>
            <div className="flex flex-wrap gap-1 mb-2">
              {(lead.tags ?? []).map((tg) => (
                <Badge key={tg} variant="secondary" className="rounded-sm pr-1 font-mono text-[10px] uppercase">
                  {tg}
                  <button onClick={() => removeTag(tg)} className="ml-1 hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
                </Badge>
              ))}
              {(lead.tags ?? []).length === 0 && <span className="text-xs text-muted-foreground">No tags</span>}
            </div>
            <div className="flex gap-1.5">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="Add tag…"
                className="h-8 text-sm rounded-sm"
              />
              <Button size="sm" variant="outline" onClick={addTag} className="rounded-sm"><Plus className="w-3.5 h-3.5" /></Button>
            </div>
          </div>

          <div>
            <div className="text-eyebrow mb-2 inline-flex items-center gap-1.5"><StickyNote className="w-3 h-3" />Notes</div>
            <Textarea
              value={lead.notes ?? ""}
              onChange={(e) => onChange({ notes: e.target.value })}
              placeholder="Private notes about this lead…"
              className="min-h-[100px] text-sm rounded-sm font-sans"
            />
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4 pt-4 pb-6">
          <div className="text-eyebrow inline-flex items-center gap-1.5"><CalIcon className="w-3 h-3" />Plan a call or meeting</div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start rounded-sm font-normal">
                <CalIcon className="w-4 h-4 mr-2" />
                {scheduleDate ? format(scheduleDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarUI mode="single" selected={scheduleDate} onSelect={setScheduleDate} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          <div>
            <div className="text-eyebrow mb-1.5">Time</div>
            <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="h-9 rounded-sm font-mono" />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button onClick={applySchedule} disabled={!scheduleDate} className="rounded-sm">
              <CalIcon className="w-3.5 h-3.5 mr-1.5" /> Save
            </Button>
            {lead.next_action_at && (
              <Button variant="outline" onClick={() => { setScheduleDate(undefined); onChange({ next_action_at: null }); }} className="rounded-sm">
                Clear
              </Button>
            )}
          </div>

          {lead.next_action_at && (
            <div className="rounded-sm border border-foreground bg-muted/40 p-3 text-sm">
              <div className="text-eyebrow mb-0.5">Next action</div>
              <div className="font-mono">{format(new Date(lead.next_action_at), "PPP · HH:mm")}</div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="comms" className="space-y-4 pt-4 pb-6">
          <div className="rounded-sm border border-border p-3 space-y-2 bg-card">
            <div className="flex items-center gap-2">
              <Select value={commChannel} onValueChange={(v) => setCommChannel(v as any)}>
                <SelectTrigger className="h-8 w-28 rounded-sm text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">Log a touchpoint</span>
            </div>
            <Textarea
              value={commBody}
              onChange={(e) => setCommBody(e.target.value)}
              placeholder="What was said? Outcome? Next step?"
              className="min-h-[80px] text-sm rounded-sm"
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={addComm} disabled={!commBody.trim()} className="rounded-sm">
                <Send className="w-3 h-3 mr-1.5" /> Log
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {(lead.communications ?? []).length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-6 font-mono">— no touchpoints yet —</div>
            ) : (
              (lead.communications ?? []).map((c) => (
                <div key={c.id} className="rounded-sm border border-border p-3 bg-card group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{c.channel} · {format(new Date(c.at), "MMM d, HH:mm")}</span>
                    <button onClick={() => removeComm(c.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

export default LeadsPage;
