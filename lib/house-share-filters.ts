import type {
  HouseShareDrinkingPreference,
  HouseShareGenderPreference,
  HouseSharePost,
  HouseSharePersonalityTag,
  HouseShareStudyLevel,
} from "@/lib/types";

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
      (!language || post.prefs.languages.some((item) => item.toLocaleLowerCase() === language))
    );
  });
}
