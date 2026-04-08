import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Upload, X, Loader2, History, Trash2, Crop } from "lucide-react";
import { ImageCropperModal, type CropPosition } from "./ImageCropperModal";

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
  accept?: string;
  showFitControls?: boolean;
  imageFit?: ImageFit;
  onFitChange?: (fit: ImageFit) => void;
  /** Aspect ratio (w/h) for the crop area. Null = square */
  cropAspectRatio?: number | null;
  /** Human-friendly label shown in the cropper */
  cropLabel?: string;
}

export function ImageUploadField({
  label,
  value,
  onChange,
  folder,
  accept = "image/*",
  showFitControls = true,
  imageFit,
  onFitChange,
  cropAspectRatio,
  cropLabel,
}: ImageUploadFieldProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [recentUploads, setRecentUploads] = useState<string[]>([]);
  const [showCropper, setShowCropper] = useState(false);
  const [previewAspectRatio, setPreviewAspectRatio] = useState<number | null>(null);

  // Derive crop position from imageFit
  const fitToCrop = (fit?: ImageFit): CropPosition => {
    if (!fit) return { x: 50, y: 50, scale: 100 };
    const parts = fit.objectPosition.split(" ");
    return { x: parseInt(parts[0]) || 50, y: parseInt(parts[1]) || 50, scale: fit.scale ?? 100 };
  };

  const cropToFit = (crop: CropPosition): ImageFit => ({
    objectFit: "cover",
    objectPosition: `${crop.x}% ${crop.y}%`,
    scale: crop.scale,
  });

  const effectiveFit = imageFit ?? { objectFit: "cover" as const, objectPosition: "50% 50%", scale: 100 };
  const cropPos = fitToCrop(imageFit);

  const storageKey = `${RECENT_KEY_PREFIX}${folder}`;

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (Array.isArray(stored)) setRecentUploads(stored);
    } catch { /* ignore */ }
  }, [storageKey]);

  useEffect(() => {
    if (!value) { setPreviewAspectRatio(null); return; }
    let active = true;
    const img = new window.Image();
    img.onload = () => { if (active) setPreviewAspectRatio(img.naturalWidth / img.naturalHeight); };
    img.onerror = () => { if (active) setPreviewAspectRatio(null); };
    img.src = value;
    return () => { active = false; };
  }, [value]);

  const addToRecent = (url: string) => {
    const updated = [url, ...recentUploads.filter(u => u !== url)].slice(0, 6);
    setRecentUploads(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const removeFromRecent = (url: string) => {
    const updated = recentUploads.filter(u => u !== url);
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
    if (error) { console.error("Upload error:", error); setUploading(false); e.target.value = ""; return; }
    const { data: urlData } = supabase.storage.from("design-assets").getPublicUrl(path);
    addToRecent(urlData.publicUrl);
    onChange(urlData.publicUrl);
    setUploading(false);
    e.target.value = "";
  };

  const handleCropConfirm = (crop: CropPosition) => {
    const newFit = cropToFit(crop);
    if (onFitChange) onFitChange(newFit);
    setShowCropper(false);
  };

  const isVideo = accept.includes("video");
  const uploadLabel = isVideo ? "Upload Video" : "Upload Image";
  const posX = parseInt(effectiveFit.objectPosition.split(" ")[0]) || 50;
  const posY = parseInt(effectiveFit.objectPosition.split(" ")[1]) || 50;
  const scale = effectiveFit.scale ?? 100;
  const otherRecent = recentUploads.filter(u => u !== value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
          {value && showFitControls && !isVideo && (
            <button
              type="button"
              className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
              onClick={() => setShowCropper(true)}
            >
              <Crop className="w-3 h-3" />
              Adjust
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
          {isVideo ? (
            <video src={value} className="w-full h-24 object-cover" muted />
          ) : (
            <img
              src={value}
              alt={label}
              className="w-full h-24"
              style={{
                objectFit: "cover",
                objectPosition: `${posX}% ${posY}%`,
                transform: scale !== 100 ? `scale(${scale / 100})` : undefined,
                transformOrigin: `${posX}% ${posY}%`,
              }}
            />
          )}
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
              <span className="text-xs">{uploadLabel}</span>
            </>
          )}
        </Button>
      )}

      {/* Recent uploads gallery */}
      {showRecent && otherRecent.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground">Recent uploads — click to use, hover to delete</p>
          <div className="grid grid-cols-3 gap-1.5">
            {otherRecent.map(url => (
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
                  onClick={e => { e.stopPropagation(); removeFromRecent(url); }}
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discord-style full-screen cropper modal */}
      {showCropper && value && (
        <ImageCropperModal
          src={value}
          cropAspectRatio={cropAspectRatio ?? previewAspectRatio ?? 16 / 9}
          cropLabel={cropLabel ?? label}
          initialPosition={cropPos}
          onConfirm={handleCropConfirm}
          onCancel={() => setShowCropper(false)}
        />
      )}

      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleUpload} />
    </div>
  );
}
