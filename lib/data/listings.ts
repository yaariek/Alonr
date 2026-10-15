import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/database.types";
import { PROVIDER_GROUPS } from "@/lib/data/properties";
import type { ListingKind, Property, ProviderGroup, RoomKind } from "@/lib/types";

// Listings (swap / contract release): everything the Listings pages need. Use these instead of
// writing Supabase queries in components. Pass the client from lib/supabase/client.ts
// (client components) or lib/supabase/server.ts (server components).
// Functions throw an Error with a message you can show to the user.

type Client = SupabaseClient<Database>;
export type ListingStatus = Database["public"]["Enums"]["listing_status"];

/** What the lister wants in return. Every key optional; empty / missing = "any". */
export interface Wants {
  property_ids?: string[];
  room_kinds?: RoomKind[];
  max_price?: number;
}

export interface Listing {
  id: string;
  userId: string;
  kind: ListingKind;
  status: ListingStatus;
  roomKind: RoomKind;
  priceWeek: number;
  flatmates: number | null;
  startDate: string | null; // "2026-09-19"
  endDate: string | null;
  description: string | null;
  photos: string[]; // public image URLs
  wants: Wants;
  createdAt: string;
  property: { id: string; name: string; provider: ProviderGroup; postcode: string | null };
  likes: number;
  likedByMe: boolean; // false when signed out
  /** Who posted it. name is null when signed out (only signed-in students can see names). */
  owner: { id: string; name: string | null };
}

export interface NewListing {
  propertyId: string;
  kind: ListingKind;
  roomKind: RoomKind;
  priceWeek: number;
  flatmates?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
  photos?: string[];
  wants?: Wants; // ignored for "release" listings
}

const LISTING_SELECT = "*, properties(id, name, provider_id, postcode)";
type ListingRow = Tables<"listings"> & {
  properties: Pick<Tables<"properties">, "id" | "name" | "provider_id" | "postcode"> | null;
};

// ───────────── Pure helpers (tested in listings.test.ts) ─────────────

export function toListing(row: ListingRow, likes = 0, likedByMe = false, ownerName: string | null = null): Listing {
  const p = row.properties;
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    status: row.status,
    roomKind: row.room_kind,
    priceWeek: Number(row.price_week),
    flatmates: row.flatmates,
    startDate: row.start_date,
    endDate: row.end_date,
    description: row.description,
    photos: row.photos ?? [],
    wants: (row.wants ?? {}) as Wants,
    createdAt: row.created_at,
    property: {
      id: row.property_id,
      name: p?.name ?? "Unknown hall",
      provider: (p && PROVIDER_GROUPS[p.provider_id]) || "Other",
      postcode: p?.postcode ?? null,
    },
    likes,
    likedByMe,
    owner: { id: row.user_id, name: ownerName },
  };
}

/**
 * Form defaults after the user picks a hall: the room type (the one asked for, else the cheapest),
 * its price, flatmates and contract weeks, plus every room type the hall offers for the dropdown.
 * Halls come from fetchProperties / useProperties. The user still sets dates, description, photos.
 */
export function prefillFromHall(hall: Property, roomKind?: RoomKind) {
  const rooms = [...hall.roomTypes].sort((a, b) => a.priceWeek - b.priceWeek);
  const room = rooms.find((r) => r.kind === roomKind) ?? rooms[0];
  return {
    propertyId: hall.id,
    roomKinds: rooms.map((r) => r.kind),
    roomKind: room?.kind ?? roomKind ?? null,
    priceWeek: room?.priceWeek ?? null,
    flatmates: room?.flatmates ?? null,
    contractWeeks: room?.contractWeeks ?? [],
  };
}

/** Same rule as the SQL listing_satisfies(): does this listing give the other person what they want? */
export function satisfies(listing: Pick<Listing, "roomKind" | "priceWeek" | "property">, wants: Wants): boolean {
  return (
    (!wants.room_kinds?.length || wants.room_kinds.includes(listing.roomKind)) &&
    (wants.max_price == null || listing.priceWeek <= wants.max_price) &&
    (!wants.property_ids?.length || wants.property_ids.includes(listing.property.id))
  );
}

/** "Mutual match" badge: two swaps by different people where each room fits the other's wants. */
export function isMutualMatch(a: Listing, b: Listing): boolean {
  return (
    a.kind === "swap" && b.kind === "swap" && a.userId !== b.userId &&
    satisfies(b, a.wants) && satisfies(a, b.wants)
  );
}

/** Checks a NewListing before saving. Returns an error message, or null when it's fine. */
export function validateListing(l: NewListing): string | null {
  if (!l.propertyId) return "Pick your hall.";
  if (!l.roomKind) return "Pick your room type.";
  if (!(l.priceWeek > 0)) return "Enter the weekly price.";
  if (l.startDate && l.endDate && l.endDate < l.startDate) return "The contract end date is before the start date.";
  if (l.wants?.max_price != null && !(l.wants.max_price > 0)) return "Enter a valid maximum price.";
  return null;
}

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

/** Where a photo is stored: "<user id>/<random>.<ext>" (the storage rules only allow your own folder). */
export function photoPath(userId: string, file: { name: string; type: string; size: number }): string {
  if (!PHOTO_TYPES.includes(file.type)) throw new Error("Photos must be JPG, PNG, WebP or HEIC.");
  if (file.size > MAX_PHOTO_BYTES) throw new Error("That photo is over 10 MB. Try a smaller one.");
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : file.type.split("/")[1];
  return `${userId}/${crypto.randomUUID()}.${ext}`;
}

// ───────────── Supabase calls ─────────────

async function myId(supabase: Client): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function requireMe(supabase: Client, action: string): Promise<string> {
  const id = await myId(supabase);
  if (!id) throw new Error(`Sign in to ${action}.`);
  return id;
}

/** Owners' display names. Profiles are only readable when signed in, so this is empty when signed out. */
async function ownerNames(supabase: Client, userIds: string[]): Promise<Map<string, string>> {
  if (!(await myId(supabase))) return new Map();
  const { data } = await supabase.from("profiles").select("id, display_name").in("id", [...new Set(userIds)]);
  return new Map((data ?? []).filter((p) => p.display_name).map((p) => [p.id, p.display_name as string]));
}

/** Like counts, my likes and owner names for these rows, then map them to Listing. */
async function withLikes(supabase: Client, rows: ListingRow[]): Promise<Listing[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [{ data: counts }, liked, names] = await Promise.all([
    supabase.from("listing_like_counts").select("listing_id, likes").in("listing_id", ids),
    myLikes(supabase),
    ownerNames(supabase, rows.map((r) => r.user_id)),
  ]);
  const countOf = new Map((counts ?? []).map((c) => [c.listing_id, c.likes ?? 0]));
  return rows.map((r) => toListing(r, countOf.get(r.id) ?? 0, liked.has(r.id), names.get(r.user_id) ?? null));
}

/** Listings for the feed, newest first. By default only active ones. */
export async function getListings(
  supabase: Client,
  opts: { kind?: ListingKind; propertyId?: string; userId?: string; status?: ListingStatus | "any" } = {},
): Promise<Listing[]> {
  let q = supabase.from("listings").select(LISTING_SELECT).order("created_at", { ascending: false });
  if (opts.status !== "any") q = q.eq("status", opts.status ?? "active");
  if (opts.kind) q = q.eq("kind", opts.kind);
  if (opts.propertyId) q = q.eq("property_id", opts.propertyId);
  if (opts.userId) q = q.eq("user_id", opts.userId);
  const { data, error } = await q;
  if (error) throw new Error("Couldn't load listings. Check your connection.");
  return withLikes(supabase, data as ListingRow[]);
}

/** Number of active listings per hall (property id -> count), for the map's "Has listings" filter. */
export async function getListingCounts(supabase: Client): Promise<Map<string, number>> {
  const { data, error } = await supabase.from("listings").select("property_id").eq("status", "active");
  if (error) throw new Error("Couldn't load listings. Check your connection.");
  return countByProperty(data ?? []);
}

export function countByProperty(rows: { property_id: string }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.property_id, (counts.get(r.property_id) ?? 0) + 1);
  return counts;
}

/** My own listings (any status), for "My listings". Empty when signed out. */
export async function getMyListings(supabase: Client): Promise<Listing[]> {
  const me = await myId(supabase);
  return me ? getListings(supabase, { userId: me, status: "any" }) : [];
}

/** One listing, or null if it doesn't exist. */
export async function getListing(supabase: Client, id: string): Promise<Listing | null> {
  const { data, error } = await supabase.from("listings").select(LISTING_SELECT).eq("id", id).maybeSingle();
  if (error || !data) return null; // includes malformed ids
  return (await withLikes(supabase, [data as ListingRow]))[0];
}

/** Saves a new listing for the signed-in user and returns its id. */
export async function createListing(supabase: Client, l: NewListing): Promise<string> {
  const problem = validateListing(l);
  if (problem) throw new Error(problem);
  await requireMe(supabase, "create a listing");
  const { data, error } = await supabase
    .from("listings")
    .insert({
      property_id: l.propertyId,
      kind: l.kind,
      room_kind: l.roomKind,
      price_week: l.priceWeek,
      flatmates: l.flatmates ?? null,
      start_date: l.startDate || null,
      end_date: l.endDate || null,
      description: l.description?.trim() || null,
      photos: l.photos ?? [],
      wants: l.kind === "swap" ? ((l.wants ?? {}) as Database["public"]["Tables"]["listings"]["Insert"]["wants"]) : {},
    })
    .select("id")
    .single();
  if (error) throw new Error("Couldn't save your listing. Try again.");
  return data.id;
}

/** Mark your listing matched / closed (or active again). */
export async function setListingStatus(supabase: Client, id: string, status: ListingStatus): Promise<void> {
  const { error } = await supabase.from("listings").update({ status }).eq("id", id);
  if (error) throw new Error("Couldn't update the listing.");
}

/** Deletes your listing. */
export async function deleteListing(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from("listings").delete().eq("id", id);
  if (error) throw new Error("Couldn't delete the listing.");
}

// Likes

/** Ids of the listings I've liked (empty when signed out). */
export async function myLikes(supabase: Client): Promise<Set<string>> {
  const me = await myId(supabase);
  if (!me) return new Set();
  const { data } = await supabase.from("listing_likes").select("listing_id").eq("user_id", me);
  return new Set((data ?? []).map((r) => r.listing_id));
}

export async function like(supabase: Client, listingId: string): Promise<void> {
  await requireMe(supabase, "like listings");
  const { error } = await supabase.from("listing_likes").insert({ listing_id: listingId });
  if (!error || error.code === "23505") return; // 23505 = already liked: fine
  throw new Error(error.code === "42501" ? "You can't like your own listing." : "Couldn't save the like. Try again.");
}

export async function unlike(supabase: Client, listingId: string): Promise<void> {
  const me = await requireMe(supabase, "like listings");
  const { error } = await supabase.from("listing_likes").delete().eq("listing_id", listingId).eq("user_id", me);
  if (error) throw new Error("Couldn't remove the like.");
}

/** Listings I've liked, newest listing first (for a "Liked" tab). */
export async function getLikedListings(supabase: Client): Promise<Listing[]> {
  const ids = [...(await myLikes(supabase))];
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("listings").select(LISTING_SELECT).in("id", ids).order("created_at", { ascending: false });
  if (error) throw new Error("Couldn't load your liked listings.");
  return withLikes(supabase, data as ListingRow[]);
}

// Quick match

/**
 * Quick match: active swaps whose room fits what I want AND whose wants my room fits.
 * Uses all my active swap listings (or just `myListingId`), skipping `exclude` (ids I passed on).
 * Empty when I have no active swap listing: show a "Create a swap listing first" prompt.
 */
export async function quickMatches(
  supabase: Client,
  opts: { myListingId?: string; exclude?: Iterable<string> } = {},
): Promise<Listing[]> {
  let mine: string[];
  if (opts.myListingId) mine = [opts.myListingId];
  else {
    const me = await myId(supabase);
    if (!me) return [];
    const { data } = await supabase
      .from("listings").select("id").eq("user_id", me).eq("kind", "swap").eq("status", "active");
    mine = (data ?? []).map((r) => r.id);
  }
  const skip = new Set(opts.exclude ?? []);
  const results = await Promise.all(mine.map((id) => supabase.rpc("match_listings", { p_listing_id: id })));
  const ids = [...new Set(results.flatMap((r) => (r.data ?? []).map((l) => l.id)))].filter((id) => !skip.has(id));
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("listings").select(LISTING_SELECT).in("id", ids).order("created_at", { ascending: false });
  if (error) throw new Error("Couldn't load matches.");
  return withLikes(supabase, data as ListingRow[]);
}

// Chat

/** Opens (or creates) the chat with this listing's owner. Returns the conversation id → /messages/<id>. */
export async function startConversation(supabase: Client, listingId: string): Promise<string> {
  await requireMe(supabase, "send a message");
  const { data, error } = await supabase.rpc("start_conversation", { p_listing_id: listingId });
  if (error) {
    if (/own listing/i.test(error.message)) throw new Error("This is your own listing.");
    if (/not found/i.test(error.message)) throw new Error("This listing no longer exists.");
    throw new Error("Couldn't open the chat. Try again.");
  }
  return data;
}

// Photos

/** Uploads one photo for a listing and returns its public URL (put it in NewListing.photos). */
export async function uploadPhoto(supabase: Client, file: File): Promise<string> {
  const me = await requireMe(supabase, "upload photos");
  const path = photoPath(me, file);
  const { error } = await supabase.storage.from("listing-photos").upload(path, file, { contentType: file.type });
  if (error) throw new Error("Couldn't upload the photo. Try again.");
  return supabase.storage.from("listing-photos").getPublicUrl(path).data.publicUrl;
}
