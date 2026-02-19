-- Add timeshare inventory fields to listings for existing databases.
-- Run this once in Supabase SQL Editor.

begin;

alter table public.listings
  add column if not exists ownership_type text not null default 'fixed_week',
  add column if not exists season text,
  add column if not exists home_week text,
  add column if not exists points_power integer,
  add column if not exists inventory_notes text;

alter table public.listings
  drop constraint if exists listings_ownership_type_check;

alter table public.listings
  add constraint listings_ownership_type_check
  check (ownership_type in ('fixed_week', 'floating_week', 'points'));

alter table public.listings
  drop constraint if exists listings_points_power_check;

alter table public.listings
  add constraint listings_points_power_check
  check (points_power is null or points_power > 0);

commit;

