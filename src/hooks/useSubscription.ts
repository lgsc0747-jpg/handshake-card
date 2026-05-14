import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type Plan = "free" | "pro";

export interface PlanLimits {
  maxPersonas: number;
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
  pageBuilder: boolean;
}

const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    maxPersonas: 1,
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
    pageBuilder: false,
  },
  pro: {
    maxPersonas: Infinity,
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
    pageBuilder: true,
  },
};

// Cache plan per user so navigations never flash "free" before "pro" loads.
const cache = new Map<string, Plan>();

export function useSubscription() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [plan, setPlan] = useState<Plan>(() => (userId ? cache.get(userId) ?? "free" : "free"));
  const [loading, setLoading] = useState<boolean>(() => (userId ? !cache.has(userId) : false));

  useEffect(() => {
    if (!userId) {
      setPlan("free");
      setLoading(false);
      return;
    }
    if (cache.has(userId)) {
      setPlan(cache.get(userId)!);
      setLoading(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("user_subscriptions")
      .select("plan")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const next = (data?.plan as Plan) || "free";
        cache.set(userId, next);
        setPlan(next);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId]);

  const limits = PLAN_LIMITS[plan];
  const isPro = plan === "pro";

  const canUseFeature = (feature: keyof PlanLimits): boolean => {
    const value = limits[feature];
    if (typeof value === "boolean") return value;
    return true;
  };

  return { plan, isPro, limits, loading, canUseFeature };
}
