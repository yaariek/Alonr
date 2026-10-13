'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { SlidersHorizontal } from 'lucide-react';

export interface FilterState {
maxPrice: number;
cateredOnly: boolean;
reception24h: boolean;
accessibleOnly: boolean;
}

interface FilterSheetProps {
filters: FilterState;
onChange: (filters: FilterState) => void;
activeCount: number;
}

export function FilterSheet({ filters, onChange, activeCount }: FilterSheetProps) {
return (
<Sheet>
 <SheetTrigger className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground gap-2">
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
      {/* Max Weekly Budget */}
      <div>
        <div className="flex justify-between text-sm font-medium">
          <span>Max Budget</span>
          <span className="font-bold text-primary">£{filters.maxPrice}/wk</span>
        </div>
        <Slider
          value={[filters.maxPrice]}
          min={150}
          max={600}
          step={10}
          onValueChange={([val]) => onChange({ ...filters, maxPrice: val })}
          className="mt-3"
        />
      </div>

      {/* Feature Switches */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Catered Meals Included</span>
          <Switch
            checked={filters.cateredOnly}
            onCheckedChange={(val) => onChange({ ...filters, cateredOnly: val })}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">24/7 Reception / Security</span>
          <Switch
            checked={filters.reception24h}
            onCheckedChange={(val) => onChange({ ...filters, reception24h: val })}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Accessible Rooms</span>
          <Switch
            checked={filters.accessibleOnly}
            onCheckedChange={(val) => onChange({ ...filters, accessibleOnly: val })}
          />
        </div>
      </div>
    </div>
  </SheetContent>
</Sheet>
);
}
