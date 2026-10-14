'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection, Point } from 'geojson';
import { FilterSheet, GroupChips } from '@/components/filters';
import { useProperties } from '@/lib/data/use-properties';
import { minPrice } from '@/lib/filters';
import { PROVIDER_COLOURS } from '@/lib/sample-data';
import { usePropertyFilters } from '@/lib/use-property-filters';

// MapLibre v6 loads its worker from next to its own script, which breaks once Next bundles it.
// The worker is copied to public/ by the "postinstall" script in package.json.
maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');

// Free vector tiles with London streets (no API key)
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const PROPERTY_SOURCE = 'property-points';
const CLUSTER_LAYER = 'property-clusters';
const CLUSTER_COUNT_LAYER = 'property-cluster-count';
const PROPERTY_LAYER = 'property-points-unclustered';

interface PropertyFeatureProperties {
  id: string;
  name: string;
  provider: string;
  colour: string;
  priceLabel: string;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const locationMarker = useRef<maplibregl.Marker | null>(null);

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

  const propertyFeatures = useMemo<FeatureCollection<Point, PropertyFeatureProperties>>(() => ({
    type: 'FeatureCollection',
    features: filteredProperties.map((property) => {
      const price = minPrice(property);
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [property.lng, property.lat] },
        properties: {
          id: property.id,
          name: property.name,
          provider: property.provider,
          colour: PROVIDER_COLOURS[property.provider] ?? PROVIDER_COLOURS.Other,
          priceLabel: price === null ? 'Prices coming soon' : `From £${price}/wk`,
        },
      };
    }),
  }), [filteredProperties]);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: [-0.1276, 51.5074],
      zoom: 12,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    const addPropertyLayers = () => {
      const activeMap = map.current;
      if (!activeMap || activeMap.getSource(PROPERTY_SOURCE)) return;

      activeMap.addSource(PROPERTY_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterRadius: 48,
        clusterMaxZoom: 14,
      });

      activeMap.addLayer({
        id: CLUSTER_LAYER,
        type: 'circle',
        source: PROPERTY_SOURCE,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#1f2f4a',
          'circle-radius': ['step', ['get', 'point_count'], 18, 10, 22, 30, 27],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      activeMap.addLayer({
        id: CLUSTER_COUNT_LAYER,
        type: 'symbol',
        source: PROPERTY_SOURCE,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['Open Sans Bold'],
          'text-size': 12,
        },
        paint: { 'text-color': '#ffffff' },
      });

      activeMap.addLayer({
        id: PROPERTY_LAYER,
        type: 'circle',
        source: PROPERTY_SOURCE,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['get', 'colour'],
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      activeMap.on('click', CLUSTER_LAYER, (event) => {
        const feature = activeMap.queryRenderedFeatures(event.point, { layers: [CLUSTER_LAYER] })[0];
        const clusterId = feature?.properties?.cluster_id;
        if (clusterId === undefined) return;

        const source = activeMap.getSource(PROPERTY_SOURCE) as maplibregl.GeoJSONSource;
        void source.getClusterExpansionZoom(Number(clusterId)).then((zoom) => {
          const coordinates = (feature.geometry as Point).coordinates as [number, number];
          activeMap.easeTo({ center: coordinates, zoom });
        });
      });

      activeMap.on('click', PROPERTY_LAYER, (event) => {
        const feature = activeMap.queryRenderedFeatures(event.point, { layers: [PROPERTY_LAYER] })[0];
        const details = feature?.properties as PropertyFeatureProperties | undefined;
        if (!details) return;

        const popupContent = `
          <div style="padding: 4px;">
            <strong style="font-size: 14px;">${escapeHtml(details.name)}</strong><br/>
            <span style="font-size: 12px; color: #666;">${escapeHtml(details.provider)}</span><br/>
            <strong style="font-size: 13px; color: #2563eb;">${escapeHtml(details.priceLabel)}</strong><br/>
            <a href="/property/${encodeURIComponent(details.id)}" style="display: inline-block; margin-top: 6px; font-size: 13px; font-weight: 600; text-decoration: underline;">View hall →</a>
          </div>
        `;
        const popup = new maplibregl.Popup({ offset: 12, className: 'provider-map-popup' })
          .setLngLat(event.lngLat)
          .setHTML(popupContent)
          .addTo(activeMap);
        popup.getElement().style.setProperty('--provider-pastel', details.colour);
      });

      activeMap.on('mouseenter', CLUSTER_LAYER, () => { activeMap.getCanvas().style.cursor = 'pointer'; });
      activeMap.on('mouseleave', CLUSTER_LAYER, () => { activeMap.getCanvas().style.cursor = ''; });
      activeMap.on('mouseenter', PROPERTY_LAYER, () => { activeMap.getCanvas().style.cursor = 'pointer'; });
      activeMap.on('mouseleave', PROPERTY_LAYER, () => { activeMap.getCanvas().style.cursor = ''; });
    };

    if (map.current.isStyleLoaded()) addPropertyLayers();
    else map.current.once('load', addPropertyLayers);

    return () => {
      // Clear the refs too: React re-runs this effect (dev Strict Mode, and when you come back
      // to the Map tab), and a stale ref would stop the map being recreated -> blank map.
      locationMarker.current?.remove();
      locationMarker.current = null;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const activeMap = map.current;
    if (!activeMap) return;

    const updateProperties = () => {
      const source = activeMap.getSource(PROPERTY_SOURCE) as maplibregl.GeoJSONSource | undefined;
      source?.setData(propertyFeatures);
    };

    if (activeMap.isStyleLoaded()) updateProperties();
    else activeMap.once('load', updateProperties);
    return () => { activeMap.off('load', updateProperties); };
  }, [propertyFeatures]);

  useEffect(() => {
    const activeMap = map.current;
    if (!activeMap) return;

    locationMarker.current?.remove();
    locationMarker.current = null;
    if (!filters.currentLocation) return;

    const element = document.createElement("div");
    element.setAttribute("aria-label", "Current location");
    element.title = "Current location";
    Object.assign(element.style, {
      display: "grid",
      placeItems: "center",
      width: "32px",
      height: "32px",
      borderRadius: "9999px",
      background: "white",
      border: "2px solid #315b8c",
      boxShadow: "0 0 0 7px rgb(49 91 140 / 20%), 0 2px 8px rgb(15 23 42 / 35%)",
    });
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("width", "20");
    icon.setAttribute("height", "20");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "#315b8c");
    icon.setAttribute("stroke-width", "2.5");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    const center = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    center.setAttribute("cx", "12");
    center.setAttribute("cy", "12");
    center.setAttribute("r", "3");
    const crosshairs = document.createElementNS("http://www.w3.org/2000/svg", "path");
    crosshairs.setAttribute("d", "M12 2v3m0 14v3M2 12h3m14 0h3");
    icon.append(center, crosshairs);
    element.append(icon);
    locationMarker.current = new maplibregl.Marker({ element, anchor: "center" })
      .setLngLat([filters.currentLocation.lng, filters.currentLocation.lat])
      .addTo(activeMap);
    activeMap.flyTo({ center: [filters.currentLocation.lng, filters.currentLocation.lat], zoom: 13 });
  }, [filters.currentLocation]);

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
