import { describe, expect, it } from "vitest";
import { filterProperties } from "@/lib/filters";
import { propertiesBetween } from "@/lib/geo";
import { CAMPUSES, SAMPLE_PROPERTIES } from "@/lib/sample-data";

const names = (ps: { name: string }[]) => ps.map((p) => p.name);

describe("filterProperties", () => {
  it("returns everything with no filters", () => {
    expect(filterProperties(SAMPLE_PROPERTIES, {})).toHaveLength(SAMPLE_PROPERTIES.length);
  });

  it("filters by provider group", () => {
    expect(names(filterProperties(SAMPLE_PROPERTIES, { providers: ["UCL"] }))).toEqual(["Ramsay Hall"]);
  });

  it("budget and room kind must match the same room type", () => {
    // Chapter has an ensuite at 389 and a studio at 489: studio under 450 must exclude it
    const result = filterProperties(SAMPLE_PROPERTIES, { roomKinds: ["studio"], maxPriceWeek: 450 });
    expect(names(result)).toEqual(["iQ Shoreditch"]);
  });

  it("excludes properties with unknown distance when a distance filter is set", () => {
    const result = filterProperties(SAMPLE_PROPERTIES, { maxBikeDockM: 10_000 });
    expect(names(result)).not.toContain("Woodward Buildings");
  });
});

describe("propertiesBetween", () => {
  it("finds halls along UCL Bloomsbury → UCL East, ranked by total distance", () => {
    const [bloomsbury, east] = CAMPUSES;
    const result = propertiesBetween(SAMPLE_PROPERTIES, bloomsbury, east, 1);
    expect(names(result)).toContain("iQ Shoreditch");
    expect(names(result)).not.toContain("Woodward Buildings");
    const totals = result.map((p) => p.totalKm);
    expect(totals).toEqual([...totals].sort((a, b) => a - b));
  });
});
