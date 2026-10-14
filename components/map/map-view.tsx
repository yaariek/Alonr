'use client';

import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { FilterSheet, GroupChips } from '@/components/filters';
import { useProperties } from '@/lib/data/use-properties';
import { minPrice } from '@/lib/filters';
import { usePropertyFilters } from '@/lib/use-property-filters';

// MapLibre v6 loads its worker from next to its own script, which breaks once Next bundles it.
// The worker is copied to public/ by the "postinstall" script in package.json.
maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');

// Free vector tiles with London streets (no API key)
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);

  const { properties } = useProperties();
  const {
    selectedProvider,
    setSelectedProvider,
    filters,
    setFilters,
    priceBounds,
    activeFilterCount,
    filteredProperties,
  } = usePropertyFilters(properties);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: [-0.1276, 51.5074],
      zoom: 12,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    return () => {
      // Clear the refs too: React re-runs this effect (dev Strict Mode, and when you come back
      // to the Map tab), and a stale ref would stop the map being recreated -> blank map.
      markers.current = [];
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;

    markers.current.forEach((m) => m.remove());
    markers.current = [];

    filteredProperties.forEach((prop) => {
      const from = minPrice(prop);
      const popupContent = `
        <div style="padding: 4px;">
          <strong style="font-size: 14px;">${escapeHtml(prop.name)}</strong><br/>
          <span style="font-size: 12px; color: #666;">${escapeHtml(prop.provider)}</span><br/>
          <strong style="font-size: 13px; color: #2563eb;">${from === null ? 'Prices coming soon' : `From £${from}/wk`}</strong><br/>
          <a href="/property/${encodeURIComponent(prop.id)}" style="display: inline-block; margin-top: 6px; font-size: 13px; font-weight: 600; text-decoration: underline;">View hall →</a>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(popupContent);

      const marker = new maplibregl.Marker({ color: '#2563eb' })
        .setLngLat([prop.lng, prop.lat])
        .setPopup(popup)
        .addTo(map.current!);

      markers.current.push(marker);
    });
  }, [filteredProperties]);

  return (
    <div className="relative h-screen w-full">
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-col gap-2 rounded-2xl bg-background/90 p-3 shadow-md backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 overflow-hidden">
          <GroupChips selected={selectedProvider} onSelect={setSelectedProvider} />
          <FilterSheet
            filters={filters}
            priceBounds={priceBounds}
            onChange={setFilters}
            activeCount={activeFilterCount}
          />
        </div>
      </div>

      <div ref={mapContainer} className="h-full w-full" />
    </div>
  );
}
