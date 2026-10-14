"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { LocateFixed, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import type { LatLng } from "@/lib/types";

export interface FilterState {
  minPrice: number | null;
  maxPrice: number | null;
  cateredOnly: boolean;
  reception24h: boolean;
  accessibleOnly: boolean;
  currentLocation: LatLng | null;
  radiusKm: number;
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
}

export function FilterSheet({ filters, priceBounds, onChange, activeCount }: FilterSheetProps) {
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
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl px-6 py-4">
        <SheetHeader className="text-left">
          <SheetTitle>Filter Halls</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6 overflow-y-auto pb-12">
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
