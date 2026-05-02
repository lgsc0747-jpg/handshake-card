import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface LogRow {
  id: string;
  interaction_type: string;
  created_at: string;
  metadata: Record<string, any> | null;
}

const TYPE_EMOJI: Record<string, string> = {
  profile_view: "👁",
  vcard_download: "📇",
  cv_download: "📄",
  link_click: "🔗",
  cta_click: "👆",
  card_flip: "🔁",
  contact_form_submit: "✉️",
  video_play: "▶",
  security_attempt: "🔒",
};

export function RecentInteractionsPanel({ userId, personaId }: { userId: string; personaId: string | null }) {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);

    const load = async () => {
      const { data } = await supabase
        .from("interaction_logs")
        .select("id, interaction_type, created_at, metadata")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(25);
      if (!cancelled) {
        const filtered = personaId
          ? (data ?? []).filter((l) => {
              const meta = (l.metadata as any) ?? {};
              return !meta.persona_id || meta.persona_id === personaId;
            })
          : (data ?? []);
        setLogs(filtered as LogRow[]);
        setLoading(false);
      }
    };
    load();

    const channel = supabase
      .channel(`pb-interactions-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "interaction_logs", filter: `user_id=eq.${userId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId, personaId]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="w-3.5 h-3.5 text-primary" />
        <h3 className="text-xs font-semibold">Recent Interactions</h3>
      </div>
      <p className="text-[10px] text-muted-foreground">Latest 25 visitor events. Live-updating.</p>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <p className="text-[11px] text-muted-foreground text-center py-4">No interactions yet.</p>
      ) : (
        <div className="space-y-1">
          {logs.map((l) => (
            <div key={l.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-border/40 bg-card/40">
              <span className="text-sm leading-none">{TYPE_EMOJI[l.interaction_type] ?? "•"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium capitalize truncate">
                  {l.interaction_type.replace(/_/g, " ")}
                </p>
                <p className="text-[9px] text-muted-foreground">
                  {formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
