import pytest

from enrich import CsvError, group_rows, haversine_m, nearest, slugify
from import_osm import candidate_halls, guess_provider, spread_sample
from seed import build_demo_listings, cheapest, plan_prune, to_db_wants

ROW = {"name": "Chapter King's Cross", "provider": "Chapter", "affiliated_university": "",
       "address": "200 Pentonville Rd", "postcode": "n1 9jp", "room_kind": "ensuite", "price_week": "389",
       "flatmates": "5", "contract_weeks": "44;51", "catered": "false", "reception_24h": "true",
       "accessible": "yes", "facilities": "gym; cinema room", "website": "", "added_by": "C"}


def test_slugify():
    assert slugify("Chapter King's Cross") == "chapter-king-s-cross"


def test_haversine_bloomsbury_to_ucl_east_is_about_8km():
    assert 8_000 < haversine_m(51.5246, -0.134, 51.5383, -0.0105) < 9_000


def test_nearest_picks_closest():
    places = [{"name": "far", "lat": 51.6, "lng": -0.1}, {"name": "near", "lat": 51.5001, "lng": -0.1}]
    place, m = nearest(51.5, -0.1, places)
    assert place["name"] == "near" and m < 20
    assert nearest(51.5, -0.1, []) == (None, None)


def test_group_rows_merges_room_types_per_hall():
    halls, warnings = group_rows([ROW, {**ROW, "room_kind": "studio", "price_week": "489", "flatmates": "0"}])
    assert warnings == []
    (hall,) = halls
    assert hall["slug"] == "chapter-king-s-cross" and hall["provider_id"] == "chapter"
    assert hall["postcode"] == "N1 9JP" and hall["accessible"] is True
    assert hall["facilities"] == ["gym", "cinema room"]
    assert [r["kind"] for r in hall["room_types"]] == ["ensuite", "studio"]
    assert hall["room_types"][0] == {"kind": "ensuite", "price_week": 389.0, "flatmates": 5, "contract_weeks": [44, 51]}


def test_bad_room_kind_names_the_row():
    with pytest.raises(CsvError, match="row 2"):
        group_rows([{**ROW, "room_kind": "penthouse"}])


def test_blank_rows_ignored():
    assert group_rows([{**ROW, "name": ""}]) == ([], [])


def test_hall_without_prices_is_kept_with_no_room_types():
    halls, _ = group_rows([{**ROW, "room_kind": "", "price_week": "", "lat": "51.5", "lng": "-0.1"}])
    assert halls[0]["room_types"] == [] and (halls[0]["lat"], halls[0]["lng"]) == (51.5, -0.1)


def test_room_kind_without_price_is_an_error():
    with pytest.raises(CsvError, match="both"):
        group_rows([{**ROW, "price_week": ""}])


def test_unknown_providers_summarised_in_one_warning():
    halls, warnings = group_rows([{**ROW, "provider": "Yara"}, {**ROW, "name": "X", "provider": "Yara"}])
    assert all(h["provider_id"] == "other" for h in halls)
    assert warnings == ["providers stored as 'other' (not in Supabase providers table): Yara (2)"]


# Same rules as public.listing_satisfies (after the drop_borough migration)
def satisfies(have: dict, wants: dict) -> bool:
    return ((not wants.get("room_kinds") or have["room_kind"] in wants["room_kinds"])
            and (wants.get("max_price") is None or have["price_week"] <= wants["max_price"])
            and (not wants.get("property_ids") or have["property_id"] in wants["property_ids"]))


def hall(slug, price, priced=True):
    return {"slug": slug, "name": slug, "lat": 51.5, "lng": -0.1,
            "room_types": [{"kind": "ensuite", "price_week": price, "flatmates": 5, "contract_weeks": [51]}] if priced else []}


def test_demo_listings_form_mutual_matches():
    props = [hall("a", 300), hall("b", 250), hall("c", 400), hall("d", 350), hall("unpriced", 0, priced=False)]
    ids = {p["slug"]: f"id-{p['slug']}" for p in props}
    people = ["judge", "amira", "tom", "mei", "jonas", "priya"]
    listings = build_demo_listings(props, people)
    assert all(l["property_slug"] != "unpriced" for l in listings)

    swaps = [{**l, "property_id": ids[l["property_slug"]], "wants": to_db_wants(l["wants"], ids)}
             for l in listings if l["kind"] == "swap"]
    assert len(swaps) == 4 and all(l["person"] != "judge" for l in listings)
    for x, y in zip(swaps[::2], swaps[1::2]):  # built in pairs
        assert satisfies(y, x["wants"]) and satisfies(x, y["wants"])
        assert not satisfies(swaps[2] if x is swaps[0] else swaps[0], x["wants"])  # other pairs don't match
    release = [l for l in listings if l["kind"] == "release"]
    assert len(release) == 1 and release[0]["person"] == "priya"


def test_cheapest():
    p = {"room_types": [{"price_week": 400}, {"price_week": 300}]}
    assert cheapest(p)["price_week"] == 300


# ───────────── import_osm ─────────────

def pt(name, lat, lng):
    return {"name": name, "operator": "", "postcode": "", "lat": lat, "lng": lng}


def test_spread_sample_starts_central_then_spreads_out():
    central = pt("central", 51.516, -0.12)
    cluster = [pt(f"c{i}", 51.516 + i * 0.0005, -0.12) for i in range(1, 6)]  # 5 halls next to central
    far_w, far_e = pt("west", 51.51, -0.40), pt("east", 51.52, 0.15)
    picked = spread_sample(cluster + [far_w, central, far_e], 3)
    assert [p["name"] for p in picked][0] == "central"
    assert {p["name"] for p in picked} == {"central", "west", "east"}  # not the cluster
    assert spread_sample([], 5) == [] and len(spread_sample([central], 5)) == 1


def test_guess_provider():
    assert guess_provider("Unite Students - Arch View House", "") == "Unite"
    assert guess_provider("iQ Hammersmith", "") == "iQ"
    assert guess_provider("Ramsay Hall", "University College London") == "UCL"
    assert guess_provider("Urbanest Tower Bridge", "") == "Urbanest"
    assert guess_provider("Felix House", "") == ""
    assert guess_provider("Some Hall", "Downing Students") == "Downing"


def test_candidate_halls_drops_junk_duplicates_and_existing():
    raw = [pt("Britannia Student Services", 51.5, -0.1), pt("Clive (T)", 51.5, -0.1),
           pt("Felix House", 51.5, -0.1), pt("Felix House", 51.6, -0.1), pt("Existing Hall", 51.5, -0.1)]
    assert [h["name"] for h in candidate_halls(raw, {"existing-hall"})] == ["Felix House"]


# ───────────── seed --prune ─────────────

def test_plan_prune():
    db_props = [{"id": "1", "slug": "kept", "name": "Kept"}, {"id": "2", "slug": "gone", "name": "Gone"},
                {"id": "3", "slug": "renamed-old", "name": "Old Name"}, {"id": "4", "slug": "has-listings", "name": "Busy"}]
    db_rooms = [{"id": "r1", "property_id": "1", "kind": "ensuite"}, {"id": "r2", "property_id": "1", "kind": "studio"},
                {"id": "r3", "property_id": "2", "kind": "ensuite"}]
    keep = {"kept": {"ensuite"}, "renamed-new": set()}  # studio removed from Kept in the CSV
    props, rooms, skipped = plan_prune(db_props, db_rooms, keep, blocked={"4"})
    assert [p["name"] for p in props] == ["Gone", "Old Name"]
    assert [r["id"] for r in rooms] == ["r2"]  # r3 goes with its hall via cascade
    assert [p["name"] for p in skipped] == ["Busy"]


def test_plan_prune_hall_without_prices_keeps_nothing_extra():
    props, rooms, skipped = plan_prune([{"id": "1", "slug": "a", "name": "A"}],
                                       [{"id": "r1", "property_id": "1", "kind": "studio"}], {"a": set()}, set())
    assert props == [] and [r["id"] for r in rooms] == ["r1"] and skipped == []
