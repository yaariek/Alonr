export const HOUSE_SHARE_MOVE_IN_WINDOW_DAYS = 90;
export const HOUSE_SHARE_LOCATION_WINDOW_KM = 25;

// Approximate London neighborhood centers used for consistent nearby-area matching.
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

function areaCenter(area: string) {
  return AREA_CENTERS[area.trim().toLocaleLowerCase()];
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

export function closestHouseShareAreaDistanceKm(firstAreas: string[], secondAreas: string[]): number | undefined {
  let closest: number | undefined;
  for (const firstArea of firstAreas) {
    const firstCenter = areaCenter(firstArea);
    if (!firstCenter) continue;
    for (const secondArea of secondAreas) {
      const secondCenter = areaCenter(secondArea);
      if (!secondCenter) continue;
      const distance = distanceKm(firstCenter, secondCenter);
      if (closest === undefined || distance < closest) closest = distance;
    }
  }
  return closest;
}

export function houseShareMoveInDifferenceDays(first: string, second: string): number | undefined {
  const firstTime = Date.parse(`${first.slice(0, 10)}T00:00:00Z`);
  const secondTime = Date.parse(`${second.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(firstTime) || !Number.isFinite(secondTime)) return undefined;
  return Math.abs(firstTime - secondTime) / 86_400_000;
}
