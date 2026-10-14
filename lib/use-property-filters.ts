"use client";

import { useMemo, useState } from "react";
import { filterProperties } from "@/lib/filters";
import type { Property } from "@/lib/types";
import type { FilterState } from "@/components/filters/FilterSheet";

const DEFAULT_FILTERS: FilterState = {
  maxPrice: 600,
  cateredOnly: false,
  reception24h: false,
  accessibleOnly: false,
};

/** Shared provider and feature filters for both the map and the search feed. */
export function usePropertyFilters(properties: Property[]) {
  const [selectedProvider, setSelectedProvider] = useState("All");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.maxPrice < 600) count++;
    if (filters.cateredOnly) count++;
    if (filters.reception24h) count++;
    if (filters.accessibleOnly) count++;
    return count;
  }, [filters]);

  const filteredProperties = useMemo(() => {
    let list = filterProperties(properties, {
      maxPriceWeek: filters.maxPrice < 600 ? filters.maxPrice : undefined,
      catered: filters.cateredOnly ? true : undefined,
      reception24h: filters.reception24h,
      accessible: filters.accessibleOnly,
    });
    if (selectedProvider !== "All") {
      list = list.filter((property) => property.provider === selectedProvider);
    }
    return list;
  }, [properties, filters, selectedProvider]);

  return {
    selectedProvider, setSelectedProvider, filters, setFilters,
    activeFilterCount, filteredProperties,
  };
}
