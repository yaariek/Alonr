import { describe, expect, it } from "vitest";
import { chatTime, dayLabel, mergeMessage, toConversation, type Message } from "@/lib/data/chat";

const msg = (id: number, createdAt: string, senderId = "a"): Message =>
  ({ id, conversationId: "c1", senderId, body: `m${id}`, createdAt });

const ROW = {
  id: "c1", created_at: "2026-10-14T10:00:00Z", user_a: "amira", user_b: "tom",
  a: { id: "amira", display_name: "Amira" }, b: { id: "tom", display_name: "Tom" },
  listings: {
    id: "l1", kind: "swap" as const, room_kind: "shared_bathroom" as const, price_week: 225,
    property_id: "p1", user_id: "tom", properties: { name: "James Lighthill House" },
  },
};

describe("toConversation", () => {
  it("shows the other person from either side", () => {
    expect(toConversation(ROW, "amira").other).toEqual({ id: "tom", name: "Tom" });
    expect(toConversation(ROW, "tom").other).toEqual({ id: "amira", name: "Amira" });
  });
  it("listing summary, and activity time from the last message", () => {
    const c = toConversation(ROW, "amira", msg(1, "2026-10-14T12:00:00Z"));
    expect(c.listing).toMatchObject({ propertyName: "James Lighthill House", priceWeek: 225, ownerId: "tom" });
    expect(c.updatedAt).toBe("2026-10-14T12:00:00Z");
    expect(toConversation(ROW, "amira").updatedAt).toBe(ROW.created_at);
  });
  it("copes with a deleted listing and a profile without a name", () => {
    const c = toConversation({ ...ROW, listings: null, b: { id: "tom", display_name: null } }, "amira");
    expect(c.listing).toBeNull();
    expect(c.other.name).toBe("Student");
  });
});

describe("mergeMessage", () => {
  it("keeps order and ignores duplicates (sent + Realtime echo)", () => {
    let list = [msg(1, "2026-10-14T10:00:00Z"), msg(3, "2026-10-14T10:02:00Z")];
    list = mergeMessage(list, msg(2, "2026-10-14T10:01:00Z"));
    list = mergeMessage(list, msg(3, "2026-10-14T10:02:00Z"));
    expect(list.map((m) => m.id)).toEqual([1, 2, 3]);
  });
});

describe("chatTime", () => {
  const now = new Date(2026, 9, 14, 18, 0); // Wed 14 Oct 2026, 18:00 local
  it("today, yesterday, this week, older", () => {
    expect(chatTime(new Date(2026, 9, 14, 9, 5).toISOString(), now)).toBe("09:05");
    expect(chatTime(new Date(2026, 9, 13, 23, 0).toISOString(), now)).toBe("Yesterday");
    expect(chatTime(new Date(2026, 9, 12, 8, 0).toISOString(), now)).toBe("Mon");
    expect(chatTime(new Date(2026, 9, 2, 8, 0).toISOString(), now)).toBe("2 Oct");
  });
  it("day separators", () => {
    expect(dayLabel(new Date(2026, 9, 14, 9, 5).toISOString(), now)).toBe("Today");
    expect(dayLabel(new Date(2026, 9, 13, 9, 5).toISOString(), now)).toBe("Yesterday");
  });
});
