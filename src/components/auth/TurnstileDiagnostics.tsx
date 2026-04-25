import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Stethoscope, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { currentHostname } from "@/lib/turnstileEnv";

interface TurnstileDiagnosticsProps {
  captchaToken?: string | null;
  compact?: boolean;
}

interface DiagnoseResult {
  ok: boolean;
  detected_environment: string;
  detected_hostname: string;
  config_present: boolean;
  hostname_whitelisted: boolean;
  site_key_in_use: string | null;
  error_codes?: string[];
  hint?: string;
}

export function TurnstileDiagnostics({ captchaToken, compact }: TurnstileDiagnosticsProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnoseResult | null>(null);

  const runDiagnose = async () => {
    setLoading(true);
    setResult(null);
    const { data, error } = await supabase.functions.invoke("turnstile-diagnose", {
      body: { hostname: currentHostname(), captcha_token: captchaToken ?? "" },
    });
    if (error) {
      setResult({
        ok: false,
        detected_environment: "unknown",
        detected_hostname: currentHostname(),
        config_present: false,
        hostname_whitelisted: false,
        site_key_in_use: null,
        hint: `Network error: ${error.message}`,
      });
    } else {
      setResult(data as DiagnoseResult);
    }
    setLoading(false);
  };

  return (
    <div className={compact ? "" : "mt-3"}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 mx-auto"
      >
        <Stethoscope className="w-3 h-3" />
        Having trouble with the security check?
      </button>

      {open && (
        <div className="mt-3 p-3 rounded-lg bg-muted/30 border border-border space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              Hostname: <span className="text-foreground font-mono">{currentHostname()}</span>
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={runDiagnose}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Run test"}
            </Button>
          </div>

          {result && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                {result.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                )}
                <span className="font-medium">
                  {result.ok ? "Turnstile is healthy" : "Issue detected"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
                <span>Environment:</span>
                <span className="font-mono text-foreground">{result.detected_environment}</span>
                <span>Config in DB:</span>
                <span className="font-mono text-foreground">{result.config_present ? "yes" : "no"}</span>
                <span>Hostname allow-listed:</span>
                <span className="font-mono text-foreground">
                  {result.hostname_whitelisted ? "yes" : "no"}
                </span>
                {result.site_key_in_use && (
                  <>
                    <span>Site key:</span>
                    <span className="font-mono text-foreground truncate">{result.site_key_in_use}</span>
                  </>
                )}
                {result.error_codes && result.error_codes.length > 0 && (
                  <>
                    <span>Error codes:</span>
                    <span className="font-mono text-destructive">{result.error_codes.join(", ")}</span>
                  </>
                )}
              </div>
              {result.hint && (
                <p className="pt-1.5 text-foreground/80 leading-relaxed">{result.hint}</p>
              )}
            </div>
          )}

          {!result && !loading && (
            <p className="text-muted-foreground leading-relaxed">
              Solve the CAPTCHA above first, then click Run test to verify connectivity and check
              hostname whitelisting in Cloudflare.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
