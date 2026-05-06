import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Page, PageHeader, PageSection, PageGrid } from "@/components/layout/Page";
import { Users, Palette, FileText, ArrowRight, Sparkles } from "lucide-react";
import { springIOS, fadeUp, staggerChildren } from "@/lib/motion";

const TILES = [
  {
    id: "personas",
    to: "/personas",
    label: "Personas",
    desc: "Manage identities, PINs, privacy and active state.",
    icon: Users,
    accent: "from-sky-500/30 to-sky-500/0",
  },
  {
    id: "card",
    to: "/design-studio",
    label: "Card Studio",
    desc: "Design the 3D business card and visual theme.",
    icon: Palette,
    accent: "from-fuchsia-500/30 to-fuchsia-500/0",
  },
  {
    id: "page",
    to: "/page-builder",
    label: "Page Builder",
    desc: "Compose the public landing page block by block.",
    icon: FileText,
    accent: "from-emerald-500/30 to-emerald-500/0",
  },
];

const FunnelPage = () => {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <Page>
        <PageHeader
          title={
            <span className="inline-flex items-center gap-2">
              <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-[var(--shadow-card)]">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </span>
              Funnel
            </span>
          }
          description="Personas, card design and pages — one place to shape every step a visitor takes."
        />

        <PageSection title="Workspaces">
          <motion.div
            variants={staggerChildren}
            initial="hidden"
            animate="show"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {TILES.map((t) => {
              const Icon = t.icon;
              return (
                <motion.button
                  key={t.id}
                  variants={fadeUp}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.985 }}
                  transition={springIOS}
                  onClick={() => navigate(t.to)}
                  className="text-left group"
                >
                  <Card className="relative overflow-hidden h-full border-border/60 hover:border-primary/40 transition-colors">
                    <div
                      className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${t.accent} opacity-60 group-hover:opacity-100 transition-opacity`}
                    />
                    <CardContent className="relative p-5 sm:p-6 flex flex-col h-full gap-4">
                      <div className="flex items-center justify-between">
                        <span className="w-10 h-10 rounded-2xl bg-background/70 backdrop-blur-md border border-border/60 flex items-center justify-center">
                          <Icon className="w-4 h-4" />
                        </span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-base font-semibold tracking-tight">
                          {t.label}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {t.desc}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.button>
              );
            })}
          </motion.div>
        </PageSection>
      </Page>
    </DashboardLayout>
  );
};

export default FunnelPage;
