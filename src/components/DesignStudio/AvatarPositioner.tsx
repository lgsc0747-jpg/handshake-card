import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Crop, RotateCcw } from "lucide-react";
import { ImageCropperModal, type CropPosition } from "./ImageCropperModal";

export interface AvatarPosition {
  x: number;
  y: number;
  scale: number;
}

interface AvatarPositionerProps {
  src: string;
  position: AvatarPosition;
  onPositionChange: (pos: AvatarPosition) => void;
}

export const DEFAULT_AVATAR_POSITION: AvatarPosition = { x: 50, y: 50, scale: 100 };

export function AvatarPositioner({ src, position, onPositionChange }: AvatarPositionerProps) {
  const [showCropper, setShowCropper] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Avatar Position</Label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
            onClick={() => setShowCropper(true)}
          >
            <Crop className="w-3 h-3" /> Adjust
          </button>
          <button
            type="button"
            className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
            onClick={() => onPositionChange(DEFAULT_AVATAR_POSITION)}
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
      </div>

      {/* Mini preview */}
      <div className="relative h-16 w-16 mx-auto rounded-full overflow-hidden border-2 border-border">
        <img
          src={src}
          alt="Avatar preview"
          className="w-full h-full pointer-events-none"
          draggable={false}
          style={{
            objectFit: "cover",
            objectPosition: `${position.x}% ${position.y}%`,
            transform: `scale(${position.scale / 100})`,
            transformOrigin: `${position.x}% ${position.y}%`,
          }}
        />
      </div>

      {showCropper && (
        <ImageCropperModal
          src={src}
          cropAspectRatio={1}
          cropLabel="Profile Picture (circle crop)"
          initialPosition={position}
          onConfirm={(crop) => {
            onPositionChange(crop);
            setShowCropper(false);
          }}
          onCancel={() => setShowCropper(false)}
        />
      )}
    </div>
  );
}
