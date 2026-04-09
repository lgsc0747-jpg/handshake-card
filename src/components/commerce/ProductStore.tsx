import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ImageUploadField } from "@/components/DesignStudio/ImageUploadField";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Plus, Trash2, Edit, Loader2, Package, Eye, EyeOff,
  ShoppingBag, ExternalLink,
} from "lucide-react";

interface Product {
  id: string;
  user_id: string;
  persona_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  stock: number;
  is_visible: boolean;
  sort_order: number;
}

interface ProductStoreProps {
  personaId: string;
  personaLabel: string;
}

export function ProductStore({ personaId, personaLabel }: ProductStoreProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Quick-add form state
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !personaId) return;
    loadProducts();
  }, [user, personaId]);

  const loadProducts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("persona_id", personaId)
      .eq("user_id", user!.id)
      .order("sort_order");
    setProducts((data as Product[]) ?? []);
    setLoading(false);
  };

  const resetForm = () => {
    setName("");
    setPrice("");
    setStock("");
    setImageUrl(null);
  };

  const handleQuickAdd = async () => {
    if (!name.trim() || !price) {
      toast({ title: "Name and price are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("products")
      .insert({
        name: name.trim(),
        price: parseFloat(price),
        stock: parseInt(stock) || 0,
        image_url: imageUrl,
        persona_id: personaId,
        user_id: user!.id,
        sort_order: products.length,
      });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Product added" });
    setSaving(false);
    setDialogOpen(false);
    resetForm();
    loadProducts();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from("products").delete().eq("id", deleteId);
    toast({ title: "Product deleted" });
    setDeleteId(null);
    loadProducts();
  };

  const toggleVisibility = async (p: Product) => {
    await supabase.from("products").update({ is_visible: !p.is_visible }).eq("id", p.id);
    loadProducts();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-display font-bold flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" /> Products
          </h2>
          <p className="text-xs text-muted-foreground">
            Manage products for <span className="font-semibold">{personaLabel}</span>
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="ios-card max-w-sm border-border/60">
            <DialogHeader>
              <DialogTitle className="font-display">Quick Add Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label>Product Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Premium NFC Card" className="rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Price (₱)</Label>
                  <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="499" className="rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label>Stock</Label>
                  <Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="50" className="rounded-xl" />
                </div>
              </div>
              <ImageUploadField label="Featured Image" value={imageUrl} onChange={setImageUrl} folder="product-images" />
              <p className="text-[10px] text-muted-foreground">Save to add gallery, variants, and full description.</p>
              <Button onClick={handleQuickAdd} disabled={saving} className="w-full gradient-primary text-primary-foreground rounded-xl h-11">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Add Product
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {products.length === 0 ? (
        <Card className="ios-card">
          <CardContent className="p-8 text-center">
            <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No products yet. Add your first product to start selling.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {products.map((p) => (
            <Card key={p.id} className={`ios-card overflow-hidden transition-opacity ${!p.is_visible ? "opacity-60" : ""}`}>
              {p.image_url && (
                <div className="h-32 w-full overflow-hidden">
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                </div>
              )}
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{p.name}</p>
                    {p.description && <p className="text-[10px] text-muted-foreground">{p.description}</p>}
                  </div>
                  <Badge variant="secondary" className="text-xs font-mono">₱{p.price.toFixed(2)}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={p.stock > 0 ? "default" : "destructive"} className="text-[10px]">
                      {p.stock > 0 ? `${p.stock} in stock` : "Sold Out"}
                    </Badge>
                    {!p.is_visible && (
                      <Badge variant="outline" className="text-[10px]">
                        <EyeOff className="w-2.5 h-2.5 mr-1" /> Hidden
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleVisibility(p)}>
                      {p.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigate(`/commerce/products/${p.id}`)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(p.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Product?"
        description="This product and all its variants will be permanently removed."
        onConfirm={handleDelete}
      />
    </div>
  );
}
