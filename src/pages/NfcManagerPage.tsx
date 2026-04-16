import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { QRCodeSVG } from "qrcode.react";
import {
  Link2, Copy, Check, Download, Smartphone, ExternalLink, Info, Loader2, LayoutPanelLeft, User, Crown,
} from "lucide-react";
import { Label } from "@/components/ui/label";

const NfcManagerPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPro } = useSubscription();
  const [username, setUsername] = useState<string | null>(null);
  const [shortCode, setShortCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shortened, setShortened] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [pageMode, setPageMode] = useState<string>("personal");
  const [activePersonaId, setActivePersonaId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const init = async () => {
      // Get username
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", user.id)
        .single();

      setUsername(profile?.username ?? null);

      // Get active persona for page_mode toggle
      const { data: personaData } = await supabase
        .from("personas")
        .select("id, page_mode")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .single();
      if (personaData) {
        setActivePersonaId(personaData.id);
        setPageMode(personaData.page_mode ?? "personal");
      }
      // Get or create short link
      const { data: existingLink } = await supabase
        .from("short_links")
        .select("code")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (existingLink) {
        setShortCode(existingLink.code);
      } else if (profile?.username) {
        // Generate a random 6-char code
        const code = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
        const { data: newLink } = await supabase
          .from("short_links")
          .insert({ user_id: user.id, code })
          .select("code")
          .single();
        setShortCode(newLink?.code ?? null);
      }

      setLoading(false);
    };

    init();
  }, [user]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const fullUrl = username ? `${origin}/p/${username}` : "";
  const shortUrl = shortCode ? `${origin}/u/${shortCode}` : "";
  const displayUrl = shortened ? shortUrl : fullUrl;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayUrl);
    setCopied(true);
    toast({ title: "Copied!", description: "Link copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    const svg = document.getElementById("nfc-manager-qr");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 512, 512);
      const a = document.createElement("a");
      a.download = `nfc-qr-${username}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
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

  if (!username) {
    return (
      <DashboardLayout>
        <div className="glass-card rounded-lg p-12 text-center animate-fade-in">
          <Smartphone className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            Set a username in your{" "}
            <Link to="/profile" className="text-primary underline">Profile</Link>{" "}
            to configure your NFC link.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">NFC Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your physical NFC card link and download assets
          </p>
        </div>

        <Card className="glass-card animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-sm flex items-center gap-2">
              <Link2 className="w-4 h-4" /> Your NFC Link
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border font-mono text-sm break-all">
              <span className="flex-1 select-all">{displayUrl}</span>
              <Button size="icon" variant="ghost" className="shrink-0" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={shortened} onCheckedChange={setShortened} />
                <span className="text-sm text-muted-foreground">Short link</span>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                <Info className="w-3 h-3 mr-1" /> Short links save space on NFC chips
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Short links are mapped to your account — even if you change your username, the link will always resolve correctly.
            </p>

            {/* Page Mode Toggle */}
            {activePersonaId && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <Label className="text-xs text-muted-foreground cursor-pointer">Personal Profile</Label>
                  </div>
                  <Switch
                    checked={pageMode === "builder"}
                    disabled={!isPro && pageMode !== "builder"}
                    onCheckedChange={async (checked) => {
                      if (checked && !isPro) {
                        toast({ title: "Pro Feature", description: "Page Builder requires Handshake+. Upgrade to unlock.", variant: "destructive" });
                        return;
                      }
                      const mode = checked ? "builder" : "personal";
                      setPageMode(mode);
                      await supabase.from("personas").update({ page_mode: mode }).eq("id", activePersonaId);
                      toast({ title: `Landing page set to ${checked ? "Page Builder" : "Personal Profile"}` });
                    }}
                  />
                  <div className="flex items-center gap-1.5">
                    <LayoutPanelLeft className="w-3.5 h-3.5 text-muted-foreground" />
                    <Label className="text-xs text-muted-foreground cursor-pointer">Page Builder</Label>
                    {!isPro && (
                      <Crown className="w-3 h-3 text-amber-500" />
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => window.open(fullUrl, "_blank")}>
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Preview
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowGuide(true)}>
                <Smartphone className="w-3.5 h-3.5 mr-1.5" /> Write Guide
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card animate-fade-in" style={{ animationDelay: "80ms" }}>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-sm flex items-center gap-2">
              <Download className="w-4 h-4" /> QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="p-4 bg-white rounded-xl">
              <QRCodeSVG id="nfc-manager-qr" value={displayUrl} size={180} level="H" includeMargin={false} />
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              Download this QR code for physical printing on business cards, stickers, or badges.
            </p>
            <Button onClick={handleDownloadQr} className="gradient-primary text-primary-foreground">
              <Download className="w-4 h-4 mr-1.5" /> Download PNG (512×512)
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">How to Write Your NFC Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Step 1 — Get an App</h3>
              <p>Download <strong>NFC Tools</strong> (iOS / Android) or any NDEF-compatible writer app.</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Step 2 — Write a URL Record</h3>
              <p>Open the app → tap <strong>Write</strong> → select <strong>URL / URI</strong> → paste your link:</p>
              <code className="block p-2 rounded bg-muted text-xs font-mono break-all">{displayUrl}</code>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Step 3 — Tap Your Card</h3>
              <p>Hold the NFC tag against your phone's NFC reader until the app confirms the write. That's it — your card is live!</p>
            </div>
            <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
              <p className="text-xs">
                <strong>Pro Tip:</strong> Use the short link to fit within the memory limits of most NFC chips (typically 137–504 bytes). Short links are mapped to your account ID, so they never break even if you change your username.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default NfcManagerPage;
