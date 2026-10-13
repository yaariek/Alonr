import pytest

from enrich import CsvError, group_rows, haversine_m, nearest, slugify
from seed import build_demo_listings, cheapest

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


def test_unknown_provider_becomes_other_with_warning():
    halls, warnings = group_rows([{**ROW, "provider": "Vita"}])
    assert halls[0]["provider_id"] == "other" and "Vita" in warnings[0]


def test_bad_room_kind_names_the_row():
    with pytest.raises(CsvError, match="row 2"):
        group_rows([{**ROW, "room_kind": "penthouse"}])


def test_blank_rows_ignored():
    assert group_rows([{**ROW, "name": ""}]) == ([], [])


# Same rules as public.listing_satisfies in the schema migration
def satisfies(have: dict, have_prop: dict, wants: dict) -> bool:
    return ((not wants.get("room_kinds") or have["room_kind"] in wants["room_kinds"])
            and (wants.get("max_price") is None or have["price_week"] <= wants["max_price"])
            and (not wants.get("boroughs") or have_prop["borough"] in wants["boroughs"]))


def hall(slug, borough, price):
    return {"slug": slug, "name": slug, "borough": borough,
            "room_types": [{"kind": "ensuite", "price_week": price, "flatmates": 5, "contract_weeks": [51]}]}


def test_demo_listings_form_mutual_matches():
    props = [hall("a", "Camden", 300), hall("b", "Newham", 250), hall("c", "Camden", 400),
             hall("d", "Hackney", 350), hall("e", "Southwark", 280)]
    by_slug = {p["slug"]: p for p in props}
    people = ["judge", "amira", "tom", "mei", "jonas", "priya"]
    listings = build_demo_listings(props, people)

    swaps = [l for l in listings if l["kind"] == "swap"]
    assert len(swaps) == 4 and all(l["person"] != "judge" for l in listings)
    for x, y in zip(swaps[::2], swaps[1::2]):  # built in pairs
        assert satisfies(y, by_slug[y["property_slug"]], x["wants"])
        assert satisfies(x, by_slug[x["property_slug"]], y["wants"])
    release = [l for l in listings if l["kind"] == "release"]
    assert len(release) == 1 and release[0]["person"] == "priya"


def test_cheapest():
    p = {"room_types": [{"price_week": 400}, {"price_week": 300}]}
    assert cheapest(p)["price_week"] == 300
