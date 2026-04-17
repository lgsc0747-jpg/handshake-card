import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ChartTitleWithInfo } from "@/components/dashboard/ChartTitleWithInfo";

interface Lead {
  id: string;
  visitor_name: string | null;
  visitor_email: string;
  visitor_company: string | null;
  created_at: string;
}

export function LeadGenTracker() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("lead_captures")
      .select("id, visitor_name, visitor_email, visitor_company, created_at")
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setLeads((data as Lead[]) ?? []));
  }, [user]);

  const timeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-2">
        <ChartTitleWithInfo
          icon={<Users className="w-4 h-4" />}
          title="Lead Gen Tracker"
          info="Most recent visitors who submitted the contact form on a private persona — each row is a warm lead waiting for follow-up."
        />
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leads captured yet. Enable Private Mode on a persona to start collecting contacts.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs">Company</TableHead>
                <TableHead className="text-xs text-right">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="text-sm font-medium">{lead.visitor_name || "—"}</TableCell>
                  <TableCell className="text-sm">
                    <Badge variant="outline" className="text-xs font-mono">{lead.visitor_email}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{lead.visitor_company || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground text-right">{timeSince(lead.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
