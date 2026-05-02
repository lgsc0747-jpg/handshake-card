import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CreditCard, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface NfcCard {
  id: string;
  serial_number: string;
  label: string | null;
  status: string;
  persona_id: string | null;
}

export function NfcCardsPanel({ userId, personaId }: { userId: string; personaId: string | null }) {
  const { toast } = useToast();
  const [cards, setCards] = useState<NfcCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSerial, setNewSerial] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    const q = supabase
      .from("nfc_cards")
      .select("id, serial_number, label, status, persona_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    const { data } = personaId ? await q.eq("persona_id", personaId) : await q;
    setCards((data as NfcCard[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId, personaId]);

  const addCard = async () => {
    if (!newSerial.trim() || !userId) return;
    const { error } = await supabase.from("nfc_cards").insert({
      user_id: userId,
      persona_id: personaId,
      serial_number: newSerial.trim(),
      label: newLabel.trim() || null,
      status: "active" as any,
    });
    if (error) {
      toast({ title: "Couldn't add card", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Card linked" });
      setNewSerial(""); setNewLabel("");
      load();
    }
  };

  const toggleActive = async (card: NfcCard) => {
    const next = card.status === "active" ? "inactive" : "active";
    await supabase.from("nfc_cards").update({ status: next as any }).eq("id", card.id);
    setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, status: next } : c)));
  };

  const removeCard = async (id: string) => {
    await supabase.from("nfc_cards").delete().eq("id", id);
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CreditCard className="w-3.5 h-3.5 text-primary" />
        <h3 className="text-xs font-semibold">NFC Cards</h3>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Link physical cards to this persona. Toggle them off without deleting.
      </p>

      <div className="space-y-2 p-3 rounded-xl border border-border/40 bg-muted/20">
        <Input
          value={newSerial}
          onChange={(e) => setNewSerial(e.target.value)}
          placeholder="Card serial"
          className="h-8 text-xs rounded-lg"
        />
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Label (optional)"
          className="h-8 text-xs rounded-lg"
        />
        <Button size="sm" className="w-full h-7 text-[11px]" onClick={addCard} disabled={!newSerial.trim()}>
          <Plus className="w-3 h-3 mr-1" /> Link card
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : cards.length === 0 ? (
        <p className="text-[11px] text-muted-foreground text-center py-4">No cards linked yet.</p>
      ) : (
        <div className="space-y-1.5">
          {cards.map((c) => (
            <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-border/40 bg-card/40">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium truncate">{c.label || c.serial_number}</p>
                <p className="text-[9px] text-muted-foreground font-mono truncate">{c.serial_number}</p>
              </div>
              <Switch
                checked={c.status === "active"}
                onCheckedChange={() => toggleActive(c)}
                className="scale-75"
              />
              <button
                onClick={() => removeCard(c.id)}
                className="p-1 text-muted-foreground hover:text-destructive"
                title="Unlink"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
