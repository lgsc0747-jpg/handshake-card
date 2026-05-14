import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Module-level cache so navigation between pages never flickers the value
// back to "not admin" while a fresh fetch is in-flight.
const cache = new Map<string, boolean>();

export function useIsAdmin() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [isAdmin, setIsAdmin] = useState<boolean>(() => (userId ? cache.get(userId) ?? false : false));
  const [loading, setLoading] = useState<boolean>(() => (userId ? !cache.has(userId) : false));

  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    if (cache.has(userId)) {
      setIsAdmin(cache.get(userId)!);
      setLoading(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "super_admin"])
      .then(({ data }) => {
        if (cancelled) return;
        const next = (data?.length ?? 0) > 0;
        cache.set(userId, next);
        setIsAdmin(next);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId]);

  return { isAdmin, loading };
}
