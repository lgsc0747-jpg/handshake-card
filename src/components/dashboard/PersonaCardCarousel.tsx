import { useEffect, useState, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { InteractiveCard3D } from "@/components/InteractiveCard3D";
import { Button } from "@/components/ui/button";
import { ChartTitleWithInfo } from "@/components/dashboard/ChartTitleWithInfo";

interface PersonaRow {
  id: string;
  slug: string;
  label: string;
  display_name: string | null;
  headline: string | null;
  avatar_url: string | null;
  accent_color: string | null;
  secondary_color: string | null;
  tertiary_color: string | null;
  text_color: string | null;
  card_bg_image_url: string | null;
  card_bg_size: string | null;
  avatar_position: any;
  card_bg_position: any;
  glass_opacity: number | null;
  font_family: string | null;
  text_alignment: string | null;
  card_blur: number | null;
  card_texture: string | null;
  border_radius: number | null;
  email_public: string | null;
  phone: string | null;
  website: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  is_active: boolean;
}

export function PersonaCardCarousel() {
  const { user } = useAuth();
  const [personas, setPersonas] = useState<PersonaRow[]>([]);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "center" });
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("personas").select("*").eq("user_id", user.id).order("created_at"),
      supabase.from("profiles").select("username").eq("user_id", user.id).maybeSingle(),
    ]).then(([p, pr]) => {
      setPersonas((p.data as PersonaRow[]) ?? []);
      setUsername(pr.data?.username ?? "you");
      setLoading(false);
    });
  }, [user]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
  }, [emblaApi, onSelect]);

  return (
    <div className="rounded-sm border border-border bg-card p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <ChartTitleWithInfo
          title="Card Studio"
          info="Interactive 3D render of every persona's business card. Swipe to flip through your identities."
          className="text-sm"
        />
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-sm" onClick={() => emblaApi?.scrollPrev()} disabled={!emblaApi?.canScrollPrev()}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-eyebrow text-muted-foreground tabular-nums">
            {personas.length === 0 ? "0 / 0" : `${selected + 1} / ${personas.length}`}
          </span>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-sm" onClick={() => emblaApi?.scrollNext()} disabled={!emblaApi?.canScrollNext()}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : personas.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-border rounded-sm">
          <p className="text-sm text-muted-foreground mb-3">No personas yet.</p>
          <Button asChild size="sm" className="rounded-sm">
            <Link to="/personas"><Plus className="w-3.5 h-3.5 mr-1.5" />Create persona</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="overflow-hidden -mx-2" ref={emblaRef}>
            <div className="flex">
              {personas.map((p) => (
                <div key={p.id} className="min-w-0 flex-[0_0_100%] sm:flex-[0_0_70%] lg:flex-[0_0_55%] px-2">
                  <div
                    className="rounded-sm p-6 sm:p-8 flex flex-col items-center gap-3"
                    style={{
                      background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${p.accent_color ?? "#0d9488"}1a, transparent 70%)`,
                    }}
                  >
                    <div className="w-full max-w-[440px]">
                      <InteractiveCard3D
                        name={p.display_name ?? p.label}
                        headline={p.headline ?? undefined}
                        avatarUrl={p.avatar_url ?? undefined}
                        username={`${username}/${p.slug}`}
                        accentColor={p.accent_color ?? "#0d9488"}
                        secondaryColor={p.secondary_color ?? undefined}
                        tertiaryColor={p.tertiary_color ?? undefined}
                        textColor={p.text_color ?? "#ffffff"}
                        cardBgImageUrl={p.card_bg_image_url ?? undefined}
                        cardBgSize={p.card_bg_size ?? "cover"}
                        avatarPosition={p.avatar_position}
                        cardBgPosition={p.card_bg_position}
                        glassOpacity={p.glass_opacity ?? 0.15}
                        linkedinUrl={p.linkedin_url ?? undefined}
                        githubUrl={p.github_url ?? undefined}
                        website={p.website ?? undefined}
                        email={p.email_public ?? undefined}
                        fontFamily={p.font_family ?? "Space Grotesk"}
                        textAlignment={p.text_alignment ?? "left"}
                        cardBlur={p.card_blur ?? 12}
                        cardTexture={p.card_texture ?? "none"}
                        borderRadius={p.border_radius ?? 24}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-eyebrow text-muted-foreground">{p.is_active ? "Active" : "Draft"}</p>
                      <p className="text-sm font-semibold mt-0.5">{p.label}</p>
                      <Link
                        to={`/personas/${p.slug}/analytics`}
                        className="text-eyebrow text-accent hover:underline mt-1 inline-block"
                      >
                        View analytics →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center gap-1.5">
            {personas.map((_, i) => (
              <button
                key={i}
                onClick={() => emblaApi?.scrollTo(i)}
                className={`h-1 rounded-sm transition-all ${i === selected ? "w-6 bg-foreground" : "w-1.5 bg-border"}`}
                aria-label={`Go to persona ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
