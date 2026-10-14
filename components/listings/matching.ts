import type { RoomListing } from "./types";

export function listingsAreMutualMatches(a: RoomListing, b: RoomListing): boolean {
  if (a.id === b.id || a.kind !== "swap" || b.kind !== "swap") return false;

  const aWantsB = a.wants.propertyIds.includes(b.propertyId)
    && a.wants.roomKinds.includes(b.roomKind)
    && b.priceWeek <= a.wants.maxPrice;
  const bWantsA = b.wants.propertyIds.includes(a.propertyId)
    && b.wants.roomKinds.includes(a.roomKind)
    && a.priceWeek <= b.wants.maxPrice;

  return aWantsB && bWantsA;
}
