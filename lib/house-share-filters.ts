import type {
  HouseShareDrinkingPreference,
  HouseShareFacilityTag,
  HouseShareGenderPreference,
  HouseSharePost,
  HouseSharePersonalityTag,
  HouseShareStudyLevel,
} from "@/lib/types";
import { closestHouseShareAreaDistanceKm, houseShareMoveInDifferenceDays, HOUSE_SHARE_LOCATION_WINDOW_KM, HOUSE_SHARE_MOVE_IN_WINDOW_DAYS } from "@/lib/house-share-distance";

export interface HouseShareFilters {
  query?: string;
  maxBudget?: number;
  studyLevel?: HouseShareStudyLevel;
  gender?: HouseShareGenderPreference;
  pets?: boolean;
  smoking?: boolean;
  drinking?: HouseShareDrinkingPreference;
  instruments?: boolean;
  personality?: HouseSharePersonalityTag;
  language?: string;
  moveIn?: string;
  area?: string;
  parties?: boolean;
  facilities?: HouseShareFacilityTag[];
}

/** Pure client/server-safe filter for demo or database-backed House Share posts. */
export function filterHouseShare(posts: HouseSharePost[], filters: HouseShareFilters): HouseSharePost[] {
  const query = filters.query?.trim().toLocaleLowerCase();
  const language = filters.language?.trim().toLocaleLowerCase();

  return posts.filter((post) => {
    const searchableText = `${post.apartment_name} ${post.name} ${post.areas.join(" ")}`.toLocaleLowerCase();

    return (
      (!query || searchableText.includes(query)) &&
      (filters.maxBudget === undefined || post.budget <= filters.maxBudget) &&
      (filters.studyLevel === undefined || post.prefs.study_level === filters.studyLevel) &&
      (filters.gender === undefined || post.prefs.gender === filters.gender) &&
      (filters.pets === undefined || post.prefs.pets === filters.pets) &&
      (filters.smoking === undefined || post.prefs.smoking === filters.smoking) &&
      (filters.drinking === undefined || post.prefs.drinking === filters.drinking) &&
      (filters.instruments === undefined || post.prefs.instruments === filters.instruments) &&
      (filters.personality === undefined || post.prefs.personality.includes(filters.personality)) &&
      (!language || post.prefs.languages.some((item) => item.toLocaleLowerCase() === language)) &&
      (filters.parties === undefined || post.prefs.parties === filters.parties) &&
      (!filters.facilities?.length || filters.facilities.every((facility) => post.prefs.facilities.includes(facility))) &&
      (!filters.moveIn || (houseShareMoveInDifferenceDays(filters.moveIn, post.move_in) ?? Infinity) <= HOUSE_SHARE_MOVE_IN_WINDOW_DAYS) &&
      (!filters.area || (closestHouseShareAreaDistanceKm([filters.area], post.areas) ?? Infinity) <= HOUSE_SHARE_LOCATION_WINDOW_KM)
    );
  });
}
