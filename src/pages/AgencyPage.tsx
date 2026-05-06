import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Page, PageHeader, PageSection } from "@/components/layout/Page";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Building2, Plus, Users, ShieldCheck, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { fadeUp, springIOS } from "@/lib/motion";

type OrgRole = "owner" | "admin" | "manager" | "member";
interface Org { id: string; name: string; slug: string; owner_user_id: string; }
interface Member { id: string; user_id: string; role: OrgRole; }

const RESOURCES = ["persona", "lead", "card", "page", "analytics"] as const;
const PERMS = ["view", "edit", "delete", "manage"] as const;
type ResourceType = typeof RESOURCES[number];
type Permission = typeof PERMS[number];

const AgencyPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [accountType, setAccountType] = useState<"personal" | "agency">("personal");
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [activeOrg, setActiveOrg] = useState<Org | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [perms, setPerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOrgName, setNewOrgName] = useState("");
  const [creating, setCreating] = useState(false);

  const loadOrgs = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: profile }, { data: orgRows }] = await Promise.all([
      supabase.from("profiles").select("account_type").eq("user_id", user.id).maybeSingle(),
      supabase.from("organizations").select("*").order("created_at", { ascending: false }),
    ]);
    setAccountType((profile?.account_type as any) ?? "personal");
    const list = (orgRows ?? []) as Org[];
    setOrgs(list);
    if (list.length && !activeOrg) setActiveOrg(list[0]);
    setLoading(false);
  };

  useEffect(() => { loadOrgs(); /* eslint-disable-line */ }, [user]);

  useEffect(() => {
    if (!activeOrg) { setMembers([]); setPerms([]); return; }
    (async () => {
      const [m, p] = await Promise.all([
        supabase.from("organization_members").select("*").eq("organization_id", activeOrg.id),
        supabase.from("member_permissions").select("*").eq("organization_id", activeOrg.id),
      ]);
      setMembers((m.data ?? []) as Member[]);
      setPerms(p.data ?? []);
    })();
  }, [activeOrg]);

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
    const slug = newOrgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).slice(2, 6);
    const { data, error } = await supabase
      .from("organizations")
      .insert({ name: newOrgName.trim(), slug, owner_user_id: user.id })
      .select()
      .single();
    setCreating(false);
    if (error) return toast({ title: "Create failed", description: error.message, variant: "destructive" });
    setNewOrgName("");
    toast({ title: "Workspace created", description: data.name });
    loadOrgs();
    setActiveOrg(data as Org);
  };

  const togglePerm = async (memberUserId: string, resource: ResourceType, permission: Permission) => {
    if (!activeOrg) return;
    const existing = perms.find(
      (p) => p.member_user_id === memberUserId && p.resource_type === resource && p.permission === permission && p.resource_id === null,
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
    const p = await supabase.from("member_permissions").select("*").eq("organization_id", activeOrg.id);
    setPerms(p.data ?? []);
  };

  const hasPerm = (uid: string, r: ResourceType, p: Permission) =>
    perms.some((x) => x.member_user_id === uid && x.resource_type === r && x.permission === p && x.resource_id === null);

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
                    <Plus className="w-4 h-4 mr-1.5" />Create
                  </Button>
                </CardContent>
              </Card>
            </PageSection>

            {activeOrg && (
              <PageSection title="Members & permissions" description="Owners and admins have all permissions implicitly. Toggle per-feature access for managers and members.">
                <Card>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="text-left p-3">Member</th>
                          <th className="text-left p-3">Role</th>
                          {RESOURCES.map((r) => (
                            <th key={r} className="text-center p-3 capitalize">{r}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((m) => {
                          const isPrivileged = m.role === "owner" || m.role === "admin";
                          return (
                            <motion.tr
                              key={m.id}
                              variants={fadeUp}
                              initial="initial"
                              animate="animate"
                              className="border-t border-border/50"
                            >
                              <td className="p-3 font-mono text-xs truncate max-w-[180px]">
                                {m.user_id === user?.id ? "You" : m.user_id.slice(0, 8) + "…"}
                              </td>
                              <td className="p-3">
                                <Badge variant={isPrivileged ? "default" : "secondary"} className="rounded-full text-[10px]">
                                  {m.role}
                                </Badge>
                              </td>
                              {RESOURCES.map((r) => (
                                <td key={r} className="p-3 text-center">
                                  {isPrivileged ? (
                                    <ShieldCheck className="w-4 h-4 text-primary mx-auto" />
                                  ) : (
                                    <Sheet>
                                      <SheetTrigger asChild>
                                        <Button size="sm" variant="ghost" className="text-xs">
                                          {PERMS.filter((p) => hasPerm(m.user_id, r, p)).length || "—"}
                                        </Button>
                                      </SheetTrigger>
                                      <SheetContent>
                                        <SheetHeader>
                                          <SheetTitle className="capitalize">{r} permissions</SheetTitle>
                                        </SheetHeader>
                                        <div className="mt-4 space-y-3">
                                          {PERMS.map((p) => (
                                            <div key={p} className="flex items-center justify-between ios-row px-3 py-2">
                                              <Label className="capitalize">{p}</Label>
                                              <Switch
                                                checked={hasPerm(m.user_id, r, p)}
                                                onCheckedChange={() => togglePerm(m.user_id, r, p)}
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      </SheetContent>
                                    </Sheet>
                                  )}
                                </td>
                              ))}
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
      </Page>
    </DashboardLayout>
  );
};

export default AgencyPage;
