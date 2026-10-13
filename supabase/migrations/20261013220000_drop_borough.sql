-- Borough isn't used: drop it, and remove "boroughs" from swap matching.
-- wants keys are now: room_kinds, max_price, property_ids, campus_id (display only).

create or replace function public.listing_satisfies(h public.listings, w jsonb)
returns boolean
language sql
stable
set search_path = ''
as $$
  select
    (coalesce(jsonb_array_length(w -> 'room_kinds'), 0) = 0 or (w -> 'room_kinds') ? h.room_kind::text)
    and (w ->> 'max_price' is null or h.price_week <= (w ->> 'max_price')::numeric)
    and (coalesce(jsonb_array_length(w -> 'property_ids'), 0) = 0 or (w -> 'property_ids') ? h.property_id::text);
$$;

alter table public.properties drop column borough;
