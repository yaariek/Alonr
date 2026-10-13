'use client';

import { useState, useMemo } from 'react';
import { FilterSheet, GroupChips } from '@/components/filters';
import { SAMPLE_PROPERTIES } from '@/lib/sample-data';
import { filterProperties } from '@/lib/filters';

export function MapView() {
const [selectedProvider, setSelectedProvider] = useState('All');
const [filters, setFilters] = useState({
maxPrice: 600,
cateredOnly: false,
reception24h: false,
accessibleOnly: false,
});

// Count active filter toggles
const activeFilterCount = useMemo(() => {
let count = 0;
if (filters.maxPrice < 600) count++;
if (filters.cateredOnly) count++;
if (filters.reception24h) count++;
if (filters.accessibleOnly) count++;
return count;
}, [filters]);

// Apply filters to sample data
const filteredProperties = useMemo(() => {
let list = filterProperties(SAMPLE_PROPERTIES, filters);
if (selectedProvider !== 'All') {
  list = list.filter((p) => p.provider_id === selectedProvider);
}
return list;
}, [filters, selectedProvider]);

return (
<div className="relative h-screen w-full bg-slate-100">
  {/* Top Filter Overlay Bar */}
  <div className="absolute top-4 left-4 right-4 z-10 flex flex-col gap-2 bg-background/80 p-3 backdrop-blur-md rounded-2xl shadow-md">
    <div className="flex items-center justify-between gap-2">
      <GroupChips selected={selectedProvider} onSelect={setSelectedProvider} />
      <FilterSheet
        filters={filters}
        onChange={setFilters}
        activeCount={activeFilterCount}
      />
    </div>
  </div>

  {/* Map Canvas Placeholder */}
  <div className="flex h-full w-full items-center justify-center text-muted-foreground font-medium">
    Map Canvas ({filteredProperties.length} properties displayed)
  </div>
</div>
);
}
