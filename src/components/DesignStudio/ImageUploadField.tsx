import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Upload, X, Loader2, History, Trash2, Move } from "lucide-react";

const RECENT_KEY_PREFIX = "nfc_recent_uploads_";

interface ImageFit {
  objectFit: "cover" | "contain" | "fill" | "none";
  objectPosition: string;
  scale: number;
}

interface ImageUploadFieldProps {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  folder: string;
  showFitControls?: boolean;
  imageFit?: ImageFit;
  onFitChange?: (fit: ImageFit) => void;
}

const FIT_OPTIONS = [
  { value: "cover", label: "Fill" },
  { value: "contain", label: "Fit" },
  { value: "fill", label: "Stretch" },
  { value: "none", label: "Original" },
] as const;

export function ImageUploadField({ label, value, onChange, folder, showFitControls = true, imageFit, onFitChange }: ImageUploadFieldProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [recentUploads, setRecentUploads] = useState<string[]>([]);
  const [showAdjust, setShowAdjust] = useState(false);
  const [posX, setPosX] = useState(50);
  const [posY, setPosY] = useState(50);
  const [internalFit, setInternalFit] = useState<ImageFit>({ objectFit: "cover", objectPosition: "50% 50%", scale: 100 });

  const effectiveFit = imageFit ?? internalFit;
  const handleFitChange = (fit: ImageFit) => {
    if (onFitChange) onFitChange(fit);
    else setInternalFit(fit);
  };

  const storageKey = `${RECENT_KEY_PREFIX}${folder}`;

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (Array.isArray(stored)) setRecentUploads(stored);
    } catch { /* ignore */ }
  }, [storageKey]);

  useEffect(() => {
    if (effectiveFit?.objectPosition) {
      const parts = effectiveFit.objectPosition.split(" ");
      setPosX(parseInt(parts[0]) || 50);
      setPosY(parseInt(parts[1]) || 50);
    }
  }, [effectiveFit?.objectPosition]);

  const addToRecent = (url: string) => {
    const updated = [url, ...recentUploads.filter((u) => u !== url)].slice(0, 6);
    setRecentUploads(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const removeFromRecent = (url: string) => {
    const updated = recentUploads.filter((u) => u !== url);
    setRecentUploads(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    if (value === url) onChange(null);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${folder}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("design-assets").upload(path, file, { upsert: true });
    if (error) {
      console.error("Upload error:", error);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("design-assets").getPublicUrl(path);
    addToRecent(urlData.publicUrl);
    onChange(urlData.publicUrl);
    setUploading(false);
  };

  const updateFit = (updates: Partial<ImageFit>) => {
    if (!onFitChange || !imageFit) return;
    onFitChange({ ...imageFit, ...updates });
  };

  const handlePosChange = (axis: "x" | "y", val: number) => {
    if (axis === "x") setPosX(val);
    else setPosY(val);
    const newX = axis === "x" ? val : posX;
    const newY = axis === "y" ? val : posY;
    updateFit({ objectPosition: `${newX}% ${newY}%` });
  };

  const currentFit = imageFit?.objectFit ?? "cover";
  const currentScale = imageFit?.scale ?? 100;

  const otherRecent = recentUploads.filter((u) => u !== value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
          {value && showFitControls && (
            <button
              type="button"
              className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
              onClick={() => setShowAdjust(!showAdjust)}
            >
              <Move className="w-3 h-3" />
              {showAdjust ? "Hide" : "Adjust"}
            </button>
          )}
          {otherRecent.length > 0 && (
            <button
              type="button"
              className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
              onClick={() => setShowRecent(!showRecent)}
            >
              <History className="w-3 h-3" />
              {showRecent ? "Hide" : "Recent"} ({otherRecent.length})
            </button>
          )}
        </div>
      </div>
      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-border">
          <img
            src={value}
            alt={label}
            className="w-full h-24"
            style={{
              objectFit: currentFit,
              objectPosition: `${posX}% ${posY}%`,
              transform: currentScale !== 100 ? `scale(${currentScale / 100})` : undefined,
            }}
          />
          <Button
            size="icon"
            variant="destructive"
            className="absolute top-1 right-1 h-6 w-6"
            onClick={() => onChange(null)}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full h-20 border-dashed flex flex-col gap-1"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span className="text-xs">Upload Image</span>
            </>
          )}
        </Button>
      )}

      {/* Image Adjustment Controls */}
      {showAdjust && value && showFitControls && (
        <div className="space-y-3 p-3 rounded-xl border border-border/60 bg-muted/20">
          <div className="space-y-1">
            <Label className="text-[10px]">Sizing</Label>
            <Select value={currentFit} onValueChange={(v) => updateFit({ objectFit: v as ImageFit["objectFit"] })}>
              <SelectTrigger className="h-8 rounded-lg text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Horizontal Position ({posX}%)</Label>
            <Slider value={[posX]} onValueChange={([v]) => handlePosChange("x", v)} min={0} max={100} step={1} className="py-1" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Vertical Position ({posY}%)</Label>
            <Slider value={[posY]} onValueChange={([v]) => handlePosChange("y", v)} min={0} max={100} step={1} className="py-1" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Scale ({currentScale}%)</Label>
            <Slider value={[currentScale]} onValueChange={([v]) => updateFit({ scale: v })} min={50} max={200} step={5} className="py-1" />
          </div>
        </div>
      )}

      {/* Recent uploads gallery */}
      {showRecent && otherRecent.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground">Recent uploads — click to use, hover to delete</p>
          <div className="grid grid-cols-3 gap-1.5">
            {otherRecent.map((url) => (
              <div key={url} className="relative group">
                <button
                  type="button"
                  className="rounded-md overflow-hidden border border-border hover:ring-2 hover:ring-primary transition-all w-full"
                  onClick={() => onChange(url)}
                >
                  <img src={url} alt="Recent upload" className="w-full h-14 object-cover" />
                </button>
                <button
                  type="button"
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); removeFromRecent(url); }}
                  title="Remove from recent"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
    </div>
  );
}
