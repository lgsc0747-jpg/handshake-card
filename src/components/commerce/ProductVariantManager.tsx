import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2, ChevronUp, Image as ImageIcon, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { VariantImageGallery } from "./VariantImageGallery";

interface ProductVariant {
  id: string;
  product_id: string;
  variant_type: string;
  variant_value: string;
  price_modifier: number;
  stock: number;
  image_url: string | null;
  sort_order: number;
}

interface ProductVariantManagerProps {
  productId: string;
}

const VARIANT_TYPES = ["Color", "Size", "Material", "Style"] as const;

const VARIANT_PRESETS: Record<string, string[]> = {
  Color: ["Black", "White", "Red", "Blue", "Green", "Yellow", "Pink", "Purple", "Orange", "Gray", "Navy", "Teal", "Gold", "Silver", "Rose Gold"],
  Size: ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "One Size", "28", "30", "32", "34", "36", "38", "40"],
  Material: ["Plastic", "Metal", "Wood", "Bamboo", "Carbon Fiber", "Leather", "Silicone", "Ceramic", "Glass", "Acrylic"],
  Style: ["Classic", "Modern", "Minimalist", "Premium", "Matte", "Glossy", "Textured", "Transparent", "Frosted", "Engraved"],
};

const COLOR_SWATCHES: Record<string, string> = {
  Black: "#000", White: "#fff", Red: "#ef4444", Blue: "#3b82f6", Green: "#22c55e",
  Yellow: "#eab308", Pink: "#ec4899", Purple: "#a855f7", Orange: "#f97316", Gray: "#6b7280",
  Navy: "#1e3a5f", Teal: "#14b8a6", Gold: "#d4a017", Silver: "#c0c0c0", "Rose Gold": "#b76e79",
};

export function ProductVariantManager({ productId }: ProductVariantManagerProps) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [expandedVariant, setExpandedVariant] = useState<string | null>(null);
  const [editingVariant, setEditingVariant] = useState<string | null>(null);
  const [editFields, setEditFields] = useState({ type: "", value: "", price: "", stock: "" });
  const [saving, setSaving] = useState(false);
  const [newType, setNewType] = useState<string>("Color");
  const [newValue, setNewValue] = useState("");
  const [newPrice, setNewPrice] = useState("0");
  const [newStock, setNewStock] = useState("0");

  const loadVariants = async () => {
    const { data } = await (supabase as any)
      .from("product_variants")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order");
    setVariants((data ?? []) as ProductVariant[]);
    setLoading(false);
  };

  useEffect(() => {
    if (productId) loadVariants();
  }, [productId]);

  const addVariant = async (value?: string) => {
    const val = (value ?? newValue).trim();
    if (!val) return;
    setAdding(true);
    await (supabase as any).from("product_variants").insert({
      product_id: productId,
      variant_type: newType,
      variant_value: val,
      price_modifier: parseFloat(newPrice) || 0,
      stock: parseInt(newStock) || 0,
      sort_order: variants.length,
    });
    if (!value) { setNewValue(""); setNewPrice("0"); setNewStock("0"); }
    await loadVariants();
    setAdding(false);
  };

  const removeVariant = async (id: string) => {
    await (supabase as any).from("product_variants").delete().eq("id", id);
    if (editingVariant === id) setEditingVariant(null);
    if (expandedVariant === id) setExpandedVariant(null);
    await loadVariants();
  };

  const startEdit = (v: ProductVariant) => {
    setEditingVariant(v.id);
    setEditFields({
      type: v.variant_type,
      value: v.variant_value,
      price: v.price_modifier.toString(),
      stock: v.stock.toString(),
    });
  };

  const cancelEdit = () => setEditingVariant(null);

  const saveEdit = async (id: string) => {
    if (!editFields.value.trim()) return;
    setSaving(true);
    await (supabase as any).from("product_variants").update({
      variant_type: editFields.type,
      variant_value: editFields.value.trim(),
      price_modifier: parseFloat(editFields.price) || 0,
      stock: parseInt(editFields.stock) || 0,
    }).eq("id", id);
    setEditingVariant(null);
    await loadVariants();
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-24"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>;

  const grouped = variants.reduce<Record<string, ProductVariant[]>>((acc, v) => {
    (acc[v.variant_type] = acc[v.variant_type] || []).push(v);
    return acc;
  }, {});

  const presets = VARIANT_PRESETS[newType] ?? [];
  const existingValues = variants.filter(v => v.variant_type === newType).map(v => v.variant_value);
  const availablePresets = presets.filter(p => !existingValues.includes(p));

  return (
    <div className="space-y-4">
      <span className="text-xs font-medium">Variants ({variants.length})</span>

      {/* Existing Variants */}
      {Object.entries(grouped).map(([type, items]) => (
        <div key={type} className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{type}</Label>
          <div className="space-y-1.5">
            {items.map((v) => {
              const isExpanded = expandedVariant === v.id;
              const isEditing = editingVariant === v.id;
              return (
                <div key={v.id} className="rounded-lg border border-border/40 bg-muted/10 overflow-hidden">
                  {isEditing ? (
                    /* Inline edit form */
                    <div className="p-2.5 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[9px]">Type</Label>
                          <Select value={editFields.type} onValueChange={(val) => setEditFields(f => ({ ...f, type: val }))}>
                            <SelectTrigger className="h-7 rounded-lg text-[11px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {VARIANT_TYPES.map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[9px]">Value</Label>
                          <Input
                            value={editFields.value}
                            onChange={(e) => setEditFields(f => ({ ...f, value: e.target.value }))}
                            className="h-7 rounded-lg text-[11px]"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[9px]">Price ±</Label>
                          <Input
                            type="number"
                            value={editFields.price}
                            onChange={(e) => setEditFields(f => ({ ...f, price: e.target.value }))}
                            className="h-7 rounded-lg text-[11px]"
                          />
                        </div>
                        <div>
                          <Label className="text-[9px]">Stock</Label>
                          <Input
                            type="number"
                            value={editFields.stock}
                            onChange={(e) => setEditFields(f => ({ ...f, stock: e.target.value }))}
                            className="h-7 rounded-lg text-[11px]"
                          />
                        </div>
                      </div>
                      <div className="flex gap-1.5 justify-end">
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] rounded-lg" onClick={cancelEdit}>
                          <X className="w-3 h-3 mr-1" /> Cancel
                        </Button>
                        <Button size="sm" className="h-6 px-2 text-[10px] rounded-lg" onClick={() => saveEdit(v.id)} disabled={saving}>
                          {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />} Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Display row */
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5">
                      {type === "Color" && COLOR_SWATCHES[v.variant_value] && (
                        <span
                          className="w-3 h-3 rounded-full border border-border/60 flex-shrink-0"
                          style={{ backgroundColor: COLOR_SWATCHES[v.variant_value] }}
                        />
                      )}
                      <span className="text-xs font-medium flex-1">{v.variant_value}</span>
                      {v.price_modifier !== 0 && (
                        <span className="text-[9px] text-muted-foreground">
                          {v.price_modifier > 0 ? "+" : ""}₱{v.price_modifier}
                        </span>
                      )}
                      <span className="text-[9px] text-muted-foreground">({v.stock})</span>
                      <button
                        onClick={() => startEdit(v)}
                        className="p-0.5 hover:bg-muted rounded transition-colors"
                        title="Edit variant"
                      >
                        <Pencil className="w-3 h-3 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => setExpandedVariant(isExpanded ? null : v.id)}
                        className="p-0.5 hover:bg-muted rounded transition-colors"
                        title="Toggle images"
                      >
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ImageIcon className="w-3 h-3 text-muted-foreground" />}
                      </button>
                      <button onClick={() => removeVariant(v.id)} className="p-0.5 hover:text-destructive transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  {isExpanded && !isEditing && (
                    <div className="px-2.5 pb-2.5">
                      <VariantImageGallery variantId={v.id} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Add Variant Panel */}
      <div className="space-y-3 p-3 rounded-xl border border-dashed border-border/60 bg-muted/20">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px]">Type</Label>
            <Select value={newType} onValueChange={(val) => { setNewType(val); setNewValue(""); }}>
              <SelectTrigger className="h-8 rounded-lg text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {VARIANT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px]">Custom Value</Label>
            <Input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="e.g. Custom" className="h-8 rounded-lg text-xs" />
          </div>
        </div>

        {/* Preset quick-add chips */}
        {availablePresets.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground">Quick add {newType.toLowerCase()} options:</Label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
              {availablePresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={adding}
                  onClick={() => addVariant(preset)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium",
                    "border border-border/60 bg-background hover:bg-primary/10 hover:border-primary/40 transition-colors",
                    "disabled:opacity-50"
                  )}
                >
                  {newType === "Color" && COLOR_SWATCHES[preset] && (
                    <span
                      className="w-3 h-3 rounded-full border border-border/40 flex-shrink-0"
                      style={{ backgroundColor: COLOR_SWATCHES[preset] }}
                    />
                  )}
                  <Plus className="w-2.5 h-2.5 text-muted-foreground" />
                  {preset}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px]">Price ±</Label>
            <Input type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} className="h-8 rounded-lg text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">Stock</Label>
            <Input type="number" value={newStock} onChange={(e) => setNewStock(e.target.value)} className="h-8 rounded-lg text-xs" />
          </div>
        </div>
        <Button size="sm" onClick={() => addVariant()} disabled={adding || !newValue.trim()} className="w-full h-8 rounded-lg text-xs">
          {adding ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
          Add Custom Variant
        </Button>
      </div>
    </div>
  );
}
