"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, LayoutGrid, List, Search, SlidersHorizontal } from "lucide-react";
import { FilterSheet, GroupChips } from "@/components/filters";
import { useListingCounts } from "@/lib/data/use-listing-counts";
import { useProperties } from "@/lib/data/use-properties";
import { minPrice } from "@/lib/filters";
import { PROVIDER_COLOURS } from "@/lib/sample-data";
import { usePropertyFilters } from "@/lib/use-property-filters";
import type { Property } from "@/lib/types";
import { HallImage } from "@/components/property/HallImage";
import { cn } from "@/lib/utils";

const money = (price: number | null) => price === null ? "Prices coming soon" : `From £${price}/wk`;
const titleCase = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function PropertyPost({ property, listingCount, eager }: { property: Property; listingCount: number; eager?: boolean }) {
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
        <HallImage propertyName={property.name} alt={`${property.name} hall`} className="z-10 bg-white object-contain" sizes="(max-width: 768px) 100vw, 640px" eager={eager} />
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
        {listingCount > 0 && <span className="absolute left-4 top-4 z-20 rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">{listingCount} {listingCount === 1 ? "room" : "rooms"} listed</span>}
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

export function SearchView({ embedded = false }: { embedded?: boolean } = {}) {
  const { properties, loading, error } = useProperties();
  const listingCounts = useListingCounts();
  const {
    selectedProvider,
    setSelectedProvider,
    filters,
    setFilters,
    priceBounds,
    options,
    availableProviders,
    activeFilterCount,
    filteredProperties,
    resetFilters,
  } = usePropertyFilters(properties, listingCounts);
  const [query, setQuery] = useState("");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [gridColumns, setGridColumns] = useState<2 | 3 | 4>(3);

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
  const gridClass = layout === "list"
    ? "mx-auto grid max-w-3xl grid-cols-1 gap-4"
    : `grid gap-4 ${gridColumns === 2 ? "grid-cols-1 sm:grid-cols-2" : gridColumns === 3 ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"}`;

  return (
    <div className={embedded ? "pb-2" : "min-h-full bg-muted/30 pb-8"}>
      <header className="sticky top-0 z-20 border-b bg-background/95 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="mx-auto max-w-screen-2xl">
          {!embedded && <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">alonr</p>
            <h1 className="text-2xl font-bold tracking-tight">Find your place</h1>
          </div>}
          {embedded && <h2 className="mb-3 text-sm font-semibold">Find a student hall</h2>}
          <div className="flex items-center gap-2">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border bg-muted/60 px-3 py-2.5 focus-within:ring-2 focus-within:ring-ring">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search halls, areas, stations…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" aria-label="Search halls, areas, stations" />
            </label>
            <FilterSheet filters={filters} priceBounds={priceBounds} onChange={setFilters} activeCount={activeFilterCount} options={options} onReset={resetFilters} />
          </div>
          <div className="mt-3 -mx-2"><GroupChips selected={selectedProvider} onSelect={setSelectedProvider} available={availableProviders} /></div>
        </div>
      </header>

      <section className="mx-auto max-w-screen-2xl px-3 pt-4 sm:px-4" aria-live="polite">
        <div className="mb-3 flex items-center justify-between px-1">
          <p className="text-sm font-medium">{loading ? "Finding halls…" : `${results.length} ${results.length === 1 ? "hall" : "halls"}`}</p>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && <p className="text-xs text-muted-foreground"><SlidersHorizontal className="mr-1 inline size-3" />{activeFilterCount} filters on</p>}
            <div className="flex rounded-lg border bg-background p-0.5" role="group" aria-label="Hall layout">
              <button type="button" aria-label="Grid layout" aria-pressed={layout === "grid"} onClick={() => setLayout("grid")} className={cn("inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium", layout === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
                <LayoutGrid className="size-3.5" /> Grid
              </button>
              <button type="button" aria-label="List layout" aria-pressed={layout === "list"} onClick={() => setLayout("list")} className={cn("inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium", layout === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
                <List className="size-3.5" /> List
              </button>
            </div>
            {layout === "grid" && (
              <div className="hidden rounded-lg border bg-background p-0.5 xl:flex" role="group" aria-label="Hall grid columns">
                {([2, 3, 4] as const).map((columns) => (
                  <button key={columns} type="button" aria-label={`${columns} columns`} aria-pressed={gridColumns === columns} onClick={() => setGridColumns(columns)} className={cn("size-8 rounded-md text-xs font-medium", gridColumns === columns ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
                    {columns}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {error ? (
          <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">{error}</div>
        ) : results.length ? (
          <div className={gridClass}>{results.map((property, index) => <PropertyPost key={property.id} property={property} listingCount={listingCounts.get(property.id) ?? 0} eager={index < 2} />)}</div>
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
