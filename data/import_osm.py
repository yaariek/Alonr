"""Add student halls from OpenStreetMap to data/properties.csv.

    python data/import_osm.py            # add 50 halls spread across London
    python data/import_osm.py -n 30      # add 30
    python data/import_osm.py --dry-run  # print the picks, don't touch the CSV

Fills only name, provider (when it can tell), postcode, lat, lng and added_by=osm.
Everything else is left blank for the team to fill in. Halls already in the CSV are skipped.
Then run: python data/enrich.py && python data/seed.py
"""

from __future__ import annotations

import argparse
import csv
import re
import sys
from pathlib import Path

import requests

import osm
from enrich import CSV_PATH, HEADERS, haversine_m, slugify

CSV_COLUMNS = ["name", "provider", "affiliated_university", "address", "postcode", "lat", "lng",
               "room_kind", "price_week", "flatmates", "contract_weeks", "catered", "reception_24h",
               "accessible", "facilities", "website", "added_by"]
CENTRAL_LONDON = (51.5155, -0.1195)  # Holborn: first pick, so central London is always included

# (pattern on name + operator, provider written to the CSV). First match wins.
PROVIDER_PATTERNS = [
    (r"\bunite\b", "Unite"), (r"\biq\b", "iQ"), (r"\bchapter\b", "Chapter"), (r"\bscape\b", "Scape"),
    (r"\bprestige\b", "Prestige"), (r"\bucl\b|university college london", "UCL"),
    (r"king'?s college|\bkcl\b", "KCL"), (r"\bimperial\b", "Imperial"),
    (r"\burbanest\b", "Urbanest"), (r"\bcanvas\b", "Canvas"), (r"\bdowning\b", "Downing"),
    (r"\bvita\b", "Vita"), (r"\bnido\b", "Nido"), (r"\byugo\b", "Yugo"), (r"\bgradpad\b", "Gradpad"),
    (r"\bhello student\b", "Hello Student"), (r"\bstudent roost\b", "Student Roost"),
    (r"\bsanctuary\b", "Sanctuary"), (r"\bcrm\b", "CRM"), (r"\bliberty\b", "Liberty"),
    (r"\blse\b|london school of economics", "LSE"), (r"queen mary", "QMUL"),
]
# Things tagged like halls that aren't a hall you can live in
JUNK = re.compile(r"\b(services|office|reception|management|car park|gym|shop|police|ymca|hotel|hostel)\b|\([A-Z]\)$", re.I)


def guess_provider(name: str, operator: str) -> str:
    text = f"{name} {operator}".lower()
    for pattern, provider in PROVIDER_PATTERNS:
        if re.search(pattern, text):
            return provider
    return operator.strip()  # blank when OSM doesn't know: the team fills it in


def spread_sample(items: list[dict], n: int, start: tuple[float, float] = CENTRAL_LONDON) -> list[dict]:
    """Farthest-point sampling: first the item nearest `start`, then repeatedly the item
    farthest from everything picked so far. Gives an even geographic spread. Pure, tested."""
    if n <= 0 or not items:
        return []
    remaining = list(items)
    first = min(remaining, key=lambda h: haversine_m(start[0], start[1], h["lat"], h["lng"]))
    picked = [first]
    remaining.remove(first)
    # distance from each remaining item to its nearest picked item
    dist = [haversine_m(h["lat"], h["lng"], first["lat"], first["lng"]) for h in remaining]
    while remaining and len(picked) < n:
        i = max(range(len(remaining)), key=dist.__getitem__)
        chosen = remaining.pop(i)
        dist.pop(i)
        picked.append(chosen)
        dist = [min(d, haversine_m(h["lat"], h["lng"], chosen["lat"], chosen["lng"]))
                for d, h in zip(dist, remaining)]
    return picked


def candidate_halls(raw: list[dict], existing_slugs: set[str]) -> list[dict]:
    """Drop junk, duplicates (same name) and halls already in the CSV."""
    seen, out = set(existing_slugs), []
    for h in raw:
        slug = slugify(h["name"])
        if not slug or slug in seen or JUNK.search(h["name"]):
            continue
        seen.add(slug)
        out.append(h)
    return out


def reverse_postcodes(halls: list[dict]) -> None:
    """Fill missing postcodes from lat/lng with postcodes.io (bulk, 100 per request)."""
    todo = [h for h in halls if not h["postcode"]]
    for i in range(0, len(todo), 100):
        batch = todo[i:i + 100]
        res = requests.post("https://api.postcodes.io/postcodes", headers=HEADERS, timeout=30, json={
            "geolocations": [{"latitude": h["lat"], "longitude": h["lng"], "limit": 1, "radius": 500}
                             for h in batch]})
        res.raise_for_status()
        for h, item in zip(batch, res.json()["result"]):
            if item["result"]:
                h["postcode"] = item["result"][0]["postcode"]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("-n", type=int, default=50, help="how many halls to add (default 50)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    with CSV_PATH.open(encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    existing = {slugify(r["name"]) for r in rows if r.get("name")}

    halls = spread_sample(candidate_halls(osm.student_halls(), existing), args.n)
    reverse_postcodes(halls)
    for h in halls:
        h["provider"] = guess_provider(h["name"], h["operator"])

    for h in halls:
        print(f"  {h['name'][:40]:<40} {h['provider'][:14]:<14} {h['postcode'] or '??':<9} {h['lat']:.4f},{h['lng']:.4f}")
    print(f"{len(halls)} halls, {sum(1 for h in halls if h['provider'])} with a provider, "
          f"{sum(1 for h in halls if h['postcode'])} with a postcode")
    if args.dry_run:
        return 0

    new_rows = [{"name": h["name"], "provider": h["provider"], "postcode": h["postcode"],
                 "lat": f"{h['lat']:.6f}", "lng": f"{h['lng']:.6f}", "added_by": "osm"} for h in halls]
    with CSV_PATH.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=CSV_COLUMNS, extrasaction="ignore", lineterminator="\n")
        w.writeheader()
        w.writerows(rows + new_rows)
    print(f"added to {CSV_PATH.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
