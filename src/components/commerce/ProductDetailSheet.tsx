import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ShoppingBag, Package } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  stock: number;
}

interface ProductVariant {
  id: string;
  variant_type: string;
  variant_value: string;
  price_modifier: number;
  stock: number;
}

interface ProductDetailSheetProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, variantLabel?: string, priceModifier?: number) => void;
  accentColor: string;
  textColor?: string;
}

export function ProductDetailSheet({ product, open, onClose, onAddToCart, accentColor, textColor = "#ffffff" }: ProductDetailSheetProps) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selected, setSelected] = useState<Record<string, ProductVariant>>({});

  useEffect(() => {
    if (!product || !open) { setVariants([]); setSelected({}); return; }
    (supabase as any)
      .from("product_variants")
      .select("id, variant_type, variant_value, price_modifier, stock")
      .eq("product_id", product.id)
      .order("sort_order")
      .then(({ data }: any) => {
        const v = (data ?? []) as ProductVariant[];
        setVariants(v);
        // Auto-select first of each type
        const initial: Record<string, ProductVariant> = {};
        v.forEach((item) => { if (!initial[item.variant_type]) initial[item.variant_type] = item; });
        setSelected(initial);
      });
  }, [product?.id, open]);

  if (!product) return null;

  const grouped = variants.reduce<Record<string, ProductVariant[]>>((acc, v) => {
    (acc[v.variant_type] = acc[v.variant_type] || []).push(v);
    return acc;
  }, {});

  const priceModifier = Object.values(selected).reduce((s, v) => s + v.price_modifier, 0);
  const finalPrice = product.price + priceModifier;
  const anyOutOfStock = Object.values(selected).some((v) => v.stock <= 0);
  const allTypesSelected = Object.keys(grouped).length === 0 || Object.keys(grouped).every((t) => selected[t]);

  const variantLabel = Object.values(selected).length > 0
    ? Object.values(selected).map((v) => `${v.variant_type}: ${v.variant_value}`).join(", ")
    : undefined;

  const handleAdd = () => {
    onAddToCart({ ...product, price: finalPrice }, variantLabel, priceModifier);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-[2rem] bg-background border-t border-border/60 shadow-2xl"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            <div className="flex justify-center pt-3 pb-1 sticky top-0 z-10">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <Button size="icon" variant="ghost" className="absolute top-3 right-4 rounded-full h-8 w-8 z-10 bg-background/80 backdrop-blur-sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>

            {product.image_url ? (
              <div className="w-full aspect-[4/3] bg-muted/10 overflow-hidden">
                <img src={product.image_url} alt={product.name} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-full aspect-[4/3] bg-muted/10 flex items-center justify-center">
                <Package className="w-16 h-16 text-muted-foreground/20" />
              </div>
            )}

            <div className="px-6 pb-8 pt-5 space-y-5">
              <div className="space-y-1">
                <h2 className="text-2xl font-display font-bold tracking-tight">{product.name}</h2>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-mono font-bold" style={{ color: accentColor }}>
                    ₱{finalPrice.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </span>
                  {priceModifier !== 0 && (
                    <span className="text-xs text-muted-foreground line-through">
                      ₱{product.price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </span>
                  )}
                  {product.stock > 0 && !anyOutOfStock ? (
                    <Badge variant="secondary" className="text-[10px]">{product.stock} in stock</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px]">Sold Out</Badge>
                  )}
                </div>
              </div>

              {product.description && (
                <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>
              )}

              {/* Variant Selectors */}
              {Object.entries(grouped).map(([type, items]) => (
                <div key={type} className="space-y-2">
                  <p className="text-xs font-semibold">{type}</p>
                  <div className="flex flex-wrap gap-2">
                    {items.map((v) => {
                      const isSelected = selected[type]?.id === v.id;
                      const oos = v.stock <= 0;
                      return (
                        <button
                          key={v.id}
                          disabled={oos}
                          onClick={() => setSelected((s) => ({ ...s, [type]: v }))}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border-2 transition-all ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : oos
                              ? "border-border/40 opacity-40 line-through"
                              : "border-border/60 hover:border-primary/40"
                          }`}
                        >
                          {v.variant_value}
                          {v.price_modifier !== 0 && (
                            <span className="ml-1 text-[10px] text-muted-foreground">
                              {v.price_modifier > 0 ? "+" : ""}₱{v.price_modifier}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {product.stock > 0 && !anyOutOfStock && allTypesSelected ? (
                <Button onClick={handleAdd} className="w-full h-14 rounded-2xl text-base font-semibold gap-2" style={{ backgroundColor: accentColor, color: "#fff" }}>
                  <ShoppingBag className="w-5 h-5" />
                  Add to Bag · ₱{finalPrice.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </Button>
              ) : (
                <Button disabled className="w-full h-14 rounded-2xl text-base font-semibold">
                  {!allTypesSelected ? "Select all options" : "Sold Out"}
                </Button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
