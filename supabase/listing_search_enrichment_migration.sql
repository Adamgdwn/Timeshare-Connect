-- Add structured resort-search fields to owner inventory and listings.
-- Run this after the existing inventory/listing migrations.

begin;

alter table public.owner_inventory
  add column if not exists resort_key text,
  add column if not exists description_template text,
  add column if not exists amenities text[] not null default '{}',
  add column if not exists photo_urls text[] not null default '{}';

alter table public.listings
  add column if not exists resort_key text,
  add column if not exists description_template text,
  add column if not exists amenities text[] not null default '{}',
  add column if not exists photo_urls text[] not null default '{}';

create index if not exists owner_inventory_resort_key_idx on public.owner_inventory(resort_key);
create index if not exists listings_resort_key_idx on public.listings(resort_key);
create index if not exists listings_amenities_idx on public.listings using gin (amenities);

commit;
