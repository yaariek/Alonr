"use client";

import { useMemo, useState } from "react";
import { filterProperties } from "@/lib/filters";
import type { Property } from "@/lib/types";
import type { FilterState, PriceBounds } from "@/components/filters/FilterSheet";

const DEFAULT_FILTERS: FilterState = {
  minPrice: null,
  maxPrice: null,
  cateredOnly: false,
  reception24h: false,
  accessibleOnly: false,
};

/** Shared provider, price range, and feature filters for the map and search feed. */
export function usePropertyFilters(properties: Property[]) {
  const [selectedProvider, setSelectedProvider] = useState("All");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const priceBounds = useMemo<PriceBounds>(() => {
    const prices = properties.flatMap((property) => property.roomTypes.map((room) => room.priceWeek))
      .filter((price) => Number.isFinite(price) && price > 0);
    if (!prices.length) return { min: 0, max: 0 };
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [properties]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.minPrice !== null && filters.minPrice > priceBounds.min) count++;
    if (filters.maxPrice !== null && filters.maxPrice < priceBounds.max) count++;
    if (filters.cateredOnly) count++;
    if (filters.reception24h) count++;
    if (filters.accessibleOnly) count++;
    return count;
  }, [filters, priceBounds]);

  const filteredProperties = useMemo(() => {
    let list = filterProperties(properties, {
      minPriceWeek: filters.minPrice !== null && filters.minPrice > priceBounds.min ? filters.minPrice : undefined,
      maxPriceWeek: filters.maxPrice !== null && filters.maxPrice < priceBounds.max ? filters.maxPrice : undefined,
      catered: filters.cateredOnly ? true : undefined,
      reception24h: filters.reception24h,
      accessible: filters.accessibleOnly,
    });
    if (selectedProvider !== "All") {
      list = list.filter((property) => property.provider === selectedProvider);
    }
    return list;
  }, [properties, filters, priceBounds, selectedProvider]);

  return {
    selectedProvider, setSelectedProvider, filters, setFilters,
    priceBounds, activeFilterCount, filteredProperties,
  };
}
