import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ShortUrlRedirect = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!code) {
      navigate("/", { replace: true });
      return;
    }

    const resolve = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "resolve-short-link",
          { body: { code } }
        );

        if (fnError || !data?.username) {
          setError(true);
          return;
        }

        // Stash the resolved short-link metadata so PublicProfilePage can
        // attribute this view as an NFC tap — even when the short link has
        // no card bound yet, arriving via /u/<code> still means a physical
        // device tap (NFC chip or printed QR routed through the shortener).
        try {
          sessionStorage.setItem(
            "tap_origin",
            JSON.stringify({
              card_id: data.card_id ?? null,
              card_serial: data.card_serial ?? null,
              short_code: code,
              source: "short_link",
              ts: Date.now(),
            })
          );
        } catch {
          // sessionStorage may be unavailable — fail silently.
        }

        const path = data.persona_slug
          ? `/p/${data.username}/${data.persona_slug}`
          : `/p/${data.username}`;
        navigate(path, { replace: true });
      } catch {
        setError(true);
      }
    };

    resolve();
  }, [code, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">This short link is invalid or expired.</p>
        <Link to="/" className="text-primary underline text-sm">Go home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
};

export default ShortUrlRedirect;
