import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ColorPickerField } from "@/components/DesignStudio/ColorPickerField";
import { ImageUploadField } from "@/components/DesignStudio/ImageUploadField";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, X } from "lucide-react";
import type { PageBlock } from "./types";
import { ANIMATION_OPTIONS } from "./BlockRenderer";

interface BlockEditorProps {
  block: PageBlock;
  onChange: (block: PageBlock) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function BlockEditor({ block, onChange, onDelete, onClose }: BlockEditorProps) {
  const updateContent = (key: string, value: any) => {
    onChange({ ...block, content: { ...block.content, [key]: value } });
  };
  const updateStyles = (key: string, value: any) => {
    onChange({ ...block, styles: { ...block.styles, [key]: value } });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold capitalize">{block.block_type.replace("_", " ")} Settings</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive h-7 px-2">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 px-2">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Visibility toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-xs">Visible</Label>
        <Switch checked={block.is_visible} onCheckedChange={(v) => onChange({ ...block, is_visible: v })} />
      </div>

      {/* Block-specific content editors */}
      {renderContentEditor(block, updateContent, updateStyles)}

      {/* Common style controls */}
      <div className="space-y-3 pt-3 border-t border-border/40">
        <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Spacing & Style</h4>
        <div className="space-y-2">
          <Label className="text-xs">Vertical Padding</Label>
          <Slider
            value={[block.styles.paddingY ?? 24]}
            onValueChange={([v]) => updateStyles("paddingY", v)}
            min={0} max={96} step={4}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Horizontal Padding</Label>
          <Slider
            value={[block.styles.paddingX ?? 16]}
            onValueChange={([v]) => updateStyles("paddingX", v)}
            min={0} max={64} step={4}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Max Width</Label>
          <Select value={String(block.styles.maxWidth ?? "100%")} onValueChange={(v) => updateStyles("maxWidth", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="100%">Full Width</SelectItem>
              <SelectItem value="640px">Narrow (640px)</SelectItem>
              <SelectItem value="768px">Medium (768px)</SelectItem>
              <SelectItem value="1024px">Wide (1024px)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Alignment</Label>
          <Select value={block.styles.alignment ?? "left"} onValueChange={(v) => updateStyles("alignment", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ColorPickerField label="Background" value={block.styles.bgColor ?? "transparent"} onChange={(v) => updateStyles("bgColor", v === "transparent" ? undefined : v)} />
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Background Transparency</Label>
            <Switch
              checked={block.styles.bgTransparencyEnabled ?? false}
              onCheckedChange={(v) => updateStyles("bgTransparencyEnabled", v)}
            />
          </div>
          {block.styles.bgTransparencyEnabled && (
            <Slider
              value={[block.styles.bgOpacity ?? 100]}
              onValueChange={([v]) => updateStyles("bgOpacity", v)}
              min={0} max={100} step={5}
            />
          )}
          {block.styles.bgTransparencyEnabled && (
            <span className="text-[10px] text-muted-foreground">{block.styles.bgOpacity ?? 100}% opacity</span>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Border Radius</Label>
          <Slider
            value={[block.styles.borderRadius ?? 0]}
            onValueChange={([v]) => updateStyles("borderRadius", v)}
            min={0} max={32} step={2}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Entrance Animation</Label>
          <Select value={block.styles.animation ?? "none"} onValueChange={(v) => updateStyles("animation", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ANIMATION_OPTIONS.map((a) => (
                <SelectItem key={a} value={a} className="text-xs capitalize">{a.replace(/-/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function renderContentEditor(block: PageBlock, updateContent: (k: string, v: any) => void, updateStyles: (k: string, v: any) => void) {
  const c = block.content;

  switch (block.block_type) {
    case "heading":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Heading Text</Label>
            <Input value={c.text ?? ""} onChange={(e) => updateContent("text", e.target.value)} placeholder="Enter heading" className="mt-1 h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Subtitle</Label>
            <Input value={c.subtitle ?? ""} onChange={(e) => updateContent("subtitle", e.target.value)} placeholder="Optional subtitle" className="mt-1 h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Font Size</Label>
            <Slider value={[c.fontSize ?? 32]} onValueChange={([v]) => updateContent("fontSize", v)} min={16} max={72} step={2} />
            <span className="text-[10px] text-muted-foreground">{c.fontSize ?? 32}px</span>
          </div>
          <ColorPickerField label="Text Color" value={block.styles.textColor ?? "#ffffff"} onChange={(v) => updateStyles("textColor", v)} />
        </div>
      );

    case "text":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Content</Label>
            <Textarea value={c.text ?? ""} onChange={(e) => updateContent("text", e.target.value)} placeholder="Write your content..." className="mt-1 min-h-[120px] text-sm" />
          </div>
          <div>
            <Label className="text-xs">Font Size</Label>
            <Slider value={[c.fontSize ?? 16]} onValueChange={([v]) => updateContent("fontSize", v)} min={12} max={32} step={1} />
            <span className="text-[10px] text-muted-foreground">{c.fontSize ?? 16}px</span>
          </div>
          <div>
            <Label className="text-xs">Line Height</Label>
            <Slider value={[Math.round((c.lineHeight ?? 1.7) * 10)]} onValueChange={([v]) => updateContent("lineHeight", v / 10)} min={10} max={30} step={1} />
          </div>
          <ColorPickerField label="Text Color" value={block.styles.textColor ?? "#ffffff"} onChange={(v) => updateStyles("textColor", v)} />
        </div>
      );

    case "image":
      return (
        <div className="space-y-3">
          <ImageUploadField
            label="Image"
            value={c.url ?? null}
            onChange={(url) => updateContent("url", url)}
            folder="page-blocks"
          />
          <div>
            <Label className="text-xs">Caption</Label>
            <Input value={c.caption ?? ""} onChange={(e) => updateContent("caption", e.target.value)} className="mt-1 h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Alt Text</Label>
            <Input value={c.alt ?? ""} onChange={(e) => updateContent("alt", e.target.value)} className="mt-1 h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Max Height</Label>
            <Slider value={[c.maxHeight ?? 400]} onValueChange={([v]) => updateContent("maxHeight", v)} min={100} max={800} step={20} />
          </div>
          <div>
            <Label className="text-xs">Image Radius</Label>
            <Slider value={[block.styles.imageRadius ?? 12]} onValueChange={([v]) => updateStyles("imageRadius", v)} min={0} max={32} step={2} />
          </div>
        </div>
      );

    case "gallery":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Columns</Label>
            <Slider value={[c.columns ?? 3]} onValueChange={([v]) => updateContent("columns", v)} min={2} max={6} step={1} />
          </div>
          <div>
            <Label className="text-xs">Images</Label>
            <div className="space-y-2 mt-1">
              {(c.images ?? []).map((img: { url: string }, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={img.url} onChange={(e) => {
                    const updated = [...(c.images ?? [])];
                    updated[i] = { ...updated[i], url: e.target.value };
                    updateContent("images", updated);
                  }} className="h-8 text-xs" placeholder="Image URL" />
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => {
                    updateContent("images", (c.images ?? []).filter((_: any, j: number) => j !== i));
                  }}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => updateContent("images", [...(c.images ?? []), { url: "" }])}>
                <Plus className="w-3 h-3 mr-1" /> Add Image
              </Button>
            </div>
          </div>
        </div>
      );

    case "video":
      return (
        <div>
          <Label className="text-xs">Video URL (YouTube)</Label>
          <Input value={c.url ?? ""} onChange={(e) => updateContent("url", e.target.value)} placeholder="https://youtube.com/watch?v=..." className="mt-1 h-9 text-sm" />
        </div>
      );

    case "spacer":
      return (
        <div>
          <Label className="text-xs">Height</Label>
          <Slider value={[c.height ?? 48]} onValueChange={([v]) => updateContent("height", v)} min={8} max={200} step={4} />
          <span className="text-[10px] text-muted-foreground">{c.height ?? 48}px</span>
        </div>
      );

    case "divider":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Thickness</Label>
            <Slider value={[c.thickness ?? 1]} onValueChange={([v]) => updateContent("thickness", v)} min={1} max={8} step={1} />
          </div>
          <ColorPickerField label="Line Color" value={block.styles.lineColor ?? "#333"} onChange={(v) => updateStyles("lineColor", v)} />
        </div>
      );

    case "button":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Button Text</Label>
            <Input value={c.text ?? ""} onChange={(e) => updateContent("text", e.target.value)} className="mt-1 h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Link URL</Label>
            <Input value={c.url ?? ""} onChange={(e) => updateContent("url", e.target.value)} placeholder="https://..." className="mt-1 h-9 text-sm" />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Show Arrow</Label>
            <Switch checked={c.showArrow ?? false} onCheckedChange={(v) => updateContent("showArrow", v)} />
          </div>
          <ColorPickerField label="Button Color" value={block.styles.buttonColor ?? "#0d9488"} onChange={(v) => updateStyles("buttonColor", v)} />
          <ColorPickerField label="Button Text" value={block.styles.buttonTextColor ?? "#ffffff"} onChange={(v) => updateStyles("buttonTextColor", v)} />
        </div>
      );

    case "quote":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Quote</Label>
            <Textarea value={c.text ?? ""} onChange={(e) => updateContent("text", e.target.value)} className="mt-1 min-h-[80px] text-sm" />
          </div>
          <div>
            <Label className="text-xs">Author</Label>
            <Input value={c.author ?? ""} onChange={(e) => updateContent("author", e.target.value)} className="mt-1 h-9 text-sm" />
          </div>
          <ColorPickerField label="Accent" value={block.styles.accentColor ?? "#0d9488"} onChange={(v) => updateStyles("accentColor", v)} />
        </div>
      );

    case "team":
      return (
        <div className="space-y-3">
          <ImageUploadField
            label="Photo"
            value={c.photoUrl ?? null}
            onChange={(url) => updateContent("photoUrl", url)}
            folder="page-blocks"
          />
          <div>
            <Label className="text-xs">Name</Label>
            <Input value={c.name ?? ""} onChange={(e) => updateContent("name", e.target.value)} className="mt-1 h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Role / Title</Label>
            <Input value={c.role ?? ""} onChange={(e) => updateContent("role", e.target.value)} className="mt-1 h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={c.description ?? ""} onChange={(e) => updateContent("description", e.target.value)} className="mt-1 min-h-[60px] text-sm" />
          </div>
        </div>
      );

    case "stats":
      return (
        <div className="space-y-3">
          <Label className="text-xs">Stats Items</Label>
          {(c.items ?? []).map((item: { value: string; label: string }, i: number) => (
            <div key={i} className="flex gap-2">
              <Input value={item.value} onChange={(e) => {
                const updated = [...(c.items ?? [])];
                updated[i] = { ...updated[i], value: e.target.value };
                updateContent("items", updated);
              }} className="h-8 text-xs w-20" placeholder="100+" />
              <Input value={item.label} onChange={(e) => {
                const updated = [...(c.items ?? [])];
                updated[i] = { ...updated[i], label: e.target.value };
                updateContent("items", updated);
              }} className="h-8 text-xs flex-1" placeholder="Label" />
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => updateContent("items", (c.items ?? []).filter((_: any, j: number) => j !== i))}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => updateContent("items", [...(c.items ?? []), { value: "0", label: "Label" }])}>
            <Plus className="w-3 h-3 mr-1" /> Add Stat
          </Button>
          <ColorPickerField label="Accent" value={block.styles.accentColor ?? "#0d9488"} onChange={(v) => updateStyles("accentColor", v)} />
        </div>
      );

    case "testimonial":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Review Text</Label>
            <Textarea value={c.text ?? ""} onChange={(e) => updateContent("text", e.target.value)} className="mt-1 min-h-[60px] text-sm" />
          </div>
          <div>
            <Label className="text-xs">Customer Name</Label>
            <Input value={c.name ?? ""} onChange={(e) => updateContent("name", e.target.value)} className="mt-1 h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Company</Label>
            <Input value={c.company ?? ""} onChange={(e) => updateContent("company", e.target.value)} className="mt-1 h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Rating</Label>
            <Slider value={[c.rating ?? 5]} onValueChange={([v]) => updateContent("rating", v)} min={1} max={5} step={1} />
          </div>
        </div>
      );

    case "faq":
      return (
        <div className="space-y-3">
          <Label className="text-xs">FAQ Items</Label>
          {(c.items ?? []).map((item: { q: string; a: string }, i: number) => (
            <div key={i} className="space-y-1 p-3 rounded-lg border border-border/40 bg-muted/20">
              <Input value={item.q} onChange={(e) => {
                const updated = [...(c.items ?? [])];
                updated[i] = { ...updated[i], q: e.target.value };
                updateContent("items", updated);
              }} className="h-8 text-xs" placeholder="Question" />
              <Textarea value={item.a} onChange={(e) => {
                const updated = [...(c.items ?? [])];
                updated[i] = { ...updated[i], a: e.target.value };
                updateContent("items", updated);
              }} className="min-h-[40px] text-xs" placeholder="Answer" />
              <Button variant="ghost" size="sm" className="text-xs h-6 text-destructive" onClick={() => updateContent("items", (c.items ?? []).filter((_: any, j: number) => j !== i))}>
                Remove
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => updateContent("items", [...(c.items ?? []), { q: "New Question?", a: "Answer..." }])}>
            <Plus className="w-3 h-3 mr-1" /> Add FAQ
          </Button>
        </div>
      );

    case "icon_grid":
      return (
        <div className="space-y-3">
          <Label className="text-xs">Items</Label>
          {(c.items ?? []).map((item: { icon: string; label: string; description?: string }, i: number) => (
            <div key={i} className="flex gap-2 items-start">
              <Input value={item.icon} onChange={(e) => {
                const updated = [...(c.items ?? [])];
                updated[i] = { ...updated[i], icon: e.target.value };
                updateContent("items", updated);
              }} className="h-8 text-xs w-14" placeholder="🚀" />
              <div className="flex-1 space-y-1">
                <Input value={item.label} onChange={(e) => {
                  const updated = [...(c.items ?? [])];
                  updated[i] = { ...updated[i], label: e.target.value };
                  updateContent("items", updated);
                }} className="h-8 text-xs" placeholder="Label" />
                <Textarea value={item.description ?? ""} onChange={(e) => {
                  const updated = [...(c.items ?? [])];
                  updated[i] = { ...updated[i], description: e.target.value };
                  updateContent("items", updated);
                }} className="text-xs min-h-[48px] resize-y" placeholder="Description (optional)" rows={2} />
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => updateContent("items", (c.items ?? []).filter((_: any, j: number) => j !== i))}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => updateContent("items", [...(c.items ?? []), { icon: "✨", label: "New" }])}>
            <Plus className="w-3 h-3 mr-1" /> Add Item
          </Button>
        </div>
      );

    case "contact":
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Form Title</Label>
            <Input value={c.title ?? ""} onChange={(e) => updateContent("title", e.target.value)} className="mt-1 h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Button Text</Label>
            <Input value={c.buttonText ?? ""} onChange={(e) => updateContent("buttonText", e.target.value)} className="mt-1 h-9 text-sm" />
          </div>
        </div>
      );

    case "social":
      return (
        <div className="space-y-3">
          <Label className="text-xs">Social Links</Label>
          {(c.links ?? []).map((link: { platform: string; url: string }, i: number) => (
            <div key={i} className="flex gap-2">
              <Select value={link.platform} onValueChange={(v) => {
                const updated = [...(c.links ?? [])];
                updated[i] = { ...updated[i], platform: v };
                updateContent("links", updated);
              }}>
                <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Twitter", "Facebook", "Instagram", "YouTube", "LinkedIn", "GitHub", "TikTok"].map(p => (
                    <SelectItem key={p} value={p.toLowerCase()}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input value={link.url} onChange={(e) => {
                const updated = [...(c.links ?? [])];
                updated[i] = { ...updated[i], url: e.target.value };
                updateContent("links", updated);
              }} className="h-8 text-xs flex-1" placeholder="URL" />
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => updateContent("links", (c.links ?? []).filter((_: any, j: number) => j !== i))}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => updateContent("links", [...(c.links ?? []), { platform: "twitter", url: "" }])}>
            <Plus className="w-3 h-3 mr-1" /> Add Link
          </Button>
        </div>
      );

    case "embed":
      return (
        <div>
          <Label className="text-xs">HTML Code</Label>
          <Textarea value={c.html ?? ""} onChange={(e) => updateContent("html", e.target.value)} className="mt-1 min-h-[100px] text-xs font-mono" placeholder="<iframe>...</iframe>" />
        </div>
      );

    case "nfc_card":
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Card Scale · {Math.round((c.cardScale ?? 0.95) * 100)}%</Label>
            <Slider
              value={[Math.round((c.cardScale ?? 0.95) * 100)]}
              onValueChange={([v]) => updateContent("cardScale", v / 100)}
              min={50} max={150} step={5}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Card Max Width</Label>
            <Select value={String(c.cardMaxWidth ?? "420px")} onValueChange={(v) => updateContent("cardMaxWidth", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="320px">Small (320px)</SelectItem>
                <SelectItem value="380px">Medium (380px)</SelectItem>
                <SelectItem value="420px">Default (420px)</SelectItem>
                <SelectItem value="480px">Large (480px)</SelectItem>
                <SelectItem value="540px">X-Large (540px)</SelectItem>
                <SelectItem value="100%">Full Width</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    default:
      return <p className="text-xs text-muted-foreground">No editable properties for this block.</p>;
  }
}
