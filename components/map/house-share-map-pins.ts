import type { FeatureCollection, Point } from "geojson";
import { DEMO_HOUSESHARE_POSTS } from "@/app/houseshare/demo-data";

export interface HouseShareMapPinProperties {
  id: string;
  name: string;
  area: string;
  budget: number;
  tenants: number;
  seeking: number;
}

// Approximate neighborhood centers. Demo households are fictional; these are not exact addresses.
const AREA_CENTERS: Record<string, [lat: number, lng: number]> = {
  acton: [51.508, -0.275], balham: [51.443, -0.152], bermondsey: [51.498, -0.063],
  "bethnal green": [51.527, -0.055], brixton: [51.462, -0.115], brockley: [51.463, -0.037],
  camberwell: [51.474, -0.092], "canada water": [51.498, -0.049], clapham: [51.463, -0.138],
  deptford: [51.478, -0.026], ealing: [51.513, -0.308], "finsbury park": [51.565, -0.106],
  "forest gate": [51.55, 0.024], greenwich: [51.482, -0.009], hackney: [51.545, -0.055],
  hammersmith: [51.492, -0.223], harringay: [51.582, -0.105], "herne hill": [51.453, -0.102],
  highbury: [51.552, -0.102], islington: [51.538, -0.103], kensington: [51.5, -0.19],
  kilburn: [51.537, -0.2], lewisham: [51.462, -0.01], leyton: [51.56, -0.005],
  "maida vale": [51.53, -0.185], "mile end": [51.525, -0.033], "new cross": [51.476, -0.04],
  "notting hill": [51.51, -0.2], peckham: [51.474, -0.069], putney: [51.461, -0.216],
  richmond: [51.461, -0.303], "shepherd's bush": [51.505, -0.224], southfields: [51.445, -0.206],
  "stoke newington": [51.562, -0.075], stratford: [51.541, -0.003], tooting: [51.428, -0.168],
  tottenham: [51.588, -0.072], walthamstow: [51.584, -0.019], wandsworth: [51.457, -0.193],
  wembley: [51.553, -0.296], whitechapel: [51.519, -0.06], wimbledon: [51.421, -0.206],
  "wood green": [51.597, -0.11], battersea: [51.472, -0.163], bow: [51.527, -0.023],
  canonbury: [51.548, -0.099], chiswick: [51.492, -0.263], dalston: [51.546, -0.075],
  earlsfield: [51.442, -0.188], sydenham: [51.427, -0.055],
};

function randomOffset(seed: string) {
  let value = 0;
  for (const character of seed) value = (value * 31 + character.charCodeAt(0)) >>> 0;
  value = (value * 1664525 + 1013904223) >>> 0;
  const lat = (value / 4294967296) - 0.5;
  value = (value * 1664525 + 1013904223) >>> 0;
  const lng = (value / 4294967296) - 0.5;
  return { lat: lat * 0.006, lng: lng * 0.008 };
}

/** Stable, fictional pin locations spread around the listed London neighborhoods. */
export function getDemoHouseShareMapPins(): FeatureCollection<Point, HouseShareMapPinProperties> {
  return {
    type: "FeatureCollection",
    features: DEMO_HOUSESHARE_POSTS.flatMap((post) => {
      const area = post.areas[0];
      const center = AREA_CENTERS[area.toLowerCase()];
      if (!center) return [];
      const offset = randomOffset(post.id);
      return [{
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [center[1] + offset.lng, center[0] + offset.lat] as [number, number] },
        properties: {
          id: post.id,
          name: post.apartment_name,
          area,
          budget: post.budget,
          tenants: post.total_tenants,
          seeking: post.looking_for_n,
        },
      }];
    }),
  };
}
