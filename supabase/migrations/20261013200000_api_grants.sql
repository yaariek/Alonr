-- Table privileges for the Data API roles. This project does not auto-grant new tables,
-- so every new table needs grants here as well as RLS policies (RLS still decides which rows).

grant usage on schema public to anon, authenticated, service_role;

-- Public, read-only data (also visible before login)
grant select on public.universities, public.campuses, public.providers,
                public.properties, public.room_types, public.listings
  to anon, authenticated;

-- Signed-in students
grant select, update on public.profiles to authenticated;
grant insert, update, delete on public.listings to authenticated;
grant select, insert on public.conversations, public.messages to authenticated;

-- Swap matching RPC
grant execute on function public.match_listings(uuid) to anon, authenticated;
grant execute on function public.listing_satisfies(public.listings, jsonb) to anon, authenticated;

-- Server-side scripts (data/seed.py) using the service_role key
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
