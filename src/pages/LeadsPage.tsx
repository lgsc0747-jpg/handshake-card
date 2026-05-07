import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext, PointerSensor, TouchSensor, useSensor, useSensors,
  closestCorners, type DragEndEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  SearchField, Input as AriaInput, Label as AriaLabel,
  TagGroup, TagList, Tag,
} from "react-aria-components";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Page, PageHeader, PageSection } from "@/components/layout/Page";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Mail, User, Phone, Building2, MessageSquare, Loader2, Download,
  Search, Calendar, Tag as TagIcon, Plus, X,
} from "lucide-react";
import { fadeUp, springIOS } from "@/lib/motion";

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
}

type Stage = "new" | "contacted" | "qualified" | "meeting" | "won" | "lost";
const STAGES: { id: Stage; label: string; tone: string }[] = [
  { id: "new",       label: "New",       tone: "bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30" },
  { id: "contacted", label: "Contacted", tone: "bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/30" },
  { id: "qualified", label: "Qualified", tone: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30" },
  { id: "meeting",   label: "Meeting",   tone: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300 border-fuchsia-500/30" },
  { id: "won",       label: "Won",       tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30" },
  { id: "lost",      label: "Lost",      tone: "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30" },
];

const LeadsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Lead | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("lead_captures")
      .select("*")
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setLeads((data ?? []) as Lead[]);
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
          setLeads((prev) => prev.map((l) => l.id === (payload.new as Lead).id ? (payload.new as Lead) : l));
        } else if (payload.eventType === "DELETE") {
          setLeads((prev) => prev.filter((l) => l.id !== (payload.old as Lead).id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    leads.forEach((l) => (l.tags ?? []).forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [leads]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      const matchesQ = !q ||
        (l.visitor_name ?? "").toLowerCase().includes(q) ||
        l.visitor_email.toLowerCase().includes(q) ||
        (l.visitor_company ?? "").toLowerCase().includes(q) ||
        (l.visitor_message ?? "").toLowerCase().includes(q);
      const matchesTags = tagFilter.size === 0 || (l.tags ?? []).some((t) => tagFilter.has(t));
      return matchesQ && matchesTags;
    });
  }, [leads, search, tagFilter]);

  const grouped = useMemo(() => {
    const g: Record<Stage, Lead[]> = { new: [], contacted: [], qualified: [], meeting: [], won: [], lost: [] };
    filtered.forEach((l) => g[l.stage ?? "new"].push(l));
    return g;
  }, [filtered]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const onDragEnd = async (e: DragEndEvent) => {
    const leadId = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId || !overId.startsWith("col:")) return;
    const newStage = overId.slice(4) as Stage;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === newStage) return;
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, stage: newStage } : l));
    const { error } = await supabase.from("lead_captures").update({ stage: newStage }).eq("id", leadId);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
  };

  const updateLead = async (id: string, patch: Partial<Lead>) => {
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, ...patch } as Lead : l));
    const { error } = await supabase.from("lead_captures").update(patch as any).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
  };

  const exportLeadsXLSX = async () => {
    if (leads.length === 0) return;
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "Handshake";
    const headerFont = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    const headerFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF0D9488" } };
    const borderThin = { top: { style: "thin" as const }, bottom: { style: "thin" as const }, left: { style: "thin" as const }, right: { style: "thin" as const } };
    const accentFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFF0FDFA" } };
    const ws = wb.addWorksheet("Leads");
    ws.addRow(["#", "Date", "Name", "Email", "Phone", "Company", "Stage", "Tags", "Next action", "Message"]);
    const hr = ws.getRow(1);
    for (let c = 1; c <= 10; c++) {
      const cell = hr.getCell(c);
      cell.font = headerFont; cell.fill = headerFill; cell.border = borderThin;
      cell.alignment = { horizontal: "center", vertical: "middle" };
    }
    hr.height = 22;
    leads.forEach((lead, i) => {
      const r = ws.addRow([
        i + 1, new Date(lead.created_at).toLocaleString(),
        lead.visitor_name || "—", lead.visitor_email,
        lead.visitor_phone || "—", lead.visitor_company || "—",
        lead.stage, (lead.tags ?? []).join(", "),
        lead.next_action_at ? new Date(lead.next_action_at).toLocaleString() : "—",
        (lead.visitor_message || "—").replace(/\n/g, " "),
      ]);
      r.eachCell((c) => { c.border = borderThin; });
      if (i % 2 === 0) r.eachCell((c) => { c.fill = accentFill; });
    });
    ws.columns?.forEach((col) => {
      let maxLen = 12;
      (col as any).eachCell?.({ includeEmpty: false }, (cell: any) => {
        const len = String(cell.value ?? "").length;
        if (len > maxLen) maxLen = len;
      });
      col.width = Math.min(maxLen + 4, 40);
    });
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

  return (
    <DashboardLayout>
      <Page>
        <PageHeader
          title={
            <span className="inline-flex items-center gap-2">
              <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-[var(--shadow-card)]">
                <Mail className="w-4 h-4 text-primary-foreground" />
              </span>
              Leads
            </span>
          }
          description="Search, tag, plan calls, and move contacts through your pipeline."
          actions={
            leads.length > 0 ? (
              <Button size="sm" variant="outline" onClick={exportLeadsXLSX}>
                <Download className="w-4 h-4 mr-1.5" /> Export
              </Button>
            ) : null
          }
        />

        {leads.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Mail className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No leads yet. Enable Private Mode + Require Contact Exchange on a persona to start collecting.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <SearchField
                  aria-label="Search leads"
                  value={search}
                  onChange={setSearch}
                  className="flex items-center gap-2 flex-1 rounded-xl bg-muted/40 px-3 py-1.5 border border-border/50 focus-within:border-primary/50 transition-colors"
                >
                  <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                  <AriaInput
                    placeholder="Search name, email, company, message…"
                    className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                  />
                </SearchField>

                {allTags.length > 0 && (
                  <TagGroup
                    aria-label="Filter by tag"
                    selectionMode="multiple"
                    selectedKeys={tagFilter}
                    onSelectionChange={(keys) => setTagFilter(new Set(Array.from(keys as Set<string>)))}
                    className="flex items-center gap-1 flex-wrap"
                  >
                    <TagList className="flex items-center gap-1 flex-wrap">
                      {allTags.map((t) => (
                        <Tag
                          key={t}
                          id={t}
                          className="cursor-pointer rounded-full border border-border/60 px-2.5 py-0.5 text-xs hover:border-primary/40 selected:bg-primary selected:text-primary-foreground selected:border-primary transition-colors data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground data-[selected=true]:border-primary"
                        >
                          {t}
                        </Tag>
                      ))}
                    </TagList>
                  </TagGroup>
                )}
              </CardContent>
            </Card>

            <PageSection title="Pipeline" description="Drag cards between columns to update the stage. Click a card to plan a call or edit tags.">
              <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
                <div className="grid grid-flow-col auto-cols-[minmax(260px,1fr)] gap-3 overflow-x-auto pb-3 no-scrollbar">
                  {STAGES.map((s) => (
                    <KanbanColumn key={s.id} stage={s} leads={grouped[s.id]} onOpen={setEditing} />
                  ))}
                </div>
              </DndContext>
            </PageSection>
          </>
        )}

        <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            {editing && (
              <LeadEditor lead={editing} onChange={(p) => { setEditing({ ...editing, ...p } as Lead); updateLead(editing.id, p); }} />
            )}
          </SheetContent>
        </Sheet>
      </Page>
    </DashboardLayout>
  );
};

function KanbanColumn({ stage, leads, onOpen }: { stage: typeof STAGES[number]; leads: Lead[]; onOpen: (l: Lead) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${stage.id}` });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border bg-card/40 backdrop-blur-md transition-colors ${isOver ? "border-primary/50 bg-primary/5" : "border-border/50"}`}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${stage.tone}`}>
          {stage.label}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">{leads.length}</span>
      </div>
      <div className="p-2 space-y-2 min-h-[120px]">
        <AnimatePresence>
          {leads.map((l) => (
            <DraggableLeadCard key={l.id} lead={l} onOpen={onOpen} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function DraggableLeadCard({ lead, onOpen }: { lead: Lead; onOpen: (l: Lead) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  const style: React.CSSProperties = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : {};

  return (
    <motion.div
      layout
      variants={fadeUp}
      initial="initial"
      animate="animate"
      exit={{ opacity: 0, scale: 0.96 }}
      transition={springIOS}
      ref={setNodeRef}
      style={{ ...style, opacity: isDragging ? 0.5 : 1 }}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(lead)}
      className="rounded-xl bg-background/80 backdrop-blur-sm border border-border/50 p-3 cursor-grab active:cursor-grabbing hover:border-primary/40 transition-colors space-y-1.5 select-none"
    >
      <div className="flex items-center gap-2">
        <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium truncate">{lead.visitor_name || "Anonymous"}</span>
      </div>
      <div className="text-xs text-muted-foreground truncate">{lead.visitor_email}</div>
      {lead.visitor_company && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Building2 className="w-3 h-3" /><span className="truncate">{lead.visitor_company}</span>
        </div>
      )}
      {lead.next_action_at && (
        <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
          <Calendar className="w-3 h-3" />
          {new Date(lead.next_action_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </div>
      )}
      {lead.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {lead.tags.slice(0, 3).map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px] rounded-full px-1.5 py-0">{t}</Badge>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function LeadEditor({ lead, onChange }: { lead: Lead; onChange: (patch: Partial<Lead>) => void }) {
  const [tagInput, setTagInput] = useState("");

  const addTag = () => {
    const t = tagInput.trim();
    if (!t || lead.tags?.includes(t)) return;
    onChange({ tags: [...(lead.tags ?? []), t] });
    setTagInput("");
  };
  const removeTag = (t: string) => onChange({ tags: (lead.tags ?? []).filter((x) => x !== t) });

  return (
    <>
      <SheetHeader>
        <SheetTitle className="font-display">{lead.visitor_name || "Anonymous"}</SheetTitle>
      </SheetHeader>
      <div className="mt-4 space-y-5">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /><a href={`mailto:${lead.visitor_email}`} className="text-primary hover:underline">{lead.visitor_email}</a></div>
          {lead.visitor_phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /><a href={`tel:${lead.visitor_phone}`} className="hover:underline">{lead.visitor_phone}</a></div>}
          {lead.visitor_company && <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-muted-foreground" />{lead.visitor_company}</div>}
          {lead.visitor_message && <div className="flex items-start gap-2 text-muted-foreground"><MessageSquare className="w-4 h-4 mt-0.5" /><span>{lead.visitor_message}</span></div>}
        </div>

        <div className="space-y-2">
          <AriaLabel className="text-xs uppercase tracking-wider text-muted-foreground">Stage</AriaLabel>
          <div className="grid grid-cols-3 gap-1.5">
            {STAGES.map((s) => (
              <button
                key={s.id}
                onClick={() => onChange({ stage: s.id })}
                className={`text-xs rounded-xl border px-2 py-1.5 transition-colors ${
                  lead.stage === s.id ? s.tone + " font-medium" : "border-border/50 text-muted-foreground hover:border-primary/30"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <AriaLabel className="text-xs uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5"><TagIcon className="w-3 h-3" />Tags</AriaLabel>
          <div className="flex flex-wrap gap-1">
            {(lead.tags ?? []).map((t) => (
              <Badge key={t} variant="secondary" className="rounded-full pr-1">
                {t}
                <button onClick={() => removeTag(t)} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
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
              className="h-8 text-sm"
            />
            <Button size="sm" variant="outline" onClick={addTag}><Plus className="w-3.5 h-3.5" /></Button>
          </div>
        </div>

        <div className="space-y-2">
          <AriaLabel className="text-xs uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5"><Calendar className="w-3 h-3" />Plan call / next action</AriaLabel>
          <Input
            type="datetime-local"
            value={lead.next_action_at ? toLocalDt(lead.next_action_at) : ""}
            onChange={(e) => onChange({ next_action_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className="h-9 text-sm"
          />
          {lead.next_action_at && (
            <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => onChange({ next_action_at: null })}>
              Clear
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

function toLocalDt(iso: string) {
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

export default LeadsPage;
