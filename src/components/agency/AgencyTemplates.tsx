import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, FileText, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props { orgId: string; }
interface Template { id: string; name: string; subject: string; body: string; }

export function AgencyTemplates({ orgId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [list, setList] = useState<Template[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("agency_email_templates")
      .select("*").eq("organization_id", orgId).order("name");
    setList((data ?? []) as Template[]);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const startNew = () => {
    setEditing(null); setName(""); setSubject(""); setBody("Hi {{lead_name}},\n\n"); setOpen(true);
  };
  const startEdit = (t: Template) => {
    setEditing(t); setName(t.name); setSubject(t.subject); setBody(t.body); setOpen(true);
  };

  const save = async () => {
    if (!name.trim() || !body.trim()) return;
    const payload = { name: name.trim(), subject: subject.trim(), body, organization_id: orgId, created_by: user!.id };
    const { error } = editing
      ? await supabase.from("agency_email_templates").update(payload).eq("id", editing.id)
      : await supabase.from("agency_email_templates").insert(payload);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: editing ? "Updated" : "Template added" });
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    await supabase.from("agency_email_templates").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold inline-flex items-center gap-2"><FileText className="w-4 h-4" /> Email templates</h2>
          <p className="text-sm text-muted-foreground">Use <code className="text-xs">{"{{lead_name}}"}</code>, <code className="text-xs">{"{{persona}}"}</code>, <code className="text-xs">{"{{owner}}"}</code> as placeholders.</p>
        </div>
        <Button size="sm" onClick={startNew}><Plus className="w-4 h-4 mr-1.5" />New template</Button>
      </div>

      {list.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No templates yet.</CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {list.map((t) => (
            <Card key={t.id} className="cursor-pointer hover:border-primary/40" onClick={() => startEdit(t)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium">{t.name}</div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); remove(t.id); }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                {t.subject && <div className="text-xs text-muted-foreground mt-1">Subject: {t.subject}</div>}
                <div className="text-xs text-muted-foreground mt-2 line-clamp-3 whitespace-pre-wrap">{t.body}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit template" : "New template"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Follow-up after meeting" /></div>
            <div><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Great chatting, {{lead_name}}!" /></div>
            <div><Label>Body</Label><Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!name.trim() || !body.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
