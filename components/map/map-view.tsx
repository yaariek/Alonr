'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { FilterSheet, GroupChips } from '@/components/filters';
import { SAMPLE_PROPERTIES } from '@/lib/sample-data';
import { filterProperties } from '@/lib/filters';

export function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);

  const [selectedProvider, setSelectedProvider] = useState('All');
  const [filters, setFilters] = useState({
    maxPrice: 600,
    cateredOnly: false,
    reception24h: false,
    accessibleOnly: false,
  });

  // Calculate active filter count for the badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.maxPrice < 600) count++;
    if (filters.cateredOnly) count++;
    if (filters.reception24h) count++;
    if (filters.accessibleOnly) count++;
    return count;
  }, [filters]);

  // Apply filter functions to sample dataset
  const filteredProperties = useMemo(() => {
    let list = filterProperties(SAMPLE_PROPERTIES, filters);
    if (selectedProvider !== 'All') {
      list = list.filter((p) => p.provider_id === selectedProvider);
    }
    return list;
  }, [filters, selectedProvider]);

  // Initialize MapLibre GL map on mount
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json', // Vector style tile endpoint
      center: [-0.1276, 51.5074], // Central London coordinates
      zoom: 12,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    return () => {
      map.current?.remove();
    };
  }, []);

  // Sync map markers whenever filteredProperties changes
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markers.current.forEach((m) => m.remove());
    markers.current = [];

    // Add new markers for filtered properties
    filteredProperties.forEach((prop) => {
      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(
        \<div style="padding: 4px;">
          <strong style="font-size: 14px;">\</strong><br/>
          <span style="font-size: 12px; color: #666;">\</span><br/>
          <strong style="font-size: 13px; color: #2563eb;">From £\/wk</strong>
        </div>\
      );

      const marker = new maplibregl.Marker({ color: '#2563eb' })
        .setLngLat([prop.lng, prop.lat])
        .setPopup(popup)
        .addTo(map.current!);

      markers.current.push(marker);
    });
  }, [filteredProperties]);

  return (
    <div className="relative h-screen w-full">
      {/* Top Overlay Filter Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-col gap-2 bg-background/80 p-3 backdrop-blur-md rounded-2xl shadow-md">
        <div className="flex items-center justify-between gap-2 overflow-hidden">
          <GroupChips selected={selectedProvider} onSelect={setSelectedProvider} />
          <FilterSheet
            filters={filters}
            onChange={setFilters}
            activeCount={activeFilterCount}
          />
        </div>
      </div>

      {/* MapLibre Canvas Container */}
      <div ref={mapContainer} className="h-full w-full" />
    </div>
  );
}
