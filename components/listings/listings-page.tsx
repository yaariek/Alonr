"use client";

import Link from "next/link";
import { useState } from "react";
import { Archive, ArrowRight, Heart, Plus, Sparkles, Trash2 } from "lucide-react";
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

type View = "explore" | "quick" | "mine" | "saved";

export function ListingsPage() {
  const {
    listings, myListings, likedListings, likedIds, userId, ready, error, isDemo,
    toggleLike, loadQuickMatches, changeStatus, deleteOwnListing,
  } = useListings();
  const [view, setView] = useState<View>("explore");
  const [selectedId, setSelectedId] = useState("");
  const [passed, setPassed] = useState<string[]>([]);
  const [quickMatches, setQuickMatches] = useState<RoomListing[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  const mySwapListings = myListings.filter((listing) => listing.kind === "swap" && (listing.status ?? "active") === "active");
  const demoPreview = !mySwapListings.length;
  const currentListing = mySwapListings.find((listing) => listing.id === selectedId) ?? mySwapListings[0] ?? DEMO_LISTINGS[0];
  const isMine = (listing: RoomListing) => listing.ownerId === userId;
  const feedListings = listings.filter((listing) => !isMine(listing));
  const shownListings = view === "mine"
    ? myListings
    : view === "saved"
      ? likedListings
      : view === "quick"
        ? quickMatches
        : feedListings;

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
    <div className="mx-auto max-w-2xl px-4 pb-8 pt-5 sm:px-6">
      <header className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <Sparkles className="size-3.5" /> Student-to-student
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Find your next room</h1>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">Real rooms, fair prices, and people who want to swap.</p>
        </div>
        <Link href="/listings/new" className={buttonVariants({ className: "h-10 gap-1.5 px-3" })}>
          <Plus className="size-4" /> <span className="hidden sm:inline">Create listing</span><span className="sm:hidden">List room</span>
        </Link>
      </header>

      <div className="mb-5 flex gap-1 rounded-xl bg-muted p-1" role="tablist" aria-label="Listings views">
        {([
          ["explore", "Explore"], ["quick", "Quick match"], ["mine", "My listings"], ["saved", "Saved"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={view === key}
            onClick={() => void changeView(key)}
            className={cn(
              "min-h-10 flex-1 rounded-lg px-1.5 text-[11px] font-semibold transition-colors sm:px-2 sm:text-sm",
              view === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}{key === "mine" && myListings.length > 0 ? ` ${myListings.length}` : key === "saved" && likedListings.length > 0 ? ` ${likedListings.length}` : ""}
          </button>
        ))}
      </div>

      {view === "explore" && (
        <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>{feedListings.length} rooms to explore</span>
          <span className="flex items-center gap-1"><Heart className="size-3.5" /> Like a room to save it</span>
        </div>
      )}

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
        <div className="grid gap-4 sm:grid-cols-2">{[0, 1, 2, 3].map((key) => <div key={key} className="aspect-[1.4] animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : loadingMatches && view === "quick" ? (
        <div className="grid gap-4 sm:grid-cols-2">{[0, 1].map((key) => <div key={key} className="aspect-[1.4] animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : shownListings.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {shownListings.map((listing) => (
            <div key={`${view}-${listing.id}`} className="space-y-2">
              <QuickMatchCard
                listing={listing}
                liked={likedIds.includes(listing.id)}
                onLike={() => void likeListing(listing.id)}
                onPass={() => void passMatch(listing.id)}
                quick={view === "quick"}
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
      ) : (
        <EmptyState title="No listings yet" description="Check back soon for rooms from London students." />
      )}

      {view === "quick" && shownListings.length > 0 && (
        <Link href="/listings/new" className={buttonVariants({ variant: "outline", className: "mt-5 w-full gap-2" })}>
          Publish your own room <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

function QuickMatchCard({
  listing, liked, onLike, onPass, quick, mutualMatch,
}: {
  listing: RoomListing; liked: boolean; onLike: () => void; onPass: () => void; quick: boolean; mutualMatch: boolean;
}) {
  return (
    <div className="space-y-2">
      <ListingCard listing={listing} allListings={[]} liked={liked} onLike={onLike} mutualMatch={mutualMatch} />
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
