-- Listings v2 (B's Vinted-style spec): likes, photo uploads, and starting a chat from a listing.
-- Quick match reuses public.match_listings(listing_id) from schema v1.

-- ───────────── Likes ─────────────
create table public.listing_likes (
  user_id    uuid not null default auth.uid() references public.profiles on delete cascade,
  listing_id uuid not null references public.listings on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
create index on public.listing_likes (listing_id);
alter table public.listing_likes enable row level security;

-- Who liked what is private: you see, add and remove only your own likes (and can't like your own listing)...
create policy "read own likes" on public.listing_likes
  for select to authenticated using (user_id = auth.uid());
create policy "like a listing" on public.listing_likes
  for insert to authenticated with check (
    user_id = auth.uid()
    and not exists (select 1 from public.listings l where l.id = listing_id and l.user_id = auth.uid()));
create policy "unlike" on public.listing_likes
  for delete to authenticated using (user_id = auth.uid());
grant select, insert, delete on public.listing_likes to authenticated;

-- ...but everyone sees how many likes each listing has. The view runs as its owner, so it counts every row.
create view public.listing_like_counts with (security_invoker = false) as
  select listing_id, count(*)::int as likes
  from public.listing_likes
  group by listing_id;
grant select on public.listing_like_counts to anon, authenticated;

-- ───────────── Start a chat from a listing ─────────────
-- Returns the conversation between you and the listing's owner, creating it the first time.
-- Runs as the caller, so the conversations RLS policies still apply.
create function public.start_conversation(p_listing_id uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  me    uuid := auth.uid();
  owner uuid;
  conv  uuid;
begin
  if me is null then
    raise exception 'Sign in to send a message' using errcode = '28000';
  end if;
  select l.user_id into owner from public.listings l where l.id = p_listing_id;
  if owner is null then
    raise exception 'Listing not found' using errcode = 'P0002';
  end if;
  if owner = me then
    raise exception 'This is your own listing' using errcode = '22023';
  end if;

  insert into public.conversations (listing_id, user_a, user_b)
  values (p_listing_id, me, owner)
  on conflict (listing_id, user_a, user_b) do nothing
  returning id into conv;

  if conv is null then
    select c.id into conv from public.conversations c
    where c.listing_id = p_listing_id and c.user_a = me and c.user_b = owner;
  end if;
  return conv;
end;
$$;
revoke execute on function public.start_conversation(uuid) from public, anon;
grant execute on function public.start_conversation(uuid) to authenticated;

-- ───────────── Listing photos (Supabase Storage) ─────────────
-- Public bucket: anyone can view photos by URL. Upload to "<your user id>/<file name>";
-- you can only add or delete files in your own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-photos', 'listing-photos', true, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do nothing;

create policy "listing photos: read own folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "listing photos: upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "listing photos: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);
