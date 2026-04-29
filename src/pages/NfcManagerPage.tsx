import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import {
  Link2, Copy, Check, Download, Smartphone, ExternalLink, Info, Loader2, Plus,
  Pencil, Trash2,
} from "lucide-react";

interface ShortLinkRow {
  id: string;
  code: string;
  label: string | null;
  is_active: boolean;
  persona_id: string | null;
  card_id: string | null;
  created_at: string;
}

interface PersonaLite { id: string; label: string; slug: string; accent_color: string | null }

const NfcManagerPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const [personas, setPersonas] = useState<PersonaLite[]>([]);
  const [links, setLinks] = useState<ShortLinkRow[]>([]);

  // create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newPersonaId, setNewPersonaId] = useState<string>("");

  // edit row state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editPersonaId, setEditPersonaId] = useState<string>("");

  // delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // qr preview
  const [qrCode, setQrCode] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const refresh = useCallback(async () => {
    if (!user) return;
    const [{ data: profile }, { data: personaRows }, { data: linkRows }] = await Promise.all([
      supabase.from("profiles").select("username").eq("user_id", user.id).single(),
      supabase.from("personas").select("id, label, slug, accent_color").eq("user_id", user.id).order("created_at"),
      supabase.from("short_links").select("id, code, label, is_active, persona_id, card_id, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setUsername(profile?.username ?? null);
    setPersonas((personaRows ?? []) as PersonaLite[]);
    setLinks((linkRows ?? []) as ShortLinkRow[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCopy = async (code: string) => {
    await navigator.clipboard.writeText(`${origin}/u/${code}`);
    setCopiedCode(code);
    toast({ title: "Copied!", description: "Link copied to clipboard." });
    setTimeout(() => setCopiedCode(null), 1500);
  };

  const personaById = (id: string | null) => personas.find(p => p.id === id);

  const handleCreate = async () => {
    if (!user) return;
    if (!newPersonaId) {
      toast({ title: "Select a persona", variant: "destructive" });
      return;
    }
    const code = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    const { data, error } = await supabase.from("short_links").insert({
      user_id: user.id, code, persona_id: newPersonaId,
      label: newLabel.trim() || null,
    }).select().single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (data) {
      setLinks(prev => [data as ShortLinkRow, ...prev]);
      toast({ title: "Link generated", description: `/u/${data.code}` });
      setShowCreate(false);
      setNewLabel(""); setNewPersonaId("");
    }
  };

  const startEdit = (l: ShortLinkRow) => {
    setEditingId(l.id);
    setEditLabel(l.label ?? "");
    setEditPersonaId(l.persona_id ?? "");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const updates = { label: editLabel.trim() || null, persona_id: editPersonaId || null };
    const { error } = await supabase.from("short_links").update(updates).eq("id", editingId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setLinks(prev => prev.map(l => l.id === editingId ? { ...l, ...updates } as ShortLinkRow : l));
      toast({ title: "Link saved" });
      setEditingId(null);
    }
  };

  const toggleActive = async (l: ShortLinkRow, active: boolean) => {
    const { error } = await supabase.from("short_links").update({ is_active: active }).eq("id", l.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setLinks(prev => prev.map(x => x.id === l.id ? { ...x, is_active: active } : x));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("short_links").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setLinks(prev => prev.filter(l => l.id !== deleteId));
      toast({ title: "Link deleted" });
    }
    setDeleteId(null);
  };

  const downloadQr = (code: string) => {
    const svg = document.getElementById(`qr-${code}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 512, 512);
      const a = document.createElement("a");
      a.download = `nfc-qr-${code}.png`;
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
            to generate NFC links.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-display font-bold">NFC Manager</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Generate persona-specific links for your physical NFC cards. Multiple personas can be live at once.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowGuide(true)}>
              <Smartphone className="w-3.5 h-3.5 mr-1.5" /> Write Guide
            </Button>
            <Button onClick={() => setShowCreate(true)} className="gradient-primary text-primary-foreground" disabled={personas.length === 0}>
              <Plus className="w-4 h-4 mr-1.5" /> Generate Link
            </Button>
          </div>
        </div>

        {personas.length === 0 && (
          <div className="glass-card rounded-2xl p-4 text-sm text-muted-foreground">
            Create at least one persona in <Link to="/personas" className="text-primary underline">Personas</Link> before generating links.
          </div>
        )}

        <Card className="glass-card animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-sm flex items-center gap-2">
              <Link2 className="w-4 h-4" /> Generated Links
            </CardTitle>
          </CardHeader>
          <CardContent>
            {links.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No links yet. Generate one and write it to an NFC card.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Persona</TableHead>
                      <TableHead>Short URL</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {links.map((l) => {
                      const persona = personaById(l.persona_id);
                      const url = `${origin}/u/${l.code}`;
                      const editing = editingId === l.id;
                      return (
                        <TableRow key={l.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch checked={l.is_active} onCheckedChange={(v) => toggleActive(l, v)} />
                              <Badge variant={l.is_active ? "default" : "secondary"} className="text-[10px]">
                                {l.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {editing ? (
                              <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="h-8 text-xs" placeholder="e.g. Conference card" />
                            ) : (
                              <span className="text-sm">{l.label || <span className="text-muted-foreground italic">Unnamed</span>}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {editing ? (
                              <Select value={editPersonaId} onValueChange={setEditPersonaId}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pick a persona" /></SelectTrigger>
                                <SelectContent>
                                  {personas.map(p => (
                                    <SelectItem key={p.id} value={p.id}>
                                      <span className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full" style={{ background: p.accent_color ?? "#14b8a6" }} />
                                        {p.label}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : persona ? (
                              <span className="flex items-center gap-2 text-sm">
                                <span className="w-2 h-2 rounded-full" style={{ background: persona.accent_color ?? "#14b8a6" }} />
                                {persona.label}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Default</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <code className="text-xs font-mono text-muted-foreground">/u/{l.code}</code>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {editing ? (
                                <>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                                    <Check className="w-3.5 h-3.5 text-primary" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCopy(l.code)} title="Copy URL">
                                    {copiedCode === l.code ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setQrCode(l.code)} title="QR code">
                                    <Download className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => window.open(url, "_blank")} title="Open">
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(l)} title="Edit">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(l.id)} title="Delete">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
              <Info className="w-3 h-3" /> Each link points to a specific persona. Disable to revoke without deleting.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Generate New Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Label (optional)</label>
              <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Conference card" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Persona</label>
              <Select value={newPersonaId} onValueChange={setNewPersonaId}>
                <SelectTrigger><SelectValue placeholder="Pick a persona" /></SelectTrigger>
                <SelectContent>
                  {personas.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: p.accent_color ?? "#14b8a6" }} />
                        {p.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} className="gradient-primary text-primary-foreground">Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR preview dialog */}
      <Dialog open={!!qrCode} onOpenChange={(open) => !open && setQrCode(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">QR Code</DialogTitle>
          </DialogHeader>
          {qrCode && (
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 bg-white rounded-xl">
                <QRCodeSVG id={`qr-${qrCode}`} value={`${origin}/u/${qrCode}?src=qr`} size={200} level="H" includeMargin={false} />
              </div>
              <code className="text-xs font-mono text-muted-foreground">/u/{qrCode}</code>
              <Button onClick={() => downloadQr(qrCode)} className="gradient-primary text-primary-foreground">
                <Download className="w-4 h-4 mr-1.5" /> Download PNG (512×512)
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete this link?"
        description="The short URL will stop working immediately. Visitors with the old link will get a 404."
        onConfirm={handleDelete}
      />

      {/* Write guide */}
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
              <p>Open the app → tap <strong>Write</strong> → select <strong>URL / URI</strong> → paste the short URL from the table above.</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Step 3 — Tap Your Card</h3>
              <p>Hold the NFC tag against your phone's NFC reader until the app confirms the write.</p>
            </div>
            <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
              <p className="text-xs">
                <strong>Pro tip:</strong> Each generated link maps to a specific persona. You can write different cards to different personas and they'll all be live simultaneously.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default NfcManagerPage;
