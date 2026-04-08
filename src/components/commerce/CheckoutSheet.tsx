import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  X, ShoppingCart, Minus, Plus, Smartphone, Truck,
  Loader2, CheckCircle2, QrCode,
} from "lucide-react";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
  stock: number;
  variantLabel?: string;
}

interface CheckoutSheetProps {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateCart: (cart: CartItem[]) => void;
  personaId: string;
  sellerUserId: string;
  gcashQrUrl?: string | null;
}

export function CheckoutSheet({
  open, onClose, cart, onUpdateCart, personaId, sellerUserId, gcashQrUrl,
}: CheckoutSheetProps) {
  const [step, setStep] = useState<"cart" | "info" | "payment" | "done">("cart");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerLocation, setBuyerLocation] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"gcash" | "cod">("cod");
  const [submitting, setSubmitting] = useState(false);

  const total = cart.reduce((s, c) => s + c.price * c.quantity, 0);

  const updateQty = (id: string, variantLabel: string | undefined, delta: number) => {
    onUpdateCart(
      cart.map((c) => {
        if (c.id !== id || c.variantLabel !== variantLabel) return c;
        const newQty = Math.max(0, Math.min(c.stock, c.quantity + delta));
        return { ...c, quantity: newQty };
      }).filter((c) => c.quantity > 0)
    );
  };

  const handleSubmit = async () => {
    if (!buyerName.trim() || !buyerPhone.trim() || !buyerLocation.trim()) return;
    setSubmitting(true);

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        seller_user_id: sellerUserId,
        persona_id: personaId,
        buyer_name: buyerName.trim(),
        buyer_phone: buyerPhone.trim(),
        buyer_location: buyerLocation.trim(),
        payment_method: paymentMethod,
        total,
      })
      .select("id")
      .single();

    if (orderErr || !order) { setSubmitting(false); return; }

    await supabase.from("order_items").insert(
      cart.map((c) => ({
        order_id: order.id,
        product_id: c.id,
        quantity: c.quantity,
        unit_price: c.price,
        variant_info: c.variantLabel || null,
      } as any))
    );

    setSubmitting(false);
    setStep("done");
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-[2rem] bg-background border-t border-border/60 shadow-2xl"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-muted-foreground/30" /></div>
            <div className="px-6 pb-8 pt-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-bold">
                  {step === "cart" && "Your Cart"}
                  {step === "info" && "Your Details"}
                  {step === "payment" && "Payment"}
                  {step === "done" && "Order Placed!"}
                </h2>
                <Button size="icon" variant="ghost" className="rounded-full h-8 w-8" onClick={onClose}><X className="w-4 h-4" /></Button>
              </div>

              {step === "cart" && (
                <div className="space-y-4">
                  {cart.length === 0 ? (
                    <div className="text-center py-8">
                      <ShoppingCart className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Your cart is empty</p>
                    </div>
                  ) : (
                    <>
                      {cart.map((item, idx) => (
                        <div key={`${item.id}-${item.variantLabel ?? idx}`} className="flex items-center gap-3 p-3 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/40">
                          {item.image_url && <img src={item.image_url} alt={item.name} className="w-14 h-14 rounded-xl object-cover" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{item.name}</p>
                            {item.variantLabel && <p className="text-[10px] text-muted-foreground truncate">{item.variantLabel}</p>}
                            <p className="text-xs text-muted-foreground font-mono">₱{item.price.toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="icon" variant="outline" className="h-7 w-7 rounded-full" onClick={() => updateQty(item.id, item.variantLabel, -1)}><Minus className="w-3 h-3" /></Button>
                            <span className="text-sm font-mono w-6 text-center">{item.quantity}</span>
                            <Button size="icon" variant="outline" className="h-7 w-7 rounded-full" onClick={() => updateQty(item.id, item.variantLabel, 1)}><Plus className="w-3 h-3" /></Button>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-2 border-t border-border/40">
                        <span className="text-sm text-muted-foreground">Total</span>
                        <span className="text-lg font-display font-bold font-mono">₱{total.toFixed(2)}</span>
                      </div>
                      <Button onClick={() => setStep("info")} className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground text-sm font-semibold" disabled={cart.length === 0}>Continue</Button>
                    </>
                  )}
                </div>
              )}

              {step === "info" && (
                <div className="space-y-4">
                  <div className="space-y-1"><Label className="text-xs">Full Name</Label><Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Juan dela Cruz" className="rounded-xl h-11" /></div>
                  <div className="space-y-1"><Label className="text-xs">Phone Number</Label><Input value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} placeholder="09XX XXX XXXX" className="rounded-xl h-11" /></div>
                  <div className="space-y-1"><Label className="text-xs">Delivery Location</Label><Input value={buyerLocation} onChange={(e) => setBuyerLocation(e.target.value)} placeholder="123 Main St, Cebu City" className="rounded-xl h-11" /></div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep("cart")}>Back</Button>
                    <Button onClick={() => setStep("payment")} className="flex-1 rounded-xl gradient-primary text-primary-foreground" disabled={!buyerName.trim() || !buyerPhone.trim() || !buyerLocation.trim()}>Continue</Button>
                  </div>
                </div>
              )}

              {step === "payment" && (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">Select your payment method</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setPaymentMethod("gcash")} className={`p-4 rounded-2xl border-2 text-center transition-all ${paymentMethod === "gcash" ? "border-primary bg-primary/10" : "border-border/60 hover:border-primary/40"}`}>
                      <Smartphone className="w-6 h-6 mx-auto mb-1 text-[#007DFE]" /><p className="text-xs font-semibold">GCash</p>
                    </button>
                    <button onClick={() => setPaymentMethod("cod")} className={`p-4 rounded-2xl border-2 text-center transition-all ${paymentMethod === "cod" ? "border-primary bg-primary/10" : "border-border/60 hover:border-primary/40"}`}>
                      <Truck className="w-6 h-6 mx-auto mb-1" /><p className="text-xs font-semibold">Cash on Delivery</p>
                    </button>
                  </div>
                  {paymentMethod === "gcash" && gcashQrUrl && (
                    <div className="p-4 rounded-2xl bg-card/80 border border-border/40 text-center space-y-2">
                      <QrCode className="w-5 h-5 mx-auto text-[#007DFE]" />
                      <p className="text-xs font-semibold">Scan to pay via GCash</p>
                      <img src={gcashQrUrl} alt="GCash QR" className="w-48 h-48 mx-auto rounded-xl object-contain border" />
                      <p className="text-[10px] text-muted-foreground">Send ₱{total.toFixed(2)} then place your order</p>
                    </div>
                  )}
                  {paymentMethod === "gcash" && !gcashQrUrl && (
                    <div className="p-4 rounded-2xl bg-warning/10 border border-warning/30 text-center">
                      <p className="text-xs text-warning">Seller hasn't set up GCash QR yet. Please choose COD.</p>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-border/40">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="text-lg font-display font-bold font-mono">₱{total.toFixed(2)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep("info")}>Back</Button>
                    <Button onClick={handleSubmit} className="flex-1 rounded-xl gradient-primary text-primary-foreground" disabled={submitting || (paymentMethod === "gcash" && !gcashQrUrl)}>
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}Place Order
                    </Button>
                  </div>
                </div>
              )}

              {step === "done" && (
                <div className="text-center py-8 space-y-4">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 10, stiffness: 200 }}>
                    <CheckCircle2 className="w-16 h-16 text-success mx-auto" />
                  </motion.div>
                  <h3 className="text-lg font-display font-bold">Order Placed!</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    {paymentMethod === "cod"
                      ? "Your order has been submitted. The seller will contact you to confirm delivery."
                      : "Your order has been submitted. Please ensure your GCash payment has been sent."}
                  </p>
                  <Button onClick={onClose} className="rounded-xl gradient-primary text-primary-foreground">Done</Button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
