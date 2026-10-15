import { describe, expect, it } from "vitest";
import type { HouseSharePost } from "@/lib/types";
import { scoreHouseShareCompatibility } from "@/lib/house-share-compatibility";

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
    prefs: {
      study_level: "postgrad",
      gender: "women",
      pets: false,
      smoking: false,
      drinking: "sometimes",
      parties: false,
      instruments: false,
      personality: ["steadiness"],
      languages: ["English"],
      facilities: ["wifi", "laundry"],
    },
    ...overrides,
  };
}

describe("scoreHouseShareCompatibility", () => {
  it("returns 100% when every selected criterion matches", () => {
    const score = scoreHouseShareCompatibility({
      moveIn: "2026-12-01",
      area: "Camden",
      maxBudget: 300,
      studyLevel: "postgrad",
      gender: "women",
      pets: false,
      smoking: false,
      drinking: "sometimes",
      parties: false,
      instruments: false,
      facilities: ["wifi", "laundry"],
    }, house());

    expect(score.percentage).toBe(100);
    expect(score.points).toBe(score.maxPoints);
    expect(score.hasCriteria).toBe(true);
  });

  it("weights move-in timing and area proximity more than each other selected filter", () => {
    const score = scoreHouseShareCompatibility({ moveIn: "2026-12-15", area: "Camden", pets: false }, house());
    expect(score.breakdown.moveIn + score.breakdown.location).toBeGreaterThan(score.breakdown.preferences);
  });

  it("gives more location points to closer areas", () => {
    const filters = { area: "Camden" };
    const nearby = scoreHouseShareCompatibility(filters, house({ areas: ["Islington"] }));
    const distant = scoreHouseShareCompatibility(filters, house({ areas: ["Wimbledon"] }));
    expect(nearby.breakdown.location).toBeGreaterThan(distant.breakdown.location);
  });

  it("scores only criteria the user selected", () => {
    const score = scoreHouseShareCompatibility({ pets: true }, house({ prefs: { ...house().prefs, pets: false } }));
    expect(score).toMatchObject({ points: 0, maxPoints: 5, percentage: 0, hasCriteria: true });
    expect(score.breakdown.moveIn).toBe(0);
    expect(score.breakdown.location).toBe(0);
  });

  it("does not invent a score when no match criteria were selected", () => {
    expect(scoreHouseShareCompatibility({}, house())).toMatchObject({ points: 0, maxPoints: 0, percentage: 0, hasCriteria: false });
  });
});
