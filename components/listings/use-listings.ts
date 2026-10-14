"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { DEMO_LISTINGS } from "./demo-data";
import type { RoomListing } from "./types";
import { createClient } from "@/lib/supabase/client";
import {
  createListing as saveListing,
  deleteListing as removeListing,
  getLikedListings,
  getListing,
  getListings,
  getMyListings,
  isMutualMatch,
  like as saveLike,
  quickMatches as fetchQuickMatches,
  setListingStatus as saveStatus,
  unlike as removeLike,
  type Listing as BackendListing,
  type ListingStatus,
  type NewListing,
} from "@/lib/data/listings";
import { DEMO_LISTINGS as SAMPLE_LISTINGS } from "./demo-data";
import { listingsAreMutualMatches } from "./matching";

const HAS_SUPABASE = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const LISTINGS_KEY = "alonr.demo-listings.v1";
const LIKES_KEY = "alonr.demo-likes.v1";
type Snapshot = { listings: RoomListing[]; likedIds: string[]; ready: boolean };
const SERVER_SNAPSHOT: Snapshot = { listings: DEMO_LISTINGS, likedIds: [], ready: false };
let cachedSnapshot: Snapshot = SERVER_SNAPSHOT;
let cachedListingsJson = "";
let cachedLikesJson = "";
const listeners = new Set<() => void>();

type RemoteSnapshot = {
  listings: RoomListing[];
  mine: RoomListing[];
  liked: RoomListing[];
  userId: string | null;
  ready: boolean;
  error: string | null;
};

function fromBackend(row: BackendListing, userId: string | null, match = false): RoomListing {
  return {
    id: row.id,
    ownerId: row.userId,
    ownerName: row.userId === userId ? "You" : "Student",
    university: row.property.provider,
    propertyId: row.property.id,
    propertyName: row.property.name,
    roomKind: row.roomKind,
    priceWeek: row.priceWeek,
    flatmates: row.flatmates ?? 0,
    contractWeeks: 0,
    startDate: row.startDate ?? "",
    endDate: row.endDate ?? "",
    description: row.description ?? "",
    photos: row.photos.length ? row.photos : [SAMPLE_LISTINGS[0].photos[0]],
    kind: row.kind,
    wants: {
      propertyIds: row.wants.property_ids ?? [],
      roomKinds: row.wants.room_kinds ?? [],
      maxPrice: row.wants.max_price ?? 0,
    },
    createdAt: row.createdAt,
    likes: row.likes,
    likedByMe: row.likedByMe,
    status: row.status,
    mutualMatch: match,
  };
}

function mapWithMatches(rows: BackendListing[], userId: string | null) {
  return rows.map((row) => fromBackend(row, userId, rows.some((other) => isMutualMatch(row, other))));
}

function parse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getClientSnapshot(): Snapshot {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;
  try {
    const listingsJson = window.localStorage.getItem(LISTINGS_KEY) ?? "";
    const likesJson = window.localStorage.getItem(LIKES_KEY) ?? "";
    if (cachedSnapshot.ready && listingsJson === cachedListingsJson && likesJson === cachedLikesJson) return cachedSnapshot;
    cachedListingsJson = listingsJson;
    cachedLikesJson = likesJson;
    cachedSnapshot = {
      listings: [...parse<RoomListing[]>(listingsJson, []), ...DEMO_LISTINGS],
      likedIds: parse<string[]>(likesJson, []),
      ready: true,
    };
  } catch {
    cachedSnapshot = { ...SERVER_SNAPSHOT, ready: true };
  }
  return cachedSnapshot;
}

function notify() {
  getClientSnapshot();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (typeof window !== "undefined") window.addEventListener("storage", notify);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", notify);
  };
}

export function useListings() {
  const snapshot = useSyncExternalStore(subscribe, getClientSnapshot, () => SERVER_SNAPSHOT);
  const [remote, setRemote] = useState<RemoteSnapshot | null>(null);

  useEffect(() => {
    if (!HAS_SUPABASE) return;
    const supabase = createClient();
    let active = true;
    Promise.all([getListings(supabase), getMyListings(supabase), getLikedListings(supabase), supabase.auth.getUser()])
      .then(([feed, mine, liked, auth]) => {
        if (!active) return;
        const userId = auth.data.user?.id ?? null;
        setRemote({
          listings: mapWithMatches(feed, userId),
          mine: mapWithMatches(mine, userId),
          liked: mapWithMatches(liked, userId),
          userId,
          ready: true,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setRemote({ listings: [], mine: [], liked: [], userId: null, ready: true, error: error instanceof Error ? error.message : "Couldn't load listings." });
      });
    return () => { active = false; };
  }, []);

  const reload = useCallback(async (supabase = createClient()) => {
    const [feed, mine, liked, auth] = await Promise.all([
      getListings(supabase), getMyListings(supabase), getLikedListings(supabase), supabase.auth.getUser(),
    ]);
    const userId = auth.data.user?.id ?? null;
    setRemote({ listings: mapWithMatches(feed, userId), mine: mapWithMatches(mine, userId), liked: mapWithMatches(liked, userId), userId, ready: true, error: null });
  }, []);

  const toggleLike = useCallback(async (id: string) => {
    if (HAS_SUPABASE) {
      const item = remote?.listings.find((listing) => listing.id === id)
        ?? remote?.mine.find((listing) => listing.id === id)
        ?? remote?.liked.find((listing) => listing.id === id);
      if (item?.likedByMe) await removeLike(createClient(), id);
      else await saveLike(createClient(), id);
      await reload();
      return;
    }
    const current = getClientSnapshot().likedIds;
    const next = current.includes(id) ? current.filter((liked) => liked !== id) : [...current, id];
    window.localStorage.setItem(LIKES_KEY, JSON.stringify(next));
    notify();
  }, [remote, reload]);

  const addListing = useCallback(async (listing: RoomListing) => {
    if (HAS_SUPABASE) {
      const input: NewListing = {
        propertyId: listing.propertyId,
        kind: listing.kind,
        roomKind: listing.roomKind,
        priceWeek: listing.priceWeek,
        flatmates: listing.flatmates,
        startDate: listing.startDate,
        endDate: listing.endDate,
        description: listing.description,
        photos: listing.photos,
        wants: listing.kind === "swap" ? {
          property_ids: listing.wants.propertyIds,
          room_kinds: listing.wants.roomKinds,
          max_price: listing.wants.maxPrice,
        } : {},
      };
      const id = await saveListing(createClient(), input);
      await reload();
      return id;
    }
    const current = parse<RoomListing[]>(window.localStorage.getItem(LISTINGS_KEY), []);
    window.localStorage.setItem(LISTINGS_KEY, JSON.stringify([listing, ...current]));
    notify();
    return listing.id;
  }, [reload]);

  const getById = useCallback(async (id: string) => {
    if (!HAS_SUPABASE) return snapshot.listings.find((listing) => listing.id === id) ?? null;
    const row = await getListing(createClient(), id);
    return row ? fromBackend(row, remote?.userId ?? null) : null;
  }, [remote?.userId, snapshot.listings]);

  const loadQuickMatches = useCallback(async (myListingId: string | undefined, exclude: string[]) => {
    if (HAS_SUPABASE) {
      const rows = await fetchQuickMatches(createClient(), { myListingId, exclude });
      const userId = remote?.userId ?? null;
      return mapWithMatches(rows, userId);
    }
    const current = snapshot.listings.find((listing) => listing.id === myListingId) ?? SAMPLE_LISTINGS[0];
    return snapshot.listings.filter((listing) => !exclude.includes(listing.id) && listingsAreMutualMatches(current, listing));
  }, [remote?.userId, snapshot.listings]);

  const changeStatus = useCallback(async (id: string, status: ListingStatus) => {
    if (!HAS_SUPABASE) {
      const current = parse<RoomListing[]>(window.localStorage.getItem(LISTINGS_KEY), []);
      window.localStorage.setItem(LISTINGS_KEY, JSON.stringify(current.map((listing) => listing.id === id ? { ...listing, status } : listing)));
      notify();
      return;
    }
    await saveStatus(createClient(), id, status);
    await reload();
  }, [reload]);

  const deleteOwnListing = useCallback(async (id: string) => {
    if (!HAS_SUPABASE) {
      const current = parse<RoomListing[]>(window.localStorage.getItem(LISTINGS_KEY), []);
      window.localStorage.setItem(LISTINGS_KEY, JSON.stringify(current.filter((listing) => listing.id !== id)));
      notify();
      return;
    }
    await removeListing(createClient(), id);
    await reload();
  }, [reload]);

  if (!HAS_SUPABASE) {
    return {
      listings: snapshot.listings,
      myListings: snapshot.listings.filter((listing) => listing.ownerId === "local-user"),
      likedListings: snapshot.listings.filter((listing) => snapshot.likedIds.includes(listing.id)),
      likedIds: snapshot.likedIds,
      userId: "local-user",
      ready: snapshot.ready,
      error: null,
      isDemo: true,
      toggleLike,
      addListing,
      getById,
      loadQuickMatches,
      changeStatus,
      deleteOwnListing,
    };
  }

  return {
    listings: remote?.listings ?? [],
    myListings: remote?.mine ?? [],
    likedListings: remote?.liked ?? [],
    likedIds: [...new Set([...(remote?.listings ?? []), ...(remote?.mine ?? []), ...(remote?.liked ?? [])].filter((listing) => listing.likedByMe).map((listing) => listing.id))],
    userId: remote?.userId ?? null,
    ready: remote?.ready ?? false,
    error: remote?.error ?? null,
    isDemo: false,
    toggleLike,
    addListing,
    getById,
    loadQuickMatches,
    changeStatus,
    deleteOwnListing,
  };
}
