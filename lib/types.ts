// Hand-written placeholder types. Person C replaces/extends these with
// `npx supabase gen types typescript` output once the schema exists.

export type RoomKind = "ensuite" | "studio" | "shared_bathroom" | "twin" | "non_ensuite";

export type ProviderGroup =
  | "Unite"
  | "iQ"
  | "Chapter"
  | "Scape"
  | "Prestige"
  | "UCL"
  | "KCL"
  | "Imperial"
  | "QMUL"
  | "LSE"
  | "Goldsmiths"
  | "UEL"
  | "Greenwich"
  | "Westminster"
  | "Middlesex"
  | "St Mary's"
  | "Mezzino"
  | "Urbanest"
  | "Stay Club"
  | "Other";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RoomType {
  kind: RoomKind;
  priceWeek: number; // GBP per week
  flatmates: number;
  contractWeeks: number[];
}

export interface Property extends LatLng {
  id: string;
  name: string;
  provider: ProviderGroup;
  affiliatedUniversity?: string;
  address: string;
  postcode: string;
  reception24h: boolean;
  accessible: boolean;
  catered: boolean;
  facilities: string[];
  roomTypes: RoomType[];
  supermarketName?: string;
  supermarketM?: number; // metres to nearest supermarket
  stationName?: string;
  stationM?: number; // metres to nearest station
  bikeDockM?: number; // metres to nearest Santander Cycles dock
  website?: string;
}

export interface Campus extends LatLng {
  id: string;
  university: string;
  name: string;
}

export type ListingKind = "swap" | "release";

export type HouseShareStudyLevel = "undergrad" | "postgrad";
export type HouseShareGenderPreference = "women" | "men" | "mixed";
export type HouseShareDrinkingPreference = "none" | "sometimes" | "often";

// DISC-inspired personality tags for House Share matching. These are preferences,
// not a clinical or formal DISC assessment score.
export type HouseSharePersonalityTag =
  | "dominance"
  | "influence"
  | "steadiness"
  | "conscientiousness";

/** Lifestyle preferences stored under profiles.lifestyle / a post's prefs JSON. */
export interface HouseSharePreferences {
  study_level: HouseShareStudyLevel;
  gender: HouseShareGenderPreference;
  pets: boolean;
  smoking: boolean;
  drinking: HouseShareDrinkingPreference;
  parties: boolean;
  instruments: boolean;
  personality: HouseSharePersonalityTag[];
  languages: string[];
}

/** House Share post data; budget, areas and occupancy are post fields, not lifestyle prefs. */
export interface HouseSharePost {
  id: string;
  user_id: string;
  name: string;
  apartment_name: string;
  budget: number;
  areas: string[];
  move_in: string;
  looking_for_n: number;
  total_tenants: number;
  prefs: HouseSharePreferences;
}
