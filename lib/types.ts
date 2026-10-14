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
