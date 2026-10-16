import type { HouseSharePost } from "@/lib/types";

export const HOUSE_SHARE_AGE_GROUPS = [
  { value: "18_21", label: "18–20" },
  { value: "21_25", label: "21–24" },
  { value: "25_plus", label: "25+" },
] as const;

export type HouseShareAgeGroup = (typeof HOUSE_SHARE_AGE_GROUPS)[number]["value"];
type AgeAwarePreferences = HouseSharePost["prefs"] & { age_group?: HouseShareAgeGroup };

export type HouseSharePostWithAgeGroup = Omit<HouseSharePost, "prefs"> & {
  prefs: AgeAwarePreferences & { age_group: HouseShareAgeGroup };
};

const AGE_GROUP_VALUES = new Set<string>(HOUSE_SHARE_AGE_GROUPS.map(({ value }) => value));

export function getHouseShareAgeGroup(post: HouseSharePost): HouseShareAgeGroup | undefined {
  const ageGroup = (post.prefs as AgeAwarePreferences).age_group;
  return ageGroup && AGE_GROUP_VALUES.has(ageGroup) ? ageGroup : undefined;
}
