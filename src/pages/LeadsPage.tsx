import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Mail, User, Phone, Building2, MessageSquare, Loader2, Download } from "lucide-react";

interface Lead {
  id: string;
  visitor_name: string | null;
  visitor_email: string;
  visitor_phone: string | null;
  visitor_company: string | null;
  visitor_message: string | null;
  created_at: string;
  persona_id: string;
}

const LeadsPage = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("lead_captures")
      .select("*")
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setLeads((data as Lead[]) ?? []);
        setLoading(false);
      });

    const channel = supabase
      .channel("leads-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "lead_captures",
        filter: `owner_user_id=eq.${user.id}`,
      }, (payload) => {
        setLeads((prev) => [payload.new as Lead, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const exportLeadsCSV = () => {
    if (leads.length === 0) return;
    const rows: string[][] = [];

    rows.push(["HANDSHAKE — LEAD CAPTURES REPORT"]);
    rows.push([`Generated: ${new Date().toLocaleString()}`]);
    rows.push([`Total Leads: ${leads.length}`]);
    rows.push([]);

    rows.push(["═══ LEAD DATA ═══"]);
    rows.push(["#", "Date", "Name", "Email", "Phone", "Company", "Message"]);
    leads.forEach((lead, i) => {
      rows.push([
        String(i + 1),
        new Date(lead.created_at).toLocaleString(),
        lead.visitor_name || "—",
        lead.visitor_email,
        lead.visitor_phone || "—",
        lead.visitor_company || "—",
        (lead.visitor_message || "—").replace(/\n/g, " "),
      ]);
    });

    rows.push([]);
    rows.push(["═══ SUMMARY ═══"]);
    const withPhone = leads.filter((l) => l.visitor_phone).length;
    const withCompany = leads.filter((l) => l.visitor_company).length;
    const withMessage = leads.filter((l) => l.visitor_message).length;
    rows.push(["Leads with Phone", String(withPhone), `${Math.round((withPhone / leads.length) * 100)}%`]);
    rows.push(["Leads with Company", String(withCompany), `${Math.round((withCompany / leads.length) * 100)}%`]);
    rows.push(["Leads with Message", String(withMessage), `${Math.round((withMessage / leads.length) * 100)}%`]);

    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `handshake-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Lead Captures</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Contacts collected via Digital Handshake — visitors who exchanged their info to unlock your profile
            </p>
          </div>
          {leads.length > 0 && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={exportLeadsCSV}>
              <Download className="w-3 h-3" />
              Export CSV
            </Button>
          )}
        </div>

        {leads.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-12 text-center">
              <Mail className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No leads captured yet. Enable "Private Mode" on a persona and set "Require Contact Exchange" to start collecting visitor info.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">{leads.length} total leads</Badge>
              <Badge variant="secondary" className="text-xs">{leads.filter((l) => l.visitor_phone).length} with phone</Badge>
              <Badge variant="secondary" className="text-xs">{leads.filter((l) => l.visitor_company).length} with company</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {leads.map((lead) => (
                <Card key={lead.id} className="glass-card animate-fade-in">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{lead.visitor_name || "Anonymous"}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      <a href={`mailto:${lead.visitor_email}`} className="text-primary hover:underline">{lead.visitor_email}</a>
                    </div>
                    {lead.visitor_phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{lead.visitor_phone}</span>
                      </div>
                    )}
                    {lead.visitor_company && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{lead.visitor_company}</span>
                      </div>
                    )}
                    {lead.visitor_message && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MessageSquare className="w-3.5 h-3.5 mt-0.5" />
                        <span>{lead.visitor_message}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LeadsPage;
