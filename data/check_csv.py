"""Check data/properties.csv before enrich/seed and list every problem at once.

    python data/check_csv.py               # checks data/properties.csv
    python data/check_csv.py other.csv

ERROR   = enrich.py or seed.py would fail on it: fix before running them.
WARNING = it will load, but probably isn't what you meant (wrong price, hall rows that disagree…).
Exit code 1 when there are errors.
"""

from __future__ import annotations

import collections
import csv
import re
import sys
from dataclasses import dataclass
from pathlib import Path

from enrich import CSV_PATH, PROVIDERS, ROOM_KINDS, slugify

COLUMNS = ["name", "provider", "affiliated_university", "address", "postcode", "lat", "lng",
           "room_kind", "price_week", "flatmates", "contract_weeks", "catered", "reception_24h",
           "accessible", "facilities", "website", "added_by"]
# universities.id in supabase/migrations/20261013180100_reference_data.sql (affiliated_university must be one)
UNIVERSITIES = {"ucl", "kcl", "imperial", "qmul", "lse", "city", "soas", "gold", "bbk", "ual",
                "westminster", "uel", "lsbu", "greenwich", "mdx", "roehampton", "brunel", "rhul", "stmarys"}
# Columns describing the hall (not the room): every row of the same hall should agree on them
HALL_COLUMNS = ["provider", "affiliated_university", "address", "postcode", "lat", "lng",
                "catered", "reception_24h", "accessible", "facilities", "website"]
BOOLS = {"true", "yes", "y", "1", "false", "no", "n", "0", ""}
POSTCODE = re.compile(r"^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$")
LONDON = (51.2, 51.75, -0.6, 0.35)  # lat min/max, lng min/max (generous Greater London box)
PRICE_RANGE = (80, 1000)            # £/week outside this is almost certainly a typo (monthly? missing digit?)
MIN_PRICED_HALLS = 4                # seed.py needs this many for the demo swap pairs


@dataclass
class Problem:
    level: str  # "ERROR" | "WARNING"
    row: int    # CSV line number (1 = header), 0 = whole file
    message: str

    def __str__(self) -> str:
        where = f"row {self.row}: " if self.row else ""
        return f"{self.level:7} {where}{self.message}"


def _num(value: str, cast=float):
    try:
        return cast(value)
    except ValueError:
        return None


def _same(column: str, a: str, b: str) -> bool:
    a, b = a.strip().lower(), b.strip().lower()
    if column in ("catered", "reception_24h", "accessible"):  # "yes" == "true"
        return (a in ("true", "yes", "y", "1")) == (b in ("true", "yes", "y", "1"))
    if column == "facilities":
        return sorted(x.strip() for x in a.split(";") if x.strip()) == sorted(x.strip() for x in b.split(";") if x.strip())
    return a == b


def check_rows(rows: list[dict], header: list[str] | None = None) -> list[Problem]:
    """All problems in the CSV rows (dicts from csv.DictReader). Pure, tested in data/tests."""
    problems: list[Problem] = []

    def err(i, msg): problems.append(Problem("ERROR", i, msg))
    def warn(i, msg): problems.append(Problem("WARNING", i, msg))

    if header is not None:
        missing = [c for c in COLUMNS if c not in header]
        extra = [c for c in header if c not in COLUMNS]
        if missing:
            err(0, f"missing columns: {', '.join(missing)}")
        if extra:
            warn(0, f"unknown columns (ignored): {', '.join(extra)}")

    first_row: dict[str, tuple[int, dict]] = {}  # hall slug -> (row number, row)
    kinds: dict[str, set[str]] = collections.defaultdict(set)
    other_providers: dict[str, list[str]] = collections.defaultdict(list)  # provider -> hall names

    for i, r in enumerate(rows, start=2):
        g = lambda c: (r.get(c) or "").strip()  # noqa: E731
        name = g("name")
        if not any(g(c) for c in COLUMNS):
            continue  # blank line
        if not name:
            err(i, "name is blank")
            continue
        at = f"{name}: "

        # Room type + price
        kind, price = g("room_kind").lower(), g("price_week")
        if kind and kind not in ROOM_KINDS:
            err(i, at + f"room_kind {kind!r} is not one of {', '.join(sorted(ROOM_KINDS))}")
        if bool(kind) != bool(price):
            err(i, at + "fill both room_kind and price_week, or leave both blank")
        if price:
            p = _num(price.lstrip("£"))
            if p is None:
                err(i, at + f"price_week {price!r} is not a number (just digits, no £ or 'pw')")
            elif price.startswith("£"):
                err(i, at + f"price_week {price!r}: drop the £ sign")
            elif not PRICE_RANGE[0] <= p <= PRICE_RANGE[1]:
                warn(i, at + f"price_week {price} looks wrong for £/week (monthly price?)")
        if kind and kind in kinds[slugify(name)]:
            warn(i, at + f"room_kind {kind!r} appears twice for this hall; only the first is kept")
        if kind:
            kinds[slugify(name)].add(kind)

        flatmates = g("flatmates")
        if flatmates:
            n = _num(flatmates, int)
            if n is None:
                err(i, at + f"flatmates {flatmates!r} must be a whole number")
            elif not 0 <= n <= 20:
                warn(i, at + f"flatmates {n} looks wrong")
            elif kind == "studio" and n > 0:
                warn(i, at + f"a studio with {n} flatmates? (use 0)")
        weeks = [w.strip() for w in g("contract_weeks").split(";") if w.strip()]
        bad = [w for w in weeks if _num(w, int) is None]
        if bad:
            err(i, at + f"contract_weeks must be numbers separated by ';', got {g('contract_weeks')!r}")
        elif any(not 1 <= int(w) <= 52 for w in weeks):
            warn(i, at + f"contract_weeks {g('contract_weeks')!r} should be between 1 and 52")

        # Hall-level fields
        for col in ("catered", "reception_24h", "accessible"):
            if g(col).lower() not in BOOLS:
                err(i, at + f"{col} must be true/false, got {g(col)!r}")
        uni = g("affiliated_university").lower()
        if uni and uni not in UNIVERSITIES:
            err(i, at + f"affiliated_university {g('affiliated_university')!r} is not a university id "
                        f"(use one of {', '.join(sorted(UNIVERSITIES))}, or leave blank)")
        provider = g("provider")
        if slugify(name) not in first_row and provider.lower() not in PROVIDERS:
            other_providers[provider].append(name)

        lat, lng = g("lat"), g("lng")
        if bool(lat) != bool(lng):
            err(i, at + "fill both lat and lng, or leave both blank")
        elif lat:
            la, ln = _num(lat), _num(lng)
            if la is None or ln is None:
                err(i, at + f"lat/lng must be numbers, got {lat!r}, {lng!r}")
            elif not (LONDON[0] <= la <= LONDON[1] and LONDON[2] <= ln <= LONDON[3]):
                swapped = LONDON[0] <= ln <= LONDON[1] and LONDON[2] <= la <= LONDON[3]
                warn(i, at + f"lat/lng {lat}, {lng} is outside London" + (" (lat and lng swapped?)" if swapped else ""))
        postcode = g("postcode").upper()
        if postcode and not POSTCODE.match(postcode):
            warn(i, at + f"postcode {g('postcode')!r} doesn't look like a UK postcode")
        if not postcode and not lat:
            warn(i, at + "no postcode and no lat/lng: won't appear on the map")
        website = g("website")
        if website and not website.lower().startswith(("http://", "https://")):
            warn(i, at + f"website {website!r} should start with https://")

        # Rows of the same hall must agree on the hall fields (enrich keeps the first row's values)
        slug = slugify(name)
        if slug in first_row:
            j, first = first_row[slug]
            for col in HALL_COLUMNS:
                a, b = (first.get(col) or ""), (r.get(col) or "")
                if not _same(col, a, b):
                    warn(i, at + f"{col} {b.strip()!r} differs from row {j} ({a.strip()!r}); row {j} wins")
        else:
            first_row[slug] = (i, r)

    # One line per provider instead of one per hall (there can be dozens)
    for provider, names in sorted(other_providers.items()):
        label = f"provider {provider!r} isn't a known group" if provider else "provider is blank"
        warn(0, f"{label}, so {len(names)} hall(s) show as 'Other': {', '.join(names)}")
    if other_providers:
        warn(0, f"known provider groups: {', '.join(sorted(set(PROVIDERS.values())))} (ask C to add more)")

    return problems


def summary(rows: list[dict]) -> str:
    halls: dict[str, dict] = {}
    for r in rows:
        name = (r.get("name") or "").strip()
        if not name:
            continue
        h = halls.setdefault(slugify(name), {"priced": False, "provider": False, "located": False})
        h["priced"] |= bool((r.get("price_week") or "").strip())
        h["provider"] |= bool((r.get("provider") or "").strip())
        h["located"] |= bool((r.get("postcode") or "").strip() or (r.get("lat") or "").strip())
    priced = sum(h["priced"] for h in halls.values())
    lines = [
        f"{len(halls)} halls, {priced} with prices, "
        f"{sum(not h['provider'] for h in halls.values())} without a provider, "
        f"{sum(not h['located'] for h in halls.values())} without a location.",
    ]
    if priced < MIN_PRICED_HALLS:
        lines.append(f"Demo swaps need at least {MIN_PRICED_HALLS} halls with prices (have {priced}).")
    return "\n".join(lines)


def main() -> int:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else CSV_PATH
    try:
        with path.open(encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
    except UnicodeDecodeError:
        print("ERROR   the file isn't UTF-8 (Excel's plain 'CSV' format garbles accents and curly apostrophes). "
              "Save it again as 'CSV UTF-8 (Comma delimited)'.")
        return 1
    problems = check_rows(rows, reader.fieldnames or [])
    for p in sorted(problems, key=lambda p: (p.level != "ERROR", p.row)):
        print(p)
    errors = sum(p.level == "ERROR" for p in problems)
    print(f"\n{errors} errors, {len(problems) - errors} warnings. {summary(rows)}")
    if errors:
        print("Fix the errors before running enrich.py.")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
