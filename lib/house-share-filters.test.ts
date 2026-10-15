import { describe, expect, it } from "vitest";
import type { HouseSharePost } from "@/lib/types";
import { filterHouseShare } from "@/lib/house-share-filters";

const posts: HouseSharePost[] = [
  {
    id: "share-a",
    user_id: "user-a",
    name: "Amira",
    apartment_name: "Bright Camden Flat",
    budget: 250,
    areas: ["Camden", "Kentish Town"],
    move_in: "2026-11-01",
    looking_for_n: 1,
    total_tenants: 3,
    prefs: {
      study_level: "postgrad",
      gender: "women",
      pets: true,
      smoking: false,
      drinking: "sometimes",
      parties: false,
      instruments: true,
      personality: ["steadiness", "conscientiousness"],
      languages: ["English", "Arabic"],
      facilities: ["wifi", "laundry"],
    },
  },
  {
    id: "share-b",
    user_id: "user-b",
    name: "Tom",
    apartment_name: "Hackney Townhouse",
    budget: 325,
    areas: ["Hackney"],
    move_in: "2026-12-01",
    looking_for_n: 2,
    total_tenants: 5,
    prefs: {
      study_level: "undergrad",
      gender: "mixed",
      pets: false,
      smoking: true,
      drinking: "often",
      parties: true,
      instruments: false,
      personality: ["influence"],
      languages: ["English", "French"],
      facilities: ["gym"],
    },
  },
];

describe("filterHouseShare", () => {
  it("returns all posts with no filters and ignores an empty query", () => {
    expect(filterHouseShare(posts, {})).toEqual(posts);
    expect(filterHouseShare(posts, { query: "   " })).toEqual(posts);
  });

  it("searches apartment names, host names and areas without case sensitivity", () => {
    expect(filterHouseShare(posts, { query: "CAMDEN" }).map((post) => post.id)).toEqual(["share-a"]);
    expect(filterHouseShare(posts, { query: "tom" }).map((post) => post.id)).toEqual(["share-b"]);
    expect(filterHouseShare(posts, { query: "hackney" }).map((post) => post.id)).toEqual(["share-b"]);
  });

  it("filters the maximum budget inclusively", () => {
    expect(filterHouseShare(posts, { maxBudget: 250 }).map((post) => post.id)).toEqual(["share-a"]);
  });

  it("matches preference fields including false boolean values", () => {
    expect(filterHouseShare(posts, { studyLevel: "postgrad", gender: "women" }).map((post) => post.id)).toEqual(["share-a"]);
    expect(filterHouseShare(posts, { pets: false, smoking: true, drinking: "often", instruments: false }).map((post) => post.id)).toEqual(["share-b"]);
  });

  it("filters by DISC-inspired personality tag and language", () => {
    expect(filterHouseShare(posts, { personality: "steadiness" }).map((post) => post.id)).toEqual(["share-a"]);
    expect(filterHouseShare(posts, { language: "french" }).map((post) => post.id)).toEqual(["share-b"]);
  });

  it("combines all provided filters", () => {
    expect(filterHouseShare(posts, { query: "camden", maxBudget: 250, pets: true, smoking: false }).map((post) => post.id)).toEqual(["share-a"]);
    expect(filterHouseShare(posts, { query: "camden", pets: false })).toEqual([]);
  });

  it("filters move-in dates within the matching window and nearby areas", () => {
    expect(filterHouseShare(posts, { moveIn: "2026-09-01" }).map((post) => post.id)).toEqual(["share-a"]);
    expect(filterHouseShare(posts, { area: "Camden" }).map((post) => post.id)).toEqual(["share-a", "share-b"]);
    expect(filterHouseShare(posts, { area: "Not a London area" })).toEqual([]);
  });

  it("matches selected facilities and party preference", () => {
    expect(filterHouseShare(posts, { facilities: ["wifi"], parties: false }).map((post) => post.id)).toEqual(["share-a"]);
  });
});
