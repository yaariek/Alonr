# AGENTS.md — alonr

> Single source of truth for the alonr team **and** for any AI coding agent (Claude Code, Codex, Cursor, Copilot…).
> Read this whole file before writing code. Update it (via PR) when a decision changes.

## Rules for AI coding agents (and humans)
1. **Stay in your lane:** only edit folders owned by your person (see *Team split*). Need a change elsewhere? Open an issue / ask the owner.
2. **Database schema changes only via new files in `supabase/migrations/`, made by Person C.** Never edit an already-merged migration.
3. **Never commit secrets:** `.env*` is gitignored (except `.env.example`). The Supabase **service-role key** must never appear in frontend code or git.
4. Frontend uses only the `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`; security comes from RLS policies.
5. **Small PRs**, branch names `a/…`, `b/…`, `c/…`. No direct pushes to `main`.
6. Before opening a PR: `npm run lint && npm test` (frontend) / `python -m pytest` if touching `data/`. Check the Vercel preview on a phone.
7. Mobile-first: design for ~390px width first, then desktop.
8. Use shadcn/ui components + Tailwind; don't add another UI library without team agreement.
9. Keep TypeScript simple (loose strictness OK). Prefer pure functions in `lib/` for logic so it can be unit-tested.
10. Don't add new paid services or API keys without telling the team.

## Getting started
- **Scaffold (Person B, once):** `create-next-app` refuses a non-empty folder, so run `npx create-next-app@latest web-tmp --ts --tailwind --eslint --app --no-src-dir`, move its contents into the repo root, and merge its `.gitignore` with ours.
- Then: `npx shadcn@latest init`, `npm i @supabase/supabase-js @supabase/ssr react-map-gl maplibre-gl @turf/turf`, `npm i -D vitest`.
- Copy `.env.example` → `.env.local` and fill in Supabase values (ask Person C).
- Python (Person C): `python -m venv .venv && pip install -r data/requirements.txt`.

## Context
London students are stuck with accommodation contracts they no longer want: the wrong campus (e.g. UCL Bloomsbury → UCL East Marshgate), the wrong price, or the wrong room type. They also have no easy way to compare halls across providers (Unite, iQ, Chapter, Scape, Prestige, UCL/KCL/Imperial halls). **alonr** is a verified-student app with three parts:
1. A **London accommodation map** with rich filters and a "between two places" search.
2. A **swap / contract-release marketplace** where students list their room and find mutual swaps.
3. **House Share** matching (bonus) and **Summer Storage** (stretch).

Team of 3, mostly Python experience. Deadline **Fri 16 Oct, 18:20** (~3.5 days from Tue 13 Oct). It must work on phones and as a live website.

## Decisions (agreed)
| Area | Choice | Why |
|---|---|---|
| App | **Next.js (App Router) as a PWA**, TypeScript (loose), Tailwind + shadcn/ui | One codebase gives a phone app (installable) and a website. It's the fastest to ship and the best fit for map libraries. |
| Hosting | **Vercel** linked to GitHub | Every push gives a live URL, and every PR gets a preview link to test on phones. |
| Backend | **Supabase** (Postgres + Auth + Storage + Realtime) | SQL handles the many filters easily, it has built-in auth and realtime chat, and it's free. |
| Map | **MapLibre GL** (`react-map-gl/maplibre`) + free OpenFreeMap/MapTiler tiles | Free, modern look, clustering, can draw lines and buffers. |
| Geo maths | **turf.js** on the client | With ~150 properties we can load everything once and filter and measure distances in the browser. No PostGIS needed. |
| Data | Curated CSV + **Python enrichment script** | Reliable demo data, and it uses the team's Python strength. |

## Feature scope (priority order)
**P0 (must demo)**
- Uni-email sign-in (magic link / 6-digit OTP), only allowed for `.ac.uk` domains, plus a **"Demo login" button** for judges, who don't have uni emails.
- Map of all properties with pins coloured by provider group, a group filter chip bar (Unite / iQ / Chapter / Scape / Prestige / UCL / KCL / Imperial / …), and clustering.
- Filters: budget (£/week), room type (ensuite/studio/shared bathroom/twin), catered, 24/7 reception, accessibility, bike rental nearby, number of flatmates, contract weeks, max distance to supermarket and station, uni, area (borough).
- Property detail sheet: prices, room types, facilities, nearest supermarket and station (distance), affiliated uni, link out.
- **Between two points**: pick 2 campuses (or tap the map), draw the line, and show properties within X km of it, ranked by total distance.

**P1 (core differentiator)**
- Swap marketplace: create a listing ("I have room X, contract dates, price; I want: areas/properties/room types/max price"), with type **Swap** or **Contract release/takeover**.
- "Swap filter" on the map: show only properties with active listings.
- **Mutual match** badge: A's room fits B's wants AND B's room fits A's wants.
- 1-to-1 chat per listing (Supabase Realtime).
- Installable PWA (manifest, icons, home-screen launch).

**P2 (bonus)**
- House Share: profiles with lifestyle prefs (drinking, parties, smoking, instruments, pets, personality tags, languages, budget), a compatibility % score, and swipe/list view of people seeking a flat-share.

**P3 (stretch)**
- Summer storage board for international students (offer/need space, dates, price).
- Real transit times between two points via the TfL Journey Planner API.

## Data model (Supabase, `supabase/migrations/`)
- `universities(id, name, email_domains text[], colour)`
- `campuses(id, university_id, name, lat, lng)`: e.g. UCL Bloomsbury, UCL East Marshgate, KCL Strand/Guy's/Waterloo, Imperial South Ken/White City, QMUL Mile End, LSE…
- `providers(id, name, kind 'private'|'university', colour)`
- `properties(id, provider_id, affiliated_university_id?, name, address, postcode, borough, lat, lng, reception_24h bool, accessible bool, catered bool, facilities text[], bike_dock_m int, supermarket_name, supermarket_m int, station_name, station_m int, website, image_url)`
- `room_types(id, property_id, kind enum, price_week, flatmates int, contract_weeks int[])`
- `profiles(id → auth.users, display_name, university_id, course, year, languages text[], lifestyle jsonb, budget_max, bio, avatar_url)`
- `listings(id, user_id, property_id, kind 'swap'|'release', room_kind, price_week, start_date, end_date, flatmates, wants jsonb {property_ids, boroughs, room_kinds, max_price, campus_id}, description, photos text[], status)`
- `conversations(id, listing_id, user_a, user_b)` and `messages(id, conversation_id, sender_id, body, created_at)` with Realtime enabled.
- P2: `houseshare_posts(id, user_id, budget, areas, move_in, looking_for_n, prefs jsonb)`
- **RLS**: public read on properties, rooms, campuses and listings; write only your own listings and profile; messages readable only by conversation members.
- **Domain check**: a `before insert` trigger on `profiles` (or a Supabase *Before User Created* auth hook) rejects emails that don't end in `.ac.uk`. Demo accounts are seeded with `@demo.ac.uk`.
- **Mutual-match**: the SQL function `match_listings(listing_id)` returns listings where each side's `wants` is satisfied by the other's room. It's called via `supabase.rpc`.

## Data pipeline (Python, `data/`)
1. `data/properties.csv`: hand-curated ~80–150 London halls (name, provider, address, postcode, room types and prices, flags). Split the provider lists between all 3 people on Tuesday night for ~1 hour.
2. `data/enrich.py`:
   - Geocode the postcode with **postcodes.io** (free, no key) to get lat/lng and borough.
   - Nearest supermarket (`shop=supermarket`) and station (`railway=station`/`station=subway`) with the **Overpass API**, computing distances with haversine.
   - Nearest Santander Cycles dock from the **TfL BikePoint API** (free), giving the "bicycle rentals" filter.
   - Writes `data/properties.enriched.json`.
3. `data/seed.py` (uses `supabase-py`) upserts universities, campuses, providers, properties, room types, demo users and ~20 demo swap listings designed so a few mutual matches exist on stage.

## Repo structure
```
alonr/
  app/                  # Next.js routes
    (auth)/login/       # email OTP + demo login
    map/                # main map + filters + between-two-points
    property/[id]/
    swap/  swap/new/  swap/[id]/
    messages/  messages/[id]/
    houseshare/         # P2
    manifest.ts         # PWA manifest
  components/map/  components/filters/  components/swap/  components/ui/ (shadcn)
  lib/supabase/ (client.ts, server.ts)  lib/filters.ts  lib/geo.ts (turf helpers)  lib/types.ts (generated)
  supabase/migrations/  supabase/seed.sql
  data/ (csv, enrich.py, seed.py, requirements.txt)
  public/icons/
```

## Team split (folder ownership keeps merge conflicts low)
**Person A: Map & Explore** (frontend, most visual)
- MapLibre map, provider-coloured pins and clustering, group chips.
- Filter panel (bottom sheet on mobile) plus `lib/filters.ts` (pure functions, easy to test).
- Property detail sheet/page.
- Between-two-points: campus pickers, draw the line, `turf.pointToLineDistance` buffer, ranked list.
- Owns `app/map`, `app/property`, `components/map`, `components/filters`, `lib/geo.ts`.

**Person B: Accounts, Swap & Chat** (frontend + Supabase client)
- Login (OTP), demo login, onboarding profile form.
- Swap listing create/browse/detail, "My listings", the mutual-match badge (calls the RPC).
- Conversations and realtime chat.
- PWA manifest, icons, app shell and bottom nav.
- Owns `app/(auth)`, `app/swap`, `app/messages`, `components/swap`, `app/layout.tsx`.

**Person C: Data & Backend** (the Python-strongest teammate)
- Creates the Supabase project, writes the migrations, RLS and domain-check trigger, and generates TS types (`supabase gen types`) for A and B.
- `enrich.py` and `seed.py`, and the demo data story.
- `match_listings` SQL function; later the House Share compatibility score (SQL function or a small Python-written formula ported to TS).
- From Thursday: builds the House Share page with B's components.
- Owns `supabase/`, `data/`, `lib/types.ts`.

Everyone uses shadcn/ui components and one colour theme so the screens match. AI help is fine for TS syntax; the logic is the same as in Python.

## GitHub workflow
- One repo; protect `main` (PR required, 1 approval, or just a "don't push to main" rule).
- Branches: `a/map-filters`, `b/swap-listings`, `c/schema-v1`… Keep PRs small and merge at least twice a day.
- Vercel GitHub integration gives every PR a preview URL, so open it on your phone before approving.
- Secrets: `.env.local` is gitignored; `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` go in Vercel project settings. Only C's local `.env` holds the service-role key, for `seed.py`; it's **never** committed.
- Schema changes are made only by C, through migration files. A and B request them in the GitHub issue or chat.
- GitHub Projects board with columns P0/P1/P2, one issue per bullet above.

## Timeline (to Fri 18:20)
- **Tue 13 Oct (evening)**: C sets up the Supabase project and schema v1. B sets up the Next.js scaffold, Tailwind/shadcn, Vercel deploy, and a **live URL by end of night**. A does the MapLibre spike with hard-coded pins. Everyone: 1 hour filling `properties.csv`.
- **Wed 14**: C enriches and seeds the data. A builds the real map from Supabase, chips and the first filters. B does auth and demo login, the profile, and listing create/browse. **EOD: P0 map and login working on a phone.**
- **Thu 15**: A finishes all filters, between-two-points and the property page. B does chat and the PWA install. C builds the match RPC and demo listings, then House Share (P2). **EOD: P0 + P1 complete, merged and deployed.**
- **Fri 16**: until 14:00 finish P2 or polish. **14:00 feature freeze.** 14:00–16:30 bug bash on real phones (iOS Safari plus Android Chrome), reset the demo data. 16:30–18:00 slides, demo script, and a **backup screen recording**. 18:20 submit.

## Risks & mitigations
- Supabase's built-in email sender is limited to a few emails an hour. Use OTP codes, add free **Resend** SMTP if needed, and rely on the demo login for judges.
- Overpass API rate limits: run the enrichment once and commit `properties.enriched.json`.
- Map performance on phones: cluster the pins and load only ~150 rows.
- Merge conflicts: folder ownership, and only C edits migrations.

## Verification
- Open the Vercel production URL on iOS and Android, use "Add to Home Screen", and check it launches full-screen.
- Sign in with a `.ac.uk` address (works); a `gmail.com` address is rejected; the demo login works.
- Map: toggling each group chip and each filter changes the pin count as expected (unit tests in `lib/filters.ts` with Vitest).
- Between two points: pick UCL Bloomsbury and UCL East Marshgate; only properties near the line show, ranked by distance.
- Swap: two demo users with complementary listings both see the "Mutual match" badge; a message sent by one appears live for the other.
- Run `python data/enrich.py && python data/seed.py` on a fresh Supabase project to rebuild all the data.
