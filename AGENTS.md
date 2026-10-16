# AGENTS.md: alonr

> Notes for anyone (human or AI coding agent) changing this code. What the app is and how to try it: see [README.md](README.md).

## Rules
1. **Database changes only through new files in `supabase/migrations/`.** Never edit a migration that has already been applied. **Every new table needs `grant` statements** (see `20261013200000_api_grants.sql`) as well as RLS policies: this project doesn't auto-grant, so a missing grant gives `permission denied` (401/403).
2. **Never commit secrets.** `.env*` is gitignored (except `.env.example`). The Supabase **service-role key** must never appear in frontend code or git. The demo tester code (`DEMO_PASSWORD`) is never committed either.
3. The frontend uses only `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`; security comes from RLS policies.
4. Before pushing: `npm run lint && npm test && npm run build` (and `python -m pytest data` if you touched `data/`). **Never push a broken build**: `main` deploys straight to the live site. Always `git pull --rebase` first; never force-push.
5. Mobile-first: design for ~390px width first, then desktop.
6. Use shadcn/ui components + Tailwind; don't add another UI library.
7. Prefer pure functions in `lib/` for logic so it can be unit-tested (Vitest, `lib/*.test.ts`). `lib/` must not import from `app/`.
8. `lib/database.types.ts` is generated from the live schema: never edit it by hand, regenerate with `npm run db:types`.

## Next.js 16 gotchas
- `cacheComponents` is on: request-time data (`usePathname`, `useSearchParams`, `cookies()`, `params`) must render inside `<Suspense>`, or the build fails. See `app/property/[id]/page.tsx` for the pattern. `npm run dev` doesn't catch this; `npm run build` does.
- Middleware is called **`proxy.ts`** (project root).
- shadcn here uses **Base UI**, not Radix: there's no `asChild`. Style a `<Link>` with `buttonVariants()` instead.
- Redirects (`/` → `/listings`, `/search` → `/listings?view=halls`) live in `next.config.ts`, not in pages.
- The React hooks lint rule forbids calling `setState` synchronously inside an effect.

## Data model (Supabase, `supabase/migrations/`)
- `universities(id, name, email_domains text[], colour)`, `campuses(id, university_id, name, lat, lng)`, `providers(id, name, kind, colour)`
- `properties(…, name, address, postcode, lat, lng, reception_24h, accessible, catered, facilities[], bike_dock_m, supermarket_name/_m, station_name/_m, website)` and `room_types(property_id, kind, price_week, flatmates, contract_weeks[])`
- `profiles(id → auth.users, display_name, university_id, languages[], lifestyle jsonb, bio, is_demo, …)`
- `listings(user_id, property_id, kind 'swap'|'release', room_kind, price_week, start_date, end_date, flatmates, wants jsonb {property_ids, room_kinds, max_price}, description, photos[], status)`, `listing_likes` (public counts, not who liked), `listing-photos` storage bucket
- `conversations(listing_id, user_a, user_b)` and `messages(conversation_id, sender_id, body, created_at)`, with Realtime enabled; `start_conversation(listing_id)` gets or creates one.
- **RLS:** public read on halls, rooms and listings; signed-in students can read profiles; you write only your own listings and profile; messages are readable only by the two people in the conversation.
- **Domain check:** the `on_auth_user_created` trigger rejects sign-ups whose email doesn't end in `.ac.uk` and creates the `profiles` row (university matched from the email domain). Demo accounts use `@demo.ac.uk` (`is_demo = true`).
- **Mutual match:** `match_listings(listing_id)` returns listings where each side's `wants` is met by the other's room; called via `supabase.rpc`.
- **House Share** is front-end only for now: 50 illustrative households in `app/houseshare/demo-data.ts`; posts people create are stored in the browser (`demo-storage.ts`). Filtering and compatibility scoring are pure functions in `lib/house-share-*.ts`, ready for a future `houseshare_posts` table.

## Data pipeline (Python, `data/`)
1. `data/properties.csv` is the master copy of the halls: one row per room type (the same hall repeats). Don't edit halls in the Supabase dashboard; `seed.py` overwrites them.
2. `python data/check_csv.py`: lists every problem at once; fix the ERRORs.
3. `python data/enrich.py`: nearest supermarket and station from an offline OpenStreetMap extract (`data/osm.py` downloads it once into `data/.cache/`), and the nearest Santander Cycles dock (TfL BikePoint API). Output: `data/properties.enriched.json` (committed).
4. `python data/seed.py --dry-run`, then `python data/seed.py`: upserts halls and room types, the 12 demo users and the demo story. Needs `SUPABASE_SERVICE_ROLE_KEY` and `DEMO_PASSWORD` in `.env.local`. Safe to re-run; it **resets the demo data**. `--skip-demo` updates halls only; `--prune` deletes halls no longer in the CSV (never ones with real students' listings); `--demo-profiles-only` refreshes demo bios.
5. Tests: `python -m pytest data`.

**Sign-in:** `lib/auth.ts` (`startSignIn`, then `verifyCode`). Real `.ac.uk` students get a 6-digit code by email through Gmail SMTP (`[auth.email.smtp]` in `supabase/config.toml`, templates in `supabase/templates/`; the credentials live only in the maintainer's `.env.local`). The 12 `@demo.ac.uk` accounts get no email; they type the shared tester code.

**Demo story** (`DEMO_LISTINGS` in `data/seed.py`):
- Mutual swap pairs that see each other in **Match**: Amira ↔ Tom (UCL: Wick Park ↔ James Lighthill House), Mei ↔ Jonas (Chapter King's Cross ↔ LSE High Holborn), Sara ↔ Leo (Imperial: Willis Jackson Hall ↔ Gradpad White City).
- **Omar** (Floyer House, shared bathroom, wants an ensuite under £260) has no match yet. **On stage:** as `judge`, list a swap at Templars House (ensuite £205) that wants Floyer House **and tick "Shared bathroom"** under room types (the form pre-ticks only Ensuite, and Omar's room is a shared bathroom). Omar then appears in Match with the Mutual match badge.
- Chloe: a swap with no match. Priya, Hana, Ravi: contract releases. The judge starts with no listings.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
