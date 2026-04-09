import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImageUploadField } from "@/components/DesignStudio/ImageUploadField";
import { ProductImageGallery } from "@/components/commerce/ProductImageGallery";
import { ProductVariantManager } from "@/components/commerce/ProductVariantManager";
import {
  ArrowLeft, Loader2, Save, Package, Image as ImageIcon, Layers, Eye,
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

const ProductEditPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!user || !productId) return;
    supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .eq("user_id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          toast({ title: "Product not found", variant: "destructive" });
          navigate("/commerce");
          return;
        }
        const p = data as Product;
        setProduct(p);
        setName(p.name);
        setDescription(p.description ?? "");
        setPrice(p.price.toString());
        setStock(p.stock.toString());
        setImageUrl(p.image_url);
        setIsVisible(p.is_visible);
        setLoading(false);
      });
  }, [user, productId]);

  const handleSave = async () => {
    if (!name.trim() || !price) {
      toast({ title: "Name and price are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("products")
      .update({
        name: name.trim(),
        description: description.trim() || null,
        price: parseFloat(price),
        stock: parseInt(stock) || 0,
        image_url: imageUrl,
        is_visible: isVisible,
      })
      .eq("id", productId!);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Product saved!" });
    }
    setSaving(false);
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
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate("/commerce")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-display font-bold">Edit Product</h1>
              <p className="text-xs text-muted-foreground">{name || "Untitled"}</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm" className="gradient-primary text-primary-foreground rounded-xl h-9">
            {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            Save
          </Button>
        </div>

        {/* Basic Info */}
        <div className="ios-card rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Package className="w-4 h-4" /> Product Details
          </h2>
          <div className="space-y-1">
            <Label>Product Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Premium NFC Card" className="rounded-xl" />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your product in detail..."
              className="rounded-xl min-h-[100px]"
            />
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
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5" /> Visible to customers
            </Label>
            <Switch checked={isVisible} onCheckedChange={setIsVisible} />
          </div>
        </div>

        {/* Featured Image */}
        <div className="ios-card rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /> Featured Image
          </h2>
          <ImageUploadField
            label="Product Image"
            value={imageUrl}
            onChange={setImageUrl}
            folder="product-images"
          />
        </div>

        {/* Gallery */}
        {product && (
          <div className="ios-card rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Gallery
            </h2>
            <p className="text-[10px] text-muted-foreground">Add extra photos or videos to the product page.</p>
            <ProductImageGallery productId={product.id} />
          </div>
        )}

        {/* Variants */}
        {product && (
          <div className="ios-card rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4" /> Variants
            </h2>
            <p className="text-[10px] text-muted-foreground">Create options like color, size, or material.</p>
            <ProductVariantManager productId={product.id} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ProductEditPage;
