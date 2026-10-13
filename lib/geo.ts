import { lineString, point, pointToLineDistance, distance } from "@turf/turf";
import type { LatLng, Property } from "@/lib/types";

const toPoint = (p: LatLng) => point([p.lng, p.lat]);

/** Straight-line distance in km. */
export function distanceKm(a: LatLng, b: LatLng): number {
  return distance(toPoint(a), toPoint(b), { units: "kilometers" });
}

/**
 * "Between two points": properties within `bufferKm` of the straight line A→B,
 * ranked by total distance to A + B (lowest first).
 */
export function propertiesBetween(
  properties: Property[],
  a: LatLng,
  b: LatLng,
  bufferKm = 1,
): (Property & { totalKm: number })[] {
  const line = lineString([
    [a.lng, a.lat],
    [b.lng, b.lat],
  ]);
  return properties
    .filter((p) => pointToLineDistance(toPoint(p), line, { units: "kilometers" }) <= bufferKm)
    .map((p) => ({ ...p, totalKm: distanceKm(p, a) + distanceKm(p, b) }))
    .sort((x, y) => x.totalKm - y.totalKm);
}
