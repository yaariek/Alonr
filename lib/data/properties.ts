import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/database.types";
import { SAMPLE_PROPERTIES } from "@/lib/sample-data";
import { createClient } from "@/lib/supabase/client";
import type { Property, ProviderGroup } from "@/lib/types";

// Real halls from Supabase (seeded from data/properties.csv by data/seed.py),
// in the same Property shape as lib/sample-data.ts.

// providers.id -> the group name used by the chips and colours
export const PROVIDER_GROUPS: Record<string, ProviderGroup> = {
  unite: "Unite", iq: "iQ", chapter: "Chapter", scape: "Scape", prestige: "Prestige",
  ucl: "UCL", kcl: "KCL", imperial: "Imperial",
};

export const PROPERTY_SELECT = "*, room_types(*)";
export type PropertyRow = Tables<"properties"> & { room_types: Tables<"room_types">[] };

const opt = <T,>(v: T | null) => v ?? undefined;

/** One DB row -> Property. null for halls without lat/lng (they can't go on the map). */
export function toProperty(row: PropertyRow): Property | null {
  if (row.lat === null || row.lng === null) return null;
  return {
    id: row.id,
    name: row.name,
    provider: PROVIDER_GROUPS[row.provider_id] ?? "Other",
    affiliatedUniversity: opt(row.affiliated_university_id),
    address: row.address ?? "",
    postcode: row.postcode ?? "",
    lat: row.lat,
    lng: row.lng,
    reception24h: row.reception_24h,
    accessible: row.accessible,
    catered: row.catered,
    facilities: row.facilities,
    roomTypes: [...row.room_types]
      .sort((a, b) => a.price_week - b.price_week)
      .map((r) => ({ kind: r.kind, priceWeek: r.price_week, flatmates: r.flatmates, contractWeeks: r.contract_weeks })),
    supermarketName: opt(row.supermarket_name),
    supermarketM: opt(row.supermarket_m),
    stationName: opt(row.station_name),
    stationM: opt(row.station_m),
    bikeDockM: opt(row.bike_dock_m),
    website: opt(row.website),
  };
}

export async function fetchProperties(supabase: SupabaseClient<Database>): Promise<Property[]> {
  const { data, error } = await supabase.from("properties").select(PROPERTY_SELECT).order("name");
  if (error) throw error;
  return (data as PropertyRow[]).map(toProperty).filter((p): p is Property => p !== null);
}

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
