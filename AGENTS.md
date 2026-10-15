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
- **Login** (C, design by B): `.ac.uk` email link, tester code for the 12 `@demo.ac.uk` demo accounts, `/auth/callback`, Me tab with sign out.
- **Map on real data** (A, loader by C): 48 halls from B's CSV, provider-coloured pins, provider chips, clustered pins, all the filters (price, room type, flatmates, contract weeks, uni, walk to supermarket/station, bike dock, catered, 24/7, accessible, "Has rooms listed"), nearby search with your location, list view `/search` with listing counts. Chips with 0 halls are hidden.
- **Property page** `/property/[id]` (C): rooms & prices, facilities, nearby walk times, active listings at that hall, website. Map popups link to it.
- **Data** (C, CSV by B): `check_csv.py` → `enrich.py` → `seed.py`. 48 halls, all priced; 20 provider groups; 12 demo users; 11 demo listings with 23 likes (see *Demo story*).

### To do (in this order)
Agents: do the tasks under **your person** only, top first. Stay inside the folders that person owns (see *Team split*).

**A: Map** (owns `app/map`, `app/search`, `app/property`, `components/map`, `components/filters`, `lib/geo.ts`, `lib/filters.ts`)
1. [x] `git pull --rebase` first (new provider chips + this file).
2. [x] Cluster the pins (MapLibre GeoJSON source with `cluster: true`), so central London isn't a pile of overlapping pins.
3. [x] Hide the Prestige chip (0 halls) and tidy the chip bar (20 chips, scrolls sideways).
4. [x] After C pushes `lib/data/listings.ts`: a "Has listings" filter on the map, and the listing count on each hall card in `/search`.

**B: Listings** (was "Swap"; owns `app/(auth)`, `app/listings`, `components/listings`, `app/layout.tsx`, `components/bottom-nav.tsx`)
1. [x] Rename Swap → **Listings**: bottom-nav tab and routes `/listings`, `/listings/new`, `/listings/[id]` (delete `app/swap`).
2. [x] Build the screens with **placeholder data first** (don't wait for C):
   - Feed, Vinted-style: photo cards, a **like** (heart) on each, tap to open.
   - "Create listing" button + form: pick the hall → room type, price, flatmates and contract weeks **auto-fill** from that hall; the user sets contract dates, description, photos, kind (swap / contract release) and what they want (halls, room types, max price).
   - Listing detail: photos, info, like, and a **"Message"** button.
   - **Quick match** (swaps only), on the listings page: dating-app style cards of listings that fit your wants AND whose wants your hall fits, with pass / like.
   - "Mutual match" badge.
3. [x] Swap the placeholder data for C's functions in `lib/data/listings.ts` (**ready**, each is documented in the file): `getListings`, `getMyListings`, `getListing`, `createListing` + `validateListing`, `prefillFromHall`, `like` / `unlike` / `myLikes` / `getLikedListings`, `quickMatches` (pass `exclude` = ids the user swiped away), `isMutualMatch`, `uploadPhoto`, `setListingStatus`, `deleteListing`. They throw an `Error` whose message you can show. Don't write your own Supabase queries for these.
4. [x] The "Message" button calls `startConversation(listingId)` and goes to `/messages/<conversation id>`. **Chat itself is C's** (don't build `/messages`).
- CSV edits: save as **CSV UTF-8**, use university ids (`kcl`, not "King's College London"), run `python data/check_csv.py` before pushing.

**C: Backend + Chat** (owns `supabase/`, `data/`, `lib/types.ts`, `lib/data/`, `app/messages`, `components/chat`)
1. [x] Migration: `listing_likes` (public like counts, not who liked), `listing-photos` storage bucket, `start_conversation(listing_id)` (get-or-create). C runs `npx supabase db push`.
2. [x] `lib/data/listings.ts` + tests: the functions B uses (list above) plus `startConversation`.
3. [x] Seed ~10–12 demo listings with good matching pairs (e.g. near UCL Bloomsbury ↔ near UCL East) so the feed and Quick match aren't empty.
4. [x] **Chat**: `/messages` (my conversations, newest first, with the listing) and `/messages/[id]` (messages, live via Supabase Realtime, send box).
5. [ ] Gmail SMTP so real students also get a 6-digit code.
6. [ ] House Share (P2): agree the `profiles.lifestyle` keys first.

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
- Placeholder pages still to build (`components/placeholder-page.tsx`): `/messages` (Person C) and `/houseshare` (P2).
- `data/properties.csv`: template; **one row per room type** (same hall repeated), lists separated by `;`, put your initial in `added_by`.

### Next.js 16 gotchas (read before coding)
- `cacheComponents` is on: request-time data (`usePathname`, `useSearchParams`, `cookies()`, `params`) must render inside `<Suspense>`, or the build fails. See `app/property/[id]/page.tsx` and the nav in `app/layout.tsx` for the pattern.
- Middleware is now called **`proxy.ts`** (project root).
- shadcn here uses **Base UI**, not Radix: there's no `asChild`. Style a `<Link>` with `buttonVariants()` instead.
- Run `npm run build` before pushing; it catches the Suspense errors that `npm run dev` doesn't.

## Context
London students are stuck with accommodation contracts they no longer want: the wrong campus (e.g. UCL Bloomsbury → UCL East Marshgate), the wrong price, or the wrong room type. They also have no easy way to compare halls across providers (Unite, iQ, Chapter, Scape, Prestige, UCL/KCL/Imperial halls). **alonr** is a verified-student app with three parts:
1. A **London accommodation map** with rich filters and a nearby search.
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
- ~~Between two points~~: **dropped** (Wed 14 Oct) to focus on Listings and chat.

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
6. **Login + tester code:** use `lib/auth.ts` on the login page: `startSignIn(supabase, email)` then `verifyCode(supabase, email, code)`. Real `.ac.uk` students get a sign-in email (link; a code too once SMTP is set up). **Testers use the 12 `@demo.ac.uk` accounts** created by seed.py (`judge` for judges, plus `amira`, `tom`, `mei`, `jonas`, `priya`, `leo`, `sara`, `omar`, `chloe`, `ravi`, `hana`): **no email is sent**, they type the shared tester code (`DEMO_PASSWORD`, ask C, never commit it).
7. **Demo story** (`DEMO_LISTINGS` in `data/seed.py`; re-running seed.py resets it):
   - Mutual swap pairs, each sees the other in Quick match: **Amira ↔ Tom** (UCL: Wick Park near UCL East ↔ James Lighthill House in Bloomsbury), **Mei ↔ Jonas** (Chapter King's Cross studio too pricey ↔ LSE High Holborn), **Sara ↔ Leo** (Imperial: South Kensington ↔ White City).
   - **Omar** (Floyer House, wants any ensuite under £260) has no match yet. **On stage:** log in as `judge`, create a swap at Templars House (ensuite £205) that wants Floyer House → Omar appears in Quick match with the mutual-match badge.
   - Chloe: swap with no match. Priya, Hana, Ravi: contract releases. The judge has no listings.

## Repo structure
```
alonr/
  app/                  # Next.js routes
    (auth)/login/       # email OTP + demo login
    map/                # main map + filters
    property/[id]/
    listings/  listings/new/  listings/[id]/   # was swap/
    messages/  messages/[id]/
    houseshare/         # P2
    manifest.ts         # PWA manifest
  components/map/  components/filters/  components/listings/  components/chat/  components/ui/ (shadcn)
  lib/data/             # typed data functions (C): properties, listings, likes, conversations
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
- Owns `app/map`, `app/property`, `components/map`, `components/filters`, `lib/geo.ts`.

**Person B: Accounts & Listings** (frontend + Supabase client)
- Login design, onboarding profile form.
- Listings (was "Swap"): create/browse/detail, likes, Quick match, "My listings", the mutual-match badge.
- PWA manifest, icons, app shell and bottom nav.
- Owns `app/(auth)`, `app/listings`, `components/listings`, `app/layout.tsx`, `components/bottom-nav.tsx`.

**Person C: Data & Backend** (the Python-strongest teammate)
- Creates the Supabase project, writes the migrations, RLS and domain-check trigger, and generates TS types (`supabase gen types`) for A and B.
- `enrich.py` and `seed.py`, and the demo data story.
- `match_listings` SQL function; later the House Share compatibility score (SQL function or a small Python-written formula ported to TS).
- `lib/data/` (typed data functions the pages call: halls, listings, likes, conversations).
- **Chat** (taken over from B): `/messages`, `/messages/[id]`, Supabase Realtime.
- Then the House Share page with B's components.
- Owns `supabase/`, `data/`, `lib/types.ts`, `lib/data/`, `app/messages`, `components/chat`.

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
- URLs are agreed: `/property/<id>` (A) shows that hall's active listings and links to `/listings/<id>` (B), and the reverse. A listing's "Message" button (B) opens `/messages/<conversation id>` (C).
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
- **Thu 15**: A finishes all filters, clustering and map polish. B builds Listings (feed, create, likes, Quick match) and the PWA install. C ships the listings backend + demo listings, then chat, then House Share (P2). **EOD: P0 + P1 complete, merged and deployed.**
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
- Swap: two demo users with complementary listings both see the "Mutual match" badge; a message sent by one appears live for the other.
- Run `python data/enrich.py && python data/seed.py` on a fresh Supabase project to rebuild all the data.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
