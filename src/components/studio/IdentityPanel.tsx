import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ImageUploadField } from "@/components/DesignStudio/ImageUploadField";
import { AvatarPositioner, DEFAULT_AVATAR_POSITION } from "@/components/DesignStudio/AvatarPositioner";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import type { StudioPanelProps } from "./CardDesignPanel";
import { FileText } from "lucide-react";

export function IdentityPanel({ editing, update, isPro }: StudioPanelProps) {
  const avatarPos = editing?.avatar_position
    ? (typeof editing.avatar_position === "string" ? JSON.parse(editing.avatar_position) : editing.avatar_position)
    : DEFAULT_AVATAR_POSITION;

  const handleAvatarPosChange = (pos: { x: number; y: number; scale: number }) => {
    update("avatar_position", pos);
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
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Links & Socials</h3>
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-1"><Label className="text-xs">Email</Label><Input value={editing?.email_public ?? ""} onChange={(e) => update("email_public", e.target.value)} className="rounded-xl" /></div>
          <div className="space-y-1"><Label className="text-xs">Website</Label><Input value={editing?.website ?? ""} onChange={(e) => update("website", e.target.value)} className="rounded-xl" /></div>
          <div className="space-y-1"><Label className="text-xs">LinkedIn</Label><Input value={editing?.linkedin_url ?? ""} onChange={(e) => update("linkedin_url", e.target.value)} className="rounded-xl" /></div>
          <div className="space-y-1"><Label className="text-xs">GitHub</Label><Input value={editing?.github_url ?? ""} onChange={(e) => update("github_url", e.target.value)} className="rounded-xl" /></div>
        </div>
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
