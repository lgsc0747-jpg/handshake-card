import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Loader2, ShieldCheck, UserPlus, X, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Props { orgId: string; ownerUserId: string; onLeft?: () => void; }
type OrgRole = "owner" | "admin" | "manager" | "member";
const SECTIONS = ["identity","design","blocks","cards","leads","analytics","inbox","goals"] as const;
const PERMS = ["view","edit","manage"] as const;

interface Member {
  membership_id: string; user_id: string; role: OrgRole;
  display_name: string | null; username: string | null; avatar_url: string | null;
}
interface Persona { id: string; label: string; }
interface Grant { id: string; persona_id: string; member_user_id: string; section: string; permission: string; }

const PRESETS: Record<string, Array<{ section: string; permission: string }>> = {
  Viewer: SECTIONS.map((s) => ({ section: s, permission: "view" })),
  Editor: SECTIONS.map((s) => ({ section: s, permission: "edit" })),
  "Lead Manager": [
    { section: "leads", permission: "manage" }, { section: "inbox", permission: "manage" },
    { section: "goals", permission: "edit" }, { section: "analytics", permission: "view" },
  ],
  Analyst: [
    { section: "analytics", permission: "view" }, { section: "leads", permission: "view" },
    { section: "inbox", permission: "view" },
  ],
};

export function AgencyMembers({ orgId }: Props) {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteIdent, setInviteIdent] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("member");
  const [inviting, setInviting] = useState(false);

  const [matrixMember, setMatrixMember] = useState<Member | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [m, p, g] = await Promise.all([
      supabase.rpc("get_org_member_profiles", { _org_id: orgId }),
      supabase.from("personas").select("id, label").order("created_at"),
      supabase.from("persona_member_grants").select("*").eq("organization_id", orgId),
    ]);
    setMembers((m.data ?? []) as Member[]);
    setPersonas((p.data ?? []) as Persona[]);
    setGrants((g.data ?? []) as Grant[]);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const invite = async () => {
    if (!inviteIdent.trim()) return;
    setInviting(true);
    const { error } = await supabase.rpc("invite_org_member", {
      _org_id: orgId, _identifier: inviteIdent.trim(), _role: inviteRole,
    });
    setInviting(false);
    if (error) return toast({ title: "Invite failed", description: error.message, variant: "destructive" });
    toast({ title: "Member added", description: inviteIdent });
    setInviteIdent(""); setInviteOpen(false); load();
  };

  const updateGrant = async (personaId: string, memberId: string, section: string, permission: string | null) => {
    const existing = grants.find((g) => g.persona_id === personaId && g.member_user_id === memberId && g.section === section);
    if (!permission) {
      if (existing) await supabase.from("persona_member_grants").delete().eq("id", existing.id);
    } else if (existing) {
      await supabase.from("persona_member_grants").update({ permission }).eq("id", existing.id);
    } else {
      await supabase.from("persona_member_grants").insert({
        organization_id: orgId, persona_id: personaId, member_user_id: memberId, section, permission,
      });
    }
    load();
  };

  const applyPreset = async (personaId: string, memberId: string, presetName: string) => {
    const preset = PRESETS[presetName];
    if (!preset) return;
    const { error } = await supabase.rpc("set_persona_grants", {
      _org_id: orgId, _persona_id: personaId, _member: memberId, _grants: preset,
    });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: `Applied ${presetName}` });
    load();
  };

  const grantFor = (personaId: string, memberId: string, section: string) =>
    grants.find((g) => g.persona_id === personaId && g.member_user_id === memberId && g.section === section)?.permission ?? "none";

  if (loading) {
    return <Card><CardContent className="p-8 text-center text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading members…</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Team members</h2>
          <p className="text-sm text-muted-foreground">{members.length} {members.length === 1 ? "member" : "members"}</p>
        </div>
        <Button size="sm" onClick={() => setInviteOpen(true)}><UserPlus className="w-4 h-4 mr-1.5" />Invite member</Button>
      </div>

      <Card>
        <CardContent className="p-0 divide-y divide-border/40">
          {members.map((m) => (
            <div key={m.membership_id} className="flex items-center gap-3 p-4">
              <Avatar className="h-10 w-10">
                {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                <AvatarFallback>{(m.display_name || m.username || "?").slice(0,2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{m.display_name || m.username || "Unnamed"}</div>
                <div className="text-xs text-muted-foreground truncate">@{m.username ?? "—"}</div>
              </div>
              <Badge variant="outline" className="capitalize">{m.role}</Badge>
              <Button size="sm" variant="outline" onClick={() => setMatrixMember(m)}>
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Permissions
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite member</DialogTitle>
            <DialogDescription>Add a teammate by their username or public email.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Username or email</Label>
              <Input value={inviteIdent} onChange={(e) => setInviteIdent(e.target.value)} placeholder="alice" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as OrgRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={invite} disabled={inviting || !inviteIdent.trim()}>
              {inviting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions matrix dialog */}
      <Dialog open={!!matrixMember} onOpenChange={(o) => !o && setMatrixMember(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Permissions for {matrixMember?.display_name || matrixMember?.username}</DialogTitle>
            <DialogDescription>Pick a preset per persona, or fine-tune each section below.</DialogDescription>
          </DialogHeader>
          {matrixMember && (
            <div className="space-y-6">
              {personas.length === 0 && (
                <p className="text-sm text-muted-foreground">You haven't created any personas yet.</p>
              )}
              {personas.map((p) => (
                <div key={p.id} className="space-y-3 border border-border/40 rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h4 className="font-medium">{p.label}</h4>
                    <div className="flex gap-1">
                      {Object.keys(PRESETS).map((preset) => (
                        <Button key={preset} size="sm" variant="outline"
                          onClick={() => applyPreset(p.id, matrixMember.user_id, preset)}>
                          {preset}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {SECTIONS.map((s) => {
                      const current = grantFor(p.id, matrixMember.user_id, s);
                      return (
                        <div key={s} className="space-y-1">
                          <Label className="text-xs capitalize">{s}</Label>
                          <Select value={current} onValueChange={(v) => updateGrant(p.id, matrixMember.user_id, s, v === "none" ? null : v)}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No access</SelectItem>
                              {PERMS.map((perm) => (
                                <SelectItem key={perm} value={perm} className="capitalize">{perm}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
