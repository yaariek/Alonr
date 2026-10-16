"""Load data/properties.enriched.json + demo users/listings into Supabase.

    python data/seed.py --dry-run    # show what would be written, no credentials needed
    python data/seed.py              # write (needs .env.local, see below)
    python data/seed.py --demo-profiles-only  # update demo bios/countries/languages only
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
from datetime import datetime, timedelta, timezone
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
    {"key": "leo", "display_name": "Leo", "course": "Mechanical Engineering", "year": 2,
     "languages": ["English", "Italian"], "lifestyle": {"drinking": "sometimes", "parties": True, "smoking": False,
                                                        "instruments": ["drums"], "pets": False, "personality": ["sporty"]}},
    {"key": "sara", "display_name": "Sara", "course": "Bioengineering PhD", "year": 1,
     "languages": ["English", "Swedish"], "lifestyle": {"drinking": "sometimes", "parties": False, "smoking": False,
                                                        "instruments": [], "pets": True, "personality": ["tidy", "early bird"]}},
    {"key": "omar", "display_name": "Omar", "course": "Mathematics", "year": 3,
     "languages": ["English", "Arabic", "French"], "lifestyle": {"drinking": "never", "parties": False, "smoking": False,
                                                                 "instruments": [], "pets": False, "personality": ["quiet"]}},
    {"key": "chloe", "display_name": "Chloe", "course": "Fashion Design", "year": 2,
     "languages": ["English", "French"], "lifestyle": {"drinking": "often", "parties": True, "smoking": False,
                                                       "instruments": [], "pets": False, "personality": ["creative", "night owl"]}},
    {"key": "ravi", "display_name": "Ravi", "course": "Nursing", "year": 1,
     "languages": ["English", "Tamil"], "lifestyle": {"drinking": "sometimes", "parties": False, "smoking": False,
                                                      "instruments": [], "pets": False, "personality": ["friendly"]}},
    {"key": "hana", "display_name": "Hana", "course": "History", "year": 2,
     "languages": ["English", "Japanese"], "lifestyle": {"drinking": "sometimes", "parties": False, "smoking": False,
                                                         "instruments": ["flute"], "pets": False, "personality": ["organised"]}},
]

DEMO_COUNTRIES = {
    "judge": "United Kingdom",
    "amira": "Morocco",
    "tom": "United Kingdom",
    "mei": "China",
    "jonas": "Germany",
    "priya": "India",
    "leo": "Ireland",
    "sara": "United Kingdom",
    "omar": "Pakistan",
    "chloe": "France",
    "ravi": "India",
    "hana": "Japan",
}


def natural_join(items: list[str]) -> str:
    if len(items) < 2:
        return items[0] if items else "English"
    if len(items) == 2:
        return f"{items[0]} and {items[1]}"
    return f"{', '.join(items[:-1])} and {items[-1]}"


# Countries that take "the" in a sentence ("I am from the United Kingdom").
THE_COUNTRIES = {"united kingdom", "united states", "netherlands", "philippines", "united arab emirates", "czech republic"}


def from_country(country: str) -> str:
    return f"the {country}" if country.lower() in THE_COUNTRIES else country


def demo_profile_data(person: dict) -> dict:
    country = DEMO_COUNTRIES[person["key"]]
    profile = {k: v for k, v in person.items() if k != "key"}
    profile["bio"] = f"My name is {person['display_name']} and I am from {from_country(country)}. I can speak {natural_join(person['languages'])}."
    profile["lifestyle"] = {**profile["lifestyle"], "nationality": country}
    return profile

# Hand-picked demo listings that tell the alonr story (hall slugs from properties.csv).
# Price and flatmates come from the hall's room type. Three pairs match each other both ways
# (Amira<->Tom, Mei<->Jonas, Sara<->Leo); Omar has no match yet, so on stage the judge can
# create a listing that matches him (an ensuite under £260 that wants Floyer House).
# The judge has no listings. likes = demo people who liked it; age_h = posted this many hours ago.
DEMO_LISTINGS = [
    {"person": "amira", "kind": "swap", "hall": "wick-park", "room": "ensuite",
     "start": "2026-09-12", "end": "2027-07-17", "age_h": 30, "likes": ["tom", "mei", "omar"],
     "wants": {"property_slugs": ["james-lighthill-house"], "max_price": 260},
     "description": "My Architecture studio moved to UCL Bloomsbury and I'm 50 minutes from class. "
                    "Ensuite at Wick Park, 6 flatmates, by the canal. Looking for James Lighthill House."},
    {"person": "tom", "kind": "swap", "hall": "james-lighthill-house", "room": "shared_bathroom",
     "start": "2026-09-19", "end": "2027-06-26", "age_h": 26, "likes": ["amira", "chloe"],
     "wants": {"property_slugs": ["wick-park"], "room_kinds": ["ensuite"], "max_price": 260},
     "description": "My Computer Science modules are at UCL East this year. Room at James Lighthill House, "
                    "near King's Cross. Would love an ensuite near Stratford."},
    {"person": "mei", "kind": "swap", "hall": "chapter-king-s-cross", "room": "studio",
     "start": "2026-09-05", "end": "2027-08-28", "age_h": 20, "likes": ["jonas", "sara", "hana", "ravi"],
     "wants": {"property_slugs": ["lse-high-holborn-residence"], "max_price": 400},
     "description": "Lovely studio with a gym and cinema room downstairs, but £489 a week is too much for me "
                    "this year. Happy to move into an ensuite at LSE High Holborn."},
    {"person": "jonas", "kind": "swap", "hall": "lse-high-holborn-residence", "room": "ensuite",
     "start": "2026-09-19", "end": "2027-06-12", "age_h": 18, "likes": ["mei"],
     "wants": {"property_slugs": ["chapter-king-s-cross"], "room_kinds": ["studio"], "max_price": 500},
     "description": "Early hospital placements and I'd like my own kitchen. Ensuite at LSE High Holborn, "
                    "5 flatmates, very central. Swap for a studio at Chapter King's Cross."},
    {"person": "sara", "kind": "swap", "hall": "willis-jackson-hall", "room": "shared_bathroom",
     "start": "2026-09-26", "end": "2027-06-26", "age_h": 12, "likes": ["leo", "priya"],
     "wants": {"property_slugs": ["gradpad-wood-lane-studios"], "room_kinds": ["studio"], "max_price": 380},
     "description": "My PhD lab moved to Imperial's White City campus. Room at Willis Jackson Hall in "
                    "South Kensington. Looking for a studio at Wood Lane."},
    {"person": "leo", "kind": "swap", "hall": "gradpad-wood-lane-studios", "room": "studio",
     "start": "2026-09-05", "end": "2027-08-28", "age_h": 10, "likes": ["sara"],
     "wants": {"property_slugs": ["willis-jackson-hall", "goldsmid-house"], "max_price": 250},
     "description": "Studio at Wood Lane, 3 minutes from White City. All my lectures are in South Kensington "
                    "now: I'd swap for an Imperial hall there and save over £150 a week."},
    {"person": "omar", "kind": "swap", "hall": "floyer-house", "room": "shared_bathroom",
     "start": "2026-09-19", "end": "2027-06-12", "age_h": 6, "likes": [],
     "wants": {"room_kinds": ["ensuite"], "max_price": 260},
     "description": "Final-year QMUL student at Floyer House in Mile End, 6 flatmates. I'd like my own "
                    "bathroom: any ensuite under £260, anywhere in London."},
    {"person": "chloe", "kind": "swap", "hall": "urbanest-hoxton", "room": "studio",
     "start": "2026-09-05", "end": "2027-08-28", "age_h": 40, "likes": ["tom", "omar"],
     "wants": {"room_kinds": ["studio"], "max_price": 340},
     "description": "Studio at Urbanest Hoxton, 10 minutes to my UAL campus. Looking for a cheaper studio "
                    "under £340 a week."},
    {"person": "priya", "kind": "release", "hall": "yara-central-holland-park", "room": "studio",
     "start": "2026-11-01", "end": "2027-08-28", "age_h": 48, "likes": ["chloe", "leo", "mei"],
     "description": "Leaving London early for a job in Manchester. Take over my studio contract from "
                    "1 November and I'll help with the transfer."},
    {"person": "hana", "kind": "release", "hall": "scape-shoreditch", "room": "studio",
     "start": "2027-01-09", "end": "2027-08-28", "age_h": 4, "likes": ["chloe", "amira"],
     "description": "Erasmus in Barcelona for the spring term. My Scape Shoreditch studio is free from "
                    "January to the end of August."},
    {"person": "ravi", "kind": "release", "hall": "stamford-street-apartments", "room": "ensuite",
     "start": "2027-01-04", "end": "2027-06-26", "age_h": 2, "likes": ["omar", "jonas", "tom"],
     "description": "Moving in with my brother in January. KCL ensuite at Stamford Street, 6 flatmates, "
                    "5 minutes from Waterloo."},
]


# Demo chats about the listings above: "from" messaged the owner of "about"'s listing.
# Each message: (sender, text, hours ago). The judge has one, so their Chats tab isn't empty.
DEMO_CHATS = [
    {"from": "amira", "about": "tom", "messages": [
        ("amira", "Hi Tom! Looks like we're a perfect match: my Wick Park ensuite for your room at James Lighthill?", 20),
        ("tom", "Yes! Wick Park is so close to UCL East, that would save me over an hour a day.", 19.5),
        ("amira", "Amazing. Want to see each other's rooms this weekend?", 19),
        ("tom", "Saturday at 11 works for me.", 18.5),
    ]},
    {"from": "judge", "about": "priya", "messages": [
        ("judge", "Hi Priya, is your studio still available from November?", 3),
        ("priya", "Hi! Yes it is. The contract runs to the end of August, and I can show you around any evening this week.", 2.5),
    ]},
    {"from": "chloe", "about": "hana", "messages": [
        ("chloe", "Is the Scape Shoreditch studio quiet? I'd need it from January.", 3.5),
        ("hana", "Very quiet, it faces the courtyard. January is perfect!", 3),
    ]},
]

def demo_email(key: str) -> str:
    return f"{key}@demo.ac.uk"


def build_demo_listings(props: list[dict], spec: list[dict] = DEMO_LISTINGS) -> tuple[list[dict], list[str]]:
    """DEMO_LISTINGS -> listing rows. Pure: no I/O, tested in data/tests.

    Price and flatmates come from the hall's room type. A listing whose hall or room type isn't
    in the data (CSV changed) is skipped with a warning. Rows keep 'person' + 'property_slug',
    and wants.property_slugs (seed turns slugs into ids).
    """
    halls = {p["slug"]: p for p in props}
    listings: list[dict] = []
    warnings: list[str] = []
    for s in spec:
        hall = halls.get(s["hall"])
        room = next((r for r in (hall or {}).get("room_types", []) if r["kind"] == s["room"]), None)
        missing = [w for w in s.get("wants", {}).get("property_slugs", []) if w not in halls]
        if room is None or missing:
            what = f"wanted hall(s) {missing}" if room else f"{s['hall']} / {s['room']}"
            warnings.append(f"skipping {s['person']}'s demo listing: {what} not in the data")
            continue
        listings.append({
            "person": s["person"], "property_slug": hall["slug"], "kind": s["kind"],
            "room_kind": room["kind"], "price_week": room["price_week"], "flatmates": room["flatmates"],
            "start_date": s["start"], "end_date": s["end"], "age_h": s["age_h"], "likes": s["likes"],
            "wants": s.get("wants", {}) if s["kind"] == "swap" else {}, "description": s["description"],
        })
    return listings, warnings


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


def find_user_id(sb, email: str) -> str | None:
    page = 1
    while True:
        users = sb.auth.admin.list_users(page=page, per_page=200)
        for user in users:
            if (user.email or "").lower() == email:
                return user.id
        if len(users) < 200:
            return None
        page += 1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--skip-demo", action="store_true")
    ap.add_argument("--demo-profiles-only", action="store_true", help="update only demo profile bios, countries and languages")
    ap.add_argument("--prune", action="store_true", help="delete halls/room types that are no longer in the CSV")
    args = ap.parse_args()

    if args.demo_profiles_only:
        if args.dry_run:
            print(f"would update {len(DEMO_PEOPLE)} demo profiles (bios, countries and spoken languages)")
            return 0
        from supabase import create_client
        env = load_env()
        sb = create_client(env["url"], env["key"])
        update_demo_profiles(sb)
        return 0

    if not ENRICHED.exists():
        sys.exit("Run python data/enrich.py first")
    halls = json.loads(ENRICHED.read_text(encoding="utf8"))
    located = [h for h in halls if h.get("lat") is not None]
    if len(located) < len(halls):
        print(f"skipping {len(halls) - len(located)} halls with no location (bad postcode)")
    people = [p["key"] for p in DEMO_PEOPLE]
    demo, demo_warnings = ([], []) if args.skip_demo else build_demo_listings(located)
    for w in demo_warnings:
        print("warning:", w)

    if args.dry_run:
        priced = sum(1 for h in located if h["room_types"])
        print(f"would upsert {len(located)} properties ({priced} with prices), "
              f"{sum(len(h['room_types']) for h in located)} room types")
        if not args.skip_demo:
            print(f"would create {len(DEMO_PEOPLE)} demo users ({', '.join(demo_email(k) for k in people)})")
            for l in demo:
                print(f"  {l['person']:>6} {l['kind']:<7} {l['property_slug']} {l['price_week']:.0f}/wk "
                      f"wants {l['wants'] or 'n/a'} ({len(l['likes'])} likes)")
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


def update_demo_profiles(sb) -> None:
    updated = 0
    for person in DEMO_PEOPLE:
        uid = find_user_id(sb, demo_email(person["key"]))
        if uid is None:
            print(f"skipped missing demo account: {demo_email(person['key'])}")
            continue
        sb.table("profiles").update(demo_profile_data(person) | {"is_demo": True}) \
            .eq("id", uid).execute()
        updated += 1
    print(f"updated {updated} demo profiles; passwords, listings and chats were left untouched")


def seed_demo(sb, env: dict, ids: dict[str, str], demo: list[dict]) -> None:
    user_ids = {}
    for person in DEMO_PEOPLE:
        uid = get_or_create_user(sb, demo_email(person["key"]), env["demo_password"])
        user_ids[person["key"]] = uid
        sb.table("profiles").update(demo_profile_data(person) | {"is_demo": True}) \
            .eq("id", uid).execute()
    print(f"demo users ready: {', '.join(demo_email(k) for k in user_ids)}")

    # Recreate demo listings (their likes go with them; old demo chats lose their listing link)
    sb.table("listings").delete().in_("user_id", list(user_ids.values())).execute()
    now = datetime.now(timezone.utc)
    listing_rows = [{
        "user_id": user_ids[l["person"]], "property_id": ids[l["property_slug"]], "kind": l["kind"],
        "room_kind": l["room_kind"], "price_week": l["price_week"], "flatmates": l["flatmates"],
        "start_date": l["start_date"], "end_date": l["end_date"],
        "created_at": (now - timedelta(hours=l["age_h"])).isoformat(),
        "wants": to_db_wants(l["wants"], ids), "description": l["description"],
    } for l in demo]
    saved = sb.table("listings").insert(listing_rows).execute().data if listing_rows else []
    likes = [{"user_id": user_ids[who], "listing_id": row["id"]}
             for l, row in zip(demo, saved) for who in l["likes"] if who != l["person"]]
    if likes:
        sb.table("listing_likes").insert(likes).execute()
    print(f"created {len(saved)} demo listings, {len(likes)} likes")

    # Demo chats: replace the ones between two demo users (chats with real students are kept)
    demo_ids = list(user_ids.values())
    sb.table("conversations").delete().in_("user_a", demo_ids).in_("user_b", demo_ids).execute()
    listing_of = {l["person"]: row["id"] for l, row in zip(demo, saved)}
    messages = []
    for chat in DEMO_CHATS:
        if chat["about"] not in listing_of:
            print(f"warning: skipping demo chat {chat['from']} -> {chat['about']}: no listing")
            continue
        conv = sb.table("conversations").insert({
            "listing_id": listing_of[chat["about"]], "user_a": user_ids[chat["from"]], "user_b": user_ids[chat["about"]],
            "created_at": (now - timedelta(hours=chat["messages"][0][2])).isoformat(),
        }).execute().data[0]
        messages += [{"conversation_id": conv["id"], "sender_id": user_ids[who], "body": text,
                      "created_at": (now - timedelta(hours=h)).isoformat()} for who, text, h in chat["messages"]]
    if messages:
        sb.table("messages").insert(messages).execute()
    print(f"created {len(DEMO_CHATS)} demo chats, {len(messages)} messages")

if __name__ == "__main__":
    sys.exit(main())
