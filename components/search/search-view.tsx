"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Map as MapIcon, Search, SlidersHorizontal } from "lucide-react";
import { FilterSheet, GroupChips } from "@/components/filters";
import { useProperties } from "@/lib/data/use-properties";
import { minPrice } from "@/lib/filters";
import { PROVIDER_COLOURS } from "@/lib/sample-data";
import { usePropertyFilters } from "@/lib/use-property-filters";
import type { Property } from "@/lib/types";
import { HallImage } from "@/components/property/HallImage";

const money = (price: number | null) => price === null ? "Prices coming soon" : `From £${price}/wk`;
const titleCase = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function PropertyPost({ property }: { property: Property }) {
  const price = minPrice(property);
  const providerColour = PROVIDER_COLOURS[property.provider];
  const roomKinds = [...new Set(property.roomTypes.map((room) => titleCase(room.kind)))];

  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-slate-800" style={{ backgroundColor: providerColour }}>
          {property.provider.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{property.provider} student living</p>
          <p className="truncate text-xs text-muted-foreground">{property.address || property.postcode || "London"}</p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{money(price)}</span>
      </div>

      <div className="relative flex aspect-[1.25/1] items-center justify-center overflow-hidden px-6 text-white" style={{ background: `linear-gradient(145deg, ${providerColour} 0%, #fffaf7 100%)` }}>
        <HallImage propertyName={property.name} alt={`${property.name} hall`} className="z-10 object-cover" sizes="(max-width: 768px) 100vw, 640px" />
        <div className="absolute -right-10 -top-12 size-56 rounded-full border border-slate-900/10" />
        <div className="absolute -bottom-20 -left-16 size-64 rounded-full border border-slate-900/10" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="relative flex w-full max-w-sm items-end justify-center gap-4">
          <div className="mb-5 h-28 w-16 rounded-t-md bg-slate-900/10" />
          <div className="relative flex h-48 w-32 flex-col items-center justify-center rounded-t-lg border border-slate-900/10 bg-white/45 shadow-2xl backdrop-blur-sm">
            <Building2 aria-hidden="true" className="size-14 text-slate-700/80" strokeWidth={1.1} />
            <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-700/70">London halls</span>
          </div>
          <div className="mb-5 h-36 w-20 rounded-t-md bg-slate-900/10" />
        </div>
        <span className="absolute bottom-4 left-4 z-20 rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-slate-800 backdrop-blur">{property.postcode || "London"}</span>
        {property.catered && <span className="absolute right-4 top-4 z-20 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-foreground">Catered</span>}
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-tight">{property.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{property.address}{property.address && property.postcode ? ", " : ""}{property.postcode}</p>
          </div>
          <Link href={`/property/${encodeURIComponent(property.id)}`} className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">View hall</Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {roomKinds.slice(0, 3).map((kind) => <span key={kind} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{kind}</span>)}
          {property.reception24h && <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">24/7 reception</span>}
          {property.accessible && <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">Accessible</span>}
        </div>
        <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <span>{property.stationName ? `${property.stationName} · ${property.stationM === undefined ? "nearby" : `${Math.round(property.stationM)} m`}` : "Explore the area"}</span>
          <span>{property.roomTypes.length ? `${property.roomTypes.length} room ${property.roomTypes.length === 1 ? "type" : "types"}` : "Room details soon"}</span>
        </div>
      </div>
    </article>
  );
}

export function SearchView() {
  const { properties, loading, error } = useProperties();
  const {
    selectedProvider,
    setSelectedProvider,
    filters,
    setFilters,
    priceBounds,
    activeFilterCount,
    filteredProperties,
  } = usePropertyFilters(properties);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return filteredProperties;
    return filteredProperties.filter((property) => [
      property.name,
      property.provider,
      property.address,
      property.postcode,
      property.affiliatedUniversity,
      property.stationName,
      ...property.facilities,
      ...property.roomTypes.map((room) => room.kind),
    ].some((value) => value?.toLowerCase().includes(needle)));
  }, [filteredProperties, query]);

  return (
    <div className="min-h-full bg-muted/30 pb-8">
      <header className="sticky top-0 z-20 border-b bg-background/95 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">alonr</p>
              <h1 className="text-2xl font-bold tracking-tight">Find your place</h1>
            </div>
            <Link href="/map" aria-label="Open map view" className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold hover:bg-accent">
              <MapIcon className="size-4" /> Map
            </Link>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border bg-muted/60 px-3 py-2.5 focus-within:ring-2 focus-within:ring-ring">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search halls, areas, stations…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" aria-label="Search halls, areas, stations" />
            </label>
            <FilterSheet filters={filters} priceBounds={priceBounds} onChange={setFilters} activeCount={activeFilterCount} />
          </div>
          <div className="mt-3 -mx-2"><GroupChips selected={selectedProvider} onSelect={setSelectedProvider} /></div>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-3 pt-4 sm:px-4" aria-live="polite">
        <div className="mb-3 flex items-center justify-between px-1">
          <p className="text-sm font-medium">{loading ? "Finding halls…" : `${results.length} ${results.length === 1 ? "hall" : "halls"}`}</p>
          {activeFilterCount > 0 && <p className="text-xs text-muted-foreground"><SlidersHorizontal className="mr-1 inline size-3" />{activeFilterCount} filters on</p>}
        </div>
        {error ? (
          <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">{error}</div>
        ) : results.length ? (
          <div className="space-y-4">{results.map((property) => <PropertyPost key={property.id} property={property} />)}</div>
        ) : (
          <div className="rounded-2xl border bg-card px-6 py-12 text-center">
            <Search className="mx-auto size-8 text-muted-foreground" />
            <h2 className="mt-3 font-semibold">No halls found</h2>
            <p className="mt-1 text-sm text-muted-foreground">Try another search or widen your filters.</p>
          </div>
        )}
      </section>
    </div>
  );
}
