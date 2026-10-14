"use client";

import { useEffect, useState } from "react";
import { fetchProperties } from "@/lib/data/properties";
import { SAMPLE_PROPERTIES } from "@/lib/sample-data";
import { createClient } from "@/lib/supabase/client";
import type { Property } from "@/lib/types";

/**
 * For "use client" components: all halls, loaded once. Starts as [] while loading.
 * Without Supabase keys in .env.local it falls back to the sample halls, so the map still works.
 */
export function useProperties(): { properties: Property[]; loading: boolean; error: string | null } {
  const hasKeys = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const [state, setState] = useState({
    properties: hasKeys ? [] : SAMPLE_PROPERTIES,
    loading: hasKeys,
    error: null as string | null,
  });

  useEffect(() => {
    if (!hasKeys) return;
    let cancelled = false;
    fetchProperties(createClient())
      .then((properties) => !cancelled && setState({ properties, loading: false, error: null }))
      .catch((e) => {
        console.error("Loading halls failed", e);
        if (!cancelled) setState({ properties: [], loading: false, error: "Couldn't load the halls. Check your connection." });
      });
    return () => {
      cancelled = true;
    };
  }, [hasKeys]);

  return state;
}
