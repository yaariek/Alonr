import type { Property, ProviderGroup, RoomKind } from "@/lib/types";

// All filters are optional: undefined / empty means "don't filter on this".
export interface PropertyFilters {
  providers?: ProviderGroup[];
  minPriceWeek?: number;
  maxPriceWeek?: number;
  roomKinds?: RoomKind[];
  catered?: boolean;
  reception24h?: boolean;
  accessible?: boolean;
  maxSupermarketM?: number;
  maxStationM?: number;
  maxBikeDockM?: number;
  maxFlatmates?: number;
  contractWeeks?: number;
}

const hasAny = <T,>(xs?: T[]): xs is T[] => !!xs && xs.length > 0;

// A hall with no prices yet still shows, unless a room filter (price, kind, flatmates, weeks) is set.
const hasRoomFilter = (f: PropertyFilters) =>
  f.minPriceWeek !== undefined || f.maxPriceWeek !== undefined || hasAny(f.roomKinds) || f.maxFlatmates !== undefined || f.contractWeeks !== undefined;

function roomMatches(p: Property, f: PropertyFilters): boolean {
  if (p.roomTypes.length === 0) return !hasRoomFilter(f);
  return p.roomTypes.some(
    (r) =>
      (f.minPriceWeek === undefined || r.priceWeek >= f.minPriceWeek) &&
      (f.maxPriceWeek === undefined || r.priceWeek <= f.maxPriceWeek) &&
      (!hasAny(f.roomKinds) || f.roomKinds.includes(r.kind)) &&
      (f.maxFlatmates === undefined || r.flatmates <= f.maxFlatmates) &&
      (f.contractWeeks === undefined || r.contractWeeks.includes(f.contractWeeks)),
  );
}

// Distance filters: a property with unknown distance is excluded when the filter is set.
const within = (value: number | undefined, max: number | undefined) =>
  max === undefined || (value !== undefined && value <= max);

export function matchesFilters(p: Property, f: PropertyFilters): boolean {
  return (
    (!hasAny(f.providers) || f.providers.includes(p.provider)) &&
    (f.catered === undefined || p.catered === f.catered) &&
    (!f.reception24h || p.reception24h) &&
    (!f.accessible || p.accessible) &&
    within(p.supermarketM, f.maxSupermarketM) &&
    within(p.stationM, f.maxStationM) &&
    within(p.bikeDockM, f.maxBikeDockM) &&
    roomMatches(p, f)
  );
}

export function filterProperties(properties: Property[], f: PropertyFilters): Property[] {
  return properties.filter((p) => matchesFilters(p, f));
}

// null = no prices yet
export function minPrice(p: Property): number | null {
  return p.roomTypes.length ? Math.min(...p.roomTypes.map((r) => r.priceWeek)) : null;
}
