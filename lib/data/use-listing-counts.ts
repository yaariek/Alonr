"use client";

import { useEffect, useState } from "react";
import { getListingCounts } from "@/lib/data/listings";
import { createClient } from "@/lib/supabase/client";

/**
 * For "use client" components: active listings per hall (property id -> count), loaded once.
 * Empty while loading, without Supabase keys, or if loading fails (the map still works).
 */
export function useListingCounts(): Map<string, number> {
  const [counts, setCounts] = useState(() => new Map<string, number>());

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
    let cancelled = false;
    getListingCounts(createClient())
      .then((c) => !cancelled && setCounts(c))
      .catch((e) => console.error("Loading listing counts failed", e));
    return () => {
      cancelled = true;
    };
  }, []);

  return counts;
}
