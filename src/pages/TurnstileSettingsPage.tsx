import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { supabase } from "@/integrations/supabase/client";
import { TurnstileDiagnostics } from "@/components/auth/TurnstileDiagnostics";
import { Loader2, Save, Shield, Sliders, Globe } from "lucide-react";

interface TurnstileRow {
  id: string;
  environment: "dev" | "preview" | "prod";
  site_key: string;
  secret_key: string;
  allowed_hostnames: string[];
  enabled: boolean;
  notes: string | null;
}

const ENV_LABELS: Record<TurnstileRow["environment"], { title: string; hint: string }> = {
  dev: { title: "Development", hint: "localhost & 127.0.0.1" },
  preview: { title: "Preview", hint: "*.lovable.app · *.lovableproject.com" },
  prod: { title: "Production", hint: "Your custom production hostnames" },
};

const TurnstileSettingsPage = () => {
  const { isSuperAdmin, loading: roleLoading } = useIsSuperAdmin();
  const { toast } = useToast();
  const [rows, setRows] = useState<TurnstileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("turnstile_config")
      .select("*")
      .order("environment");
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    } else {
      setRows((data ?? []) as TurnstileRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isSuperAdmin) fetchRows();
  }, [isSuperAdmin]);

  const updateRow = (id: string, patch: Partial<TurnstileRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const saveRow = async (row: TurnstileRow) => {
    setSaving(row.id);
    const { error } = await supabase
      .from("turnstile_config")
      .update({
        site_key: row.site_key,
        secret_key: row.secret_key,
        allowed_hostnames: row.allowed_hostnames,
        enabled: row.enabled,
        notes: row.notes,
      })
      .eq("id", row.id);
    setSaving(null);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: `${ENV_LABELS[row.environment].title} config updated.` });
    }
  };

  if (roleLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Shield className="w-12 h-12 text-destructive" />
          <h1 className="text-xl font-display font-bold">Super-admin only</h1>
          <p className="text-muted-foreground text-sm">
            Turnstile configuration is restricted to super-admins.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Sliders className="w-6 h-6 text-primary" />
            Turnstile Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage Cloudflare Turnstile keys and allowed hostnames per environment. Dev and preview
            default to test keys that always pass; production uses your real keys.
          </p>
        </div>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Live diagnostics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TurnstileDiagnostics compact />
          </CardContent>
        </Card>

        {rows.map((row) => (
          <Card key={row.id} className="glass-card">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-display flex items-center gap-2">
                    {ENV_LABELS[row.environment].title}
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {row.environment}
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {ENV_LABELS[row.environment].hint}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`enabled-${row.id}`} className="text-xs text-muted-foreground">
                    Enabled
                  </Label>
                  <Switch
                    id={`enabled-${row.id}`}
                    checked={row.enabled}
                    onCheckedChange={(v) => updateRow(row.id, { enabled: v })}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Site key (public)</Label>
                  <Input
                    value={row.site_key}
                    onChange={(e) => updateRow(row.id, { site_key: e.target.value })}
                    placeholder="0x4AAAAAAA..."
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Secret key (private)</Label>
                  <Input
                    type="password"
                    value={row.secret_key}
                    onChange={(e) => updateRow(row.id, { secret_key: e.target.value })}
                    placeholder="0x4AAAAAAA..."
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  Allowed hostnames{" "}
                  <span className="text-muted-foreground">(comma-separated; matches subdomains)</span>
                </Label>
                <Input
                  value={row.allowed_hostnames.join(", ")}
                  onChange={(e) =>
                    updateRow(row.id, {
                      allowed_hostnames: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="lovable.app, handshake-card.lovable.app"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Input
                  value={row.notes ?? ""}
                  onChange={(e) => updateRow(row.id, { notes: e.target.value })}
                  placeholder="Optional notes"
                  className="text-xs"
                />
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button size="sm" onClick={() => saveRow(row)} disabled={saving === row.id}>
                  {saving === row.id ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Save {ENV_LABELS[row.environment].title}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        <p className="text-xs text-muted-foreground">
          Production secret can also be supplied via the <code className="text-foreground">TURNSTILE_SECRET_KEY</code>{" "}
          environment variable; the DB value takes precedence when present and enabled.
        </p>
      </div>
    </DashboardLayout>
  );
};

export default TurnstileSettingsPage;
