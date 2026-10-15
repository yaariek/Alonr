import { describe, expect, it } from "vitest";
import type { HouseShareMatchProfile, HouseSharePost } from "@/lib/types";
import { scoreHouseShareCompatibility } from "@/lib/house-share-compatibility";

const seeker: HouseShareMatchProfile = {
  move_in: "2026-12-01",
  areas: ["Camden"],
  prefs: {
    study_level: "postgrad",
    gender: "mixed",
    pets: false,
    smoking: false,
    drinking: "sometimes",
    parties: false,
    instruments: false,
    personality: ["steadiness", "conscientiousness"],
    languages: ["English"],
    facilities: ["wifi", "laundry"],
  },
};

function house(overrides: Partial<HouseSharePost> = {}): HouseSharePost {
  return {
    id: "house-1",
    user_id: "host-1",
    name: "Amira",
    apartment_name: "Camden House Share",
    budget: 250,
    areas: ["Camden"],
    move_in: "2026-12-01",
    looking_for_n: 1,
    total_tenants: 3,
    prefs: { ...seeker.prefs },
    ...overrides,
  };
}

describe("scoreHouseShareCompatibility", () => {
  it("gives a full score to an exact move-in, location and preference match", () => {
    expect(scoreHouseShareCompatibility(seeker, house())).toEqual({
      points: 100,
      maxPoints: 100,
      percentage: 100,
      breakdown: { moveIn: 35, location: 35, preferences: 30 },
    });
  });

  it("weights move-in timing and location more heavily than lifestyle and facilities", () => {
    const nearAndSoon = scoreHouseShareCompatibility(seeker, house({ move_in: "2026-12-15", areas: ["Islington"] }));
    const farAndLate = scoreHouseShareCompatibility(seeker, house({ move_in: "2027-02-28", areas: ["Richmond"] }));
    expect(nearAndSoon.points).toBeGreaterThan(farAndLate.points);
    expect(nearAndSoon.breakdown.moveIn + nearAndSoon.breakdown.location).toBeGreaterThan(nearAndSoon.breakdown.preferences);
  });

  it("gives progressively more location points to closer areas", () => {
    const nearby = scoreHouseShareCompatibility(seeker, house({ areas: ["Islington"] }));
    const distant = scoreHouseShareCompatibility(seeker, house({ areas: ["Wimbledon"] }));
    expect(nearby.breakdown.location).toBeGreaterThan(distant.breakdown.location);
  });

  it("gives each lifestyle and facility category an equal share of the smaller preference weight", () => {
    const allMismatch = house({
      prefs: {
        study_level: "undergrad",
        gender: "women",
        pets: true,
        smoking: true,
        drinking: "often",
        parties: true,
        instruments: true,
        personality: ["influence"],
        languages: ["French"],
        facilities: ["gym"],
      },
    });
    const score = scoreHouseShareCompatibility(seeker, allMismatch);
    // A mixed-gender household is considered compatible with the seeker's mixed preference.
    expect(score.breakdown.preferences).toBe(3);
  });

  it("returns zero location points for unknown areas and zero move-in points for invalid dates", () => {
    const score = scoreHouseShareCompatibility(seeker, house({ areas: ["Unknown area"], move_in: "not-a-date" }));
    expect(score.breakdown.location).toBe(0);
    expect(score.breakdown.moveIn).toBe(0);
    expect(score.percentage).toBe(score.points);
  });
});
