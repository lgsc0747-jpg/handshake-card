import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Page, PageHeader, PageSection } from "@/components/layout/Page";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Building2, Plus, ShieldCheck, UserPlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { fadeUp } from "@/lib/motion";

type OrgRole = "owner" | "admin" | "manager" | "member";
interface Org { id: string; name: string; slug: string; owner_user_id: string; }
interface MemberRow {
  membership_id: string;
  user_id: string;
  role: OrgRole;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}
interface PermRow {
  id: string;
  member_user_id: string;
  resource_type: string;
  permission: string;
  resource_id: string | null;
}

const RESOURCES = ["persona", "lead", "card", "page", "analytics"] as const;
const PERMS = ["view", "edit", "delete", "manage"] as const;
type ResourceType = typeof RESOURCES[number];
type Permission = typeof PERMS[number];

const initials = (m: MemberRow) =>
  (m.display_name || m.username || m.user_id).slice(0, 2).toUpperCase();

const AgencyPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [accountType, setAccountType] = useState<"personal" | "agency">("personal");
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [activeOrg, setActiveOrg] = useState<Org | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [perms, setPerms] = useState<PermRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOrgName, setNewOrgName] = useState("");
  const [creating, setCreating] = useState(false);

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteIdent, setInviteIdent] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("member");
  const [inviting, setInviting] = useState(false);

  const loadOrgs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: profile }, { data: orgRows }] = await Promise.all([
      supabase.from("profiles").select("account_type").eq("user_id", user.id).maybeSingle(),
      supabase.from("organizations").select("*").order("created_at", { ascending: false }),
    ]);
    setAccountType((profile?.account_type as any) ?? "personal");
    const list = (orgRows ?? []) as Org[];
    setOrgs(list);
    setActiveOrg((cur) => cur && list.find((o) => o.id === cur.id) ? cur : (list[0] ?? null));
    setLoading(false);
  }, [user]);

  useEffect(() => { loadOrgs(); }, [loadOrgs]);

  const loadMembersAndPerms = useCallback(async (orgId: string) => {
    const [m, p] = await Promise.all([
      supabase.rpc("get_org_member_profiles", { _org_id: orgId }),
      supabase.from("member_permissions").select("*").eq("organization_id", orgId),
    ]);
    setMembers(((m.data ?? []) as MemberRow[]));
    setPerms(((p.data ?? []) as PermRow[]));
  }, []);

  useEffect(() => {
    if (!activeOrg) { setMembers([]); setPerms([]); return; }
    loadMembersAndPerms(activeOrg.id);
  }, [activeOrg, loadMembersAndPerms]);

  const upgradeToAgency = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ account_type: "agency" }).eq("user_id", user.id);
    if (error) return toast({ title: "Upgrade failed", description: error.message, variant: "destructive" });
    setAccountType("agency");
    toast({ title: "Switched to agency", description: "You can now create a workspace." });
  };

  const switchToPersonal = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ account_type: "personal" }).eq("user_id", user.id);
    if (error) return toast({ title: "Switch failed", description: error.message, variant: "destructive" });
    setAccountType("personal");
    toast({ title: "Switched to personal" });
  };

  const createOrg = async () => {
    if (!user || !newOrgName.trim()) return;
    setCreating(true);
    const slug = newOrgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
      + "-" + Math.random().toString(36).slice(2, 6);
    const { data, error } = await supabase
      .from("organizations")
      .insert({ name: newOrgName.trim(), slug, owner_user_id: user.id })
      .select()
      .single();
    setCreating(false);
    if (error) return toast({ title: "Create failed", description: error.message, variant: "destructive" });
    setNewOrgName("");
    toast({ title: "Workspace created", description: data.name });
    const created = data as Org;
    setOrgs((prev) => [created, ...prev.filter((o) => o.id !== created.id)]);
    setActiveOrg(created);
    // Membership row is created by trigger; refresh after a tick
    setTimeout(() => loadMembersAndPerms(created.id), 250);
  };

  const invite = async () => {
    if (!activeOrg || !inviteIdent.trim()) return;
    setInviting(true);
    const { error } = await supabase.rpc("invite_org_member", {
      _org_id: activeOrg.id,
      _identifier: inviteIdent.trim(),
      _role: inviteRole,
    });
    setInviting(false);
    if (error) return toast({ title: "Invite failed", description: error.message, variant: "destructive" });
    toast({ title: "Member added", description: inviteIdent });
    setInviteIdent("");
    setInviteOpen(false);
    loadMembersAndPerms(activeOrg.id);
  };

  const togglePerm = async (memberUserId: string, resource: ResourceType, permission: Permission) => {
    if (!activeOrg) return;
    const existing = perms.find(
      (p) => p.member_user_id === memberUserId && p.resource_type === resource
        && p.permission === permission && p.resource_id === null,
    );
    if (existing) {
      await supabase.from("member_permissions").delete().eq("id", existing.id);
    } else {
      await supabase.from("member_permissions").insert({
        organization_id: activeOrg.id,
        member_user_id: memberUserId,
        resource_type: resource,
        permission,
      });
    }
    loadMembersAndPerms(activeOrg.id);
  };

  const hasPerm = (uid: string, r: ResourceType, p: Permission) =>
    perms.some((x) => x.member_user_id === uid && x.resource_type === r
      && x.permission === p && x.resource_id === null);

  return (
    <DashboardLayout>
      <Page>
        <PageHeader
          title={
            <span className="inline-flex items-center gap-2">
              <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-[var(--shadow-card)]">
                <Building2 className="w-4 h-4 text-primary-foreground" />
              </span>
              Agency
            </span>
          }
          description="Manage workspaces, invite members and grant per-feature access."
          actions={
            accountType === "agency" ? (
              <Button variant="outline" size="sm" onClick={switchToPersonal}>Switch to personal</Button>
            ) : (
              <Button size="sm" onClick={upgradeToAgency}>Switch to agency</Button>
            )
          }
        />

        {loading ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</CardContent></Card>
        ) : accountType !== "agency" ? (
          <Card>
            <CardContent className="p-6 sm:p-8 space-y-3">
              <h3 className="text-lg font-semibold">Personal account</h3>
              <p className="text-sm text-muted-foreground">
                You're on a personal account. Switch to agency to create a shared workspace and invite members with granular access controls.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <PageSection title="Workspaces">
              <div className="flex flex-wrap gap-2 mb-3">
                {orgs.map((o) => (
                  <Button
                    key={o.id}
                    size="sm"
                    variant={activeOrg?.id === o.id ? "default" : "outline"}
                    onClick={() => setActiveOrg(o)}
                    className="rounded-full"
                  >
                    {o.name}
                  </Button>
                ))}
                {orgs.length === 0 && (
                  <p className="text-xs text-muted-foreground">No workspaces yet — create your first one below.</p>
                )}
              </div>
              <Card>
                <CardContent className="p-4 flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="New workspace name"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createOrg()}
                  />
                  <Button onClick={createOrg} disabled={creating || !newOrgName.trim()}>
                    {creating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Plus className="w-4 h-4 mr-1.5" />}
                    Create
                  </Button>
                </CardContent>
              </Card>
            </PageSection>

            {activeOrg && (
              <PageSection
                title="Members & permissions"
                description="Owners and admins have all permissions implicitly. Toggle per-feature access for managers and members."
                actions={
                  <Button size="sm" onClick={() => setInviteOpen(true)}>
                    <UserPlus className="w-4 h-4 mr-1.5" />Invite member
                  </Button>
                }
              >
                <Card>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="text-left p-3">Member</th>
                          <th className="text-left p-3">Role</th>
                          {RESOURCES.map((r) => (
                            <th key={r} colSpan={PERMS.length} className="text-center p-3 capitalize border-l border-border/40">
                              {r}
                            </th>
                          ))}
                        </tr>
                        <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          <th></th>
                          <th></th>
                          {RESOURCES.map((r) => PERMS.map((p) => (
                            <th key={r + p} className="px-1 pb-2 text-center font-medium">{p}</th>
                          )))}
                        </tr>
                      </thead>
                      <tbody>
                        {members.length === 0 && (
                          <tr><td colSpan={2 + RESOURCES.length * PERMS.length} className="p-6 text-center text-muted-foreground text-xs">No members yet.</td></tr>
                        )}
                        {members.map((m) => {
                          const isPrivileged = m.role === "owner" || m.role === "admin";
                          return (
                            <motion.tr
                              key={m.membership_id}
                              variants={fadeUp}
                              initial="initial"
                              animate="animate"
                              className="border-t border-border/50"
                            >
                              <td className="p-3">
                                <div className="flex items-center gap-2 min-w-[160px]">
                                  <Avatar className="w-7 h-7">
                                    {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                                    <AvatarFallback className="text-[10px]">{initials(m)}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-medium leading-tight">
                                      {m.display_name || m.username || "—"}
                                      {m.user_id === user?.id && <span className="text-muted-foreground font-normal"> (you)</span>}
                                    </span>
                                    {m.username && (
                                      <span className="text-[10px] text-muted-foreground leading-tight">@{m.username}</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-3">
                                <Badge variant={isPrivileged ? "default" : "secondary"} className="rounded-full text-[10px]">
                                  {m.role}
                                </Badge>
                              </td>
                              {RESOURCES.map((r) => PERMS.map((p) => (
                                <td key={r + p} className="px-1 py-3 text-center border-l border-border/20">
                                  {isPrivileged ? (
                                    <ShieldCheck className="w-3.5 h-3.5 text-primary mx-auto opacity-60" />
                                  ) : (
                                    <Checkbox
                                      checked={hasPerm(m.user_id, r, p)}
                                      onCheckedChange={() => togglePerm(m.user_id, r, p)}
                                      aria-label={`${r} ${p}`}
                                    />
                                  )}
                                </td>
                              )))}
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </PageSection>
            )}
          </>
        )}

        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite member</DialogTitle>
              <DialogDescription>
                Add an existing user to <span className="font-medium">{activeOrg?.name}</span> by username or public email.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="invite-ident">Username or email</Label>
                <Input
                  id="invite-ident"
                  placeholder="jane or jane@example.com"
                  value={inviteIdent}
                  onChange={(e) => setInviteIdent(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && invite()}
                />
              </div>
              <div className="space-y-1.5">
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
                {inviting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                Add member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Page>
    </DashboardLayout>
  );
};

export default AgencyPage;
