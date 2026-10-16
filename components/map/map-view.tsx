'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection, Point } from 'geojson';
import { BedDouble, UsersRound } from 'lucide-react';
import { FilterSheet } from '@/components/filters';
import { useListings } from '@/components/listings/use-listings';
import { useListingCounts } from '@/lib/data/use-listing-counts';
import { useProperties } from '@/lib/data/use-properties';
import { minPrice } from '@/lib/filters';
import { propertyImagePath } from '@/lib/property-images';
import { PROVIDER_COLOURS } from '@/lib/sample-data';
import type { RoomListing } from '@/components/listings/types';
import { usePropertyFilters } from '@/lib/use-property-filters';
import { getDemoHouseShareMapPins, type HouseShareMapPinProperties } from './house-share-map-pins';

// MapLibre v6 loads its worker from next to its own script, which breaks once Next bundles it.
// The worker is copied to public/ by the "postinstall" script in package.json.
maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');

// Free vector tiles with London streets (no API key)
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const PROPERTY_SOURCE = 'property-points';
const CLUSTER_LAYER = 'property-clusters';
const CLUSTER_COUNT_LAYER = 'property-cluster-count';
const PROPERTY_LAYER = 'property-points-unclustered';
const ROOM_SOURCE = 'shared-room-points';
const ROOM_LAYER = 'shared-room-pins';
const HOUSE_SHARE_SOURCE = 'house-share-points';
const HOUSE_SHARE_CLUSTER_LAYER = 'house-share-clusters';
const HOUSE_SHARE_CLUSTER_COUNT_LAYER = 'house-share-cluster-count';
const HOUSE_SHARE_LAYER = 'house-share-pins';
const ROOM_PIN_IMAGE = 'shared-room-pin';
const HOUSE_SHARE_PIN_IMAGE = 'house-share-pin';
const providerPinImageId = (colour: string) => `provider-pin-${colour.slice(1).toLowerCase()}`;

interface PropertyFeatureProperties {
  id: string;
  name: string;
  imagePath: string;
  provider: string;
  iconImage: string;
  priceLabel: string;
  listingCount: number;
}

interface RoomFeatureProperties {
  id: string;
  propertyName: string;
  roomKind: string;
  kind: RoomListing['kind'];
  priceWeek: number;
}

const EMPTY_PROPERTY_FEATURES: FeatureCollection<Point, PropertyFeatureProperties> = { type: 'FeatureCollection', features: [] };
const EMPTY_ROOM_FEATURES: FeatureCollection<Point, RoomFeatureProperties> = { type: 'FeatureCollection', features: [] };
const DEMO_HOUSESHARE_FEATURES = getDemoHouseShareMapPins();

function createProviderPinImage(colour: string): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = 54;
  canvas.height = 82;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create the map pin image.');

  context.scale(2, 2);

  // Match MapLibre's built-in Marker silhouette, shadow, outline and white center.
  const shadowRadii: [number, number][] = [
    [10.5, 5.25002273], [10.5, 5.25002273], [9.5, 4.77275007], [8.5, 4.29549936],
    [7.5, 3.81822308], [6.5, 3.34094679], [5.5, 2.86367051], [4.5, 2.38636864],
  ];
  shadowRadii.forEach(([radiusX, radiusY]) => {
    context.beginPath();
    context.ellipse(13.5, 34.80029008, radiusX, radiusY, 0, 0, Math.PI * 2);
    context.fillStyle = 'rgb(0 0 0 / 4%)';
    context.fill();
  });

  context.beginPath();
  context.moveTo(27, 13.5);
  context.bezierCurveTo(27, 19.074644, 20.250001, 27.000002, 14.75, 34.500002);
  context.bezierCurveTo(14.016665, 35.500004, 12.983335, 35.500004, 12.25, 34.500002);
  context.bezierCurveTo(6.7499993, 27.000002, 0, 19.222562, 0, 13.5);
  context.bezierCurveTo(0, 6.0441559, 6.0441559, 0, 13.5, 0);
  context.bezierCurveTo(20.955844, 0, 27, 6.0441559, 27, 13.5);
  context.closePath();
  context.fillStyle = colour;
  context.fill();
  context.strokeStyle = 'rgb(0 0 0 / 25%)';
  context.lineWidth = 0.75;
  context.stroke();

  context.beginPath();
  context.arc(13.5, 13.5, 5.4999962, 0, Math.PI * 2);
  context.fillStyle = 'rgb(0 0 0 / 25%)';
  context.fill();

  context.beginPath();
  context.arc(13.5, 13.5, 5.4999962, 0, Math.PI * 2);
  context.fillStyle = '#ffffff';
  context.fill();

  return context.getImageData(0, 0, canvas.width, canvas.height);
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const locationMarker = useRef<maplibregl.Marker | null>(null);

  const { properties } = useProperties();
  const { listings } = useListings();
  const listingCounts = useListingCounts();
  const [showSharedRoomPins, setShowSharedRoomPins] = useState(true);
  const [showHouseSharePins, setShowHouseSharePins] = useState(true);
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
  const resetMapFilters = () => {
    resetFilters();
    setSelectedProvider('All');
  };

  const propertyFeatures = useMemo<FeatureCollection<Point, PropertyFeatureProperties>>(() => {
    if (!showSharedRoomPins) return EMPTY_PROPERTY_FEATURES;

    return {
      type: 'FeatureCollection',
      features: filteredProperties.map((property) => {
        const price = minPrice(property);
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [property.lng, property.lat] },
          properties: {
            id: property.id,
            name: property.name,
            imagePath: propertyImagePath(property.name),
            provider: property.provider,
            iconImage: providerPinImageId(PROVIDER_COLOURS[property.provider] ?? PROVIDER_COLOURS.Other),
            priceLabel: price === null ? 'Prices coming soon' : `From £${price}/wk`,
            listingCount: listingCounts.get(property.id) ?? 0,
          },
        };
      }),
    };
  }, [filteredProperties, listingCounts, showSharedRoomPins]);

  const roomFeatures = useMemo<FeatureCollection<Point, RoomFeatureProperties>>(() => {
    if (!showSharedRoomPins) return EMPTY_ROOM_FEATURES;
    const propertiesById = new Map(properties.map((property) => [property.id, property]));
    return {
      type: 'FeatureCollection',
      features: listings.filter((listing) => (listing.status ?? 'active') === 'active').flatMap((listing) => {
        const property = propertiesById.get(listing.propertyId);
        if (!property) return [];
        return [{
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [property.lng, property.lat] as [number, number] },
          properties: {
            id: listing.id,
            propertyName: listing.propertyName,
            roomKind: listing.roomKind.replaceAll('_', ' '),
            kind: listing.kind,
            priceWeek: listing.priceWeek,
          },
        }];
      }),
    };
  }, [listings, properties, showSharedRoomPins]);

  const houseShareFeatures = showHouseSharePins ? DEMO_HOUSESHARE_FEATURES : null;

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

      for (const colour of new Set(Object.values(PROVIDER_COLOURS))) {
        const imageId = providerPinImageId(colour);
        if (!activeMap.hasImage(imageId)) {
          activeMap.addImage(imageId, createProviderPinImage(colour), { pixelRatio: 2 });
        }
      }
      if (!activeMap.hasImage(ROOM_PIN_IMAGE)) activeMap.addImage(ROOM_PIN_IMAGE, createProviderPinImage('#315b8c'), { pixelRatio: 2 });
      if (!activeMap.hasImage(HOUSE_SHARE_PIN_IMAGE)) activeMap.addImage(HOUSE_SHARE_PIN_IMAGE, createProviderPinImage('#2f7f86'), { pixelRatio: 2 });

      activeMap.addSource(PROPERTY_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterRadius: 48,
        clusterMaxZoom: 14,
      });
      activeMap.addSource(ROOM_SOURCE, { type: 'geojson', data: EMPTY_ROOM_FEATURES });
      activeMap.addSource(HOUSE_SHARE_SOURCE, {
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
          'text-font': ['Noto Sans Bold'],
          'text-size': 12,
        },
        paint: { 'text-color': '#ffffff' },
      });

      activeMap.addLayer({
        id: PROPERTY_LAYER,
        type: 'symbol',
        source: PROPERTY_SOURCE,
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': ['get', 'iconImage'],
          'icon-anchor': 'bottom',
          'icon-size': 1,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
      });

      activeMap.addLayer({
        id: ROOM_LAYER,
        type: 'symbol',
        source: ROOM_SOURCE,
        layout: { 'icon-image': ROOM_PIN_IMAGE, 'icon-anchor': 'bottom', 'icon-offset': [20, 0], 'icon-size': 0.85, 'icon-allow-overlap': true, 'icon-ignore-placement': true },
      });
      activeMap.addLayer({
        id: HOUSE_SHARE_CLUSTER_LAYER,
        type: 'circle',
        source: HOUSE_SHARE_SOURCE,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#0f766e',
          'circle-radius': ['step', ['get', 'point_count'], 18, 10, 22, 30, 27],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      activeMap.addLayer({
        id: HOUSE_SHARE_CLUSTER_COUNT_LAYER,
        type: 'symbol',
        source: HOUSE_SHARE_SOURCE,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 12,
        },
        paint: { 'text-color': '#ffffff' },
      });

      activeMap.addLayer({
        id: HOUSE_SHARE_LAYER,
        type: 'symbol',
        source: HOUSE_SHARE_SOURCE,
        filter: ['!', ['has', 'point_count']],
        layout: { 'icon-image': HOUSE_SHARE_PIN_IMAGE, 'icon-anchor': 'bottom', 'icon-offset': [20, 0], 'icon-size': 0.85, 'icon-allow-overlap': true, 'icon-ignore-placement': true },
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

      activeMap.on('click', HOUSE_SHARE_CLUSTER_LAYER, (event) => {
        const feature = activeMap.queryRenderedFeatures(event.point, { layers: [HOUSE_SHARE_CLUSTER_LAYER] })[0];
        const clusterId = feature?.properties?.cluster_id;
        if (clusterId === undefined) return;

        const source = activeMap.getSource(HOUSE_SHARE_SOURCE) as maplibregl.GeoJSONSource;
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
            <img src="${details.imagePath}" alt="${escapeHtml(details.name)}" onerror="this.style.display='none'" style="display:block;width:220px;height:132px;object-fit:contain;background:#fff;border-radius:8px;margin-bottom:8px;" />
            <strong style="font-size: 14px;">${escapeHtml(details.name)}</strong><br/>
            <span style="font-size: 12px; color: #666;">${escapeHtml(details.provider)}</span><br/>
            <strong style="font-size: 13px; color: #2563eb;">${escapeHtml(details.priceLabel)}</strong><br/>
            ${details.listingCount > 0 ? `<span style="display: inline-block; margin-top: 4px; font-size: 12px; font-weight: 600; color: #be123c;">${details.listingCount} ${details.listingCount === 1 ? 'room' : 'rooms'} listed by students</span><br/>` : ''}
            <a href="/property/${encodeURIComponent(details.id)}" style="display: inline-block; margin-top: 6px; font-size: 13px; font-weight: 600; text-decoration: underline;">View hall →</a>
          </div>
        `;
        new maplibregl.Popup({ offset: 12, className: 'provider-map-popup' })
          .setLngLat(event.lngLat)
          .setHTML(popupContent)
          .addTo(activeMap);
      });

      activeMap.on('click', ROOM_LAYER, (event) => {
        const feature = activeMap.queryRenderedFeatures(event.point, { layers: [ROOM_LAYER] })[0];
        const details = feature?.properties as RoomFeatureProperties | undefined;
        if (!details) return;
        const kind = details.kind === 'swap' ? 'Swap' : 'Contract release';
        const popupContent = `<div style="padding:4px"><strong style="font-size:14px">${escapeHtml(details.propertyName)}</strong><br/><span style="font-size:12px;color:#666">${escapeHtml(kind)} · ${escapeHtml(details.roomKind)}</span><br/><strong style="font-size:13px;color:#2563eb">£${details.priceWeek}/wk</strong><br/><a href="/listings/${encodeURIComponent(details.id)}" style="display:inline-block;margin-top:6px;font-size:13px;font-weight:600;text-decoration:underline">View room →</a></div>`;
        new maplibregl.Popup({ offset: 12, className: 'provider-map-popup' }).setLngLat(event.lngLat).setHTML(popupContent).addTo(activeMap);
      });

      activeMap.on('click', HOUSE_SHARE_LAYER, (event) => {
        const feature = activeMap.queryRenderedFeatures(event.point, { layers: [HOUSE_SHARE_LAYER] })[0];
        const details = feature?.properties as HouseShareMapPinProperties | undefined;
        if (!details) return;
        const popupContent = `<div style="padding:4px"><strong style="font-size:14px">${escapeHtml(details.name)}</strong><br/><span style="font-size:12px;color:#666">Fictional private flat · ${escapeHtml(details.area)}</span><br/><strong style="font-size:13px;color:#2563eb">Budget £${details.budget}/wk</strong><br/><span style="font-size:12px;color:#666">${details.seeking} seeking · ${details.tenants} total tenants</span><br/><a href="/houseshare" style="display:inline-block;margin-top:6px;font-size:13px;font-weight:600;text-decoration:underline">Open House Share →</a></div>`;
        new maplibregl.Popup({ offset: 12, className: 'provider-map-popup' }).setLngLat(event.lngLat).setHTML(popupContent).addTo(activeMap);
      });

      activeMap.on('mouseenter', CLUSTER_LAYER, () => { activeMap.getCanvas().style.cursor = 'pointer'; });
      activeMap.on('mouseleave', CLUSTER_LAYER, () => { activeMap.getCanvas().style.cursor = ''; });
      activeMap.on('mouseenter', HOUSE_SHARE_CLUSTER_LAYER, () => { activeMap.getCanvas().style.cursor = 'pointer'; });
      activeMap.on('mouseleave', HOUSE_SHARE_CLUSTER_LAYER, () => { activeMap.getCanvas().style.cursor = ''; });
      activeMap.on('mouseenter', PROPERTY_LAYER, () => { activeMap.getCanvas().style.cursor = 'pointer'; });
      activeMap.on('mouseleave', PROPERTY_LAYER, () => { activeMap.getCanvas().style.cursor = ''; });
      activeMap.on('mouseenter', ROOM_LAYER, () => { activeMap.getCanvas().style.cursor = 'pointer'; });
      activeMap.on('mouseleave', ROOM_LAYER, () => { activeMap.getCanvas().style.cursor = ''; });
      activeMap.on('mouseenter', HOUSE_SHARE_LAYER, () => { activeMap.getCanvas().style.cursor = 'pointer'; });
      activeMap.on('mouseleave', HOUSE_SHARE_LAYER, () => { activeMap.getCanvas().style.cursor = ''; });
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
    const updateRoomPins = () => (activeMap.getSource(ROOM_SOURCE) as maplibregl.GeoJSONSource | undefined)?.setData(roomFeatures);
    if (activeMap.isStyleLoaded()) updateRoomPins();
    else activeMap.once('load', updateRoomPins);
    return () => { activeMap.off('load', updateRoomPins); };
  }, [roomFeatures]);

  useEffect(() => {
    const activeMap = map.current;
    if (!activeMap) return;
    const data = houseShareFeatures ?? { type: 'FeatureCollection' as const, features: [] };
    const updateHouseSharePins = () => (activeMap.getSource(HOUSE_SHARE_SOURCE) as maplibregl.GeoJSONSource | undefined)?.setData(data);
    if (activeMap.isStyleLoaded()) updateHouseSharePins();
    else activeMap.once('load', updateHouseSharePins);
    return () => { activeMap.off('load', updateHouseSharePins); };
  }, [houseShareFeatures]);

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
      <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-1.5 sm:gap-2">
        <button
          type="button"
          aria-pressed={showSharedRoomPins}
          onClick={() => setShowSharedRoomPins((visible) => !visible)}
          className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-2 text-xs font-semibold shadow-md backdrop-blur transition-colors sm:h-10 sm:gap-2 sm:px-3 sm:text-sm ${showSharedRoomPins ? 'border-blue-800 bg-blue-800 text-white' : 'border-background/80 bg-background/95 text-foreground hover:bg-accent'}`}
        >
          <BedDouble className="size-3.5 sm:size-4" /> Rooms
        </button>
        <button
          type="button"
          aria-pressed={showHouseSharePins}
          onClick={() => setShowHouseSharePins((visible) => !visible)}
          className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-2 text-xs font-semibold shadow-md backdrop-blur transition-colors sm:h-10 sm:gap-2 sm:px-3 sm:text-sm ${showHouseSharePins ? 'border-teal-800 bg-teal-800 text-white' : 'border-background/80 bg-background/95 text-foreground hover:bg-accent'}`}
        >
          <UsersRound className="size-3.5 sm:size-4" /> House Share
        </button>
      </div>
      <div className="absolute right-4 top-4 z-10">
          <FilterSheet
            filters={filters}
            priceBounds={priceBounds}
            onChange={setFilters}
            activeCount={activeFilterCount + (selectedProvider === 'All' ? 0 : 1)}
            options={options}
            onReset={resetMapFilters}
            providerFilter={{ selected: selectedProvider, onSelect: setSelectedProvider, available: availableProviders }}
          />
      </div>

      <div ref={mapContainer} className="h-full w-full" />
    </div>
  );
}
