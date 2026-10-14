import { describe, expect, it } from "vitest";
import { formatDate, formatDistance, formatWeeks, roomKindLabel, walkTime } from "@/lib/format";

describe("format", () => {
  it("distances", () => {
    expect(formatDistance(247)).toBe("250 m");
    expect(formatDistance(1240)).toBe("1.2 km");
    expect(walkTime(250)).toBe("3 min walk");
    expect(walkTime(20)).toBe("1 min walk");
  });

  it("room kinds, dates, contract weeks", () => {
    expect(roomKindLabel("shared_bathroom")).toBe("Shared bathroom");
    expect(formatDate("2026-09-19")).toBe("19 Sep 2026");
    expect(formatWeeks([51, 44])).toBe("44 or 51 weeks");
    expect(formatWeeks([51])).toBe("51 weeks");
    expect(formatWeeks([])).toBe("");
  });
});
