-- Timeshare Connect beta seed data
-- Run in Supabase SQL Editor as postgres/service role.
--
-- Prereqs:
-- 1) Create auth users first (Authentication -> Users) with these emails, or edit below:
--    - beta-admin@timeshareconnect.test
--    - beta-owner@timeshareconnect.test
--    - beta-traveler@timeshareconnect.test
-- 2) Run schema/migrations + rls first.
--
-- This script is idempotent enough for repeated beta resets.

begin;

do $$
begin
  if not exists (select 1 from auth.users where email = 'beta-admin@timeshareconnect.test') then
    raise exception 'Missing auth user: beta-admin@timeshareconnect.test';
  end if;
  if not exists (select 1 from auth.users where email = 'beta-owner@timeshareconnect.test') then
    raise exception 'Missing auth user: beta-owner@timeshareconnect.test';
  end if;
  if not exists (select 1 from auth.users where email = 'beta-traveler@timeshareconnect.test') then
    raise exception 'Missing auth user: beta-traveler@timeshareconnect.test';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1) Upsert profiles
-- ---------------------------------------------------------------------------
with config as (
  select
    'beta-admin@timeshareconnect.test'::text as admin_email,
    'beta-owner@timeshareconnect.test'::text as owner_email,
    'beta-traveler@timeshareconnect.test'::text as traveler_email
),
ids as (
  select
    (select id from auth.users where email = (select admin_email from config) limit 1) as admin_id,
    (select id from auth.users where email = (select owner_email from config) limit 1) as owner_id,
    (select id from auth.users where email = (select traveler_email from config) limit 1) as traveler_id
)
insert into public.profiles (id, role, full_name, account_status, status_reason, status_updated_at)
select admin_id, 'admin', 'Beta Admin', 'active', null, now() from ids
union all
select owner_id, 'owner', 'Beta Owner', 'active', null, now() from ids
union all
select traveler_id, 'traveler', 'Beta Traveler', 'active', null, now() from ids
on conflict (id) do update
set role = excluded.role,
    full_name = excluded.full_name,
    account_status = excluded.account_status,
    status_reason = excluded.status_reason,
    status_updated_at = excluded.status_updated_at;

-- ---------------------------------------------------------------------------
-- 2) Ensure portal seed exists and capture one portal id
-- ---------------------------------------------------------------------------
insert into public.resort_portals (resort_name, brand, booking_base_url, requires_login, supports_deeplink, notes)
values
  ('Marriott Vacation Club', 'Marriott', 'https://www.marriottvacationclub.com/', true, false, 'Beta seed default portal')
on conflict (resort_name) do nothing;

-- ---------------------------------------------------------------------------
-- 3) Owner inventory template
-- ---------------------------------------------------------------------------
with owner_cte as (
  select id as owner_id
  from auth.users
  where email = 'beta-owner@timeshareconnect.test'
  limit 1
)
insert into public.owner_inventory (
  owner_id,
  label,
  resort_name,
  city,
  country,
  ownership_type,
  season,
  home_week,
  points_power,
  inventory_notes,
  unit_type,
  resort_booking_url
)
select
  owner_id,
  'Beta Template - Orlando Prime 2BR',
  'Marriott Grande Vista',
  'Orlando',
  'USA',
  'floating_week',
  'High season',
  null,
  null,
  'Beta template for tester listing creation',
  '2 bedroom',
  'https://www.marriottvacationclub.com/'
from owner_cte
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 4) Clear old beta listings/offers/bookings then seed fresh
-- ---------------------------------------------------------------------------
with beta_users as (
  select id
  from auth.users
  where email in (
    'beta-owner@timeshareconnect.test',
    'beta-traveler@timeshareconnect.test'
  )
)
delete from public.bookings b
using beta_users bu
where b.owner_id = bu.id
   or b.traveler_id = bu.id;

with beta_users as (
  select id
  from auth.users
  where email in (
    'beta-owner@timeshareconnect.test',
    'beta-traveler@timeshareconnect.test'
  )
)
delete from public.offers o
using beta_users bu
where o.traveler_id = bu.id
   or exists (
     select 1
     from public.listings l
     where l.id = o.listing_id
       and l.owner_id = bu.id
   );

with owner_cte as (
  select id as owner_id
  from auth.users
  where email = 'beta-owner@timeshareconnect.test'
  limit 1
)
delete from public.listings l
using owner_cte o
where l.owner_id = o.owner_id;

-- Seed two active listings
with base as (
  select
    (select id from auth.users where email = 'beta-owner@timeshareconnect.test' limit 1) as owner_id,
    (select id from public.resort_portals where resort_name = 'Marriott Vacation Club' limit 1) as portal_id
)
insert into public.listings (
  owner_id,
  resort_portal_id,
  ownership_type,
  season,
  resort_name,
  city,
  country,
  check_in_date,
  check_out_date,
  unit_type,
  owner_price_cents,
  normal_price_cents,
  resort_booking_url,
  description,
  is_active
)
select
  owner_id,
  portal_id,
  'floating_week',
  'High season',
  'Marriott Grande Vista',
  'Orlando',
  'USA',
  current_date + 35,
  current_date + 42,
  '2 bedroom',
  175000,
  280000,
  'https://www.marriottvacationclub.com/',
  'Beta listing A: family spring week',
  true
from base
union all
select
  owner_id,
  portal_id,
  'floating_week',
  'Shoulder season',
  'Marriott Grande Vista',
  'Orlando',
  'USA',
  current_date + 70,
  current_date + 77,
  '1 bedroom',
  125000,
  210000,
  'https://www.marriottvacationclub.com/',
  'Beta listing B: value week',
  true
from base;

-- Seed one traveler offer in "new" status for owner testing
with traveler_cte as (
  select id as traveler_id
  from auth.users
  where email = 'beta-traveler@timeshareconnect.test'
  limit 1
),
target_listing as (
  select l.id
  from public.listings l
  join auth.users u on u.id = l.owner_id
  where u.email = 'beta-owner@timeshareconnect.test'
  order by l.check_in_date asc
  limit 1
)
insert into public.offers (listing_id, traveler_id, guest_count, note, status)
select
  tl.id,
  t.traveler_id,
  2,
  'Beta traveler request: can we do early check-in?',
  'new'
from traveler_cte t
cross join target_listing tl;

-- Optional: create one accepted offer + booking in awaiting first payment
with traveler_cte as (
  select id as traveler_id
  from auth.users
  where email = 'beta-traveler@timeshareconnect.test'
  limit 1
),
owner_cte as (
  select id as owner_id
  from auth.users
  where email = 'beta-owner@timeshareconnect.test'
  limit 1
),
target_listing as (
  select l.id
  from public.listings l
  join owner_cte o on o.owner_id = l.owner_id
  order by l.check_in_date desc
  limit 1
),
accepted_offer as (
  insert into public.offers (listing_id, traveler_id, guest_count, note, status)
  select
    tl.id,
    t.traveler_id,
    3,
    'Beta accepted flow seed',
    'accepted'
  from traveler_cte t
  cross join target_listing tl
  returning id, listing_id, traveler_id
)
insert into public.bookings (offer_id, listing_id, traveler_id, owner_id, status)
select
  ao.id,
  ao.listing_id,
  ao.traveler_id,
  o.owner_id,
  'awaiting_first_payment'
from accepted_offer ao
cross join owner_cte o;

commit;

-- Quick summary output
select p.role, p.full_name, u.email
from public.profiles p
join auth.users u on u.id = p.id
where u.email in (
  'beta-admin@timeshareconnect.test',
  'beta-owner@timeshareconnect.test',
  'beta-traveler@timeshareconnect.test'
)
order by p.role;

select
  l.id,
  l.resort_name,
  l.city,
  l.check_in_date,
  l.check_out_date,
  l.owner_price_cents,
  l.normal_price_cents
from public.listings l
join auth.users u on u.id = l.owner_id
where u.email = 'beta-owner@timeshareconnect.test'
order by l.check_in_date;
