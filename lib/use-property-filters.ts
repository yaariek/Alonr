"use client";

import { useMemo, useState } from "react";
import { filterProperties } from "@/lib/filters";
import type { Property } from "@/lib/types";
import type { FilterOptions, FilterState, PriceBounds } from "@/components/filters/FilterSheet";

export const DEFAULT_FILTERS: FilterState = {
  minPrice: null,
  maxPrice: null,
  cateredOnly: false,
  reception24h: false,
  accessibleOnly: false,
  currentLocation: null,
  radiusKm: 5,
  roomKinds: [],
  maxFlatmates: null,
  contractWeeks: null,
  maxSupermarketM: null,
  maxStationM: null,
  maxBikeDockM: null,
  university: null,
  hasListings: false,
};

const EMPTY_COUNTS = new Map<string, number>();

/**
 * Shared provider, price range, and feature filters for the map and search feed.
 * listingCounts (property id -> active listings, from useListingCounts) powers the "Has listings" filter.
 */
export function usePropertyFilters(properties: Property[], listingCounts: Map<string, number> = EMPTY_COUNTS) {
  const [selectedProvider, setSelectedProvider] = useState("All");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const priceBounds = useMemo<PriceBounds>(() => {
    const prices = properties.flatMap((property) => property.roomTypes.map((room) => room.priceWeek))
      .filter((price) => Number.isFinite(price) && price > 0);
    if (!prices.length) return { min: 0, max: 0 };
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [properties]);

  // Choices that exist in the data (contract lengths, universities with their own halls).
  const options = useMemo<FilterOptions>(() => ({
    contractWeeks: [...new Set(properties.flatMap((p) => p.roomTypes.flatMap((r) => r.contractWeeks)))].sort((a, b) => a - b),
    roomKinds: [...new Set(properties.flatMap((p) => p.roomTypes.map((r) => r.kind)))],
    universities: [...new Set(properties.flatMap((p) => (p.affiliatedUniversity ? [p.affiliatedUniversity.toLowerCase()] : [])))].sort(),
  }), [properties]);

  const availableProviders = useMemo(() => [...new Set(properties.map((p) => p.provider))], [properties]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.minPrice !== null && filters.minPrice > priceBounds.min) count++;
    if (filters.maxPrice !== null && filters.maxPrice < priceBounds.max) count++;
    if (filters.cateredOnly) count++;
    if (filters.reception24h) count++;
    if (filters.accessibleOnly) count++;
    if (filters.currentLocation) count++;
    if (filters.roomKinds.length) count++;
    if (filters.maxFlatmates !== null) count++;
    if (filters.contractWeeks !== null) count++;
    if (filters.maxSupermarketM !== null) count++;
    if (filters.maxStationM !== null) count++;
    if (filters.maxBikeDockM !== null) count++;
    if (filters.university) count++;
    if (filters.hasListings) count++;
    return count;
  }, [filters, priceBounds]);

  const filteredProperties = useMemo(() => {
    let list = filterProperties(properties, {
      minPriceWeek: filters.minPrice !== null && filters.minPrice > priceBounds.min ? filters.minPrice : undefined,
      maxPriceWeek: filters.maxPrice !== null && filters.maxPrice < priceBounds.max ? filters.maxPrice : undefined,
      catered: filters.cateredOnly ? true : undefined,
      reception24h: filters.reception24h,
      accessible: filters.accessibleOnly,
      nearLocation: filters.currentLocation ?? undefined,
      radiusKm: filters.currentLocation ? filters.radiusKm : undefined,
      roomKinds: filters.roomKinds,
      maxFlatmates: filters.maxFlatmates ?? undefined,
      contractWeeks: filters.contractWeeks ?? undefined,
      maxSupermarketM: filters.maxSupermarketM ?? undefined,
      maxStationM: filters.maxStationM ?? undefined,
      maxBikeDockM: filters.maxBikeDockM ?? undefined,
      university: filters.university ?? undefined,
      onlyIds: filters.hasListings ? new Set(listingCounts.keys()) : undefined,
    });
    if (selectedProvider !== "All") {
      list = list.filter((property) => property.provider === selectedProvider);
    }
    return list;
  }, [properties, filters, priceBounds, selectedProvider, listingCounts]);

  return {
    selectedProvider, setSelectedProvider, filters, setFilters,
    priceBounds, options, availableProviders, activeFilterCount, filteredProperties,
    resetFilters: () => setFilters(DEFAULT_FILTERS),
  };
}
