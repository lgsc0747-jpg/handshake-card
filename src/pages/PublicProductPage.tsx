import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckoutSheet, type CartItem } from "@/components/commerce/CheckoutSheet";
import { getPageThemeStyles, PAGE_THEME_CLASS } from "@/contexts/PageBuilderThemeContext";
import {
  ArrowLeft, ShoppingBag, Minus, Plus, Package, ChevronLeft, ChevronRight,
  Loader2,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  stock: number;
  persona_id: string;
  user_id: string;
}

interface ProductVariant {
  id: string;
  variant_type: string;
  variant_value: string;
  price_modifier: number;
  stock: number;
}

interface GalleryImage {
  id: string;
  image_url: string;
  is_video: boolean;
  sort_order: number;
}

const PublicProductPage = () => {
  const { username, personaSlug, productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, ProductVariant>>({});
  const [quantity, setQuantity] = useState(1);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [personaData, setPersonaData] = useState<{ accent_color: string; text_color: string; gcash_qr_url: string | null; page_theme: string } | null>(null);

  useEffect(() => {
    // Strip dashboard theme classes for clean public page
    const root = document.documentElement;
    const themeClasses = Array.from(root.classList).filter((c) => c.startsWith("theme-"));
    themeClasses.forEach((c) => root.classList.remove(c));
    root.classList.remove("dark");
    return () => {
      const stored = localStorage.getItem("admin_theme");
      if (stored) root.classList.add(`theme-${stored}`);
      const colorMode = localStorage.getItem("admin_color_mode");
      if (colorMode === "dark" || (!colorMode && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
        root.classList.add("dark");
      }
    };
  }, []);

  useEffect(() => {
    if (!productId) return;
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    const { data: prod, error } = await supabase
      .from("products")
      .select("id, name, description, price, image_url, stock, persona_id, user_id")
      .eq("id", productId!)
      .eq("is_visible", true)
      .single();

    if (error || !prod) { setNotFound(true); setLoading(false); return; }
    setProduct(prod as Product);

    // Load persona colors
    const { data: persona } = await supabase
      .from("personas")
      .select("accent_color, text_color, gcash_qr_url, page_theme")
      .eq("id", prod.persona_id)
      .single();
    if (persona) setPersonaData(persona as any);

    // Load variants + gallery in parallel
    const [{ data: varData }, { data: galData }] = await Promise.all([
      (supabase as any).from("product_variants").select("id, variant_type, variant_value, price_modifier, stock").eq("product_id", prod.id).order("sort_order"),
      (supabase as any).from("product_images").select("id, image_url, is_video, sort_order").eq("product_id", prod.id).order("sort_order"),
    ]);

    const v = (varData ?? []) as ProductVariant[];
    setVariants(v);
    const initial: Record<string, ProductVariant> = {};
    v.forEach((item) => { if (!initial[item.variant_type]) initial[item.variant_type] = item; });
    setSelectedVariants(initial);

    setGallery((galData ?? []) as GalleryImage[]);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <Package className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-xl font-display font-bold">Product Not Found</h1>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  const accentColor = personaData?.accent_color ?? "#0d9488";
  const grouped = variants.reduce<Record<string, ProductVariant[]>>((acc, v) => {
    (acc[v.variant_type] = acc[v.variant_type] || []).push(v);
    return acc;
  }, {});

  const priceModifier = Object.values(selectedVariants).reduce((s, v) => s + v.price_modifier, 0);
  const finalPrice = product.price + priceModifier;
  const anyOutOfStock = Object.values(selectedVariants).some((v) => v.stock <= 0);
  const allTypesSelected = Object.keys(grouped).length === 0 || Object.keys(grouped).every((t) => selectedVariants[t]);

  const allImages = [
    ...(product.image_url ? [{ id: "featured", image_url: product.image_url, is_video: false, sort_order: -1 }] : []),
    ...gallery,
  ];

  const variantLabel = Object.values(selectedVariants).length > 0
    ? Object.values(selectedVariants).map((v) => `${v.variant_type}: ${v.variant_value}`).join(", ")
    : undefined;

  const addToCart = () => {
    if (!allTypesSelected || anyOutOfStock || product.stock <= 0) return;
    const key = `${product.id}|${variantLabel ?? ""}`;
    setCart((prev) => {
      const exists = prev.find((c) => `${c.id}|${c.variantLabel ?? ""}` === key);
      if (exists) {
        return prev.map((c) =>
          `${c.id}|${c.variantLabel ?? ""}` === key
            ? { ...c, quantity: Math.min(c.quantity + quantity, product.stock) }
            : c
        );
      }
      return [...prev, { id: product.id, name: product.name, price: finalPrice, image_url: product.image_url, quantity, stock: product.stock, variantLabel }];
    });
  };

  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 h-12">
          <Button variant="ghost" size="sm" className="h-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {cartCount > 0 && (
            <Button size="sm" className="rounded-full h-8 px-3 gap-1.5" style={{ backgroundColor: accentColor, color: "#fff" }} onClick={() => setCheckoutOpen(true)}>
              <ShoppingBag className="w-3.5 h-3.5" /> {cartCount}
            </Button>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left — Image Gallery */}
          <div className="space-y-3">
            {/* Main Image */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted/10 border border-border/40">
              {allImages.length > 0 ? (
                allImages[activeImageIdx]?.is_video ? (
                  <video src={allImages[activeImageIdx].image_url} className="w-full h-full object-contain" controls />
                ) : (
                  <img src={allImages[activeImageIdx]?.image_url} alt={product.name} className="w-full h-full object-contain" />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-16 h-16 text-muted-foreground/20" />
                </div>
              )}
              {allImages.length > 1 && (
                <>
                  <button
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 border border-border/40 hover:bg-background transition-colors"
                    onClick={() => setActiveImageIdx((i) => (i - 1 + allImages.length) % allImages.length)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 border border-border/40 hover:bg-background transition-colors"
                    onClick={() => setActiveImageIdx((i) => (i + 1) % allImages.length)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allImages.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImageIdx(i)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                      i === activeImageIdx ? "border-primary ring-2 ring-primary/20" : "border-border/40 opacity-70 hover:opacity-100"
                    }`}
                  >
                    {img.is_video ? (
                      <video src={img.image_url} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right — Product Info */}
          <div className="space-y-5">
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight">{product.name}</h1>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-mono font-bold" style={{ color: accentColor }}>
                  ₱{finalPrice.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
                {priceModifier !== 0 && (
                  <span className="text-sm text-muted-foreground line-through">
                    ₱{product.price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Tax included.</p>
            </div>

            {product.description && (
              <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>
            )}

            {/* Variant Selectors */}
            {Object.entries(grouped).map(([type, items]) => (
              <div key={type} className="space-y-2">
                <p className="text-xs font-semibold">
                  {type}
                  {selectedVariants[type] && (
                    <span className="font-normal text-muted-foreground ml-1">: {selectedVariants[type].variant_value}</span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  {items.map((v) => {
                    const isSelected = selectedVariants[type]?.id === v.id;
                    const oos = v.stock <= 0;
                    return (
                      <button
                        key={v.id}
                        disabled={oos}
                        onClick={() => setSelectedVariants((s) => ({ ...s, [type]: v }))}
                        className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10"
                            : oos
                            ? "border-border/40 opacity-40 line-through"
                            : "border-border/60 hover:border-primary/40"
                        }`}
                      >
                        {v.variant_value}
                        {v.price_modifier !== 0 && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            {v.price_modifier > 0 ? "+" : ""}₱{v.price_modifier}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Quantity */}
            <div className="space-y-2">
              <p className="text-xs font-semibold">Quantity</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-border rounded-xl overflow-hidden">
                  <button
                    className="px-3 py-2 hover:bg-muted/50 transition-colors"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-2 font-mono text-sm min-w-[3rem] text-center border-x border-border">
                    {quantity}
                  </span>
                  <button
                    className="px-3 py-2 hover:bg-muted/50 transition-colors"
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {product.stock > 0 ? (
                  <Badge variant="secondary" className="text-xs">{product.stock} in stock</Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">Sold Out</Badge>
                )}
              </div>
            </div>

            {/* Add to Cart */}
            {product.stock > 0 && !anyOutOfStock && allTypesSelected ? (
              <Button
                onClick={addToCart}
                className="w-full h-14 rounded-2xl text-base font-semibold gap-2"
                style={{ backgroundColor: accentColor, color: "#fff" }}
              >
                <ShoppingBag className="w-5 h-5" />
                Add to cart · ₱{(finalPrice * quantity).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </Button>
            ) : (
              <Button disabled className="w-full h-14 rounded-2xl text-base font-semibold">
                {!allTypesSelected ? "Select all options" : "Sold Out"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <CheckoutSheet
        open={checkoutOpen}
        onClose={() => { setCheckoutOpen(false); setCart([]); }}
        cart={cart}
        onUpdateCart={setCart}
        personaId={product.persona_id}
        sellerUserId={product.user_id}
        gcashQrUrl={personaData?.gcash_qr_url}
      />
    </div>
  );
};

export default PublicProductPage;
