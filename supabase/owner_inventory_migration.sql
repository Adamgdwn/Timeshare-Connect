-- Add owner inventory library table and listing reference for existing databases.
-- Run this once in Supabase SQL Editor.

begin;

create table if not exists public.owner_inventory (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  resort_name text not null,
  city text not null,
  country text,
  ownership_type text not null default 'fixed_week',
  season text,
  home_week text,
  points_power integer,
  inventory_notes text,
  unit_type text not null,
  resort_booking_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.owner_inventory
  drop constraint if exists owner_inventory_ownership_type_check;

alter table public.owner_inventory
  add constraint owner_inventory_ownership_type_check
  check (ownership_type in ('fixed_week', 'floating_week', 'points'));

alter table public.owner_inventory
  drop constraint if exists owner_inventory_points_power_check;

alter table public.owner_inventory
  add constraint owner_inventory_points_power_check
  check (points_power is null or points_power > 0);

create index if not exists owner_inventory_owner_id_idx on public.owner_inventory(owner_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists owner_inventory_set_updated_at on public.owner_inventory;
create trigger owner_inventory_set_updated_at
before update on public.owner_inventory
for each row execute function public.set_updated_at();

alter table public.listings
  add column if not exists inventory_id uuid references public.owner_inventory(id) on delete set null;

commit;

