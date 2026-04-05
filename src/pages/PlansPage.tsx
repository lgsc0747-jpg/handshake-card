import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import {
  Check, X, Crown, Zap, Shield, BarChart3, Palette,
  Users, FileText, Link2, Download,
} from "lucide-react";

const features = [
  { label: "Personas", free: "Up to 2", pro: "Unlimited", icon: Users },
  { label: "Analytics History", free: "7 days", pro: "365 days", icon: BarChart3 },
  { label: "Analytics Depth", free: "Total Taps Only", pro: "Full Dashboard (Device, Location, CTR, Funnel)", icon: BarChart3 },
  { label: "Private Mode / PIN Lock", free: false, pro: true, icon: Shield },
  { label: "Lead Gen Form", free: false, pro: true, icon: Zap },
  { label: "Custom Backgrounds & Fonts", free: false, pro: true, icon: Palette },
  { label: "CV / Resume Hosting", free: false, pro: true, icon: FileText },
  { label: "Export Reports (CSV/PDF)", free: false, pro: true, icon: Download },
  { label: "Remove 'NFC Hub' Branding", free: false, pro: true, icon: Link2 },
  { label: "Custom Short Links", free: false, pro: true, icon: Link2 },
];

const PlansPage = () => {
  const { plan, isPro } = useSubscription();

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 py-4">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-display font-bold">Choose Your Plan</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Unlock the full power of your digital identity with NFC Hub Pro.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Free Tier */}
          <Card className={`relative ${plan === "free" ? "ring-2 ring-primary" : ""}`}>
            {plan === "free" && (
              <Badge className="absolute -top-2.5 left-4 bg-primary text-primary-foreground">Current Plan</Badge>
            )}
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-muted-foreground" />
                Starter
              </CardTitle>
              <div className="pt-2">
                <span className="text-3xl font-bold">Free</span>
                <span className="text-muted-foreground text-sm ml-1">forever</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {features.map((f) => (
                <div key={f.label} className="flex items-center gap-2 text-sm">
                  {f.free === false ? (
                    <X className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                  ) : (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  )}
                  <span className={f.free === false ? "text-muted-foreground/50" : "text-foreground"}>
                    {f.label}
                  </span>
                  {typeof f.free === "string" && (
                    <Badge variant="secondary" className="ml-auto text-[10px]">{f.free}</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Pro Tier */}
          <Card className={`relative border-amber-500/40 ${plan === "pro" ? "ring-2 ring-amber-500" : ""}`}>
            {plan === "pro" && (
              <Badge className="absolute -top-2.5 left-4 bg-amber-500 text-white">Current Plan</Badge>
            )}
            {!isPro && (
              <Badge className="absolute -top-2.5 right-4 bg-amber-500 text-white">Recommended</Badge>
            )}
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                Professional
              </CardTitle>
              <div className="pt-2">
                <span className="text-3xl font-bold">$9</span>
                <span className="text-muted-foreground text-sm ml-1">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {features.map((f) => (
                <div key={f.label} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-foreground">{f.label}</span>
                  {typeof f.pro === "string" && (
                    <Badge variant="secondary" className="ml-auto text-[10px] border-amber-500/30">{f.pro}</Badge>
                  )}
                </div>
              ))}
              <div className="pt-4">
                {isPro ? (
                  <Button disabled className="w-full">
                    <Check className="w-4 h-4 mr-2" /> Active
                  </Button>
                ) : (
                  <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                    <Crown className="w-4 h-4 mr-2" /> Upgrade to Pro
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Payment integration coming soon. Contact support to upgrade your account.
        </p>
      </div>
    </DashboardLayout>
  );
};

export default PlansPage;
