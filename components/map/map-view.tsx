"use client";

import { useMemo, useState } from "react";
import Map, { Layer, Marker, NavigationControl, Popup, Source } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Badge } from "@/components/ui/badge";
import { filterProperties, minPrice } from "@/lib/filters";
import { propertiesBetween } from "@/lib/geo";
import { CAMPUSES, PROVIDER_COLOURS, SAMPLE_PROPERTIES } from "@/lib/sample-data";
import type { Property, ProviderGroup } from "@/lib/types";
import { cn } from "@/lib/utils";

// Free vector tiles, no API key needed.
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const GROUPS = Object.keys(PROVIDER_COLOURS).filter((g) => g !== "Other") as ProviderGroup[];

// Starter map (Person A owns this). Uses SAMPLE data until Supabase is seeded.
export function MapView() {
  const [groups, setGroups] = useState<ProviderGroup[]>([]);
  const [between, setBetween] = useState(false);
  const [selected, setSelected] = useState<Property | null>(null);

  // Demo of "between two points" using the first two campuses (UCL Bloomsbury → UCL East).
  const [a, b] = CAMPUSES;
  const visible = useMemo(() => {
    const filtered = filterProperties(SAMPLE_PROPERTIES, { providers: groups });
    return between ? propertiesBetween(filtered, a, b, 1) : filtered;
  }, [groups, between, a, b]);

  const toggle = (g: ProviderGroup) =>
    setGroups((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));

  return (
    <div className="absolute inset-0">
      <Map
        initialViewState={{ longitude: -0.1, latitude: 51.515, zoom: 11.5 }}
        mapStyle={MAP_STYLE}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="bottom-right" />

        {between && (
          <Source
            type="geojson"
            data={{
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: [[a.lng, a.lat], [b.lng, b.lat]] },
            }}
          >
            <Layer type="line" paint={{ "line-color": "#4f46e5", "line-width": 4, "line-dasharray": [2, 1] }} />
          </Source>
        )}

        {CAMPUSES.map((c) => (
          <Marker key={c.id} longitude={c.lng} latitude={c.lat}>
            <div className="rounded bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background">
              {c.name}
            </div>
          </Marker>
        ))}

        {visible.map((p) => (
          <Marker
            key={p.id}
            longitude={p.lng}
            latitude={p.lat}
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelected(p);
            }}
          >
            <div
              className="size-4 cursor-pointer rounded-full border-2 border-white shadow"
              style={{ background: PROVIDER_COLOURS[p.provider] }}
            />
          </Marker>
        ))}

        {selected && (
          <Popup longitude={selected.lng} latitude={selected.lat} onClose={() => setSelected(null)} offset={12}>
            <div className="space-y-0.5 text-xs">
              <p className="font-semibold">{selected.name}</p>
              <p>{selected.provider} · from £{minPrice(selected)}/wk</p>
              {selected.stationName && <p>{selected.stationName} · {selected.stationM}m</p>}
            </div>
          </Popup>
        )}
      </Map>

      <div className="absolute inset-x-0 top-0 flex gap-2 overflow-x-auto p-3">
        <button onClick={() => setBetween((v) => !v)}>
          <Badge variant={between ? "default" : "outline"} className={cn(!between && "bg-background/90")}>
            {between ? "✓ " : ""}Between UCL Bloomsbury ↔ East
          </Badge>
        </button>
        {GROUPS.map((g) => (
          <button key={g} onClick={() => toggle(g)}>
            <Badge
              variant="outline"
              className={cn("bg-background/90", groups.includes(g) && "text-white")}
              style={groups.includes(g) ? { background: PROVIDER_COLOURS[g] } : undefined}
            >
              {g}
            </Badge>
          </button>
        ))}
      </div>
    </div>
  );
}
