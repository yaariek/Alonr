"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ImagePlus, Info, Repeat, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProperties } from "@/lib/data/use-properties";
import { roomKindLabel } from "@/lib/format";
import type { ListingKind, RoomKind } from "@/lib/types";
import { prefillFromHall, uploadPhoto, validateListing } from "@/lib/data/listings";
import { createClient } from "@/lib/supabase/client";
import { DEMO_LISTINGS } from "./demo-data";
import { useListings } from "./use-listings";
import type { RoomListing } from "./types";

const ROOM_KINDS: RoomKind[] = ["ensuite", "studio", "shared_bathroom", "twin", "non_ensuite"];
const MAX_PHOTO_SIZE = 600 * 1024;

function fileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read photo"));
    reader.onerror = () => reject(new Error("Could not read photo"));
    reader.readAsDataURL(file);
  });
}

export function NewListingForm() {
  const router = useRouter();
  const { properties, loading } = useProperties();
  const { addListing, isDemo } = useListings();
  const [kind, setKind] = useState<ListingKind>("swap");
  const [propertyId, setPropertyId] = useState("");
  const [roomKind, setRoomKind] = useState<RoomKind | "">("");
  const [priceOverride, setPriceOverride] = useState<number | null>(null);
  const [flatmatesOverride, setFlatmatesOverride] = useState<number | null>(null);
  const [contractWeeksOverride, setContractWeeksOverride] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [wantedPropertyIds, setWantedPropertyIds] = useState<string[]>([]);
  const [wantedRoomKinds, setWantedRoomKinds] = useState<RoomKind[]>(["ensuite"]);
  const [maxWantedPrice, setMaxWantedPrice] = useState(400);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const effectivePropertyId = propertyId || properties[0]?.id || "";
  const property = properties.find((candidate) => candidate.id === effectivePropertyId);
  const roomTypes = property?.roomTypes ?? [];
  const effectiveRoomKind = roomKind || roomTypes[0]?.kind || "";
  const selectedRoom = roomTypes.find((room) => room.kind === effectiveRoomKind) ?? roomTypes[0];
  const defaults = property ? prefillFromHall(property, effectiveRoomKind || undefined) : null;
  const price = priceOverride ?? defaults?.priceWeek ?? selectedRoom?.priceWeek ?? 0;
  const flatmates = flatmatesOverride ?? defaults?.flatmates ?? selectedRoom?.flatmates ?? 0;
  const contractWeeks = contractWeeksOverride ?? defaults?.contractWeeks[0] ?? selectedRoom?.contractWeeks[0] ?? 44;
  const otherProperties = useMemo(() => properties.filter((candidate) => candidate.id !== propertyId), [properties, propertyId]);

  function changeProperty(id: string) {
    setPropertyId(id);
    setRoomKind("");
    setPriceOverride(null);
    setFlatmatesOverride(null);
    setContractWeeksOverride(null);
  }

  function changeRoomType(value: string) {
    const nextRoom = roomTypes.find((room) => room.kind === value);
    if (!nextRoom) return;
    setRoomKind(nextRoom.kind);
    setPriceOverride(null);
    setFlatmatesOverride(null);
    setContractWeeksOverride(null);
  }

  async function addPhotos(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []).slice(0, 3 - photos.length);
    event.currentTarget.value = "";
    if (!files.length) return;
    if (files.some((file) => !file.type.startsWith("image/"))) {
      toast.error("Choose image files only.");
      return;
    }
    if (files.some((file) => file.size > MAX_PHOTO_SIZE)) {
      toast.error("Keep each photo under 600 KB for this demo listing.");
      return;
    }
    try {
      const nextPhotos = await Promise.all(files.map(fileAsDataUrl));
      setPhotos((current) => [...current, ...nextPhotos].slice(0, 3));
      setPhotoFiles((current) => [...current, ...files].slice(0, 3));
    } catch {
      toast.error("One of those photos could not be loaded.");
    }
  }

  function toggleProperty(id: string) {
    setWantedPropertyIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleRoomType(room: RoomKind) {
    setWantedRoomKinds((current) => current.includes(room) ? current.filter((item) => item !== room) : [...current, room]);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!property || !selectedRoom || !effectiveRoomKind) {
      toast.error("Choose a hall and room type first.");
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      toast.error("Your end date needs to be after your start date.");
      return;
    }
    if (kind === "swap" && (!wantedPropertyIds.length || !wantedRoomKinds.length || maxWantedPrice < 1)) {
      toast.error("Choose at least one hall and room type you would consider.");
      return;
    }
    const validationMessage = validateListing({
      propertyId: property.id,
      kind,
      roomKind: effectiveRoomKind,
      priceWeek: Number(price),
      flatmates: Number(flatmates),
      startDate,
      endDate,
      wants: kind === "swap" ? { property_ids: wantedPropertyIds, room_kinds: wantedRoomKinds, max_price: Number(maxWantedPrice) } : {},
    });
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    setBusy(true);
    void (async () => {
      try {
        const uploadedPhotos = isDemo ? photos : await Promise.all(photoFiles.map((file) => uploadPhoto(createClient(), file)));
        const listing: RoomListing = {
          id: `local-${crypto.randomUUID()}`,
          ownerId: "local-user",
          ownerName: "You",
          university: property.affiliatedUniversity ?? property.provider,
          propertyId: property.id,
          propertyName: property.name,
          roomKind: effectiveRoomKind,
          priceWeek: Number(price),
          flatmates: Number(flatmates),
          contractWeeks: Number(contractWeeks),
          startDate,
          endDate,
          description: description.trim(),
          photos: isDemo && !photos.length ? [DEMO_LISTINGS[0].photos[0]] : uploadedPhotos,
          kind,
          wants: kind === "swap"
            ? { propertyIds: wantedPropertyIds, roomKinds: wantedRoomKinds, maxPrice: Number(maxWantedPrice) }
            : { propertyIds: [], roomKinds: [], maxPrice: 0 },
          createdAt: new Date().toISOString(),
        };
        const id = await addListing(listing);
        router.push(`/listings/${id}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Couldn't save your listing.");
        setBusy(false);
      }
    })();
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-10 pt-4 sm:px-6">
      <Link href="/listings" className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2 mb-2 gap-1" })}>
        <ArrowLeft className="size-4" /> Listings
      </Link>
      <header className="mb-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Your next move</p>
        <h1 className="text-2xl font-bold tracking-tight">List your room</h1>
        <p className="mt-1 text-sm text-muted-foreground">A few details help the right student find you.</p>
      </header>

      <form onSubmit={submit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Repeat className="size-4 text-primary" /> What are you offering?</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {([
                ["swap", "Room swap", "Find a room that works better"],
                ["release", "Contract release", "Pass your contract on"],
              ] as const).map(([value, label, detail]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setKind(value)}
                  aria-pressed={kind === value}
                  className={`min-h-20 rounded-xl border p-3 text-left transition-colors ${kind === value ? "border-primary bg-primary/5 ring-1 ring-primary/25" : "hover:bg-muted/60"}`}
                >
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{detail}</span>
                </button>
              ))}
            </div>

            <Field label="Hall" htmlFor="hall">
              <select id="hall" required value={effectivePropertyId} onChange={(event) => changeProperty(event.target.value)} disabled={loading || properties.length === 0} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                {!properties.length && <option value="">{loading ? "Loading halls…" : "No halls available"}</option>}
                {properties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Room type" htmlFor="room-kind">
                <select id="room-kind" required value={effectiveRoomKind} onChange={(event) => changeRoomType(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" disabled={!roomTypes.length}>
                  {roomTypes.map((room) => <option key={room.kind} value={room.kind}>{roomKindLabel(room.kind)}</option>)}
                </select>
              </Field>
              <Field label="Price per week" htmlFor="price">
                <div className="relative"><span className="absolute left-3 top-2.5 text-sm text-muted-foreground">£</span><Input id="price" type="number" min="1" required value={price || ""} onChange={(event) => setPriceOverride(Number(event.target.value))} className="h-10 pl-7" /></div>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Flatmates" htmlFor="flatmates">
                <Input id="flatmates" type="number" min="0" value={flatmates} onChange={(event) => setFlatmatesOverride(Number(event.target.value))} className="h-10" />
              </Field>
              <Field label="Contract length" htmlFor="contract-weeks">
                <select id="contract-weeks" value={contractWeeks} onChange={(event) => setContractWeeksOverride(Number(event.target.value))} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                  {[...new Set([...(selectedRoom?.contractWeeks ?? []), contractWeeks])].sort((a, b) => a - b).map((weeks) => <option key={weeks} value={weeks}>{weeks} weeks</option>)}
                </select>
              </Field>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Info className="size-3.5 shrink-0" /> Price, flatmates and contract length start with the hall’s room details. You can adjust them before posting.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Contract dates</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Field label="Move-in" htmlFor="start-date"><Input id="start-date" type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} className="h-10" /></Field>
            <Field label="Move-out" htmlFor="end-date"><Input id="end-date" type="date" required value={endDate} onChange={(event) => setEndDate(event.target.value)} className="h-10" /></Field>
          </CardContent>
        </Card>

        {kind === "swap" && (
          <Card>
            <CardHeader>
              <CardTitle>What would you like instead?</CardTitle>
              <p className="text-xs text-muted-foreground">These preferences are used to find reciprocal matches.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Halls you would consider</legend>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
                  {otherProperties.map((item) => (
                    <label key={item.id} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-muted/70">
                      <input type="checkbox" checked={wantedPropertyIds.includes(item.id)} onChange={() => toggleProperty(item.id)} className="size-4 accent-primary" />
                      <span className="flex-1 truncate">{item.name}</span>
                      <span className="text-xs text-muted-foreground">{item.provider}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Room types you would consider</legend>
                <div className="flex flex-wrap gap-2">
                  {ROOM_KINDS.map((room) => {
                    const selected = wantedRoomKinds.includes(room);
                    return <button key={room} type="button" aria-pressed={selected} onClick={() => toggleRoomType(room)} className={`inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-xs font-medium ${selected ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground hover:bg-muted"}`}>{selected && <Check className="size-3" />}{roomKindLabel(room)}</button>;
                  })}
                </div>
              </fieldset>
              <Field label="Maximum price you would pay each week" htmlFor="max-price">
                <div className="relative max-w-xs"><span className="absolute left-3 top-2.5 text-sm text-muted-foreground">£</span><Input id="max-price" type="number" min="1" required value={maxWantedPrice} onChange={(event) => setMaxWantedPrice(Number(event.target.value))} className="h-10 pl-7" /></div>
              </Field>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Photos and details</CardTitle>
            <p className="text-xs text-muted-foreground">Clear, well-lit photos help students picture the room.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <label htmlFor="photos" className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed bg-muted/30 text-sm hover:bg-muted/60">
              <ImagePlus className="size-5 text-primary" />
              <span className="font-medium">Add photos <span className="font-normal text-muted-foreground">({photos.length}/3)</span></span>
              <span className="text-xs text-muted-foreground">JPG, PNG or WebP · up to 600 KB each</span>
            </label>
            <input id="photos" type="file" accept="image/*" multiple onChange={addPhotos} className="sr-only" />
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo, index) => (
                  <div key={`${index}-${photo.slice(-16)}`} className="relative aspect-square rounded-lg bg-cover bg-center" style={{ backgroundImage: `url("${photo}")` }}>
                  <Button type="button" variant="outline" size="icon" aria-label="Remove photo" onClick={() => { setPhotos((current) => current.filter((_, i) => i !== index)); setPhotoFiles((current) => current.filter((_, i) => i !== index)); }} className="absolute right-1 top-1 size-7 rounded-full bg-white/90"><X className="size-3.5" /></Button>
                  </div>
                ))}
              </div>
            )}
            <Field label="Tell students about the room" htmlFor="description">
              <Textarea id="description" required minLength={20} maxLength={700} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What do you like about the room, the hall or the area?" className="min-h-28" />
              <span className="text-right text-xs text-muted-foreground">{description.length}/700</span>
            </Field>
          </CardContent>
        </Card>

        <div className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
          <Badge variant="secondary" className="mb-1">Demo mode</Badge>
          <p>This first version saves your listing in this browser. It will connect to your student account when the listings service is ready.</p>
        </div>
        <Button type="submit" className="h-11 w-full text-sm font-semibold" disabled={busy || loading || !property}>
          {busy ? "Saving your room…" : kind === "swap" ? "Publish swap listing" : "Publish contract release"}
        </Button>
      </form>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
