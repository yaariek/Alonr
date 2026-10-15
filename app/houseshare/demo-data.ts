import type { HouseSharePost } from "@/lib/types";

const LONDON_AREAS = [
  "Acton", "Balham", "Bermondsey", "Bethnal Green", "Brixton", "Brockley",
  "Camberwell", "Canada Water", "Clapham", "Deptford", "Ealing", "Finsbury Park",
  "Forest Gate", "Greenwich", "Hackney", "Hammersmith", "Harringay", "Herne Hill",
  "Highbury", "Islington", "Kensington", "Kilburn", "Lewisham", "Leyton",
  "Maida Vale", "Mile End", "New Cross", "Notting Hill", "Peckham", "Putney",
  "Richmond", "Shepherd's Bush", "Southfields", "Stoke Newington", "Stratford",
  "Tooting", "Tottenham", "Walthamstow", "Wandsworth", "Wembley", "Whitechapel",
  "Wimbledon", "Wood Green", "Battersea", "Bow", "Canonbury", "Chiswick",
  "Dalston", "Earlsfield", "Sydenham",
];

const DEMO_NAMES = ["Amira", "Tom", "Mei", "Jonas", "Priya", "Leo", "Sara", "Omar", "Chloe", "Ravi", "Hana", "Alex"];
const APARTMENT_STYLES = ["Garden Flat", "House Share", "Bright Apartment", "Terrace House", "Riverside Flat", "Townhouse"];
const DEMO_LANGUAGES = ["English", "Arabic", "French", "Mandarin", "Spanish", "Urdu", "Hindi", "Portuguese"];
const DEMO_FACILITIES = ["wifi", "laundry", "garden", "bike_storage", "dishwasher", "shared_lounge", "parking", "gym"] as const;

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const random = seededRandom(20261015);
const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)];
const integer = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));

// Fixed demo fixture: the areas are real, but the households and availability are fictional.
export const DEMO_HOUSESHARE_POSTS: HouseSharePost[] = LONDON_AREAS.map((area, index) => {
  const totalTenants = integer(2, 7);
  const lookingFor = integer(1, Math.min(3, totalTenants - 1));
  const moveIn = new Date(Date.UTC(2026, 10, 1 + integer(0, 150))).toISOString().slice(0, 10);

  return {
    id: `demo-house-share-${String(index + 1).padStart(2, "0")}`,
    user_id: `demo-user-${String(index % DEMO_NAMES.length + 1).padStart(2, "0")}`,
    name: DEMO_NAMES[index % DEMO_NAMES.length],
    apartment_name: `${area} ${APARTMENT_STYLES[index % APARTMENT_STYLES.length]}`,
    budget: integer(160, 450),
    areas: [area],
    move_in: moveIn,
    looking_for_n: lookingFor,
    total_tenants: totalTenants,
    prefs: {
      study_level: pick(["undergrad", "postgrad"] as const),
      gender: pick(["women", "men", "mixed"] as const),
      pets: random() < 0.5,
      smoking: random() < 0.5,
      drinking: pick(["none", "sometimes", "often"] as const),
      parties: random() < 0.5,
      instruments: random() < 0.5,
      personality: [pick(["dominance", "influence", "steadiness", "conscientiousness"] as const)],
      languages: [pick(DEMO_LANGUAGES)],
      facilities: DEMO_FACILITIES.filter(() => random() < 0.5),
    },
  };
});
