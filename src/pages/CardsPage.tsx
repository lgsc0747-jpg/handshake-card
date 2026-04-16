import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CreditCard, Save, Loader2, Plus, Trash2, Pencil, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import type { Tables } from "@/integrations/supabase/types";

type NfcCard = Tables<"nfc_cards">;
type Category = Tables<"categories">;

const CardsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cards, setCards] = useState<NfcCard[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newSerial, setNewSerial] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editSerial, setEditSerial] = useState("");
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user) return;
    const [cardsRes, catsRes] = await Promise.all([
      supabase.from("nfc_cards").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("categories").select("*").eq("user_id", user.id).order("label"),
    ]);
    setCards(cardsRes.data ?? []);
    setCategories(catsRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const updateCard = async (id: string, updates: Partial<NfcCard>) => {
    const { error } = await supabase.from("nfc_cards").update(updates).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
      toast({ title: "Card updated", description: "Configuration saved." });
    }
  };

  const addCard = async () => {
    if (!user || !newSerial.trim()) return;
    const { data, error } = await supabase.from("nfc_cards").insert({
      serial_number: newSerial.trim(),
      label: newLabel.trim() || null,
      user_id: user.id,
    }).select().single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (data) {
      setCards((prev) => [data, ...prev]);
      toast({ title: "Card added", description: `${data.serial_number} registered.` });
      setShowAdd(false);
      setNewSerial("");
      setNewLabel("");
    }
  };

  const deleteCard = async (id: string) => {
    const { error } = await supabase.from("nfc_cards").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setCards((prev) => prev.filter((c) => c.id !== id));
      toast({ title: "Card removed" });
    }
    setDeleteCardId(null);
  };

  const startEditing = (card: NfcCard) => {
    setEditingCardId(card.id);
    setEditLabel(card.label ?? "");
    setEditSerial(card.serial_number);
  };

  const saveEdit = async () => {
    if (!editingCardId) return;
    await updateCard(editingCardId, {
      label: editLabel.trim() || null,
      serial_number: editSerial.trim(),
    });
    setEditingCardId(null);
  };

  const timeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">NFC Cards</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your physical NFC tags and their assigned categories</p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="gradient-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-1.5" /> Register Card
          </Button>
        </div>

        {cards.length === 0 ? (
          <div className="glass-card rounded-lg p-12 text-center animate-fade-in">
            <CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No NFC cards registered yet. Add your first card to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cards.map((card, i) => (
              <Card key={card.id} className="glass-card animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-accent-foreground" />
                      </div>
                      <div>
                        {editingCardId === card.id ? (
                          <div className="space-y-1">
                            <Input
                              value={editSerial}
                              onChange={(e) => setEditSerial(e.target.value)}
                              className="h-7 text-sm font-mono w-36"
                              placeholder="Serial"
                            />
                            <Input
                              value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
                              className="h-7 text-xs w-36"
                              placeholder="Label (optional)"
                            />
                          </div>
                        ) : (
                          <>
                            <CardTitle className="text-sm font-mono">{card.serial_number}</CardTitle>
                            {card.label && <p className="text-xs text-muted-foreground">{card.label}</p>}
                            <p className="text-[10px] text-muted-foreground">Updated: {timeSince(card.updated_at)}</p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {editingCardId === card.id ? (
                        <>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                            <Check className="w-3.5 h-3.5 text-primary" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingCardId(null)}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEditing(card)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive" onClick={() => setDeleteCardId(card.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      <Badge variant={card.status === "active" ? "default" : "secondary"} className="text-[10px] ml-1">
                        {card.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Switch
                      checked={card.status === "active"}
                      onCheckedChange={(active) => updateCard(card.id, { status: active ? "active" : "inactive" })}
                    />
                  </div>
                  {categories.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-sm text-muted-foreground">Category</label>
                      <Select
                        value={card.current_category_id ?? "none"}
                        onValueChange={(val) => updateCard(card.id, { current_category_id: val === "none" ? null : val })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Register NFC Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Serial Number</label>
              <Input value={newSerial} onChange={(e) => setNewSerial(e.target.value)} placeholder="NFC-0921-A3F2" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Label (optional)</label>
              <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="My Work Card" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addCard} className="gradient-primary text-primary-foreground">Register</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteCardId}
        onOpenChange={(open) => !open && setDeleteCardId(null)}
        title="Delete NFC Card"
        description="This will permanently remove this card and any associated category assignments. This action cannot be undone."
        onConfirm={() => deleteCardId && deleteCard(deleteCardId)}
        variant="destructive"
      />
    </DashboardLayout>
  );
};

export default CardsPage;
