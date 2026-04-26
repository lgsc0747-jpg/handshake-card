import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Zap } from "lucide-react";
import { createElement } from "react";

/**
 * Subscribes to realtime lead_captures + interaction_logs for the current user
 * and fires sonner toasts (gated by notifPrefs) and feeds the notification bell.
 *
 * Mounted once at the app root. Must be inside <PreferencesProvider>.
 *
 * Tap toasts are throttled to once per 60 s so a busy day doesn't drown out the UI.
 */
export function NotificationListener() {
  const { user } = useAuth();
  const { prefs, addNotification } = usePreferences();
  const lastTapToastAtRef = useRef<number>(0);

  const inAppLeads = prefs.notifPrefs?.inAppLeads ?? true;
  const inAppTaps = prefs.notifPrefs?.inAppTaps ?? true;

  useEffect(() => {
    if (!user) return;

    const leadsChannel = supabase
      .channel(`notifs_leads_${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "lead_captures",
        filter: `owner_user_id=eq.${user.id}`,
      }, (payload: any) => {
        const lead = payload.new;
        const name = lead.visitor_name || lead.visitor_email || "A new visitor";

        addNotification({
          type: "lead",
          title: "New lead captured",
          message: `${name} submitted their contact details.`,
          meta: { leadId: lead.id, personaId: lead.persona_id },
        });

        if (inAppLeads) {
          toast.success(`New lead: ${name}`, {
            description: lead.visitor_company || lead.visitor_email || "Tap to view in Leads.",
            icon: createElement(Users, { className: "w-4 h-4" }),
          });
        }
      })
      .subscribe();

    const tapsChannel = supabase
      .channel(`notifs_taps_${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "interaction_logs",
        filter: `user_id=eq.${user.id}`,
      }, (payload: any) => {
        const log = payload.new;
        // Only toast once per minute; bell still gets every tap (capped to 50)
        const now = Date.now();
        const meta = (log.metadata as Record<string, any>) ?? {};
        const device = meta.device ? ` from ${meta.device}` : "";

        addNotification({
          type: "tap",
          title: log.occasion || log.interaction_type || "Card tap",
          message: `Interaction recorded${device}.`,
          meta: { logId: log.id, entityId: log.entity_id },
        });

        if (inAppTaps && now - lastTapToastAtRef.current > 60_000) {
          lastTapToastAtRef.current = now;
          toast(`${log.occasion || "Card tap"}${device}`, {
            icon: createElement(Zap, { className: "w-4 h-4" }),
            duration: 3000,
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(tapsChannel);
    };
  }, [user?.id, inAppLeads, inAppTaps, addNotification]);

  return null;
}
