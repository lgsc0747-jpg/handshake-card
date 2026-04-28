import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type State = "loading" | "valid" | "invalid" | "already" | "success" | "error";

export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    (async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`;
        const res = await fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } });
        const data = await res.json();
        if (data.valid) setState("valid");
        else if (data.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      } catch { setState("error"); }
    })();
  }, [token]);

  const confirm = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      if (error || !data?.success) setState("error"); else setState("success");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          {state === "loading" && <Loader2 className="h-7 w-7 animate-spin text-primary" />}
          {(state === "success" || state === "already") && <CheckCircle2 className="h-7 w-7 text-primary" />}
          {(state === "invalid" || state === "error") && <AlertTriangle className="h-7 w-7 text-destructive" />}
          {state === "valid" && <AlertTriangle className="h-7 w-7 text-primary" />}
        </div>
        <h1 className="text-xl font-semibold mb-2">
          {state === "loading" && "Checking your link…"}
          {state === "valid" && "Unsubscribe from emails?"}
          {state === "success" && "You're unsubscribed"}
          {state === "already" && "Already unsubscribed"}
          {state === "invalid" && "Invalid link"}
          {state === "error" && "Something went wrong"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {state === "valid" && "You'll stop receiving notification and digest emails from handshake-card. You can re-enable them anytime in Settings."}
          {state === "success" && "We've removed you from the list. Transactional emails (security, account) will still be sent."}
          {state === "already" && "This email address has already been unsubscribed."}
          {state === "invalid" && "This unsubscribe link is invalid or has expired."}
          {state === "error" && "Please try again in a moment."}
        </p>
        {state === "valid" && (
          <Button onClick={confirm} disabled={busy} className="w-full">
            {busy ? "Unsubscribing…" : "Confirm unsubscribe"}
          </Button>
        )}
      </div>
    </div>
  );
}
