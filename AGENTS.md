# AGENTS.md — alonr

> Single source of truth for the alonr team **and** for any AI coding agent (Claude Code, Codex, Cursor, Copilot…).
> Read this whole file before writing code. Update it (commit to `main`) when a decision changes.

## Rules for AI coding agents (and humans)
1. **Stay in your lane:** only edit folders owned by your person (see *Team split*). Need a change elsewhere? Open an issue / ask the owner.
2. **Database schema changes only via new files in `supabase/migrations/`, made by Person C.** Never edit an already-merged migration. **Every new table needs `grant` statements** (see `20261013200000_api_grants.sql`) as well as RLS policies: this project doesn't auto-grant, so a missing grant gives `permission denied` (401/403).
3. **Never commit secrets:** `.env*` is gitignored (except `.env.example`). The Supabase **service-role key** must never appear in frontend code or git.
4. Frontend uses only the `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`; security comes from RLS policies.
5. **Work directly on `main`:** small, frequent commits. Always `git pull --rebase` before `git push`. Never force-push.
6. Before pushing: `npm run lint && npm test && npm run build` (frontend) / `python -m pytest` if touching `data/`. **Never push a broken build**: `main` deploys straight to the live site.
7. Mobile-first: design for ~390px width first, then desktop.
8. Use shadcn/ui components + Tailwind; don't add another UI library without team agreement.
9. Keep TypeScript simple (loose strictness OK). Prefer pure functions in `lib/` for logic so it can be unit-tested.
10. Don't add new paid services or API keys without telling the team.

## Status & who does what (updated Wed 14 Oct, evening)
Tick a box (`[x]`) in the same commit as the work. Pull before editing this section.

### Done (live on https://alonr.vercel.app)
- **Login** (C, design by B): `.ac.uk` email link, tester code for the `@demo.ac.uk` accounts (judge, amira, tom, mei, jonas, priya), `/auth/callback`, Me tab with sign out.
- **Map on real data** (A, loader by C): 48 halls from B's CSV, provider-coloured pins, provider chips, price/catered/24-7/accessible filters, nearby search with your location, list view `/search`.
- **Property page** `/property/[id]` (C): rooms & prices, facilities, nearby walk times, active listings at that hall, website. Map popups link to it.
- **Data** (C, CSV by B): `check_csv.py` → `enrich.py` → `seed.py`. 48 halls, all priced; 20 provider groups; 6 demo users; 2 mutually-matching swap pairs + 1 contract release.

### To do
**A: Map**
- [ ] Cluster pins
- [ ] Between two points: pick 2 campuses, draw the line, ranked list (`propertiesBetween` in `lib/geo.ts` is ready)
- [ ] Hide the Prestige chip (0 halls) and tidy the long chip bar
- [ ] "Has listings" filter on the map (after C's `lib/data/listings.ts`)

**B: Listings** (was "Swap")
- [ ] Rename Swap → **Listings**: bottom-nav tab and routes `/listings`, `/listings/new`, `/listings/[id]`
- [ ] "Create listing" button + form: pick the hall → room type, price, flatmates and contract weeks **auto-fill** from that hall (`prefillFromHall`); the user sets contract dates, description, photos, kind (swap / contract release) and what they want (halls, room types, max price)
- [ ] Vinted-style feed: photo cards, **like** (heart) on each, tap to open
- [ ] Listing detail: photos, info, like, **"Message"** button → `startConversation` → `/messages/<id>`
- [ ] **Quick match** (swaps only), on the listings page: dating-app style cards of listings that fit your wants AND whose wants your hall fits (`quickMatches`), with pass / like
- [ ] "Mutual match" badge
- Use the functions in `lib/data/listings.ts` (C) rather than writing your own queries.
- CSV edits: save as **CSV UTF-8**, use university ids (`kcl`, not "King's College London"), run `python data/check_csv.py` before pushing.

**C: Backend + Chat**
- [ ] Migration: `listing_likes` (with public like counts), `listing-photos` storage bucket, `start_conversation()` function (C runs `npx supabase db push`)
- [ ] `lib/data/listings.ts` + tests: `getListings`, `getListing`, `createListing`, `prefillFromHall`, `like` / `unlike` / `myLikes`, `quickMatches`, `startConversation`, `uploadPhoto`
- [ ] Seed ~10–12 demo listings with good matching pairs (e.g. near UCL Bloomsbury ↔ near UCL East)
- [ ] Chat: `/messages` + `/messages/[id]` with Realtime (C offered to take this from B; B to confirm)
- [ ] Gmail SMTP so real students also get a 6-digit code
- [ ] House Share (P2): agree the `profiles.lifestyle` keys first

**Everyone, Fri:** 14:00 feature freeze → bug bash on real phones → reset demo data → slides + backup screen recording.

## Getting started
The scaffold is **done** (Next.js 16, React 19, Tailwind 4, shadcn/ui on Base UI, Supabase clients, MapLibre, turf, Vitest). Just:
```bash
npm install
cp .env.example .env.local     # Supabase values from Person C (map works without them)
npm run dev                    # http://localhost:3000 → /map
npm test                       # Vitest unit tests (lib/*.test.ts)
```
Python (Person C): `python -m venv .venv`, activate it (`.venv\Scripts\activate` on Windows), `pip install -r data/requirements.txt`.

### What's already there
- `app/layout.tsx`: mobile app shell + bottom nav (`components/bottom-nav.tsx`), PWA metadata. `app/manifest.ts` + `public/icons/` make it installable.
- `app/map` → `components/map/map-view.tsx`: MapLibre map of the **real halls** from Supabase (`useProperties()` in `lib/data/use-properties.ts`; falls back to `lib/sample-data.ts` without keys) with provider chips and filters. `app/search`: the same halls as a list. `app/property/[id]`: hall page.
- `lib/filters.ts` (all property filters), `lib/geo.ts` (`propertiesBetween`, `distanceKm`), tests in `lib/filters.test.ts`.
- `lib/types.ts`: placeholder types until `supabase gen types` replaces them.
- **Supabase is live** (schema v1 in `supabase/migrations/`). `lib/database.types.ts` is generated from it: never edit by hand, Person C regenerates with `npm run db:types`. The clients in `lib/supabase/` are already typed with it, so `.from("listings")` autocompletes columns. RPC: `supabase.rpc('match_listings', { p_listing_id })`.
- `lib/supabase/client.ts` (client components) and `server.ts` (server components).
- Placeholder pages still to build (`components/placeholder-page.tsx`): `/swap` and `/swap/new` (becoming `/listings`), `/messages`, `/houseshare`.
- `data/properties.csv`: template; **one row per room type** (same hall repeated), lists separated by `;`, put your initial in `added_by`.

### Next.js 16 gotchas (read before coding)
- `cacheComponents` is on: request-time data (`usePathname`, `useSearchParams`, `cookies()`, `params`) must render inside `<Suspense>`, or the build fails. See `app/property/[id]/page.tsx` and the nav in `app/layout.tsx` for the pattern.
- Middleware is now called **`proxy.ts`** (project root).
- shadcn here uses **Base UI**, not Radix: there's no `asChild`. Style a `<Link>` with `buttonVariants()` instead.
- Run `npm run build` before pushing; it catches the Suspense errors that `npm run dev` doesn't.

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
| Hosting | **Vercel** linked to GitHub | Every push to `main` redeploys the live URL. |
| Backend | **Supabase** (Postgres + Auth + Storage + Realtime) | SQL handles the many filters easily, it has built-in auth and realtime chat, and it's free. |
| Map | **MapLibre GL** (`react-map-gl/maplibre`) + free OpenFreeMap/MapTiler tiles | Free, modern look, clustering, can draw lines and buffers. |
| Geo maths | **turf.js** on the client | With ~150 properties we can load everything once and filter and measure distances in the browser. No PostGIS needed. |
| Data | Curated CSV + **Python enrichment script** | Reliable demo data, and it uses the team's Python strength. |

## Feature scope (priority order)
**P0 (must demo)**
- Uni-email sign-in (magic link / 6-digit OTP), only allowed for `.ac.uk` domains, plus a **"Demo login" button** for judges, who don't have uni emails.
- Map of all properties with pins coloured by provider group, a group filter chip bar (Unite / iQ / Chapter / Scape / Prestige / UCL / KCL / Imperial / …), and clustering.
- Filters: budget (£/week), room type (ensuite/studio/shared bathroom/twin), catered, 24/7 reception, accessibility, bike rental nearby, number of flatmates, contract weeks, max distance to supermarket and station, and uni.
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
- `properties(id, provider_id, affiliated_university_id?, name, address, postcode, lat, lng, reception_24h bool, accessible bool, catered bool, facilities text[], bike_dock_m int, supermarket_name, supermarket_m int, station_name, station_m int, website, image_url)`
- `room_types(id, property_id, kind enum, price_week, flatmates int, contract_weeks int[])`
- `profiles(id → auth.users, display_name, university_id, course, year, languages text[], lifestyle jsonb, budget_max, bio, avatar_url)`
- `listings(id, user_id, property_id, kind 'swap'|'release', room_kind, price_week, start_date, end_date, flatmates, wants jsonb {property_ids, room_kinds, max_price, campus_id}, description, photos text[], status)`
- `conversations(id, listing_id, user_a, user_b)` and `messages(id, conversation_id, sender_id, body, created_at)` with Realtime enabled.
- P2: `houseshare_posts(id, user_id, budget, areas, move_in, looking_for_n, prefs jsonb)`
- **RLS**: public read on properties, rooms, campuses and listings; write only your own listings and profile; messages readable only by conversation members.
- **Domain check**: the `on_auth_user_created` trigger on `auth.users` rejects sign-ups whose email doesn't end in `.ac.uk`, and auto-creates the `profiles` row (university matched from the email domain). Demo accounts use `@demo.ac.uk` (`is_demo = true`).
- **Mutual-match**: the SQL function `match_listings(listing_id)` returns listings where each side's `wants` is satisfied by the other's room. It's called via `supabase.rpc`.

## Data pipeline (Python, `data/`)
No borough anywhere: location is just postcode + lat/lng.
1. `data/properties.csv`: one row per room type (the same hall repeats). **A hall with no prices yet is a single row with `room_kind`/`price_week` blank.** It shows on the map; the price filters skip it.
2. `data/import_osm.py`: adds halls from OpenStreetMap (default 50, spread evenly across London) with only **name, provider (when guessable), postcode, lat, lng** filled in and `added_by=osm`. **The team fills in the rest:** provider where blank, room types and prices, catered, 24/7 reception, accessible, facilities, website. Re-running skips halls already in the CSV (`-n 30` adds 30 more).
3. `data/enrich.py`: lat/lng from the CSV (postcodes.io only if blank), nearest supermarket and station from an **offline OSM file** (`data/osm.py` downloads the Geofabrik Greater London extract, ~130 MB, once into `data/.cache/`), and the nearest Santander Cycles dock (TfL BikePoint API). No Overpass: it was too unreliable.
4. `data/seed.py` upserts properties and room types, the 6 demo users, and demo swap listings in pairs that mutually match (person X wants hall Q, person Y wants hall P). It only uses halls with prices.
5. **Run it (Person C):** `python data/import_osm.py` (once) → fill in the CSV → `python data/check_csv.py` (lists every problem at once; fix the ERRORs) → `python data/enrich.py` → `python data/seed.py --dry-run` → `python data/seed.py`. All are safe to re-run. **The CSV is the master copy:** don't edit halls in the Supabase dashboard (seed overwrites them). seed only adds and updates; after removing or renaming halls in the CSV, run `python data/seed.py --dry-run --prune` then `python data/seed.py --prune` to delete the leftovers (halls with real students' listings are never deleted). Tests: `python -m pytest data`.
6. **Login + tester code:** use `lib/auth.ts` on the login page: `startSignIn(supabase, email)` then `verifyCode(supabase, email, code)`. Real `.ac.uk` students get a sign-in email (link; a code too once SMTP is set up). **Testers use the 6 `@demo.ac.uk` accounts** created by seed.py (`judge` for judges, plus `amira`, `tom`, `mei`, `jonas`, `priya`): **no email is sent**, they type the shared tester code (`DEMO_PASSWORD`, ask C, never commit it). Matching demo swaps appear once at least 4 halls have prices.

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

## Dependencies between teammates
Most dependencies run through **Person C**, because A and B both need the database. **C ships keys + schema v1 tonight / first thing Wednesday, rough is fine.** Columns can be added later with new migrations.

**Everyone waits on C**
| C delivers | Needed by | Unblocks |
|---|---|---|
| Supabase project + `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` (shared privately) | A, B | B: login. A: real data |
| Schema v1 (`properties`, `room_types`, `profiles`, `listings`, `conversations`, `messages`) | A, B | B: saving listings, chat |
| Generated types in `lib/types.ts` | A, B | Agreed field names |
| Seeded real halls (`data/seed.py`) | A | Swap sample data → real data |
| `match_listings` RPC | B | "Mutual match" badge |
| Demo users + listings | B, demo | Testing chat with 2 users; matches on stage |

**A ↔ B**
- Listings reference `properties.id`: B's "new listing" form picks from properties, and A's map "swap filter" shows halls with active listings. Both use the same table.
- URLs are agreed: `/property/<id>` (A) shows that hall's active listings and links to `/swap/<id>` (B), and the reverse.
- `app/layout.tsx` + `components/bottom-nav.tsx` are owned by B; A asks before changing them.

**B → C (later)**
- House Share (C) reads the profile created by B's onboarding. Agree the `profiles.lifestyle` keys (drinking, parties, smoking, instruments, pets, personality, languages, budget) **before** B builds the form.

**How not to block each other**
1. Agree the data shape first: C posts schema v1 and A and B review it (15 min).
2. A builds on `lib/sample-data.ts`, which has the same shape as the real data, so switching to Supabase is a one-line change.
3. B builds forms and pages with hard-coded data first, then wires them to Supabase when the keys arrive.
4. `lib/types.ts` is the contract: rename a column → update the types in the same commit and tell the team.

## GitHub workflow
- Everyone commits and pushes **straight to `main`** (hackathon speed). Folder ownership is what prevents conflicts.
- Loop: `git pull --rebase` → code → lint/test/build → `git add <your files>` → `git commit -m "..."` → `git pull --rebase` → `git push`.
- Pull conflict? Fix the marked files, `git add` them, then `git rebase --continue`. Never `git push --force`.
- Commit small and often (at least every couple of hours), so others pick up your work early.
- Every push to `main` redeploys the live Vercel site: check it on your phone after pushing.
- Secrets: `.env.local` is gitignored; `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` go in Vercel project settings. Only C's local `.env.local` holds the service-role key, for `seed.py`; it's **never** committed.
- Schema changes are made only by C, through migration files. A and B request them in the GitHub issue or chat.
- GitHub Projects board with columns P0/P1/P2, one issue per bullet above.

## Timeline (to Fri 18:20)
- **Tue 13 Oct (evening)**: C sets up the Supabase project and schema v1. B sets up the Next.js scaffold, Tailwind/shadcn, Vercel deploy, and a **live URL by end of night**. A does the MapLibre spike with hard-coded pins. Everyone: 1 hour filling `properties.csv`.
- **Wed 14**: C enriches and seeds the data. A builds the real map from Supabase, chips and the first filters. B does auth and demo login, the profile, and listing create/browse. **EOD: P0 map and login working on a phone.**
- **Thu 15**: A finishes all filters, between-two-points and the property page. B does chat and the PWA install. C builds the match RPC and demo listings, then House Share (P2). **EOD: P0 + P1 complete, merged and deployed.**
- **Fri 16**: until 14:00 finish P2 or polish. **14:00 feature freeze.** 14:00–16:30 bug bash on real phones (iOS Safari plus Android Chrome), reset the demo data. 16:30–18:00 slides, demo script, and a **backup screen recording**. 18:20 submit.

## Risks & mitigations
- Supabase's built-in email sender is limited to a few emails an hour. Use OTP codes, add free **Resend** SMTP if needed, and rely on the demo login for judges.
- Free map APIs are flaky (Overpass was down for hours): enrichment uses a downloaded OSM file instead, and `properties.enriched.json` is committed.
- Map performance on phones: cluster the pins and load only ~150 rows.
- Merge conflicts: folder ownership, and only C edits migrations.

## Verification
- Open the Vercel production URL on iOS and Android, use "Add to Home Screen", and check it launches full-screen.
- Sign in with a `.ac.uk` address (works); a `gmail.com` address is rejected; the demo login works.
- Map: toggling each group chip and each filter changes the pin count as expected (unit tests in `lib/filters.ts` with Vitest).
- Between two points: pick UCL Bloomsbury and UCL East Marshgate; only properties near the line show, ranked by distance.
- Swap: two demo users with complementary listings both see the "Mutual match" badge; a message sent by one appears live for the other.
- Run `python data/enrich.py && python data/seed.py` on a fresh Supabase project to rebuild all the data.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
