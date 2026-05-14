import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, boolean>();

export function useIsSuperAdmin() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(() => (userId ? cache.get(userId) ?? false : false));
  const [loading, setLoading] = useState<boolean>(() => (userId ? !cache.has(userId) : false));

  useEffect(() => {
    if (!userId) {
      setIsSuperAdmin(false);
      setLoading(false);
      return;
    }
    if (cache.has(userId)) {
      setIsSuperAdmin(cache.get(userId)!);
      setLoading(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "super_admin" as any)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const next = !!data;
        cache.set(userId, next);
        setIsSuperAdmin(next);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId]);

  return { isSuperAdmin, loading };
}
