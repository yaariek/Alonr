-- alonr schema v1 (Person C). Never edit after it's merged; add a new migration instead.

-- ───────────── Enums ─────────────
create type public.room_kind as enum ('ensuite', 'studio', 'shared_bathroom', 'twin', 'non_ensuite');
create type public.listing_kind as enum ('swap', 'release');
create type public.listing_status as enum ('active', 'matched', 'closed');

-- ───────────── Reference data ─────────────
create table public.universities (
  id            text primary key,              -- e.g. 'ucl'
  name          text not null,
  email_domains text[] not null default '{}',  -- e.g. {'ucl.ac.uk'}; subdomains also match
  colour        text
);

create table public.campuses (
  id            text primary key,              -- e.g. 'ucl-bloomsbury'
  university_id text not null references public.universities on delete cascade,
  name          text not null,
  lat           double precision not null,
  lng           double precision not null
);

create table public.providers (
  id     text primary key,                     -- e.g. 'unite'
  name   text not null,                        -- matches ProviderGroup in lib/types.ts
  kind   text not null check (kind in ('private', 'university')),
  colour text
);

-- ───────────── Accommodation ─────────────
create table public.properties (
  id                       uuid primary key default gen_random_uuid(),
  slug                     text not null unique,   -- stable key used by data/seed.py upserts
  provider_id              text not null references public.providers,
  affiliated_university_id text references public.universities,
  name                     text not null,
  address                  text,
  postcode                 text,
  borough                  text,
  lat                      double precision,
  lng                      double precision,
  reception_24h            boolean not null default false,
  accessible               boolean not null default false,
  catered                  boolean not null default false,
  facilities               text[] not null default '{}',
  supermarket_name         text,
  supermarket_m            integer,
  station_name             text,
  station_m                integer,
  bike_dock_m              integer,
  website                  text,
  image_url                text,
  created_at               timestamptz not null default now()
);

create table public.room_types (
  id             uuid primary key default gen_random_uuid(),
  property_id    uuid not null references public.properties on delete cascade,
  kind           public.room_kind not null,
  price_week     numeric(7, 2) not null,
  flatmates      integer not null default 0,
  contract_weeks integer[] not null default '{}',
  unique (property_id, kind)                      -- one row per room kind per hall
);
create index on public.room_types (property_id);

-- ───────────── People ─────────────
create table public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  email         text not null,
  display_name  text,
  university_id text references public.universities,
  course        text,
  year          integer,
  languages     text[] not null default '{}',
  -- House Share prefs; keys agreed between B and C, e.g.
  -- {"drinking":"sometimes","parties":false,"smoking":false,"instruments":["guitar"],"pets":false,"personality":["quiet"]}
  lifestyle     jsonb not null default '{}',
  budget_max    numeric(7, 2),
  bio           text,
  avatar_url    text,
  is_demo       boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ───────────── Swap marketplace ─────────────
create table public.listings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles on delete cascade,
  property_id uuid not null references public.properties,
  kind        public.listing_kind not null,
  room_kind   public.room_kind not null,
  price_week  numeric(7, 2) not null,
  start_date  date,
  end_date    date,
  flatmates   integer,
  -- What the lister wants in return; every key optional / empty = "any":
  -- {"room_kinds":["studio"],"max_price":350,"property_ids":["<uuid>"],"boroughs":["Camden"],"campus_id":"ucl-east"}
  wants       jsonb not null default '{}',
  description text,
  photos      text[] not null default '{}',
  status      public.listing_status not null default 'active',
  created_at  timestamptz not null default now()
);
create index on public.listings (property_id);
create index on public.listings (user_id);

create table public.conversations (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings on delete set null,
  user_a     uuid not null references public.profiles on delete cascade,
  user_b     uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a <> user_b),
  unique (listing_id, user_a, user_b)
);

create table public.messages (
  id              bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations on delete cascade,
  sender_id       uuid not null default auth.uid() references public.profiles on delete cascade,
  body            text not null check (length(trim(body)) > 0),
  created_at      timestamptz not null default now()
);
create index on public.messages (conversation_id, created_at);

-- ───────────── Uni-email gate + auto profile ─────────────
-- Runs when someone signs up. Raising an exception aborts the sign-up,
-- so only *.ac.uk emails can create accounts.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  domain text := lower(split_part(new.email, '@', 2));
begin
  if new.email is null or domain not like '%.ac.uk' then
    raise exception 'alonr is for university students: sign up with your .ac.uk email';
  end if;

  insert into public.profiles (id, email, university_id, is_demo)
  values (
    new.id,
    new.email,
    (select u.id from public.universities u, unnest(u.email_domains) d
      where domain = d or domain like '%.' || d
      limit 1),
    domain = 'demo.ac.uk'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────── Swap matching ─────────────
-- Does listing h satisfy the wants w? Empty/missing keys mean "any".
create function public.listing_satisfies(h public.listings, w jsonb)
returns boolean
language sql
stable
set search_path = ''
as $$
  select
    (coalesce(jsonb_array_length(w -> 'room_kinds'), 0) = 0 or (w -> 'room_kinds') ? h.room_kind::text)
    and (w ->> 'max_price' is null or h.price_week <= (w ->> 'max_price')::numeric)
    and (coalesce(jsonb_array_length(w -> 'property_ids'), 0) = 0 or (w -> 'property_ids') ? h.property_id::text)
    and (coalesce(jsonb_array_length(w -> 'boroughs'), 0) = 0
         or exists (select 1 from public.properties p
                    where p.id = h.property_id and (w -> 'boroughs') ? p.borough));
$$;

-- Mutual matches for a swap listing: B fits A's wants AND A fits B's wants.
-- Frontend: supabase.rpc('match_listings', { p_listing_id })
create function public.match_listings(p_listing_id uuid)
returns setof public.listings
language sql
stable
set search_path = ''
as $$
  select b.*
  from public.listings a
  join public.listings b on b.id <> a.id
  where a.id = p_listing_id
    and a.kind = 'swap' and b.kind = 'swap'
    and b.status = 'active'
    and b.user_id <> a.user_id
    and public.listing_satisfies(b, a.wants)
    and public.listing_satisfies(a, b.wants)
  order by b.created_at desc;
$$;

-- ───────────── Row Level Security ─────────────
alter table public.universities  enable row level security;
alter table public.campuses      enable row level security;
alter table public.providers     enable row level security;
alter table public.properties    enable row level security;
alter table public.room_types    enable row level security;
alter table public.profiles      enable row level security;
alter table public.listings      enable row level security;
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;

-- Reference + accommodation data: anyone can read; only the service role (seed.py) writes.
create policy "public read" on public.universities for select using (true);
create policy "public read" on public.campuses     for select using (true);
create policy "public read" on public.providers    for select using (true);
create policy "public read" on public.properties   for select using (true);
create policy "public read" on public.room_types   for select using (true);

-- Profiles: signed-in students can see each other (chat names, house share); edit only your own.
create policy "students read profiles" on public.profiles
  for select to authenticated using (true);
create policy "update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Listings: anyone can browse; you manage only your own.
create policy "public read listings" on public.listings for select using (true);
create policy "create own listing" on public.listings
  for insert to authenticated with check (user_id = auth.uid());
create policy "update own listing" on public.listings
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own listing" on public.listings
  for delete to authenticated using (user_id = auth.uid());

-- Conversations + messages: only the two participants.
create policy "participants read conversation" on public.conversations
  for select to authenticated using (auth.uid() in (user_a, user_b));
create policy "participant starts conversation" on public.conversations
  for insert to authenticated with check (auth.uid() in (user_a, user_b));

create policy "participants read messages" on public.messages
  for select to authenticated using (
    exists (select 1 from public.conversations c
            where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b)));
create policy "participants send messages" on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and exists (select 1 from public.conversations c
                where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b)));

-- Live chat
alter publication supabase_realtime add table public.messages;
