"use client";

import Link from "next/link";
import { Heart, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, roomKindLabel } from "@/lib/format";
import { listingsAreMutualMatches } from "./matching";
import type { RoomListing } from "./types";

export function ListingPhoto({ listing, className = "" }: { listing: RoomListing; className?: string }) {
  const photo = listing.photos[0];
  return (
    <div
      role="img"
      aria-label={`Room photo for ${listing.propertyName}`}
      className={`relative overflow-hidden bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100 ${className}`}
      style={photo ? { backgroundImage: `url("${photo}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
    </div>
  );
}

export function ListingCard({
  listing,
  allListings,
  liked,
  onLike,
}: {
  listing: RoomListing;
  allListings: RoomListing[];
  liked: boolean;
  onLike: () => void;
}) {
  const hasMutualMatch = listing.mutualMatch || allListings.some((other) => listingsAreMutualMatches(listing, other));

  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="relative">
        <Link href={`/listings/${listing.id}`} aria-label={`View ${listing.propertyName} listing`}>
          <ListingPhoto listing={listing} className="aspect-[1.45] w-full" />
        </Link>
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge className="border-white/30 bg-white/90 text-foreground shadow-sm hover:bg-white/90">
            {listing.kind === "swap" ? "Swap" : "Contract release"}
          </Badge>
          {hasMutualMatch && (
            <Badge className="bg-emerald-500 text-white shadow-sm hover:bg-emerald-500">Mutual match</Badge>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={liked ? "Unlike listing" : "Like listing"}
          aria-pressed={liked}
          onClick={onLike}
          className="absolute right-3 top-3 rounded-full border-white/70 bg-white/90 text-foreground shadow-sm hover:bg-white"
        >
          <Heart className={`size-4 ${liked ? "fill-rose-500 text-rose-500" : ""}`} />
        </Button>
        <span className="absolute bottom-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {listing.photos.length} {listing.photos.length === 1 ? "photo" : "photos"}
        </span>
      </div>

      <div className="space-y-3 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/listings/${listing.id}`} className="min-w-0 flex-1">
            <h2 className="truncate font-semibold leading-snug hover:text-primary">{listing.propertyName}</h2>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" /> {listing.university}
            </p>
          </Link>
          <p className="shrink-0 text-right text-sm font-bold">£{listing.priceWeek}<span className="font-normal text-muted-foreground">/wk</span></p>
        </div>

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
          <span>{roomKindLabel(listing.roomKind)}</span>
          {listing.flatmates > 0 && <span className="inline-flex items-center gap-1"><Users className="size-3" /> {listing.flatmates} flatmates</span>}
          <span>{formatDate(listing.startDate)}</span>
        </div>

        <div className="flex items-center justify-between border-t pt-2.5">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
              {listing.ownerName.slice(0, 1).toUpperCase()}
            </span>
            <span className="text-xs text-muted-foreground">{listing.ownerName}</span>
          </div>
          <span className="mr-2 text-xs text-muted-foreground">{listing.likes ? `${listing.likes} likes` : "Be the first to like"}</span>
          <Link href={`/listings/${listing.id}`} className="text-xs font-semibold text-primary">View room</Link>
        </div>
      </div>
    </article>
  );
}
