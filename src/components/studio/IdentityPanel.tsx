import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ImageUploadField } from "@/components/DesignStudio/ImageUploadField";
import { AvatarPositioner, DEFAULT_AVATAR_POSITION } from "@/components/DesignStudio/AvatarPositioner";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import type { StudioPanelProps } from "./CardDesignPanel";
import { FileText, GripVertical } from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type SocialKey = "email" | "website" | "linkedin" | "github";
const DEFAULT_ORDER: SocialKey[] = ["email", "website", "linkedin", "github"];

const SOCIAL_META: Record<SocialKey, { label: string; field: string; placeholder?: string }> = {
  email: { label: "Email", field: "email_public" },
  website: { label: "Website", field: "website" },
  linkedin: { label: "LinkedIn", field: "linkedin_url" },
  github: { label: "GitHub", field: "github_url" },
};

function SortableSocialRow({
  socialKey, value, onChange,
}: {
  socialKey: SocialKey;
  value: string;
  onChange: (v: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: socialKey });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  const meta = SOCIAL_META[socialKey];
  return (
    <div ref={setNodeRef} style={style} className="flex items-end gap-2 group">
      <div
        {...attributes}
        {...listeners}
        className="touch-none cursor-grab pb-2 text-muted-foreground/60 hover:text-foreground transition-colors"
        title="Drag to reorder"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 space-y-1">
        <Label className="text-xs">{meta.label}</Label>
        <Input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-xl"
        />
      </div>
    </div>
  );
}

export function IdentityPanel({ editing, update, isPro }: StudioPanelProps) {
  const raw = editing?.avatar_position;
  const avatarPos = raw
    ? (typeof raw === "string" ? JSON.parse(raw as string) : raw)
    : DEFAULT_AVATAR_POSITION;

  const handleAvatarPosChange = (pos: { x: number; y: number; scale: number }) => {
    update("avatar_position", pos);
  };

  // Social order: stored on persona as `social_order` jsonb (string[]).
  const rawOrder = (editing as any)?.social_order;
  const parsedOrder: SocialKey[] = Array.isArray(rawOrder)
    ? rawOrder.filter((k: string): k is SocialKey => k in SOCIAL_META)
    : (typeof rawOrder === "string" ? (() => { try { return JSON.parse(rawOrder); } catch { return DEFAULT_ORDER; } })() : DEFAULT_ORDER);
  const order: SocialKey[] = [
    ...parsedOrder,
    ...DEFAULT_ORDER.filter((k) => !parsedOrder.includes(k)),
  ];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = order.indexOf(active.id as SocialKey);
    const newIdx = order.indexOf(over.id as SocialKey);
    if (oldIdx === -1 || newIdx === -1) return;
    const next = arrayMove(order, oldIdx, newIdx);
    update("social_order" as any, next);
  };

  const getValue = (key: SocialKey): string => {
    const field = SOCIAL_META[key].field;
    return (editing as any)?.[field] ?? "";
  };
  const setValue = (key: SocialKey, v: string) => {
    update(SOCIAL_META[key].field as any, v);
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Profile</h3>
        <div className="space-y-3">
          <ImageUploadField label="Profile Picture" value={editing?.avatar_url ?? null} onChange={(url) => update("avatar_url", url)} folder="avatars" showFitControls={false} />
          {editing?.avatar_url && (
            <AvatarPositioner src={editing.avatar_url} position={avatarPos} onPositionChange={handleAvatarPosChange} />
          )}
          <div className="space-y-1">
            <Label className="text-xs">Display Name</Label>
            <Input value={editing?.display_name ?? ""} onChange={(e) => update("display_name", e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Headline</Label>
            <Input value={editing?.headline ?? ""} onChange={(e) => update("headline", e.target.value)} placeholder="Full-Stack Developer" className="rounded-xl" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bio</Label>
            <Input value={editing?.bio ?? ""} onChange={(e) => update("bio", e.target.value)} className="rounded-xl" />
          </div>
        </div>
      </section>

      <Separator className="opacity-40" />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Links & Socials</h3>
          <span className="text-[9px] text-muted-foreground/60">Drag to reorder</span>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {order.map((key) => (
                <SortableSocialRow
                  key={key}
                  socialKey={key}
                  value={getValue(key)}
                  onChange={(v) => setValue(key, v)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </section>

      <Separator className="opacity-40" />

      <section className="space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" /> CV / Resume
        </h3>
        <p className="text-[10px] text-muted-foreground">Appears as a download button on your landing page</p>
        {isPro ? (
          <>
            {editing?.cv_url && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs truncate max-w-[200px]">{editing.cv_url.split("/").pop()}</Badge>
                <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive" onClick={() => update("cv_url", null)}>Remove</Button>
              </div>
            )}
            <ImageUploadField label="Upload CV (PDF or image)" value={editing?.cv_url ?? null} onChange={(url) => update("cv_url", url)} folder="cv-uploads" />
          </>
        ) : (
          <UpgradePrompt feature="CV / Resume Hosting" description="Upload and track CV downloads with Pro." />
        )}
      </section>
    </div>
  );
}
