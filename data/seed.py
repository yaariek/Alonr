"""Load data/properties.enriched.json + demo users/listings into Supabase.

    python data/seed.py --dry-run    # show what would be written, no credentials needed
    python data/seed.py              # write (needs .env.local, see below)
    python data/seed.py --skip-demo  # only properties + room types
    python data/seed.py --prune      # also delete halls/room types no longer in the CSV
    python data/seed.py --dry-run --prune  # list what --prune would delete (reads Supabase)

Reads from .env.local in the repo root:
    NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (service role bypasses RLS: never commit it)
    DEMO_PASSWORD (optional, default below; also used by the frontend "Demo login" button)
Safe to re-run: properties upsert on slug, room types on (property_id, kind), and
demo listings are deleted and recreated. Without --prune nothing is ever deleted, so a
hall removed or renamed in the CSV stays in Supabase until you run with --prune.
--prune never deletes a hall that real (non-demo) students have listings on.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

DATA = Path(__file__).parent
ROOT = DATA.parent
ENRICHED = DATA / "properties.enriched.json"
DEFAULT_DEMO_PASSWORD = "alonr-demo-2026"

PROPERTY_COLUMNS = [
    "slug", "name", "provider_id", "affiliated_university_id", "address", "postcode",
    "lat", "lng", "reception_24h", "accessible", "catered", "facilities", "supermarket_name",
    "supermarket_m", "station_name", "station_m", "bike_dock_m", "website",
]

DEMO_PEOPLE = [
    # The first entry is the account behind the "Demo login" button.
    {"key": "judge", "display_name": "Demo Judge", "course": "Hackathon judging", "year": 1,
     "languages": ["English"], "lifestyle": {"drinking": "sometimes", "parties": False, "smoking": False,
                                             "instruments": [], "pets": False, "personality": ["curious"]}},
    {"key": "amira", "display_name": "Amira", "course": "Architecture", "year": 2,
     "languages": ["English", "Arabic"], "lifestyle": {"drinking": "never", "parties": False, "smoking": False,
                                                       "instruments": ["piano"], "pets": False, "personality": ["quiet", "early bird"]}},
    {"key": "tom", "display_name": "Tom", "course": "Computer Science", "year": 1,
     "languages": ["English"], "lifestyle": {"drinking": "often", "parties": True, "smoking": False,
                                             "instruments": ["guitar"], "pets": False, "personality": ["social"]}},
    {"key": "mei", "display_name": "Mei", "course": "Economics", "year": 3,
     "languages": ["English", "Mandarin"], "lifestyle": {"drinking": "sometimes", "parties": False, "smoking": False,
                                                         "instruments": [], "pets": True, "personality": ["tidy", "night owl"]}},
    {"key": "jonas", "display_name": "Jonas", "course": "Medicine", "year": 4,
     "languages": ["English", "German"], "lifestyle": {"drinking": "sometimes", "parties": False, "smoking": False,
                                                       "instruments": ["violin"], "pets": False, "personality": ["quiet"]}},
    {"key": "priya", "display_name": "Priya", "course": "Law", "year": 2,
     "languages": ["English", "Hindi"], "lifestyle": {"drinking": "never", "parties": False, "smoking": False,
                                                      "instruments": [], "pets": False, "personality": ["organised"]}},
]


def demo_email(key: str) -> str:
    return f"{key}@demo.ac.uk"


def cheapest(prop: dict) -> dict:
    return min(prop["room_types"], key=lambda r: r["price_week"])


def build_demo_listings(props: list[dict], people: list[str]) -> list[dict]:
    """Deterministic demo swaps. Pure: no I/O, tested in data/tests.

    Only halls with prices (room_types) are used. For pairs of halls, person X (in hall P)
    wants hall Q and person Y (in hall Q) wants hall P -> a mutual match. The last person
    gets a 'release' listing (contract takeover), which never matches swaps.
    Returns rows with 'person' + 'property_slug', and wants.property_slugs (seed turns
    slugs into ids) instead of uuids.
    """
    located = sorted((p for p in props if p.get("lat") is not None and p.get("room_types")),
                     key=lambda p: p["slug"])
    listings: list[dict] = []
    used: set[str] = set()
    swappers = people[1:-1] if len(people) > 2 else people  # judge stays free to explore
    i = 0
    for a in located:
        if i + 1 >= len(swappers):
            break
        b = next((q for q in located if q["slug"] not in used and q["slug"] != a["slug"]), None)
        if a["slug"] in used or b is None:
            continue
        used.update({a["slug"], b["slug"]})
        for person, have, want in ((swappers[i], a, b), (swappers[i + 1], b, a)):
            room = cheapest(have)
            listings.append({
                "person": person, "property_slug": have["slug"], "kind": "swap",
                "room_kind": room["kind"], "price_week": room["price_week"],
                "flatmates": room["flatmates"],
                "wants": {"property_slugs": [want["slug"]], "max_price": cheapest(want)["price_week"] + 50},
                "description": f"Swapping my {room['kind'].replace('_', ' ')} at {have['name']}: "
                               f"looking for a room at {want['name']}.",
            })
        i += 2
    if located and len(people) > 2:
        p = located[-1]
        room = cheapest(p)
        listings.append({
            "person": people[-1], "property_slug": p["slug"], "kind": "release",
            "room_kind": room["kind"], "price_week": room["price_week"], "flatmates": room["flatmates"],
            "wants": {}, "description": f"Leaving London early: take over my contract at {p['name']}.",
        })
    return listings


def to_db_wants(wants: dict, ids: dict[str, str]) -> dict:
    """Replace property_slugs with the property_ids the matching SQL expects."""
    out = {k: v for k, v in wants.items() if k != "property_slugs"}
    if wants.get("property_slugs"):
        out["property_ids"] = [ids[s] for s in wants["property_slugs"]]
    return out


def plan_prune(db_props: list[dict], db_rooms: list[dict], keep: dict[str, set[str]],
               blocked: set[str]) -> tuple[list[dict], list[dict], list[dict]]:
    """What --prune deletes. Pure, tested.

    db_props: [{id, slug, name}], db_rooms: [{id, property_id, kind}],
    keep: {slug: {room kinds in the CSV}}, blocked: property ids with real students' listings.
    Returns (properties to delete, room types to delete, properties skipped because blocked).
    Room types of deleted properties go automatically (on delete cascade).
    """
    delete_props, skipped = [], []
    kinds_by_id: dict[str, set[str]] = {}
    for p in db_props:
        if p["slug"] in keep:
            kinds_by_id[p["id"]] = keep[p["slug"]]
        elif p["id"] in blocked:
            skipped.append(p)
        else:
            delete_props.append(p)
    delete_rooms = [r for r in db_rooms
                    if r["property_id"] in kinds_by_id and r["kind"] not in kinds_by_id[r["property_id"]]]
    return delete_props, delete_rooms, skipped


def prune(sb, halls: list[dict], dry_run: bool) -> None:
    db_props = sb.table("properties").select("id,slug,name").execute().data
    db_rooms = sb.table("room_types").select("id,property_id,kind").execute().data
    demo_ids = {r["id"] for r in sb.table("profiles").select("id").eq("is_demo", True).execute().data}
    listings = sb.table("listings").select("id,property_id,user_id").execute().data
    blocked = {l["property_id"] for l in listings if l["user_id"] not in demo_ids}
    keep = {h["slug"]: {rt["kind"] for rt in h["room_types"]} for h in halls}
    delete_props, delete_rooms, skipped = plan_prune(db_props, db_rooms, keep, blocked)

    verb = "would delete" if dry_run else "deleting"
    names = {p["id"]: p["name"] for p in db_props}
    for p in delete_props:
        print(f"  {verb} hall: {p['name']}")
    for r in delete_rooms:
        print(f"  {verb} room type: {names.get(r['property_id'])} / {r['kind']}")
    for p in skipped:
        print(f"  KEPT (students have listings there, remove them first): {p['name']}")
    print(f"prune: {len(delete_props)} halls, {len(delete_rooms)} room types {'to delete' if dry_run else 'deleted'}"
          + (f", {len(skipped)} kept" if skipped else ""))
    if dry_run:
        return
    if delete_props:
        ids = [p["id"] for p in delete_props]
        # demo listings on these halls would block the delete (foreign key): remove them first
        if demo_ids:
            sb.table("listings").delete().in_("property_id", ids).in_("user_id", list(demo_ids)).execute()
        sb.table("properties").delete().in_("id", ids).execute()
    if delete_rooms:
        sb.table("room_types").delete().in_("id", [r["id"] for r in delete_rooms]).execute()


def load_env() -> dict[str, str]:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env.local")
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local")
    return {"url": url, "key": key, "demo_password": os.getenv("DEMO_PASSWORD") or DEFAULT_DEMO_PASSWORD}


def get_or_create_user(sb, email: str, password: str) -> str:
    try:
        res = sb.auth.admin.create_user({"email": email, "password": password, "email_confirm": True})
        return res.user.id
    except Exception as e:  # already registered -> look it up
        if "already" not in str(e).lower() and "exists" not in str(e).lower():
            raise
    page = 1
    while True:
        users = sb.auth.admin.list_users(page=page, per_page=200)
        for u in users:
            if (u.email or "").lower() == email:
                sb.auth.admin.update_user_by_id(u.id, {"password": password})
                return u.id
        if len(users) < 200:
            raise RuntimeError(f"{email} exists but could not be found")
        page += 1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--skip-demo", action="store_true")
    ap.add_argument("--prune", action="store_true", help="delete halls/room types that are no longer in the CSV")
    args = ap.parse_args()

    if not ENRICHED.exists():
        sys.exit("Run python data/enrich.py first")
    halls = json.loads(ENRICHED.read_text(encoding="utf8"))
    located = [h for h in halls if h.get("lat") is not None]
    if len(located) < len(halls):
        print(f"skipping {len(halls) - len(located)} halls with no location (bad postcode)")
    people = [p["key"] for p in DEMO_PEOPLE]
    demo = [] if args.skip_demo else build_demo_listings(located, people)

    if args.dry_run:
        priced = sum(1 for h in located if h["room_types"])
        print(f"would upsert {len(located)} properties ({priced} with prices), "
              f"{sum(len(h['room_types']) for h in located)} room types")
        if not args.skip_demo:
            print(f"would create {len(DEMO_PEOPLE)} demo users ({', '.join(demo_email(k) for k in people)})")
            for l in demo:
                print(f"  {l['person']:>6} {l['kind']:<7} {l['property_slug']} wants {l['wants'] or 'n/a'}")
        if not args.prune:
            return 0

    from supabase import create_client
    env = load_env()
    sb = create_client(env["url"], env["key"])
    if args.dry_run:
        prune(sb, halls, dry_run=True)
        return 0

    rows = [{c: h.get(c) for c in PROPERTY_COLUMNS} for h in located]
    if rows:
        saved = sb.table("properties").upsert(rows, on_conflict="slug").execute().data
        ids = {r["slug"]: r["id"] for r in saved}
        room_rows = [{"property_id": ids[h["slug"]], **rt} for h in located for rt in h["room_types"]]
        if room_rows:
            sb.table("room_types").upsert(room_rows, on_conflict="property_id,kind").execute()
        print(f"upserted {len(rows)} properties, {len(room_rows)} room types")
    else:
        ids = {}
        print("no located halls to upsert")

    if not args.skip_demo:
        seed_demo(sb, env, ids, demo)
    if args.prune:
        prune(sb, halls, dry_run=False)
    return 0


def seed_demo(sb, env: dict, ids: dict[str, str], demo: list[dict]) -> None:
    user_ids = {}
    for person in DEMO_PEOPLE:
        uid = get_or_create_user(sb, demo_email(person["key"]), env["demo_password"])
        user_ids[person["key"]] = uid
        sb.table("profiles").update({k: v for k, v in person.items() if k != "key"} | {"is_demo": True}) \
            .eq("id", uid).execute()
    print(f"demo users ready: {', '.join(demo_email(k) for k in user_ids)}")

    sb.table("listings").delete().in_("user_id", list(user_ids.values())).execute()
    listing_rows = [{
        "user_id": user_ids[l["person"]], "property_id": ids[l["property_slug"]], "kind": l["kind"],
        "room_kind": l["room_kind"], "price_week": l["price_week"], "flatmates": l["flatmates"],
        "wants": to_db_wants(l["wants"], ids), "description": l["description"],
    } for l in demo]
    if listing_rows:
        sb.table("listings").insert(listing_rows).execute()
    print(f"created {len(listing_rows)} demo listings")


if __name__ == "__main__":
    sys.exit(main())
