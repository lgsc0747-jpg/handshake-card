import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props { orgId: string; orgName: string; }

export function AgencySettings({ orgId, orgName }: Props) {
  const { toast } = useToast();
  const [name, setName] = useState(orgName);
  const [replyTo, setReplyTo] = useState("");
  const [senderName, setSenderName] = useState("");
  const [sla, setSla] = useState("240");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("agency_settings").select("*").eq("organization_id", orgId).maybeSingle();
    if (data) {
      setReplyTo(data.reply_to_email ?? "");
      setSenderName(data.sender_name ?? "");
      setSla(String(data.first_response_sla_minutes ?? 240));
    }
  }, [orgId]);

  useEffect(() => { load(); setName(orgName); }, [load, orgName]);

  const save = async () => {
    setSaving(true);
    const slaNum = Math.max(15, parseInt(sla, 10) || 240);
    const [s, o] = await Promise.all([
      supabase.from("agency_settings").upsert({
        organization_id: orgId,
        reply_to_email: replyTo.trim() || null,
        sender_name: senderName.trim() || null,
        first_response_sla_minutes: slaNum,
      }, { onConflict: "organization_id" }),
      name.trim() && name.trim() !== orgName
        ? supabase.from("organizations").update({ name: name.trim() }).eq("id", orgId)
        : Promise.resolve({ error: null }),
    ]);
    setSaving(false);
    if (s.error || o.error) {
      return toast({ title: "Save failed", description: (s.error?.message || o.error?.message)!, variant: "destructive" });
    }
    toast({ title: "Settings saved" });
  };

  return (
    <Card>
      <CardContent className="p-5 sm:p-6 space-y-4 max-w-xl">
        <h2 className="text-lg font-semibold inline-flex items-center gap-2"><SettingsIcon className="w-4 h-4" /> Workspace settings</h2>
        <div>
          <Label>Workspace name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Sender name (shown in lead emails)</Label>
          <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder={orgName} />
        </div>
        <div>
          <Label>Reply-to email</Label>
          <Input type="email" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} placeholder="team@yourcompany.com" />
          <p className="text-xs text-muted-foreground mt-1">Lead replies to your outbound emails will land here.</p>
        </div>
        <div>
          <Label>First-response SLA (minutes)</Label>
          <Input type="number" min={15} value={sla} onChange={(e) => setSla(e.target.value)} />
          <p className="text-xs text-muted-foreground mt-1">Leads without a response after this window are flagged as overdue.</p>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
