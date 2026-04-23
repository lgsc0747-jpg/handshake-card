import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Loader2,
  Download,
} from "lucide-react";

interface ActivityLog {
  id: string;
  entity_id: string;
  interaction_type: string | null;
  occasion: string | null;
  location: string | null;
  card_serial: string | null;
  notes: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  user_id: string;
  profiles: {
    display_name: string | null;
    username: string | null;
    email_public: string | null;
  } | null;
}

const USER_SEARCH_PLACEHOLDER = "Search by user (name, username, email)…";

const INTERACTION_TYPES = [
  "all",
  "profile_view",
  "card_flip",
  "vcard_download",
  "cta_click",
  "video_play",
  "contact_form_submit",
  "link_click",
  "social_click",
  "page_dwell",
  "tap",
];

const TYPE_COLORS: Record<string, string> = {
  profile_view: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  card_flip: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  vcard_download: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  cta_click: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  video_play: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  contact_form_submit: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  link_click: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  social_click: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  page_dwell: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  tap: "bg-teal-500/20 text-teal-400 border-teal-500/30",
};

const PAGE_SIZE = 50;

export function AdminActivityLog() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState("all");
  const [entitySearch, setEntitySearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [userSearchInput, setUserSearchInput] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-manage", {
      body: {
        action: "list_activity_logs",
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        interaction_type: typeFilter,
        entity_search: entitySearch || undefined,
        user_search: userSearch || undefined,
      },
    });
    if (error) {
      toast({ title: "Error", description: "Failed to load activity logs", variant: "destructive" });
    } else {
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [page, typeFilter, entitySearch, userSearch, toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = () => {
    setPage(0);
    setEntitySearch(searchInput);
    setUserSearch(userSearchInput);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Detect unusual patterns: many events from same entity in short span
  const entityCounts = logs.reduce<Record<string, number>>((acc, l) => {
    acc[l.entity_id] = (acc[l.entity_id] || 0) + 1;
    return acc;
  }, {});
  const suspiciousEntities = new Set(
    Object.entries(entityCounts)
      .filter(([, count]) => count >= 10)
      .map(([entity]) => entity)
  );

  const handleExport = () => {
    const rows = logs.map((l) => ({
      Time: formatDate(l.created_at),
      User: l.profiles?.display_name || l.profiles?.username || l.user_id,
      Entity: l.entity_id,
      Activity: l.interaction_type ?? "tap",
      Occasion: l.occasion ?? "",
      Location: l.location ?? "",
      Card: l.card_serial ?? "",
      Device: (l.metadata as any)?.device ?? "",
      Browser: (l.metadata as any)?.browser ?? "",
    }));
    const headers = Object.keys(rows[0] || {});
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => `"${(r as any)[h] ?? ""}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity_log_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-display flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          User Activity Log
          {suspiciousEntities.size > 0 && (
            <Badge variant="destructive" className="ml-2 text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {suspiciousEntities.size} unusual {suspiciousEntities.size === 1 ? "entity" : "entities"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={USER_SEARCH_PLACEHOLDER}
              value={userSearchInput}
              onChange={(e) => setUserSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by entity ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTERACTION_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t === "all" ? "All Activity Types" : t.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={logs.length === 0}>
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No activity logs found for the current filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Time</TableHead>
                  <TableHead className="text-xs">User</TableHead>
                  <TableHead className="text-xs">Activity</TableHead>
                  <TableHead className="text-xs">Entity</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Device</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Browser</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Card</TableHead>
                  <TableHead className="text-xs hidden xl:table-cell">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const isSuspicious = suspiciousEntities.has(log.entity_id);
                  const meta = log.metadata as Record<string, any> | null;
                  return (
                    <TableRow key={log.id} className={isSuspicious ? "bg-destructive/5" : ""}>
                      <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium truncate max-w-[120px]">
                            {log.profiles?.display_name ?? log.profiles?.username ?? "—"}
                          </span>
                          {log.profiles?.email_public && (
                            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                              {log.profiles.email_public}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs capitalize ${TYPE_COLORS[log.interaction_type ?? "tap"] ?? "bg-muted"}`}
                        >
                          {(log.interaction_type ?? "tap").replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        <div className="flex items-center gap-1">
                          {isSuspicious && <AlertTriangle className="w-3 h-3 text-destructive shrink-0" />}
                          <span className="truncate max-w-[140px]">{log.entity_id}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {meta?.device ?? "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {meta?.browser ?? "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                        {log.card_serial ?? "—"}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-xs text-muted-foreground truncate max-w-[160px]">
                        {log.notes ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {logs.length} of {total} entries
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-3 h-3 mr-1" /> Prev
            </Button>
            <span>
              Page {page + 1} of {Math.max(totalPages, 1)}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
