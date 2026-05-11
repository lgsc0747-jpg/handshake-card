import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PersonaSection =
  | "identity" | "design" | "blocks" | "cards" | "leads" | "analytics" | "inbox" | "goals";
export type PersonaPermission = "view" | "edit" | "manage";

/**
 * Returns whether the current user has at least `permission` on `section` of `personaId`.
 * Owner of the persona always returns true.
 */
export function usePersonaSectionAccess(
  personaId: string | null | undefined,
  section: PersonaSection,
  permission: PersonaPermission = "view",
) {
  const { user } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user || !personaId) { setAllowed(null); return; }
    let cancelled = false;
    supabase.rpc("has_persona_section_access", {
      _user_id: user.id,
      _persona_id: personaId,
      _section: section,
      _required_permission: permission,
    }).then(({ data }) => {
      if (!cancelled) setAllowed(Boolean(data));
    });
    return () => { cancelled = true; };
  }, [user?.id, personaId, section, permission]);

  return allowed;
}
