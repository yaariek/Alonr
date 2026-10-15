import { describe, expect, it } from "vitest";
import {
  isMutualMatch, photoPath, prefillFromHall, satisfies, toListing, validateListing, type Listing, type NewListing,
} from "@/lib/data/listings";
import { SAMPLE_PROPERTIES } from "@/lib/sample-data";

const ROW = {
  id: "l1", user_id: "u1", property_id: "p1", kind: "swap" as const, status: "active" as const,
  room_kind: "ensuite" as const, price_week: 300, flatmates: 5, start_date: "2026-09-19", end_date: "2027-06-30",
  description: "Sunny room", photos: ["https://x/1.jpg"], wants: { property_ids: ["p2"], max_price: 350 },
  created_at: "2026-10-14T20:00:00Z",
  properties: { id: "p1", name: "Floyer House", provider_id: "qmul", postcode: "E1 4NS" },
};

const listing = (over: Partial<Listing>): Listing => ({ ...toListing(ROW), ...over });

describe("toListing", () => {
  it("maps the DB row, provider id → group", () => {
    const l = toListing(ROW, 3, true);
    expect(l).toMatchObject({ id: "l1", roomKind: "ensuite", priceWeek: 300, likes: 3, likedByMe: true });
    expect(l.property).toEqual({ id: "p1", name: "Floyer House", provider: "QMUL", postcode: "E1 4NS" });
    expect(l.wants).toEqual({ property_ids: ["p2"], max_price: 350 });
    expect(l.owner).toEqual({ id: "u1", name: null });
    expect(toListing(ROW, 0, false, "Amira").owner).toEqual({ id: "u1", name: "Amira" });
  });
});

describe("prefillFromHall", () => {
  const chapter = SAMPLE_PROPERTIES[0]; // ensuite 389 (5 flatmates, 44;51 weeks) + studio 489
  it("defaults to the cheapest room", () => {
    expect(prefillFromHall(chapter)).toEqual({
      propertyId: chapter.id, roomKinds: ["ensuite", "studio"], roomKind: "ensuite",
      priceWeek: 389, flatmates: 5, contractWeeks: [44, 51],
    });
  });
  it("uses the chosen room type", () => {
    expect(prefillFromHall(chapter, "studio")).toMatchObject({ roomKind: "studio", priceWeek: 489, flatmates: 0 });
  });
  it("hall without prices: nothing to fill", () => {
    expect(prefillFromHall({ ...chapter, roomTypes: [] })).toMatchObject({ roomKinds: [], roomKind: null, priceWeek: null });
  });
});

describe("matching (same rule as SQL listing_satisfies)", () => {
  const alice = listing({ id: "a", userId: "alice", wants: { property_ids: ["p2"] } });
  const bob = listing({
    id: "b", userId: "bob", roomKind: "studio", priceWeek: 280,
    property: { id: "p2", name: "B", provider: "KCL", postcode: null },
    wants: { property_ids: ["p1"], room_kinds: ["ensuite"], max_price: 320 },
  });
  it("satisfies checks hall, room type and price", () => {
    expect(satisfies(alice, bob.wants)).toBe(true);
    expect(satisfies({ ...alice, priceWeek: 330 }, bob.wants)).toBe(false);
    expect(satisfies({ ...alice, roomKind: "twin" }, bob.wants)).toBe(false);
    expect(satisfies(alice, {})).toBe(true); // wants nothing specific
  });
  it("mutual match needs both sides, two people, two swaps", () => {
    expect(isMutualMatch(alice, bob)).toBe(true);
    expect(isMutualMatch(bob, alice)).toBe(true);
    expect(isMutualMatch(alice, { ...bob, kind: "release" })).toBe(false);
    expect(isMutualMatch(alice, { ...bob, userId: "alice" })).toBe(false);
    expect(isMutualMatch(alice, { ...bob, wants: { max_price: 200 } })).toBe(false);
  });
});

describe("validateListing", () => {
  const ok: NewListing = { propertyId: "p1", kind: "swap", roomKind: "ensuite", priceWeek: 300 };
  it("accepts a minimal listing", () => expect(validateListing(ok)).toBeNull());
  it("catches the usual mistakes", () => {
    expect(validateListing({ ...ok, propertyId: "" })).toBe("Pick your hall.");
    expect(validateListing({ ...ok, priceWeek: 0 })).toBe("Enter the weekly price.");
    expect(validateListing({ ...ok, startDate: "2026-09-01", endDate: "2026-08-01" })).toMatch(/before the start/);
  });
});

describe("photoPath", () => {
  it("puts photos in the user's folder with a random name", () => {
    expect(photoPath("u1", { name: "Room.JPG", type: "image/jpeg", size: 1000 })).toMatch(/^u1\/[0-9a-f-]{36}\.jpg$/);
  });
  it("rejects wrong types and big files", () => {
    expect(() => photoPath("u1", { name: "a.gif", type: "image/gif", size: 1 })).toThrow(/JPG/);
    expect(() => photoPath("u1", { name: "a.jpg", type: "image/jpeg", size: 11 * 1024 * 1024 })).toThrow(/10 MB/);
  });
});
