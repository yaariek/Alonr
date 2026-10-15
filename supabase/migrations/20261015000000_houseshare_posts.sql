-- House Share student posts reuse the agreed post model; preferences live in prefs.
create table public.houseshare_posts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references public.profiles on delete cascade,
  budget         numeric(7, 2) not null check (budget >= 0),
  areas          text[] not null default '{}',
  move_in        date,
  looking_for_n  integer not null default 1 check (looking_for_n > 0),
  total_tenants  integer not null check (total_tenants > 0),
  prefs          jsonb not null default '{}',
  created_at     timestamptz not null default now()
);

create index houseshare_posts_user_id_idx on public.houseshare_posts (user_id);
create index houseshare_posts_created_at_idx on public.houseshare_posts (created_at desc);

alter table public.houseshare_posts enable row level security;

create policy "students read house share posts" on public.houseshare_posts
  for select to authenticated using (true);
create policy "create own house share post" on public.houseshare_posts
  for insert to authenticated with check (user_id = auth.uid());
create policy "update own house share post" on public.houseshare_posts
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own house share post" on public.houseshare_posts
  for delete to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.houseshare_posts to authenticated;
grant all on public.houseshare_posts to service_role;
