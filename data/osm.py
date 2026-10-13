"""Offline OpenStreetMap data for London (replaces the overloaded Overpass API).

Downloads the Geofabrik Greater London extract (~130 MB, updated daily) once into
data/.cache/ and reads it locally with pyosmium.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import requests

CACHE = Path(__file__).parent / ".cache"
PBF = CACHE / "greater-london.osm.pbf"
PBF_URL = "https://download.geofabrik.de/europe/united-kingdom/england/greater-london-latest.osm.pbf"
PLACES_JSON = CACHE / "osm_places.json"


def ensure_pbf(refresh: bool = False) -> Path:
    if PBF.exists() and not refresh:
        return PBF
    CACHE.mkdir(exist_ok=True)
    print("downloading Greater London OSM extract (~130 MB)...", file=sys.stderr)
    with requests.get(PBF_URL, stream=True, timeout=60) as r:
        r.raise_for_status()
        tmp = PBF.with_suffix(".part")
        with tmp.open("wb") as f:
            for chunk in r.iter_content(1 << 20):
                f.write(chunk)
        tmp.replace(PBF)
    return PBF


def _point(o) -> tuple[float, float] | None:
    """(lat, lng) of a node, or the average of an area's outer-ring points."""
    if o.is_node():
        return (o.location.lat, o.location.lon) if o.location.valid() else None
    pts = [(n.lat, n.lon) for ring in o.outer_rings() for n in ring if n.location.valid()]
    if not pts:
        return None
    return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))


def _scan(match) -> list[dict]:
    """Every node/area whose tags satisfy match(tags), as {'tags', 'lat', 'lng'}."""
    import osmium
    fp = (osmium.FileProcessor(str(ensure_pbf()))
          .with_areas()
          .with_filter(osmium.filter.KeyFilter("building", "amenity", "residential", "shop", "railway", "station")))
    out = []
    for o in fp:
        if not (o.is_node() or o.is_area()):
            continue  # skip raw ways/relations; areas cover closed ones
        tags = dict(o.tags)
        if match(tags):
            p = _point(o)
            if p:
                out.append({"tags": tags, "lat": p[0], "lng": p[1]})
    return out


def places(refresh: bool = False) -> dict[str, list[dict]]:
    """Supermarkets + stations as {'supermarkets': [{name, lat, lng}], 'stations': [...]}, cached as JSON."""
    if PLACES_JSON.exists() and not refresh:
        return json.loads(PLACES_JSON.read_text(encoding="utf8"))
    found = _scan(lambda t: t.get("shop") == "supermarket"
                  or t.get("railway") == "station" or t.get("station") == "subway")
    result = {"supermarkets": [], "stations": []}
    for f in found:
        t = f["tags"]
        item = {"name": t.get("name") or t.get("brand") or "Unnamed", "lat": f["lat"], "lng": f["lng"]}
        result["supermarkets" if t.get("shop") == "supermarket" else "stations"].append(item)
    PLACES_JSON.write_text(json.dumps(result), encoding="utf8")
    return result


def student_halls() -> list[dict]:
    """Named student accommodation: [{name, operator, postcode, lat, lng}]."""
    found = _scan(lambda t: bool(t.get("name")) and (
        t.get("building") == "dormitory" or t.get("amenity") == "student_accommodation"
        or t.get("residential") == "university"))
    return [{"name": f["tags"]["name"].strip(), "operator": f["tags"].get("operator", ""),
             "postcode": f["tags"].get("addr:postcode", ""), "lat": f["lat"], "lng": f["lng"]} for f in found]
