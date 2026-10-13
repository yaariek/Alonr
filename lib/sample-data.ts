import type { Campus, Property, ProviderGroup } from "@/lib/types";

// SAMPLE DATA ONLY: approximate locations/prices so the UI works before Supabase is seeded.
// Replaced by real rows from `data/seed.py` (Person C).

export const PROVIDER_COLOURS: Record<ProviderGroup, string> = {
  Unite: "#e11d48",
  iQ: "#7c3aed",
  Chapter: "#0891b2",
  Scape: "#ea580c",
  Prestige: "#ca8a04",
  UCL: "#4f46e5",
  KCL: "#dc2626",
  Imperial: "#0369a1",
  Other: "#6b7280",
};

export const CAMPUSES: Campus[] = [
  { id: "ucl-bloomsbury", university: "UCL", name: "UCL Bloomsbury", lat: 51.5246, lng: -0.134 },
  { id: "ucl-east", university: "UCL", name: "UCL East (Marshgate)", lat: 51.5383, lng: -0.0105 },
  { id: "kcl-strand", university: "KCL", name: "KCL Strand", lat: 51.5115, lng: -0.116 },
  { id: "imperial-sk", university: "Imperial", name: "Imperial South Kensington", lat: 51.4988, lng: -0.1749 },
  { id: "qmul-mile-end", university: "QMUL", name: "QMUL Mile End", lat: 51.5246, lng: -0.0403 },
  { id: "lse", university: "LSE", name: "LSE Holborn", lat: 51.5144, lng: -0.1165 },
];

const base = {
  facilities: ["gym", "study room", "laundry"] as string[],
  reception24h: true,
  accessible: true,
  catered: false,
};

export const SAMPLE_PROPERTIES: Property[] = [
  {
    ...base, id: "s1", name: "Chapter King's Cross", provider: "Chapter", address: "200 Pentonville Rd",
    postcode: "N1 9JP", lat: 51.5315, lng: -0.1185,
    facilities: [...base.facilities, "cinema room"],
    roomTypes: [{ kind: "ensuite", priceWeek: 389, flatmates: 5, contractWeeks: [44, 51] },
                { kind: "studio", priceWeek: 489, flatmates: 0, contractWeeks: [51] }],
    supermarketM: 250, stationName: "King's Cross St Pancras", stationM: 600, bikeDockM: 150,
  },
  {
    ...base, id: "s2", name: "Scape Bloomsbury", provider: "Scape", address: "19-29 Woburn Pl",
    postcode: "WC1H 0AQ", lat: 51.5249, lng: -0.1271,
    roomTypes: [{ kind: "studio", priceWeek: 465, flatmates: 0, contractWeeks: [44, 51] }],
    supermarketM: 300, stationName: "Russell Square", stationM: 250, bikeDockM: 100,
  },
  {
    ...base, id: "s3", name: "Ramsay Hall", provider: "UCL", affiliatedUniversity: "UCL",
    address: "20 Maple St", postcode: "W1T 4BE", lat: 51.5222, lng: -0.1398,
    catered: true, reception24h: true,
    roomTypes: [{ kind: "non_ensuite", priceWeek: 260, flatmates: 10, contractWeeks: [39] },
                { kind: "twin", priceWeek: 205, flatmates: 10, contractWeeks: [39] }],
    supermarketM: 200, stationName: "Warren Street", stationM: 300, bikeDockM: 80,
  },
  {
    ...base, id: "s4", name: "iQ Shoreditch", provider: "iQ", address: "1 Old St",
    postcode: "EC1V 9HL", lat: 51.5263, lng: -0.0877,
    roomTypes: [{ kind: "ensuite", priceWeek: 345, flatmates: 6, contractWeeks: [44, 51] },
                { kind: "studio", priceWeek: 425, flatmates: 0, contractWeeks: [51] }],
    supermarketM: 150, stationName: "Old Street", stationM: 200, bikeDockM: 120,
  },
  {
    ...base, id: "s5", name: "Unite Stratford One", provider: "Unite", address: "1 Grove Cres Rd",
    postcode: "E15 1BJ", lat: 51.5427, lng: -0.0013,
    roomTypes: [{ kind: "ensuite", priceWeek: 279, flatmates: 7, contractWeeks: [44, 51] }],
    supermarketM: 400, stationName: "Stratford", stationM: 350, bikeDockM: 500,
  },
  {
    ...base, id: "s6", name: "Great Dover Street Apartments", provider: "KCL", affiliatedUniversity: "KCL",
    address: "165 Great Dover St", postcode: "SE1 4XA", lat: 51.4952, lng: -0.0905,
    reception24h: false,
    roomTypes: [{ kind: "ensuite", priceWeek: 299, flatmates: 6, contractWeeks: [40] }],
    supermarketM: 350, stationName: "Borough", stationM: 700, bikeDockM: 300,
  },
  {
    ...base, id: "s7", name: "Woodward Buildings", provider: "Imperial", affiliatedUniversity: "Imperial",
    address: "1 Wood Ln", postcode: "W3 7BF", lat: 51.5128, lng: -0.2385,
    accessible: false,
    roomTypes: [{ kind: "ensuite", priceWeek: 230, flatmates: 8, contractWeeks: [39] }],
    supermarketM: 500, stationName: "North Acton", stationM: 400,
  },
];
