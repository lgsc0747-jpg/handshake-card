import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ColorPickerField } from "@/components/DesignStudio/ColorPickerField";
import { ImageUploadField } from "@/components/DesignStudio/ImageUploadField";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import type { BackgroundFill } from "./types";

interface Props {
  background: BackgroundFill | null | undefined;
  accent: string | null | undefined;
  onChange: (bg: BackgroundFill | null) => void;
  onAccent: (color: string) => void;
}

export function CanvasBackgroundPanel({ background, accent, onChange, onAccent }: Props) {
  const kind = background?.kind ?? "solid";

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-[10px] uppercase tracking-wider text-zinc-400">Page Background</Label>
        <Tabs value={kind} onValueChange={(v) => {
          if (v === "solid") onChange({ kind: "solid", color: "#0a0a0a", opacity: 1 });
          else if (v === "gradient") onChange({ kind: "gradient", from: "#0a0a0a", to: "#1e293b", angle: 135, opacity: 1 });
          else onChange({ kind: "image", url: "", fit: "cover", opacity: 1 });
        }}>
          <TabsList className="w-full grid grid-cols-3 h-8 mt-1.5 bg-zinc-800">
            <TabsTrigger value="solid" className="text-[10px] data-[state=active]:bg-zinc-700">Solid</TabsTrigger>
            <TabsTrigger value="gradient" className="text-[10px] data-[state=active]:bg-zinc-700">Gradient</TabsTrigger>
            <TabsTrigger value="image" className="text-[10px] data-[state=active]:bg-zinc-700">Image</TabsTrigger>
          </TabsList>

          <TabsContent value="solid" className="mt-3 space-y-2">
            <ColorPickerField
              label="Color"
              value={background?.kind === "solid" ? background.color : "#0a0a0a"}
              onChange={(c) => onChange({ kind: "solid", color: c, opacity: background?.opacity ?? 1 })}
            />
          </TabsContent>

          <TabsContent value="gradient" className="mt-3 space-y-2">
            <ColorPickerField
              label="From"
              value={background?.kind === "gradient" ? background.from : "#0a0a0a"}
              onChange={(c) => background?.kind === "gradient" && onChange({ ...background, from: c })}
            />
            <ColorPickerField
              label="To"
              value={background?.kind === "gradient" ? background.to : "#1e293b"}
              onChange={(c) => background?.kind === "gradient" && onChange({ ...background, to: c })}
            />
            <div className="space-y-1">
              <Label className="text-xs">Angle</Label>
              <Slider
                min={0} max={360} step={5}
                value={[background?.kind === "gradient" ? (background.angle ?? 135) : 135]}
                onValueChange={([v]) => background?.kind === "gradient" && onChange({ ...background, angle: v })}
              />
            </div>
          </TabsContent>

          <TabsContent value="image" className="mt-3 space-y-2">
            <ImageUploadField
              label="Image"
              value={background?.kind === "image" ? background.url : null}
              onChange={(url) => background?.kind === "image" ? onChange({ ...background, url: url ?? "" }) : onChange({ kind: "image", url: url ?? "", fit: "cover", opacity: 1 })}
              folder="page-backgrounds"
            />
            {background?.kind === "image" && (
              <>
                <Input
                  placeholder="Or paste image URL"
                  className="h-8 text-xs bg-zinc-800 border-zinc-700"
                  value={background.url}
                  onChange={(e) => onChange({ ...background, url: e.target.value })}
                />
                <div className="space-y-1">
                  <Label className="text-xs">Fit</Label>
                  <Select value={background.fit ?? "cover"} onValueChange={(v) => onChange({ ...background, fit: v as any })}>
                    <SelectTrigger className="h-8 text-xs bg-zinc-800 border-zinc-700"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cover">Cover</SelectItem>
                      <SelectItem value="contain">Contain</SelectItem>
                      <SelectItem value="fill">Fill</SelectItem>
                      <SelectItem value="tile">Tile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Blur</Label>
                  <Slider min={0} max={40} step={1}
                    value={[background.blur ?? 0]}
                    onValueChange={([v]) => onChange({ ...background, blur: v })}
                  />
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {background && (
          <>
            <div className="space-y-1 mt-3">
              <Label className="text-xs">Opacity</Label>
              <Slider min={0} max={100} step={1}
                value={[Math.round((background.opacity ?? 1) * 100)]}
                onValueChange={([v]) => onChange({ ...background, opacity: v / 100 } as BackgroundFill)}
              />
            </div>
            <Button variant="ghost" size="sm" className="h-7 mt-2 text-[10px] text-zinc-400 hover:text-red-400" onClick={() => onChange(null)}>
              <Trash2 className="w-3 h-3 mr-1" /> Remove background
            </Button>
          </>
        )}
      </div>

      <div className="border-t border-white/10 pt-3">
        <Label className="text-[10px] uppercase tracking-wider text-zinc-400">Accent Color</Label>
        <div className="mt-2">
          <ColorPickerField label="Site-wide accent" value={accent ?? "#3b82f6"} onChange={onAccent} />
        </div>
        <p className="text-[10px] text-zinc-500 mt-1">Used as the default for buttons & links.</p>
      </div>
    </div>
  );
}
