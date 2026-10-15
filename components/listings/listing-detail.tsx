"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Heart, MapPin, MessageCircle, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { startConversation } from "@/lib/data/listings";
import { useProperties } from "@/lib/data/use-properties";
import { formatDate, roomKindLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { listingsAreMutualMatches } from "./matching";
import { ListingPhoto, listingPlace } from "./listing-card";
import { useListings } from "./use-listings";
import type { RoomListing } from "./types";

export function ListingDetail({ id }: { id: string }) {
  const router = useRouter();
  const { listings, myListings, likedIds, userId, ready, isDemo, toggleLike, getById } = useListings();
  const { properties } = useProperties();
  const [loadedDetail, setLoadedDetail] = useState<{ id: string; listing: RoomListing | null } | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const listing = [...listings, ...myListings].find((item) => item.id === id)
    ?? (loadedDetail?.id === id ? loadedDetail.listing : null);

  useEffect(() => {
    if (!ready || listing || loadedDetail?.id === id) return;
    let active = true;
    getById(id).then((result) => {
      if (active) setLoadedDetail({ id, listing: result });
    }).catch((cause: unknown) => {
      toast.error(cause instanceof Error ? cause.message : "Couldn't load this listing.");
      if (active) setLoadedDetail({ id, listing: null });
    });
    return () => { active = false; };
  }, [getById, id, listing, loadedDetail?.id, ready]);

  if (!ready || (!listing && loadedDetail?.id !== id)) {
    return <div className="mx-auto max-w-lg space-y-4 p-4"><div className="aspect-[1.2] animate-pulse rounded-2xl bg-muted" /><div className="h-8 w-2/3 animate-pulse rounded bg-muted" /><div className="h-24 animate-pulse rounded-xl bg-muted" /></div>;
  }
  if (!listing) notFound();

  const listingId = listing.id;
  const isMine = listing.ownerId === userId;
  const hasMutualMatch = myListings.some((mine) => mine.kind === "swap" && (mine.status ?? "active") === "active" && listingsAreMutualMatches(mine, listing));
  const currentPhoto = listing.photos[Math.min(photoIndex, listing.photos.length - 1)];

  async function toggleSaved() {
    try {
      await toggleLike(listingId);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Couldn't save that like.");
    }
  }

  async function messageStudent() {
    if (isDemo) {
      toast.info("Add your Supabase keys to connect student chat.");
      return;
    }
    if (!userId) {
      router.push(`/login?next=${encodeURIComponent(`/listings/${listingId}`)}`);
      return;
    }
    try {
      const conversationId = await startConversation(createClient(), listingId);
      router.push(`/messages/${conversationId}`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Couldn't open the chat.");
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-8 pt-4 sm:px-6">
      <Link href="/listings" className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2 mb-2 gap-1" })}>
        <ArrowLeft className="size-4" /> All listings
      </Link>

      <div className="relative overflow-hidden rounded-2xl">
        <ListingPhoto listing={{ ...listing, photos: currentPhoto ? [currentPhoto] : [] }} className="aspect-[1.08] w-full sm:aspect-[1.35]" eager />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge className="border-white/30 bg-white/90 text-foreground shadow-sm hover:bg-white/90">{listing.kind === "swap" ? "Room swap" : "Contract release"}</Badge>
          {hasMutualMatch && <Badge className="bg-emerald-500 text-white shadow-sm hover:bg-emerald-500">Mutual match</Badge>}
        </div>
        {!isMine && (
          <Button type="button" variant="outline" size="icon" aria-label={likedIds.includes(listing.id) ? "Unlike listing" : "Like listing"} aria-pressed={likedIds.includes(listing.id)} onClick={() => void toggleSaved()} className="absolute right-3 top-3 rounded-full border-white/70 bg-white/90 text-foreground shadow-sm hover:bg-white">
            <Heart className={`size-4 ${likedIds.includes(listing.id) ? "fill-rose-500 text-rose-500" : ""}`} />
          </Button>
        )}
        {listing.photos.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {listing.photos.map((photo, index) => <button key={`${index}-${photo.slice(-12)}`} type="button" aria-label={`Show photo ${index + 1}`} aria-pressed={photoIndex === index} onClick={() => setPhotoIndex(index)} className={`size-2.5 rounded-full border border-white ${photoIndex === index ? "bg-white" : "bg-white/40"}`} />)}
          </div>
        )}
      </div>

      <header className="space-y-3 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-4 shrink-0" />{listingPlace(listing)}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{listing.propertyName}</h1>
          </div>
          <p className="shrink-0 text-right text-lg font-bold">£{listing.priceWeek}<span className="text-sm font-normal text-muted-foreground">/wk</span></p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{roomKindLabel(listing.roomKind)}</Badge>
          {listing.contractWeeks > 0 && <Badge variant="secondary">{listing.contractWeeks} weeks</Badge>}
          {listing.flatmates > 0 && <Badge variant="secondary"><Users className="mr-1 size-3" />{listing.flatmates} flatmates</Badge>}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" className="h-11 gap-2" onClick={() => void toggleSaved()} disabled={isMine}>
          <Heart className={`size-4 ${likedIds.includes(listing.id) ? "fill-rose-500 text-rose-500" : ""}`} /> {likedIds.includes(listing.id) ? "Saved" : "Save room"}
        </Button>
        <Button type="button" className="h-11 gap-2" disabled={isMine} onClick={() => void messageStudent()} title={isMine ? "This is your listing" : "Message this student"}>
          <MessageCircle className="size-4" /> {isMine ? "Your listing" : "Message"}
        </Button>
      </div>
      {!isMine && isDemo && <p className="mt-2 text-center text-xs text-muted-foreground">Student chat is available when this app is connected to Supabase.</p>}

      <div className="mt-4 space-y-3">
        {(listing.startDate || listing.endDate) && (
          <Card>
            <CardHeader><CardTitle>Contract dates</CardTitle></CardHeader>
            <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="size-4 shrink-0 text-primary" />
              {listing.startDate && formatDate(listing.startDate)}{listing.startDate && listing.endDate && " – "}{listing.endDate && formatDate(listing.endDate)}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>About this room</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{listing.description || "No extra details added yet."}</p>
            <div className="flex items-center gap-2 border-t pt-3 text-sm">
              <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">{listing.ownerName.slice(0, 1)}</span>
              <span><span className="block font-medium">{listing.ownerName}</span><span className="text-xs text-muted-foreground">Verified student</span></span>
              {isMine && <Badge variant="outline" className="ml-auto">Yours</Badge>}
            </div>
          </CardContent>
        </Card>

        {listing.kind === "swap" && (
          <Card>
            <CardHeader><CardTitle>What they’re looking for</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {listing.wants.propertyIds.length ? (
                <>
                  <p>{listing.wants.propertyIds.map((propertyId) => properties.find((item) => item.id === propertyId)?.name).filter(Boolean).join(", ") || "Selected halls"}</p>
                  <div className="flex flex-wrap gap-1.5">{listing.wants.roomKinds.map((room) => <Badge key={room} variant="secondary">{roomKindLabel(room)}</Badge>)}</div>
                  {listing.wants.maxPrice > 0 && <p className="text-muted-foreground">Up to £{listing.wants.maxPrice} per week</p>}
                </>
              ) : <p className="text-muted-foreground">Open to offers. Message them to discuss a swap.</p>}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
