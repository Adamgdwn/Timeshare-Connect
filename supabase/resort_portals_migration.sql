-- Add resort_portals and listing linkage for existing databases.
-- Run this once in Supabase SQL Editor.

begin;

create table if not exists public.resort_portals (
  id uuid primary key default gen_random_uuid(),
  resort_name text not null unique,
  brand text,
  booking_base_url text not null,
  requires_login boolean not null default true,
  supports_deeplink boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists resort_portals_set_updated_at on public.resort_portals;
create trigger resort_portals_set_updated_at
before update on public.resort_portals
for each row execute function public.set_updated_at();

alter table public.listings
  add column if not exists resort_portal_id uuid references public.resort_portals(id) on delete set null;

create index if not exists listings_resort_portal_id_idx on public.listings(resort_portal_id);

insert into public.resort_portals (resort_name, brand, booking_base_url, requires_login, supports_deeplink, notes)
values
  ('Marriott Vacation Club', 'Marriott', 'https://www.marriottvacationclub.com/', true, false, 'Login required for most owner inventory and booking details.'),
  ('Hilton Grand Vacations', 'Hilton', 'https://www.hiltongrandvacations.com/', true, false, 'Traveler should validate exact week after owner confirms in HGV portal.'),
  ('Wyndham Destinations', 'Wyndham', 'https://www.wyndhamdestinations.com/', true, false, 'Owner access required for points inventory and booking actions.'),
  ('Westgate Resorts', 'Westgate', 'https://www.westgateresorts.com/', true, false, 'Some public promo pages exist but member booking requires login.'),
  ('Bluegreen Vacations', 'Bluegreen', 'https://www.bluegreenvacations.com/', true, false, 'Use owner portal and guest certificate workflow.'),
  ('RCI', 'RCI', 'https://www.rci.com/', true, false, 'Exchange portal login required for availability details.')
on conflict (resort_name) do update
set brand = excluded.brand,
    booking_base_url = excluded.booking_base_url,
    requires_login = excluded.requires_login,
    supports_deeplink = excluded.supports_deeplink,
    notes = excluded.notes;

commit;

