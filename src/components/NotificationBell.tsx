import { useNavigate } from "react-router-dom";
import { Bell, Check, Trash2, Users, Zap, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { usePreferences, type AppNotification } from "@/contexts/PreferencesContext";

function timeSince(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function NotifIcon({ type }: { type: AppNotification["type"] }) {
  if (type === "lead") return <Users className="w-3.5 h-3.5 text-primary" />;
  if (type === "tap") return <Zap className="w-3.5 h-3.5 text-amber-500" />;
  return <Info className="w-3.5 h-3.5 text-muted-foreground" />;
}

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead, clearNotifications } = usePreferences();
  const navigate = useNavigate();

  const handleClick = (n: AppNotification) => {
    if (n.type === "lead") navigate("/leads");
    else if (n.type === "tap") navigate("/logs");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8" aria-label="Notifications">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <p className="text-sm font-display font-semibold">Notifications</p>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{unreadCount} new</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {notifications.length > 0 && (
              <>
                <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={markAllRead} title="Mark all read">
                  <Check className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-[10px] text-muted-foreground hover:text-destructive" onClick={clearNotifications} title="Clear all">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">You're all caught up.</p>
              <p className="text-[10px] text-muted-foreground/70 mt-1">New leads and card taps will show up here.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left flex items-start gap-2.5 px-3 py-2.5 hover:bg-muted/40 transition-colors ${!n.read ? "bg-primary/5" : ""}`}
                >
                  <div className="mt-0.5 shrink-0"><NotifIcon type={n.type} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-medium truncate">{n.title}</p>
                      <span className="text-[9px] text-muted-foreground shrink-0">{timeSince(n.createdAt)}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{n.message}</p>
                  </div>
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
