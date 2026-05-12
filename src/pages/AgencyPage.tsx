import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Page, PageHeader } from "@/components/layout/Page";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Building2, Loader2 } from "lucide-react";
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
  const [activeOrg, setActiveOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");

  const loadOrg = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: profile }, { data: orgRows }] = await Promise.all([
      supabase.from("profiles").select("account_type, display_name, username").eq("user_id", user.id).maybeSingle(),
      supabase.from("organizations").select("*").eq("owner_user_id", user.id).order("created_at", { ascending: true }),
    ]);
    setAccountType((profile?.account_type as "personal" | "agency") ?? "personal");
    let org = (orgRows ?? [])[0] as Org | undefined;

    // Auto-provision a single workspace for agency accounts
    if (!org && profile?.account_type === "agency") {
      const baseName = profile.display_name || profile.username || "My Agency";
      const slug = (profile.username || "agency") + "-" + Math.random().toString(36).slice(2, 6);
      const { data: created, error } = await supabase
        .from("organizations")
        .insert({ name: baseName, slug, owner_user_id: user.id })
        .select()
        .single();
      if (!error && created) org = created as Org;
    }

    setActiveOrg(org ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadOrg(); }, [loadOrg]);

  const upgradeToAgency = async () => {
    const { error } = await supabase.from("profiles").update({ account_type: "agency" }).eq("user_id", user!.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setAccountType("agency");
    loadOrg();
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
          description={
            activeOrg
              ? `${activeOrg.name} · your shared workspace`
              : "Delegate personas, manage leads together, and track goals as a team."
          }
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
            <p className="text-sm text-muted-foreground">Switch to an agency account to enable a shared workspace tied to your account, invite teammates, and delegate access to specific personas.</p>
          </CardContent></Card>
        ) : !activeOrg ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Setting up your workspace…</CardContent></Card>
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
            <TabsContent value="members" className="mt-4">
              <AgencyMembers orgId={activeOrg.id} ownerUserId={activeOrg.owner_user_id} onLeft={loadOrg} />
            </TabsContent>
            <TabsContent value="inbox" className="mt-4"><AgencyInbox orgId={activeOrg.id} /></TabsContent>
            <TabsContent value="goals" className="mt-4"><AgencyGoals orgId={activeOrg.id} /></TabsContent>
            <TabsContent value="templates" className="mt-4"><AgencyTemplates orgId={activeOrg.id} /></TabsContent>
            <TabsContent value="settings" className="mt-4"><AgencySettings orgId={activeOrg.id} orgName={activeOrg.name} /></TabsContent>
          </Tabs>
        )}
      </Page>
    </DashboardLayout>
  );
};

export default AgencyPage;
