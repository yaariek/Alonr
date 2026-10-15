"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Archive, ArrowRight, Heart, LayoutGrid, List, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DEMO_LISTINGS } from "./demo-data";
import { ListingCard } from "./listing-card";
import { listingsAreMutualMatches } from "./matching";
import { useListings } from "./use-listings";
import type { RoomListing } from "./types";
import { SearchView } from "@/components/search/search-view";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Search, SlidersHorizontal } from "lucide-react";
import { roomKindLabel } from "@/lib/format";
import type { RoomKind } from "@/lib/types";

type View = "explore" | "halls" | "quick" | "mine" | "saved";
type Layout = "grid" | "list";
type OfferFilter = "all" | RoomListing["kind"];

export function ListingsPage() {
  const {
    listings, myListings, likedListings, likedIds, userId, ready, error, isDemo,
    toggleLike, loadQuickMatches, changeStatus, deleteOwnListing,
  } = useListings();
  // Deep links from the Me tab: /listings?view=mine or ?view=saved
  const linkedView = useSearchParams().get("view");
  const initialView: View = linkedView === "mine" || linkedView === "saved" || linkedView === "halls" ? linkedView : "explore";
  const [view, setView] = useState<View>(initialView);
  const [layout, setLayout] = useState<Layout>("grid");
  const [offerFilter, setOfferFilter] = useState<OfferFilter>("all");
  const [roomQuery, setRoomQuery] = useState("");
  const [roomKindFilter, setRoomKindFilter] = useState<RoomKind | "all">("all");
  const [roomMaxPrice, setRoomMaxPrice] = useState<number | null>(null);
  const [gridColumns, setGridColumns] = useState<2 | 3 | 4>(3);
  const [selectedId, setSelectedId] = useState("");
  const [passed, setPassed] = useState<string[]>([]);
  const [quickMatches, setQuickMatches] = useState<RoomListing[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  const mySwapListings = myListings.filter((listing) => listing.kind === "swap" && (listing.status ?? "active") === "active");
  const demoPreview = !mySwapListings.length;
  const currentListing = mySwapListings.find((listing) => listing.id === selectedId) ?? mySwapListings[0] ?? DEMO_LISTINGS[0];
  const isMine = (listing: RoomListing) => listing.ownerId === userId;
  const feedListings = listings.filter((listing) => !isMine(listing));
  const filteredFeedListings = offerFilter === "all"
    ? feedListings
    : feedListings.filter((listing) => listing.kind === offerFilter);
  const shownListings = view === "mine"
    ? myListings
    : view === "saved"
      ? likedListings
        : view === "quick"
          ? quickMatches
          : filteredFeedListings;
  const maxRoomPrice = Math.max(5, ...listings.map((listing) => listing.priceWeek));
  const selectedRoomMaxPrice = Math.min(roomMaxPrice ?? maxRoomPrice, maxRoomPrice);
  const roomFilterCount = (roomKindFilter === "all" ? 0 : 1) + (selectedRoomMaxPrice < maxRoomPrice ? 1 : 0) + (offerFilter === "all" ? 0 : 1);
  const roomResults = view !== "explore" ? shownListings : shownListings.filter((listing) => {
    const needle = roomQuery.trim().toLowerCase();
    const matchesQuery = !needle || [listing.propertyName, listing.university, listing.postcode, listing.ownerName, listing.description, listing.roomKind]
      .some((value) => value?.toLowerCase().includes(needle));
    return matchesQuery && (roomKindFilter === "all" || listing.roomKind === roomKindFilter) && listing.priceWeek <= selectedRoomMaxPrice;
  });
  const availableRoomKinds = [...new Set(listings.map((listing) => listing.roomKind))];
  const listingGridClass = layout === "list"
    ? "mx-auto grid max-w-3xl grid-cols-1 gap-4"
    : `grid gap-4 ${gridColumns === 2 ? "grid-cols-1 sm:grid-cols-2" : gridColumns === 3 ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"}`;

  async function showQuickMatches(myListingId = mySwapListings[0]?.id, exclude = passed) {
    setLoadingMatches(true);
    try {
      const previewListingId = isDemo && !myListingId ? DEMO_LISTINGS[0].id : myListingId;
      setQuickMatches(await loadQuickMatches(previewListingId, exclude));
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Couldn't load your matches.");
      setQuickMatches([]);
    } finally {
      setLoadingMatches(false);
    }
  }

  async function changeView(next: View) {
    setView(next);
    if (next === "quick") await showQuickMatches();
  }

  // Like/unlike a card. In Quick match, update that card in place (heart + count) instead of reloading the list.
  async function likeListing(id: string) {
    try {
      await toggleLike(id);
      if (view === "quick") {
        setQuickMatches((list) => list.map((l) => {
          if (l.id !== id) return l;
          const nowLiked = !likedIds.includes(id);
          return { ...l, likedByMe: nowLiked, likes: Math.max(0, (l.likes ?? 0) + (nowLiked ? 1 : -1)) };
        }));
      }
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Couldn't save that like.");
    }
  }

  async function passMatch(id: string) {
    const next = [...passed, id];
    setPassed(next);
    await showQuickMatches(currentListing.id, next);
  }

  async function updateStatus(listing: RoomListing) {
    const next = listing.status === "closed" ? "active" : "closed";
    try {
      await changeStatus(listing.id, next);
      toast.success(next === "closed" ? "Listing closed." : "Listing is active again.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Couldn't update your listing.");
    }
  }

  async function removeMyListing(id: string) {
    if (!window.confirm("Delete this listing? This can’t be undone.")) return;
    try {
      await deleteOwnListing(id);
      toast.success("Listing deleted.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Couldn't delete your listing.");
    }
  }

  return (
    <div className="mx-auto max-w-screen-2xl px-4 pb-8 pt-5 sm:px-6 lg:px-8">
      <header className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <Image src="/alonr-logo.jpeg" alt="alonr" width={691} height={691} className="h-12 w-[5.2rem] object-cover object-center" />
            <Sparkles className="size-3.5" /> Student-to-student
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Room offers</h1>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">Find a swap or a student to take over your contract.</p>
        </div>
        <Link href="/listings/new" className={buttonVariants({ className: "h-10 gap-1.5 px-3" })}>
          <Plus className="size-4" /> <span className="hidden sm:inline">Create listing</span><span className="sm:hidden">List room</span>
        </Link>
      </header>

      <div className="mb-5 flex gap-1 rounded-xl bg-muted p-1" role="tablist" aria-label="Swap views">
        {([
          ["explore", "Rooms"], ["halls", "Halls"], ["quick", "Match"], ["mine", "My listings"], ["saved", "Saved"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-label={key === "quick" ? "Quick match" : label}
            aria-selected={view === key}
            onClick={() => void changeView(key)}
            className={cn(
              "min-h-10 flex-1 rounded-lg px-1.5 text-[11px] font-semibold transition-colors sm:px-2 sm:text-sm",
              view === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {((key === "mine" && myListings.length > 0) || (key === "saved" && likedListings.length > 0)) && (
              <span className="mr-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
                {key === "mine" ? myListings.length : likedListings.length}
              </span>
            )}
            {label}
          </button>
        ))}
      </div>

      {view === "halls" ? <SearchView embedded /> : <>
      {view === "explore" && (
        <div className="mb-3 flex items-center gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border bg-background px-3 py-2.5 focus-within:ring-2 focus-within:ring-ring">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input value={roomQuery} onChange={(event) => setRoomQuery(event.target.value)} placeholder="Search rooms, halls, areas…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" aria-label="Search room listings" />
          </label>
          <Sheet>
            <SheetTrigger className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent">
              <SlidersHorizontal className="size-4" /> Filter{roomFilterCount > 0 ? ` (${roomFilterCount})` : ""}
            </SheetTrigger>
            <SheetContent side="right" className="h-dvh w-[min(24rem,90vw)] max-w-none rounded-none px-5 py-4">
              <SheetHeader className="p-0 pr-10 text-left"><SheetTitle>Filter rooms</SheetTitle></SheetHeader>
              <div className="min-h-0 flex-1 space-y-7 overflow-y-auto py-4">
                <section className="space-y-3">
                  <div><h3 className="text-sm font-semibold">Listing type</h3><p className="text-xs text-muted-foreground">Show swaps, contract releases, or both.</p></div>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by listing type">
                    {([ ["all", "All rooms"], ["swap", "Swaps"], ["release", "Contract releases"] ] as const).map(([kind, label]) => (
                      <button key={kind} type="button" aria-pressed={offerFilter === kind} onClick={() => setOfferFilter(kind)} className={cn("rounded-full border px-3 py-2 text-xs font-medium", offerFilter === kind ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent")}>{label}</button>
                    ))}
                  </div>
                </section>
                <section className="space-y-3">
                  <div><h3 className="text-sm font-semibold">Room type</h3><p className="text-xs text-muted-foreground">Choose a room type to show.</p></div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" aria-pressed={roomKindFilter === "all"} onClick={() => setRoomKindFilter("all")} className={cn("rounded-full border px-3 py-2 text-xs font-medium", roomKindFilter === "all" ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent")}>All rooms</button>
                    {availableRoomKinds.map((kind) => (
                      <button key={kind} type="button" aria-pressed={roomKindFilter === kind} onClick={() => setRoomKindFilter(roomKindFilter === kind ? "all" : kind)} className={cn("rounded-full border px-3 py-2 text-xs font-medium", roomKindFilter === kind ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent")}>{roomKindLabel(kind)}</button>
                    ))}
                  </div>
                </section>
                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-3 text-sm font-medium"><span>Maximum weekly price</span><span className="font-bold text-primary">£{selectedRoomMaxPrice}/wk</span></div>
                  <Slider value={[selectedRoomMaxPrice]} min={0} max={maxRoomPrice} step={5} onValueChange={(value) => { if (Array.isArray(value) && value.length) setRoomMaxPrice(value[0]); }} aria-label="Maximum weekly price" />
                  <div className="flex justify-between text-xs text-muted-foreground"><span>£0/wk</span><span>£{maxRoomPrice}/wk</span></div>
                </section>
              </div>
              <div className="flex gap-2 border-t pt-4">
                <button type="button" onClick={() => { setOfferFilter("all"); setRoomKindFilter("all"); setRoomMaxPrice(null); }} className="flex-1 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-accent">Clear filters</button>
                <SheetClose className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Show rooms</SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {view === "explore" ? <span>{roomResults.length} rooms to explore</span> : <span>{roomResults.length} {roomResults.length === 1 ? "room" : "rooms"}</span>}
          {view === "explore" && <span className="ml-3 inline-flex items-center gap-1"><Heart className="size-3.5" /> Like a room to save it</span>}
        </div>
        {/* Grid and list look the same on phones, so the layout controls only show from sm up. */}
        <div className="hidden items-center gap-2 sm:flex">
          <div className="flex rounded-lg border bg-background p-0.5" role="group" aria-label="Listing layout">
            <button type="button" aria-pressed={layout === "grid"} onClick={() => setLayout("grid")} className={cn("inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium", layout === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <LayoutGrid className="size-3.5" /> Grid
            </button>
            <button type="button" aria-pressed={layout === "list"} onClick={() => setLayout("list")} className={cn("inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium", layout === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <List className="size-3.5" /> List
            </button>
          </div>
          {layout === "grid" && (
            <div className="hidden rounded-lg border bg-background p-0.5 xl:flex" role="group" aria-label="Grid columns">
              {([2, 3, 4] as const).map((columns) => (
                <button key={columns} type="button" aria-label={`${columns} columns`} aria-pressed={gridColumns === columns} onClick={() => setGridColumns(columns)} className={cn("size-8 rounded-md text-xs font-medium", gridColumns === columns ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {columns}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {view === "quick" && (
        <Card className="mb-4 border-primary/15 bg-primary/[0.035]">
          <CardContent className="space-y-2 p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Your swap match</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {isDemo && demoPreview ? "Preview using Amira's sample room. Create a listing to find matches for your room." : "Only rooms that fit your wants and whose room fits yours appear here."}
                </p>
              </div>
              {mySwapListings.length > 1 && (
                <Select value={currentListing.id} onValueChange={(id) => { if (id) { setSelectedId(id); void showQuickMatches(id); } }}>
                  <SelectTrigger className="h-9 w-36 bg-background text-xs sm:w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {mySwapListings.map((listing) => <SelectItem key={listing.id} value={listing.id}>{listing.propertyName}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            {isDemo && demoPreview && <Badge variant="outline" className="border-primary/25 text-primary">Sample match preview</Badge>}
          </CardContent>
        </Card>
      )}

      {view === "mine" && (
        <div className="mb-4 rounded-xl border border-dashed p-3.5 text-sm">
          <p className="font-semibold">Your rooms</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Manage the rooms you have posted.</p>
        </div>
      )}

      {error && <p role="alert" className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      {!ready ? (
        <div className={listingGridClass}>{[0, 1, 2, 3].map((key) => <div key={key} className="aspect-[1.4] animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : loadingMatches && view === "quick" ? (
        <div className={listingGridClass}>{[0, 1].map((key) => <div key={key} className="aspect-[1.4] animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : roomResults.length ? (
        <div className={listingGridClass}>
          {roomResults.map((listing, index) => (
            <div key={`${view}-${listing.id}`} className="space-y-2">
              <QuickMatchCard
                listing={listing}
                liked={likedIds.includes(listing.id)}
                onLike={() => void likeListing(listing.id)}
                onPass={() => void passMatch(listing.id)}
                quick={view === "quick"}
                eager={index < 3}
                mutualMatch={view === "quick" || myListings.some((mine) => mine.kind === "swap" && (mine.status ?? "active") === "active" && listingsAreMutualMatches(mine, listing))}
              />
              {view === "mine" && (
                <div className="flex gap-2 px-1">
                  <Button type="button" size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => void updateStatus(listing)}>
                    <Archive className="size-3.5" /> {listing.status === "closed" ? "Reopen" : "Close listing"}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" aria-label="Delete listing" className="text-destructive hover:text-destructive" onClick={() => void removeMyListing(listing.id)}><Trash2 className="size-4" /></Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : view === "mine" ? (
        <EmptyState title="Your next move starts here" description="List your room to find a swap or offer your contract to another student." />
      ) : view === "saved" ? (
        <EmptyState title="No saved rooms yet" description="Tap the heart on a room to keep it here while you compare your options." />
      ) : view === "quick" ? (
        <EmptyState title={mySwapListings.length ? "No reciprocal matches yet" : "Create a swap listing first"} description={mySwapListings.length ? "We’ll show students whose room matches what you want and whose room fits what you have." : "Add your room and what you are looking for to see reciprocal swap matches."} />
      ) : view === "explore" && (roomQuery.trim() || roomFilterCount > 0) ? (
        <EmptyState title="No matching rooms" description="Try a different search or clear some room filters." />
      ) : view === "explore" && offerFilter !== "all" ? (
        <EmptyState
          title={offerFilter === "swap" ? "No swap rooms available" : "No contract releases available"}
          description="Try another filter or check back later for new room offers."
        />
      ) : (
        <EmptyState title="No listings yet" description="Check back soon for rooms from London students." />
      )}

      {view === "quick" && shownListings.length > 0 && (
        <Link href="/listings/new" className={buttonVariants({ variant: "outline", className: "mt-5 w-full gap-2" })}>
          Publish your own room <ArrowRight className="size-4" />
        </Link>
      )}
      </>}
    </div>
  );
}

function QuickMatchCard({
  listing, liked, onLike, onPass, quick, mutualMatch, eager,
}: {
  listing: RoomListing; liked: boolean; onLike: () => void; onPass: () => void; quick: boolean; mutualMatch: boolean; eager?: boolean;
}) {
  return (
    <div className="space-y-2">
      <ListingCard listing={listing} allListings={[]} liked={liked} onLike={onLike} mutualMatch={mutualMatch} eager={eager} />
      {quick && (
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" className="h-10" onClick={onPass}>Pass</Button>
          <Button type="button" className="h-10 gap-1.5" onClick={onLike}><Heart className={`size-4 ${liked ? "fill-current" : ""}`} /> {liked ? "Liked" : "Like"}</Button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-dashed shadow-none">
      <CardContent className="flex min-h-44 flex-col items-center justify-center px-6 text-center">
        <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary"><Sparkles className="size-5" /></span>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
        <Link href="/listings/new" className={buttonVariants({ size: "sm", className: "mt-4 gap-1.5" })}><Plus className="size-3.5" /> Create a listing</Link>
      </CardContent>
    </Card>
  );
}
