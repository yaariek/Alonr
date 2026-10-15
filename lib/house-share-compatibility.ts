import type {
  HouseShareCompatibilityScore,
  HouseSharePost,
} from "@/lib/types";
import { closestHouseShareAreaDistanceKm, houseShareMoveInDifferenceDays, HOUSE_SHARE_LOCATION_WINDOW_KM, HOUSE_SHARE_MOVE_IN_WINDOW_DAYS } from "@/lib/house-share-distance";
import type { HouseShareFilters } from "@/lib/house-share-filters";

const MOVE_IN_WEIGHT = 35;
const LOCATION_WEIGHT = 35;
const SMALL_FILTER_WEIGHT = 5;

/** Score only criteria the person selected; move-in and location receive the larger weights. */
export function scoreHouseShareCompatibility(
  filters: HouseShareFilters,
  house: HouseSharePost,
): HouseShareCompatibilityScore {
  let points = 0;
  let maxPoints = 0;
  let moveInPoints = 0;
  let locationPoints = 0;
  let preferencePoints = 0;

  if (filters.moveIn) {
    const days = houseShareMoveInDifferenceDays(filters.moveIn, house.move_in);
    maxPoints += MOVE_IN_WEIGHT;
    moveInPoints = days === undefined ? 0 : MOVE_IN_WEIGHT * Math.max(0, 1 - days / HOUSE_SHARE_MOVE_IN_WINDOW_DAYS);
    points += moveInPoints;
  }
  if (filters.area) {
    const distance = closestHouseShareAreaDistanceKm([filters.area], house.areas);
    maxPoints += LOCATION_WEIGHT;
    locationPoints = distance === undefined ? 0 : LOCATION_WEIGHT * Math.max(0, 1 - distance / HOUSE_SHARE_LOCATION_WINDOW_KM);
    points += locationPoints;
  }

  const preferenceMatches = [
    filters.maxBudget !== undefined ? house.budget <= filters.maxBudget : undefined,
    filters.studyLevel ? house.prefs.study_level === filters.studyLevel : undefined,
    filters.gender ? house.prefs.gender === filters.gender || filters.gender === "mixed" || house.prefs.gender === "mixed" : undefined,
    filters.pets !== undefined ? house.prefs.pets === filters.pets : undefined,
    filters.smoking !== undefined ? house.prefs.smoking === filters.smoking : undefined,
    filters.drinking ? house.prefs.drinking === filters.drinking : undefined,
    filters.instruments !== undefined ? house.prefs.instruments === filters.instruments : undefined,
    filters.personality ? house.prefs.personality.includes(filters.personality) : undefined,
    filters.language ? house.prefs.languages.some((language) => language.toLocaleLowerCase() === filters.language?.trim().toLocaleLowerCase()) : undefined,
    filters.parties !== undefined ? house.prefs.parties === filters.parties : undefined,
    ...(filters.facilities ?? []).map((facility) => house.prefs.facilities.includes(facility)),
  ].filter((match): match is boolean => match !== undefined);

  maxPoints += preferenceMatches.length * SMALL_FILTER_WEIGHT;
  preferencePoints = preferenceMatches.filter(Boolean).length * SMALL_FILTER_WEIGHT;
  points += preferencePoints;
  const roundedMaxPoints = Math.round(maxPoints);
  const roundedPoints = Math.round(points);

  return {
    points: roundedPoints,
    maxPoints: roundedMaxPoints,
    percentage: roundedMaxPoints ? Math.round(roundedPoints / roundedMaxPoints * 100) : 0,
    hasCriteria: roundedMaxPoints > 0,
    breakdown: {
      moveIn: Math.round(moveInPoints),
      location: Math.round(locationPoints),
      preferences: Math.round(preferencePoints),
    },
  };
}
