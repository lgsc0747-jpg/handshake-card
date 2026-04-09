import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type Plan = "free" | "pro";

export interface PlanLimits {
  maxPersonas: number;
  maxProducts: number;
  analyticsAccess: "basic" | "full";
  analyticsDaysHistory: number;
  privateMode: boolean;
  leadGenForm: boolean;
  customBackgrounds: boolean;
  customFonts: boolean;
  cvHosting: boolean;
  removeBranding: boolean;
  exportReports: boolean;
  customShortLinks: boolean;
  commerce: boolean;
  pageBuilder: boolean;
}

const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    maxPersonas: 1,
    maxProducts: 3,
    analyticsAccess: "basic",
    analyticsDaysHistory: 7,
    privateMode: false,
    leadGenForm: false,
    customBackgrounds: false,
    customFonts: false,
    cvHosting: false,
    removeBranding: false,
    exportReports: false,
    customShortLinks: false,
    commerce: false,
    pageBuilder: false,
  },
  pro: {
    maxPersonas: Infinity,
    maxProducts: Infinity,
    analyticsAccess: "full",
    analyticsDaysHistory: 365,
    privateMode: true,
    leadGenForm: true,
    customBackgrounds: true,
    customFonts: true,
    cvHosting: true,
    removeBranding: true,
    exportReports: true,
    customShortLinks: true,
    commerce: true,
    pageBuilder: true,
  },
};

export function useSubscription() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPlan("free");
      setLoading(false);
      return;
    }

    const fetchPlan = async () => {
      const { data } = await supabase
        .from("user_subscriptions")
        .select("plan")
        .eq("user_id", user.id)
        .single();

      if (data?.plan) {
        setPlan(data.plan as Plan);
      } else {
        // Subscription is auto-created by DB trigger on signup
        // If missing, default to free without client-side insert
        setPlan("free");
      }
      setLoading(false);
    };

    fetchPlan();
  }, [user]);

  const limits = PLAN_LIMITS[plan];
  const isPro = plan === "pro";

  const canUseFeature = (feature: keyof PlanLimits): boolean => {
    const value = limits[feature];
    if (typeof value === "boolean") return value;
    return true;
  };

  return { plan, isPro, limits, loading, canUseFeature };
}
