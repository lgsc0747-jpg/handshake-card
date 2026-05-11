import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Mail, MessageSquarePlus, Send, Loader2, AlertTriangle, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Props { orgId: string; }
interface Lead {
  id: string; persona_id: string; visitor_name: string | null; visitor_email: string | null;
  visitor_company: string | null; created_at: string; stage: string;
  assigned_to: string | null; first_response_at: string | null;
}
interface Member { user_id: string; display_name: string | null; username: string | null; avatar_url: string | null; }
interface Persona { id: string; label: string; }
interface Template { id: string; name: string; subject: string; body: string; }
interface LeadMessage {
  id: string; lead_id: string; author_user_id: string; kind: "note" | "email_out";
  subject: string | null; body: string; created_at: string; delivery_status: string | null;
}

export function AgencyInbox({ orgId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LeadMessage[]>([]);
  const [filter, setFilter] = useState<"all" | "mine" | "unassigned" | "overdue">("all");
  const [slaMin, setSlaMin] = useState(240);

  const [composeKind, setComposeKind] = useState<"email_out" | "note">("email_out");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const [l, p, m, t, s] = await Promise.all([
      supabase.from("lead_captures").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("personas").select("id, label"),
      supabase.rpc("get_org_member_profiles", { _org_id: orgId }),
      supabase.from("agency_email_templates").select("*").eq("organization_id", orgId).order("name"),
      supabase.from("agency_settings").select("first_response_sla_minutes").eq("organization_id", orgId).maybeSingle(),
    ]);
    setLeads((l.data ?? []) as Lead[]);
    setPersonas((p.data ?? []) as Persona[]);
    setMembers((m.data ?? []) as Member[]);
    setTemplates((t.data ?? []) as Template[]);
    setSlaMin(s.data?.first_response_sla_minutes ?? 240);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    supabase.from("lead_messages").select("*").eq("lead_id", activeId)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages((data ?? []) as LeadMessage[]));
  }, [activeId]);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (filter === "mine") return l.assigned_to === user?.id;
      if (filter === "unassigned") return !l.assigned_to;
      if (filter === "overdue") {
        if (l.first_response_at) return false;
        return (Date.now() - new Date(l.created_at).getTime()) / 60000 > slaMin;
      }
      return true;
    });
  }, [leads, filter, user?.id, slaMin]);

  const active = leads.find((l) => l.id === activeId);
  const personaLabel = (id: string) => personas.find((p) => p.id === id)?.label ?? "—";
  const memberById = (id: string | null) => id ? members.find((m) => m.user_id === id) : undefined;

  const assign = async (leadId: string, userId: string | null) => {
    const { error } = await supabase.from("lead_captures").update({ assigned_to: userId }).eq("id", leadId);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, assigned_to: userId } : l));
    if (userId) {
      await supabase.from("agency_activity").insert({
        organization_id: orgId, actor_user_id: user!.id, verb: "lead_assigned",
        target_type: "lead", target_id: leadId,
        summary: `assigned a lead to ${memberById(userId)?.display_name ?? "a teammate"}`,
      });
    }
  };

  const applyTemplate = (tplId: string) => {
    const tpl = templates.find((t) => t.id === tplId);
    if (!tpl || !active) return;
    const replace = (s: string) => s
      .replaceAll("{{lead_name}}", active.visitor_name || "there")
      .replaceAll("{{persona}}", personaLabel(active.persona_id))
      .replaceAll("{{owner}}", user?.user_metadata?.full_name ?? user?.email ?? "");
    setComposeSubject(replace(tpl.subject));
    setComposeBody(replace(tpl.body));
  };

  const send = async () => {
    if (!active || !composeBody.trim()) return;
    setSending(true);
    if (composeKind === "email_out") {
      const { error } = await supabase.functions.invoke("send-lead-email", {
        body: { lead_id: active.id, organization_id: orgId, subject: composeSubject || null, body: composeBody },
      });
      setSending(false);
      if (error) return toast({ title: "Send failed", description: error.message, variant: "destructive" });
      toast({ title: "Email sent" });
    } else {
      const { error } = await supabase.from("lead_messages").insert({
        lead_id: active.id, persona_id: active.persona_id, author_user_id: user!.id,
        kind: "note", body: composeBody, subject: null,
      });
      setSending(false);
      if (error) return toast({ title: "Note failed", description: error.message, variant: "destructive" });
      await supabase.from("agency_activity").insert({
        organization_id: orgId, actor_user_id: user!.id, verb: "note_added",
        target_type: "lead", target_id: active.id, summary: `added a note to a lead`,
      });
    }
    setComposeBody(""); setComposeSubject("");
    // refresh thread
    const { data } = await supabase.from("lead_messages").select("*").eq("lead_id", active.id).order("created_at");
    setMessages((data ?? []) as LeadMessage[]);
    load();
  };

  const isOverdue = (l: Lead) =>
    !l.first_response_at && (Date.now() - new Date(l.created_at).getTime()) / 60000 > slaMin;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 min-h-[60vh]">
      {/* Lead list */}
      <Card className="overflow-hidden">
        <div className="p-3 border-b border-border/40 flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All leads</SelectItem>
              <SelectItem value="mine">Assigned to me</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="divide-y divide-border/40 max-h-[60vh] overflow-y-auto">
          {filtered.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">No leads to show.</div>
          )}
          {filtered.map((l) => {
            const a = memberById(l.assigned_to);
            return (
              <button key={l.id} onClick={() => setActiveId(l.id)}
                className={`w-full text-left p-3 hover:bg-muted/40 transition-colors ${activeId === l.id ? "bg-muted/60" : ""}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-medium text-sm truncate flex-1">{l.visitor_name || l.visitor_email || "Lead"}</div>
                  {isOverdue(l) && <Badge variant="destructive" className="h-4 text-[9px] px-1.5">SLA</Badge>}
                </div>
                <div className="text-xs text-muted-foreground truncate">{l.visitor_company || l.visitor_email}</div>
                <div className="flex items-center justify-between mt-1.5 gap-2">
                  <Badge variant="outline" className="h-4 text-[9px] px-1.5 truncate max-w-[140px]">{personaLabel(l.persona_id)}</Badge>
                  {a ? (
                    <Avatar className="h-5 w-5"><AvatarImage src={a.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[8px]">{(a.display_name || "?").slice(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">unassigned</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Thread + composer */}
      <Card className="flex flex-col min-h-[60vh]">
        {!active ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
            <Mail className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">Pick a lead to view the conversation.</p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-border/40 flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="font-semibold">{active.visitor_name || active.visitor_email}</div>
                <div className="text-xs text-muted-foreground">
                  {active.visitor_email} · {active.visitor_company || personaLabel(active.persona_id)}
                </div>
                {isOverdue(active) && (
                  <div className="mt-1 inline-flex items-center gap-1 text-xs text-destructive">
                    <AlertTriangle className="w-3 h-3" /> Overdue — first response SLA exceeded
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Assign</Label>
                <Select value={active.assigned_to ?? "unassigned"} onValueChange={(v) => assign(active.id, v === "unassigned" ? null : v)}>
                  <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>{m.display_name || m.username}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center">No messages yet — say hello below.</p>
              ) : messages.map((m) => {
                const a = memberById(m.author_user_id);
                return (
                  <div key={m.id} className={`rounded-2xl border p-3 ${m.kind === "note" ? "bg-amber-500/5 border-amber-500/20" : "bg-card border-border/40"}`}>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                      <Avatar className="h-5 w-5"><AvatarImage src={a?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[8px]">{(a?.display_name || "?").slice(0,2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground">{a?.display_name ?? "Teammate"}</span>
                      <Badge variant="outline" className="h-4 text-[9px] px-1.5">{m.kind === "note" ? "Internal note" : "Email sent"}</Badge>
                      <span>· {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</span>
                    </div>
                    {m.subject && <div className="text-sm font-semibold mb-1">{m.subject}</div>}
                    <div className="text-sm whitespace-pre-wrap">{m.body}</div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-border/40 p-4 space-y-2">
              <Tabs value={composeKind} onValueChange={(v) => setComposeKind(v as any)}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <TabsList>
                    <TabsTrigger value="email_out"><Send className="w-3 h-3 mr-1.5" />Send email</TabsTrigger>
                    <TabsTrigger value="note"><MessageSquarePlus className="w-3 h-3 mr-1.5" />Internal note</TabsTrigger>
                  </TabsList>
                  {composeKind === "email_out" && templates.length > 0 && (
                    <Select onValueChange={applyTemplate}>
                      <SelectTrigger className="h-8 w-[200px]"><SelectValue placeholder="Use template…" /></SelectTrigger>
                      <SelectContent>
                        {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <TabsContent value="email_out" className="space-y-2 mt-3">
                  <Input placeholder="Subject" value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} />
                  <Textarea rows={4} placeholder={`Hi ${active.visitor_name || "there"},`} value={composeBody} onChange={(e) => setComposeBody(e.target.value)} />
                </TabsContent>
                <TabsContent value="note" className="mt-3">
                  <Textarea rows={4} placeholder="Add an internal note (only your team can see this)" value={composeBody} onChange={(e) => setComposeBody(e.target.value)} />
                </TabsContent>
              </Tabs>
              <div className="flex justify-end">
                <Button onClick={send} disabled={sending || !composeBody.trim()}>
                  {sending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
                  {composeKind === "email_out" ? "Send email" : "Add note"}
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
