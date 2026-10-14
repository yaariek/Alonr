import { describe, expect, it } from "vitest";
import { toProperty, type PropertyRow } from "@/lib/data/properties";

const ROW: PropertyRow = {
  id: "p1", slug: "chapter-king-s-cross", name: "Chapter King's Cross", provider_id: "chapter",
  affiliated_university_id: null, address: "200 Pentonville Rd", postcode: "N1 9JP", lat: 51.53, lng: -0.12,
  reception_24h: true, accessible: true, catered: false, facilities: ["gym"],
  supermarket_name: "Tesco Express", supermarket_m: 250, station_name: "King's Cross", station_m: 600,
  bike_dock_m: null, website: null, image_url: null, created_at: "2026-10-14",
  room_types: [
    { id: "r2", property_id: "p1", kind: "studio", price_week: 489, flatmates: 0, contract_weeks: [51] },
    { id: "r1", property_id: "p1", kind: "ensuite", price_week: 389, flatmates: 5, contract_weeks: [44, 51] },
  ],
};

describe("toProperty", () => {
  it("maps a DB row to the Property shape, cheapest room first", () => {
    const p = toProperty(ROW)!;
    expect(p).toMatchObject({ id: "p1", provider: "Chapter", supermarketName: "Tesco Express", stationM: 600 });
    expect(p.bikeDockM).toBeUndefined();
    expect(p.roomTypes.map((r) => r.priceWeek)).toEqual([389, 489]);
    expect(p.roomTypes[0]).toEqual({ kind: "ensuite", priceWeek: 389, flatmates: 5, contractWeeks: [44, 51] });
  });

  it("unknown providers become Other, halls without lat/lng are dropped", () => {
    expect(toProperty({ ...ROW, provider_id: "other" })!.provider).toBe("Other");
    expect(toProperty({ ...ROW, lat: null })).toBeNull();
  });
});
