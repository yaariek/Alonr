import type {
  HouseShareCompatibilityScore,
  HouseShareMatchProfile,
  HouseSharePost,
  HouseSharePreferences,
} from "@/lib/types";

const MOVE_IN_WEIGHT = 35;
const LOCATION_WEIGHT = 35;
const PREFERENCE_WEIGHT = 30;
const MOVE_IN_WINDOW_DAYS = 90;
const LOCATION_WINDOW_KM = 25;

// Approximate London neighborhood centers used to score how close requested areas are.
const AREA_CENTERS: Record<string, [number, number]> = {
  acton: [51.508, -0.275], balham: [51.443, -0.152], bermondsey: [51.498, -0.063], camden: [51.539, -0.142],
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

function dateDistanceDays(first: string, second: string): number | undefined {
  const firstTime = Date.parse(`${first.slice(0, 10)}T00:00:00Z`);
  const secondTime = Date.parse(`${second.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(firstTime) || !Number.isFinite(secondTime)) return undefined;
  return Math.abs(firstTime - secondTime) / 86_400_000;
}

function distanceKm(first: [number, number], second: [number, number]): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const [lat1, lon1] = first.map(radians);
  const [lat2, lon2] = second.map(radians);
  const latDelta = lat2 - lat1;
  const lonDelta = lon2 - lon1;
  const arc = Math.sin(latDelta / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(lonDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
}

function closestAreaDistanceKm(firstAreas: string[], secondAreas: string[]): number | undefined {
  let closest: number | undefined;
  for (const firstArea of firstAreas) {
    const firstCenter = AREA_CENTERS[firstArea.trim().toLocaleLowerCase()];
    if (!firstCenter) continue;
    for (const secondArea of secondAreas) {
      const secondCenter = AREA_CENTERS[secondArea.trim().toLocaleLowerCase()];
      if (!secondCenter) continue;
      const distance = distanceKm(firstCenter, secondCenter);
      if (closest === undefined || distance < closest) closest = distance;
    }
  }
  return closest;
}

function overlapScore(wanted: string[], offered: string[]): number {
  if (wanted.length === 0) return 1;
  const offeredSet = new Set(offered.map((item) => item.toLocaleLowerCase()));
  return wanted.filter((item) => offeredSet.has(item.toLocaleLowerCase())).length / wanted.length;
}

function preferenceScore(wanted: HouseSharePreferences, offered: HouseSharePreferences): number {
  const categoryScores = [
    Number(wanted.study_level === offered.study_level),
    Number(wanted.gender === offered.gender || wanted.gender === "mixed" || offered.gender === "mixed"),
    Number(wanted.pets === offered.pets),
    Number(wanted.smoking === offered.smoking),
    Number(wanted.drinking === offered.drinking),
    Number(wanted.parties === offered.parties),
    Number(wanted.instruments === offered.instruments),
    overlapScore(wanted.personality, offered.personality),
    overlapScore(wanted.languages, offered.languages),
    overlapScore(wanted.facilities, offered.facilities),
  ];
  return categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length;
}

/** Score a candidate house from 0 to 100; move-in and location carry 70 points. */
export function scoreHouseShareCompatibility(
  seeker: HouseShareMatchProfile,
  house: HouseSharePost,
): HouseShareCompatibilityScore {
  const dayDifference = dateDistanceDays(seeker.move_in, house.move_in);
  const moveInPoints = dayDifference === undefined
    ? 0
    : MOVE_IN_WEIGHT * Math.max(0, 1 - dayDifference / MOVE_IN_WINDOW_DAYS);

  const nearestAreaKm = closestAreaDistanceKm(seeker.areas, house.areas);
  const locationPoints = nearestAreaKm === undefined
    ? 0
    : LOCATION_WEIGHT * Math.max(0, 1 - nearestAreaKm / LOCATION_WINDOW_KM);

  const preferencePoints = PREFERENCE_WEIGHT * preferenceScore(seeker.prefs, house.prefs);
  const points = Math.round(moveInPoints + locationPoints + preferencePoints);

  return {
    points,
    maxPoints: 100,
    percentage: points,
    breakdown: {
      moveIn: Math.round(moveInPoints),
      location: Math.round(locationPoints),
      preferences: Math.round(preferencePoints),
    },
  };
}
