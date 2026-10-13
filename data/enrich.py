"""Turn data/properties.csv into data/properties.enriched.json.

    python data/enrich.py            # uses cached API responses in data/.cache/ when present
    python data/enrich.py --refresh  # re-download everything

CSV: one row per room type (the same hall repeats). Lists are separated by ';'.
Adds per hall: lat/lng + borough (postcodes.io), nearest supermarket + station
(OpenStreetMap Overpass), nearest Santander Cycles dock (TfL BikePoint).
Each API is called once in bulk, never once per hall.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
import sys
from pathlib import Path

import requests

DATA = Path(__file__).parent
CSV_PATH = DATA / "properties.csv"
OUT_PATH = DATA / "properties.enriched.json"
CACHE = DATA / ".cache"
HEADERS = {"User-Agent": "alonr-hackathon/0.1 (student project)"}
OVERPASS_MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]

ROOM_KINDS = {"ensuite", "studio", "shared_bathroom", "twin", "non_ensuite"}
# CSV provider name (case-insensitive) -> providers.id in Supabase
PROVIDERS = {"unite": "unite", "iq": "iq", "chapter": "chapter", "scape": "scape",
             "prestige": "prestige", "ucl": "ucl", "kcl": "kcl", "imperial": "imperial"}


class CsvError(ValueError):
    pass


# ───────────── pure helpers (tested in data/tests) ─────────────

def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> int:
    r = 6_371_000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return round(2 * r * math.asin(math.sqrt(a)))


def nearest(lat: float, lng: float, places: list[dict]) -> tuple[dict | None, int | None]:
    """places: [{'name', 'lat', 'lng'}]. Returns (place, metres)."""
    best, best_m = None, None
    for p in places:
        m = haversine_m(lat, lng, p["lat"], p["lng"])
        if best_m is None or m < best_m:
            best, best_m = p, m
    return best, best_m


def _bool(value: str, row: int, col: str) -> bool:
    v = value.strip().lower()
    if v in ("true", "yes", "y", "1"):
        return True
    if v in ("false", "no", "n", "0", ""):
        return False
    raise CsvError(f"row {row}: {col} must be true/false, got {value!r}")


def _list(value: str) -> list[str]:
    return [x.strip() for x in value.split(";") if x.strip()]


def group_rows(rows: list[dict]) -> tuple[list[dict], list[str]]:
    """Group CSV rows (one per room type) into halls. Returns (properties, warnings)."""
    halls: dict[str, dict] = {}
    warnings: list[str] = []
    for i, r in enumerate(rows, start=2):  # row 1 is the header
        name = (r.get("name") or "").strip()
        if not name:
            continue  # blank line
        kind = (r.get("room_kind") or "").strip().lower()
        if kind not in ROOM_KINDS:
            raise CsvError(f"row {i} ({name}): room_kind must be one of {sorted(ROOM_KINDS)}, got {kind!r}")
        try:
            price = float(r["price_week"])
            flatmates = int(r.get("flatmates") or 0)
            weeks = [int(w) for w in _list(r.get("contract_weeks") or "")]
        except ValueError as e:
            raise CsvError(f"row {i} ({name}): bad number ({e})") from None

        provider_raw = (r.get("provider") or "").strip()
        provider = PROVIDERS.get(provider_raw.lower())
        if provider is None:
            warnings.append(f"row {i} ({name}): unknown provider {provider_raw!r} -> 'other'")
            provider = "other"

        slug = slugify(name)
        hall = halls.get(slug)
        if hall is None:
            hall = halls[slug] = {
                "slug": slug,
                "name": name,
                "provider_id": provider,
                "affiliated_university_id": (r.get("affiliated_university") or "").strip().lower() or None,
                "address": (r.get("address") or "").strip() or None,
                "postcode": (r.get("postcode") or "").strip().upper() or None,
                "reception_24h": _bool(r.get("reception_24h") or "", i, "reception_24h"),
                "accessible": _bool(r.get("accessible") or "", i, "accessible"),
                "catered": _bool(r.get("catered") or "", i, "catered"),
                "facilities": _list(r.get("facilities") or ""),
                "website": (r.get("website") or "").strip() or None,
                "room_types": [],
            }
        if any(rt["kind"] == kind for rt in hall["room_types"]):
            warnings.append(f"row {i} ({name}): duplicate room_kind {kind!r}, keeping the first")
            continue
        hall["room_types"].append(
            {"kind": kind, "price_week": price, "flatmates": flatmates, "contract_weeks": weeks})
    return list(halls.values()), warnings


# ───────────── API calls (cached) ─────────────

def _cached(name: str, fetch, refresh: bool):
    path = CACHE / name
    if path.exists() and not refresh:
        return json.loads(path.read_text(encoding="utf8"))
    data = fetch()
    CACHE.mkdir(exist_ok=True)
    path.write_text(json.dumps(data), encoding="utf8")
    return data


def geocode(postcodes: list[str]) -> dict[str, dict]:
    """Bulk postcodes.io lookup (100 per request). Returns {POSTCODE: {lat, lng, borough}}."""
    out = {}
    for i in range(0, len(postcodes), 100):
        res = requests.post("https://api.postcodes.io/postcodes",
                            json={"postcodes": postcodes[i:i + 100]}, headers=HEADERS, timeout=30)
        res.raise_for_status()
        for item in res.json()["result"]:
            r = item["result"]
            if r:
                out[item["query"].upper()] = {"lat": r["latitude"], "lng": r["longitude"],
                                              "borough": r["admin_district"]}
    return out


def overpass_places(bbox: tuple[float, float, float, float]) -> dict[str, list[dict]]:
    """Supermarkets + stations in bbox (south, west, north, east), one Overpass request."""
    s, w, n, e = bbox
    b = f"{s},{w},{n},{e}"
    query = f"""[out:json][timeout:90];
      (nwr["shop"="supermarket"]({b});
       node["railway"="station"]({b});
       node["station"="subway"]({b}););
      out center tags;"""
    elements = None
    for url in OVERPASS_MIRRORS:  # the main server is often overloaded (504/429): try mirrors
        try:
            res = requests.post(url, data={"data": query}, headers=HEADERS, timeout=60)
            res.raise_for_status()
            elements = res.json()["elements"]
            break
        except (requests.RequestException, ValueError) as e:
            print(f"Overpass {url} failed ({e}); trying next mirror", file=sys.stderr)
    if elements is None:
        raise RuntimeError("all Overpass mirrors failed; try again in a few minutes")
    supermarkets, stations = [], []
    for el in elements:
        lat = el.get("lat") or el.get("center", {}).get("lat")
        lng = el.get("lon") or el.get("center", {}).get("lon")
        tags = el.get("tags", {})
        if lat is None or lng is None:
            continue
        place = {"name": tags.get("name") or tags.get("brand") or "Unnamed", "lat": lat, "lng": lng}
        (supermarkets if tags.get("shop") == "supermarket" else stations).append(place)
    return {"supermarkets": supermarkets, "stations": stations}


def bike_docks() -> list[dict]:
    res = requests.get("https://api.tfl.gov.uk/BikePoint", headers=HEADERS, timeout=60)
    res.raise_for_status()
    return [{"name": d["commonName"], "lat": d["lat"], "lng": d["lon"]} for d in res.json()]


# ───────────── main ─────────────

def enrich(halls: list[dict], refresh: bool = False) -> list[str]:
    warnings: list[str] = []
    postcodes = sorted({h["postcode"] for h in halls if h["postcode"]})
    geo = _cached("postcodes.json", lambda: geocode(postcodes), refresh)
    missing = [p for p in postcodes if p not in geo]
    if missing and not refresh:  # new postcodes added since the cache was written
        geo.update(geocode(missing))
        (CACHE / "postcodes.json").write_text(json.dumps(geo), encoding="utf8")

    for h in halls:
        g = geo.get(h["postcode"] or "")
        h["lat"], h["lng"], h["borough"] = (g["lat"], g["lng"], g["borough"]) if g else (None, None, None)
        if not g:
            warnings.append(f"{h['name']}: postcode {h['postcode']!r} not found; hall won't appear on the map")

    located = [h for h in halls if h["lat"] is not None]
    if not located:
        return warnings
    pad = 0.03  # ~3 km around the halls so edge halls still find neighbours
    bbox = (min(h["lat"] for h in located) - pad, min(h["lng"] for h in located) - pad,
            max(h["lat"] for h in located) + pad, max(h["lng"] for h in located) + pad)
    key = "overpass_" + "_".join(f"{x:.2f}" for x in bbox) + ".json"
    places = _cached(key, lambda: overpass_places(bbox), refresh)
    docks = _cached("bikepoints.json", bike_docks, refresh)

    for h in located:
        sm, sm_m = nearest(h["lat"], h["lng"], places["supermarkets"])
        st, st_m = nearest(h["lat"], h["lng"], places["stations"])
        _, dock_m = nearest(h["lat"], h["lng"], docks)
        h["supermarket_name"], h["supermarket_m"] = (sm["name"] if sm else None), sm_m
        h["station_name"], h["station_m"] = (st["name"] if st else None), st_m
        h["bike_dock_m"] = dock_m
    return warnings


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--refresh", action="store_true", help="ignore data/.cache and re-download")
    args = ap.parse_args()

    with CSV_PATH.open(encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    try:
        halls, warnings = group_rows(rows)
    except CsvError as e:
        print(f"CSV error: {e}", file=sys.stderr)
        return 1
    warnings += enrich(halls, refresh=args.refresh)

    OUT_PATH.write_text(json.dumps(halls, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
    for w in warnings:
        print("warning:", w)
    print(f"{len(halls)} halls, {sum(len(h['room_types']) for h in halls)} room types -> {OUT_PATH.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
