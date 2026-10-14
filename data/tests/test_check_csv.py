from check_csv import COLUMNS, check_rows, summary

ROW = {"name": "Chapter King's Cross", "provider": "Chapter", "affiliated_university": "",
       "address": "200 Pentonville Rd", "postcode": "N1 9JP", "lat": "", "lng": "", "room_kind": "ensuite",
       "price_week": "389", "flatmates": "5", "contract_weeks": "44;51", "catered": "false",
       "reception_24h": "true", "accessible": "yes", "facilities": "gym;cinema room",
       "website": "https://www.chapter-living.com", "added_by": "C"}


def messages(rows, level=None):
    return [p.message for p in check_rows(rows, COLUMNS) if level is None or p.level == level]


def test_good_rows_have_no_problems():
    studio = {**ROW, "room_kind": "studio", "price_week": "489", "flatmates": "0", "facilities": "cinema room; gym"}
    assert messages([ROW, studio]) == []


def test_unpriced_hall_is_fine():
    assert messages([{**ROW, "room_kind": "", "price_week": "", "flatmates": "", "contract_weeks": ""}]) == []


def test_lists_every_error_not_just_the_first():
    rows = [{**ROW, "room_kind": "double"}, {**ROW, "name": "B", "price_week": "£300"},
            {**ROW, "name": "C", "catered": "maybe"}, {**ROW, "name": "D", "contract_weeks": "44,51"},
            {**ROW, "name": "E", "affiliated_university": "King's College London"},
            {**ROW, "name": "F", "lat": "51.5"}, {**ROW, "name": "G", "price_week": ""}]
    assert [p.row for p in check_rows(rows, COLUMNS) if p.level == "ERROR"] == [2, 3, 4, 5, 6, 7, 8]


def test_missing_column_is_an_error():
    header = [c for c in COLUMNS if c != "price_week"]
    assert any("missing columns: price_week" in p.message for p in check_rows([], header))


def test_suspicious_values_are_warnings():
    rows = [{**ROW, "price_week": "1650"},                              # monthly price
            {**ROW, "name": "B", "lat": "-0.13", "lng": "51.52"},       # lat/lng swapped
            {**ROW, "name": "C", "postcode": "N1"},
            {**ROW, "name": "D", "room_kind": "studio", "flatmates": "4"},
            {**ROW, "name": "E", "website": "chapter-living.com"}]
    warnings = messages(rows, "WARNING")
    assert len(warnings) == 5 and messages(rows, "ERROR") == []
    assert "swapped" in warnings[1]


def test_rows_of_the_same_hall_must_agree():
    rows = [ROW, {**ROW, "room_kind": "studio", "flatmates": "0", "postcode": "N1 9JQ", "accessible": "true"}]  # yes == true
    (warning,) = messages(rows, "WARNING")
    assert "postcode 'N1 9JQ' differs from row 2" in warning


def test_duplicate_room_kind_warns():
    assert "appears twice" in messages([ROW, ROW], "WARNING")[0]


def test_unknown_providers_are_grouped_per_provider():
    rows = [{**ROW, "name": "A", "provider": ""}, {**ROW, "name": "B", "provider": ""},
            {**ROW, "name": "B", "provider": "", "room_kind": "studio"},   # same hall: counted once
            {**ROW, "name": "C", "provider": "Urbanest"}]
    warnings = messages(rows, "WARNING")
    assert "provider is blank, so 2 hall(s) show as 'Other': A, B" in warnings
    assert any(w.startswith("provider 'Urbanest'") for w in warnings)


def test_summary_counts_priced_halls():
    rows = [ROW, {**ROW, "room_kind": "studio"}, {**ROW, "name": "B", "room_kind": "", "price_week": ""}]
    assert summary(rows).startswith("2 halls, 1 with prices")
    assert "need at least 4" in summary(rows)
