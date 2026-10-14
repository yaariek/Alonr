import type { RoomKind } from "@/lib/types";

const ROOM_KIND_LABELS: Record<RoomKind, string> = {
  ensuite: "Ensuite",
  studio: "Studio",
  shared_bathroom: "Shared bathroom",
  twin: "Twin",
  non_ensuite: "Non-ensuite",
};

export const roomKindLabel = (kind: RoomKind) => ROOM_KIND_LABELS[kind] ?? kind;

/** 250 -> "250 m", 1240 -> "1.2 km" */
export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
}

/** Walking time at ~80 m a minute: 250 -> "3 min walk" */
export function walkTime(m: number): string {
  return `${Math.max(1, Math.round(m / 80))} min walk`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09-19" -> "19 Sep 2026" (by hand: toLocaleDateString differs between Node versions, "Sep" vs "Sept") */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** [51, 44] -> "44 or 51 weeks" */
export function formatWeeks(weeks: number[]): string {
  if (weeks.length === 0) return "";
  const sorted = [...weeks].sort((a, b) => a - b);
  return sorted.length === 1 ? `${sorted[0]} weeks` : `${sorted.slice(0, -1).join(", ")} or ${sorted.at(-1)} weeks`;
}
