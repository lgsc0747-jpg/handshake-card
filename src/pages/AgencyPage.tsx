import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Page, PageHeader } from "@/components/layout/Page";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Building2, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AgencyOverview } from "@/components/agency/AgencyOverview";
import { AgencyMembers } from "@/components/agency/AgencyMembers";
import { AgencyInbox } from "@/components/agency/AgencyInbox";
import { AgencyGoals } from "@/components/agency/AgencyGoals";
import { AgencyTemplates } from "@/components/agency/AgencyTemplates";
import { AgencySettings } from "@/components/agency/AgencySettings";

interface Org { id: string; name: string; slug: string; owner_user_id: string; }

const AgencyPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [accountType, setAccountType] = useState<"personal" | "agency">("personal");
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [activeOrg, setActiveOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const [newOrgName, setNewOrgName] = useState("");
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState("overview");

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

  const upgradeToAgency = async () => {
    const { error } = await supabase.from("profiles").update({ account_type: "agency" }).eq("user_id", user!.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setAccountType("agency");
  };

  const createOrg = async () => {
    if (!user || !newOrgName.trim()) return;
    setCreating(true);
    const slug = newOrgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
      + "-" + Math.random().toString(36).slice(2, 6);
    const { data, error } = await supabase.from("organizations")
      .insert({ name: newOrgName.trim(), slug, owner_user_id: user.id }).select().single();
    setCreating(false);
    if (error) return toast({ title: "Create failed", description: error.message, variant: "destructive" });
    toast({ title: "Workspace created" });
    setNewOrgName("");
    setOrgs((prev) => [data as Org, ...prev]);
    setActiveOrg(data as Org);
  };

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
          description="Delegate personas, manage leads together, and track goals as a team."
          actions={accountType !== "agency" ? (
            <Button size="sm" onClick={upgradeToAgency}>Switch to agency</Button>
          ) : null}
        />

        {loading ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…
          </CardContent></Card>
        ) : accountType !== "agency" ? (
          <Card><CardContent className="p-8 space-y-2">
            <h3 className="text-lg font-semibold">Personal account</h3>
            <p className="text-sm text-muted-foreground">Switch to an agency account to create a shared workspace, invite teammates, and delegate access to specific personas.</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-4">
            {/* Workspace switcher */}
            <div className="flex flex-wrap items-center gap-2">
              {orgs.map((o) => (
                <Button key={o.id} size="sm" variant={activeOrg?.id === o.id ? "default" : "outline"}
                  className="rounded-full" onClick={() => setActiveOrg(o)}>{o.name}</Button>
              ))}
              <div className="flex gap-1 ml-auto">
                <Input className="h-8 w-44" placeholder="New workspace"
                  value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createOrg()} />
                <Button size="sm" onClick={createOrg} disabled={creating || !newOrgName.trim()}>
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {!activeOrg ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Create your first workspace to get started.</CardContent></Card>
            ) : (
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="flex flex-wrap h-auto">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="members">Members</TabsTrigger>
                  <TabsTrigger value="inbox">Inbox</TabsTrigger>
                  <TabsTrigger value="goals">Goals</TabsTrigger>
                  <TabsTrigger value="templates">Templates</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="mt-4"><AgencyOverview orgId={activeOrg.id} /></TabsContent>
                <TabsContent value="members" className="mt-4"><AgencyMembers orgId={activeOrg.id} /></TabsContent>
                <TabsContent value="inbox" className="mt-4"><AgencyInbox orgId={activeOrg.id} /></TabsContent>
                <TabsContent value="goals" className="mt-4"><AgencyGoals orgId={activeOrg.id} /></TabsContent>
                <TabsContent value="templates" className="mt-4"><AgencyTemplates orgId={activeOrg.id} /></TabsContent>
                <TabsContent value="settings" className="mt-4"><AgencySettings orgId={activeOrg.id} orgName={activeOrg.name} /></TabsContent>
              </Tabs>
            )}
          </div>
        )}
      </Page>
    </DashboardLayout>
  );
};

export default AgencyPage;
