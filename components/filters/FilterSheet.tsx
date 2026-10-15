"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { LocateFixed, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { roomKindLabel, universityName } from "@/lib/format";
import type { LatLng, RoomKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PROVIDER_GROUPS } from "./GroupChips";

export interface FilterState {
  minPrice: number | null;
  maxPrice: number | null;
  cateredOnly: boolean;
  reception24h: boolean;
  accessibleOnly: boolean;
  currentLocation: LatLng | null;
  radiusKm: number;
  roomKinds: RoomKind[];
  maxFlatmates: number | null;
  contractWeeks: number | null;
  maxSupermarketM: number | null;
  maxStationM: number | null;
  maxBikeDockM: number | null;
  university: string | null; // university id, e.g. "kcl"
  hasListings: boolean;
}

/** Choices that come from the data. */
export interface FilterOptions {
  contractWeeks: number[];
  roomKinds: RoomKind[]; // room types some hall has
  universities: string[]; // university ids that have their own halls
}

export interface PriceBounds {
  min: number;
  max: number;
}

interface FilterSheetProps {
  filters: FilterState;
  priceBounds: PriceBounds;
  onChange: (filters: FilterState) => void;
  activeCount: number;
  options?: FilterOptions;
  onReset?: () => void;
  providerFilter?: {
    selected: string;
    onSelect: (provider: string) => void;
    available?: string[];
  };
}

const ROOM_KINDS: RoomKind[] = ["ensuite", "studio", "shared_bathroom", "twin", "non_ensuite"];
const FLATMATES = [0, 4, 6, 8];
const WALK_M = [400, 800, 1200]; // ~5, 10, 15 min walk
const BIKE_M = [200, 400, 800];
const walkMin = (m: number) => `${Math.round(m / 80)} min`;

/** A row of single-choice pills; tapping the selected one again clears it. */
function Pills<T extends string | number>({ label, value, choices, onChange, format }: {
  label: string;
  value: T | null;
  choices: T[];
  onChange: (value: T | null) => void;
  format: (value: T) => string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {choices.map((choice) => (
        <Pill key={choice} pressed={value === choice} onClick={() => onChange(value === choice ? null : choice)}>
          {format(choice)}
        </Pill>
      ))}
    </div>
  );
}

function Pill({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        pressed ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function FilterSheet({ filters, priceBounds, onChange, activeCount, options, onReset, providerFilter }: FilterSheetProps) {
  const selectedMin = filters.minPrice ?? priceBounds.min;
  const selectedMax = filters.maxPrice ?? priceBounds.max;
  const hasPrices = priceBounds.max > priceBounds.min;
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const requestCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Location is not available in this browser.");
      return;
    }

    setLocationLoading(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onChange({ ...filters, currentLocation: { lat: coords.latitude, lng: coords.longitude } });
        setLocationLoading(false);
      },
      (error) => {
        setLocationError(error.code === error.PERMISSION_DENIED
          ? "Location access is blocked for this site. Allow it in your browser's site settings, then try again."
          : "Could not get your location. Try again.");
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 12_000 },
    );
  };

  return (
    <Sheet>
      <SheetTrigger className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
        <SlidersHorizontal className="h-4 w-4" />
        Filters
        {activeCount > 0 && (
          <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
            {activeCount}
          </span>
        )}
      </SheetTrigger>
      <SheetContent
        side={providerFilter ? "right" : "bottom"}
        className={providerFilter
          ? "h-dvh w-[min(24rem,90vw)] max-w-none rounded-none px-5 py-4"
          : "h-[85dvh] max-h-[85dvh] rounded-t-2xl px-6 py-4 data-[side=bottom]:h-[85dvh]"}
      >
        <SheetHeader className="flex-row items-center justify-between gap-3 p-0 pr-10 text-left">
          <SheetTitle>{providerFilter ? "Map filters" : "Filter Halls"}</SheetTitle>
          {onReset && activeCount > 0 && (
            <button type="button" onClick={onReset} className="text-sm font-medium text-primary underline">
              Clear all
            </button>
          )}
        </SheetHeader>

        <div className={cn("min-h-0 flex-1 space-y-6 overflow-y-auto pb-12", providerFilter ? "-mx-5 px-5" : "-mx-6 px-6")}>
          {providerFilter && (
            <Section title="Providers" hint="Show halls from one provider or all providers.">
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="Filter by provider">
                {PROVIDER_GROUPS.filter(({ value }) => value === "All" || value === providerFilter.selected || !providerFilter.available?.length || providerFilter.available.includes(value)).map(({ label, value }) => {
                  const selected = providerFilter.selected === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => providerFilter.onSelect(value)}
                      className={cn(
                        "min-h-10 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors",
                        selected ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </Section>
          )}

          <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/40">
            <div>
              <h3 className="text-sm font-semibold">Has rooms listed</h3>
              <p className="text-xs text-muted-foreground">Only halls where students are swapping or releasing a room.</p>
            </div>
            <Switch aria-label="Only halls with rooms listed" checked={filters.hasListings} onCheckedChange={(val) => onChange({ ...filters, hasListings: val })} />
          </div>

          <div>
            <div className="flex justify-between gap-3 text-sm font-medium">
              <span>Weekly price range</span>
              <span className="text-right font-bold text-primary">£{selectedMin}–£{selectedMax}/wk</span>
            </div>
            {hasPrices ? (
              <Slider
                value={[selectedMin, selectedMax]}
                min={priceBounds.min}
                max={priceBounds.max}
                step={5}
                onValueChange={(value) => {
                  if (!Array.isArray(value) || value.length < 2) return;
                  onChange({ ...filters, minPrice: value[0], maxPrice: value[1] });
                }}
                className="mt-3"
                aria-label="Weekly price range"
              />
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">Price range will be available when halls load.</p>
            )}
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>Lowest £{priceBounds.min}/wk</span>
              <span>Highest £{priceBounds.max}/wk</span>
            </div>
          </div>

          <section className="space-y-3 rounded-xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Search near me</h3>
                <p className="text-xs text-muted-foreground">
                  {filters.currentLocation
                    ? `Showing halls within ${filters.radiusKm} km of your location.`
                    : "Your browser will ask for location permission when you continue."}
                </p>
              </div>
              <button
                type="button"
                onClick={requestCurrentLocation}
                disabled={locationLoading}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-60"
              >
                <LocateFixed className="size-4 text-blue-700" />
                {locationLoading ? "Locating…" : filters.currentLocation ? "Refresh" : "Allow location"}
              </button>
            </div>
            {locationError && <p role="alert" className="text-xs text-destructive">{locationError}</p>}
            {filters.currentLocation && (
              <>
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>Radius</span>
                  <span className="font-bold text-blue-950">{filters.radiusKm} km</span>
                </div>
                <Slider
                  tone="darkBlue"
                  value={[filters.radiusKm]}
                  min={1}
                  max={25}
                  step={1}
                  onValueChange={(value) => {
                    if (Array.isArray(value) && value.length) {
                      onChange({ ...filters, radiusKm: value[0] });
                    }
                  }}
                  aria-label="Search radius in kilometres"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 km</span><span>25 km</span>
                  <button type="button" className="font-medium text-foreground underline" onClick={() => onChange({ ...filters, currentLocation: null })}>Clear location</button>
                </div>
              </>
            )}
          </section>

          <Section title="Room type">
            <div role="group" aria-label="Room type" className="flex flex-wrap gap-2">
              {ROOM_KINDS.filter((kind) => !options?.roomKinds.length || options.roomKinds.includes(kind) || filters.roomKinds.includes(kind)).map((kind) => {
                const on = filters.roomKinds.includes(kind);
                return (
                  <Pill
                    key={kind}
                    pressed={on}
                    onClick={() => onChange({ ...filters, roomKinds: on ? filters.roomKinds.filter((k) => k !== kind) : [...filters.roomKinds, kind] })}
                  >
                    {roomKindLabel(kind)}
                  </Pill>
                );
              })}
            </div>
          </Section>

          <Section title="Flatmates" hint="At most this many people sharing your flat.">
            <Pills
              label="Flatmates"
              value={filters.maxFlatmates}
              choices={FLATMATES}
              onChange={(v) => onChange({ ...filters, maxFlatmates: v })}
              format={(n) => (n === 0 ? "None (studio)" : `Up to ${n}`)}
            />
          </Section>

          {!!options?.contractWeeks.length && (
            <Section title="Contract length">
              <Pills
                label="Contract length"
                value={filters.contractWeeks}
                choices={options.contractWeeks}
                onChange={(v) => onChange({ ...filters, contractWeeks: v })}
                format={(w) => `${w} weeks`}
              />
            </Section>
          )}

          {!!options?.universities.length && (
            <Section title="My university" hint="Its own halls plus private halls open to every student.">
              <Pills
                label="My university"
                value={filters.university}
                choices={options.universities}
                onChange={(v) => onChange({ ...filters, university: v })}
                format={universityName}
              />
            </Section>
          )}

          <Section title="Walk to a supermarket">
            <Pills
              label="Walk to a supermarket"
              value={filters.maxSupermarketM}
              choices={WALK_M}
              onChange={(v) => onChange({ ...filters, maxSupermarketM: v })}
              format={(m) => `Under ${walkMin(m)}`}
            />
          </Section>

          <Section title="Walk to a station" hint="Tube, Overground, DLR or rail.">
            <Pills
              label="Walk to a station"
              value={filters.maxStationM}
              choices={WALK_M}
              onChange={(v) => onChange({ ...filters, maxStationM: v })}
              format={(m) => `Under ${walkMin(m)}`}
            />
          </Section>

          <Section title="Santander bike dock nearby">
            <Pills
              label="Santander bike dock nearby"
              value={filters.maxBikeDockM}
              choices={BIKE_M}
              onChange={(v) => onChange({ ...filters, maxBikeDockM: v })}
              format={(m) => `Within ${m} m`}
            />
          </Section>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Catered Meals Included</span>
              <Switch checked={filters.cateredOnly} onCheckedChange={(val) => onChange({ ...filters, cateredOnly: val })} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">24/7 Reception / Security</span>
              <Switch checked={filters.reception24h} onCheckedChange={(val) => onChange({ ...filters, reception24h: val })} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Accessible Rooms</span>
              <Switch checked={filters.accessibleOnly} onCheckedChange={(val) => onChange({ ...filters, accessibleOnly: val })} />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
