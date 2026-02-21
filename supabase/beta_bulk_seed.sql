-- Timeshare Connect bulk beta seed
-- Creates profile/listing/offer test data for 20 owners + 20 travelers.
-- Run in Supabase SQL Editor as postgres/service role.
--
-- IMPORTANT:
-- - Create these users first in Auth (or replace emails below with your real tester emails).
-- - This script will only seed rows for users that already exist in auth.users.
-- - It avoids overlapping inventory windows by assigning each owner a unique week.

begin;

-- 1) Define expected emails
with owner_emails(email) as (
  values
    ('beta-owner01@timeshareconnect.test'),
    ('beta-owner02@timeshareconnect.test'),
    ('beta-owner03@timeshareconnect.test'),
    ('beta-owner04@timeshareconnect.test'),
    ('beta-owner05@timeshareconnect.test'),
    ('beta-owner06@timeshareconnect.test'),
    ('beta-owner07@timeshareconnect.test'),
    ('beta-owner08@timeshareconnect.test'),
    ('beta-owner09@timeshareconnect.test'),
    ('beta-owner10@timeshareconnect.test'),
    ('beta-owner11@timeshareconnect.test'),
    ('beta-owner12@timeshareconnect.test'),
    ('beta-owner13@timeshareconnect.test'),
    ('beta-owner14@timeshareconnect.test'),
    ('beta-owner15@timeshareconnect.test'),
    ('beta-owner16@timeshareconnect.test'),
    ('beta-owner17@timeshareconnect.test'),
    ('beta-owner18@timeshareconnect.test'),
    ('beta-owner19@timeshareconnect.test'),
    ('beta-owner20@timeshareconnect.test')
),
traveler_emails(email) as (
  values
    ('beta-traveler01@timeshareconnect.test'),
    ('beta-traveler02@timeshareconnect.test'),
    ('beta-traveler03@timeshareconnect.test'),
    ('beta-traveler04@timeshareconnect.test'),
    ('beta-traveler05@timeshareconnect.test'),
    ('beta-traveler06@timeshareconnect.test'),
    ('beta-traveler07@timeshareconnect.test'),
    ('beta-traveler08@timeshareconnect.test'),
    ('beta-traveler09@timeshareconnect.test'),
    ('beta-traveler10@timeshareconnect.test'),
    ('beta-traveler11@timeshareconnect.test'),
    ('beta-traveler12@timeshareconnect.test'),
    ('beta-traveler13@timeshareconnect.test'),
    ('beta-traveler14@timeshareconnect.test'),
    ('beta-traveler15@timeshareconnect.test'),
    ('beta-traveler16@timeshareconnect.test'),
    ('beta-traveler17@timeshareconnect.test'),
    ('beta-traveler18@timeshareconnect.test'),
    ('beta-traveler19@timeshareconnect.test'),
    ('beta-traveler20@timeshareconnect.test')
),
owner_users as (
  select u.id, u.email
  from auth.users u
  join owner_emails oe on oe.email = u.email
),
traveler_users as (
  select u.id, u.email
  from auth.users u
  join traveler_emails te on te.email = u.email
)
insert into public.profiles (id, role, full_name, account_status, status_updated_at)
select
  ou.id,
  'owner',
  'Beta Owner ' || lpad(row_number() over (order by ou.email)::text, 2, '0'),
  'active',
  now()
from owner_users ou
on conflict (id) do update
set role = excluded.role,
    full_name = excluded.full_name,
    account_status = excluded.account_status,
    status_updated_at = excluded.status_updated_at;

-- 2) Upsert traveler profiles
with traveler_emails(email) as (
  values
    ('beta-traveler01@timeshareconnect.test'),
    ('beta-traveler02@timeshareconnect.test'),
    ('beta-traveler03@timeshareconnect.test'),
    ('beta-traveler04@timeshareconnect.test'),
    ('beta-traveler05@timeshareconnect.test'),
    ('beta-traveler06@timeshareconnect.test'),
    ('beta-traveler07@timeshareconnect.test'),
    ('beta-traveler08@timeshareconnect.test'),
    ('beta-traveler09@timeshareconnect.test'),
    ('beta-traveler10@timeshareconnect.test'),
    ('beta-traveler11@timeshareconnect.test'),
    ('beta-traveler12@timeshareconnect.test'),
    ('beta-traveler13@timeshareconnect.test'),
    ('beta-traveler14@timeshareconnect.test'),
    ('beta-traveler15@timeshareconnect.test'),
    ('beta-traveler16@timeshareconnect.test'),
    ('beta-traveler17@timeshareconnect.test'),
    ('beta-traveler18@timeshareconnect.test'),
    ('beta-traveler19@timeshareconnect.test'),
    ('beta-traveler20@timeshareconnect.test')
),
traveler_users as (
  select u.id, u.email
  from auth.users u
  join traveler_emails te on te.email = u.email
)
insert into public.profiles (id, role, full_name, account_status, status_updated_at)
select
  tu.id,
  'traveler',
  'Beta Traveler ' || lpad(row_number() over (order by tu.email)::text, 2, '0'),
  'active',
  now()
from traveler_users tu
on conflict (id) do update
set role = excluded.role,
    full_name = excluded.full_name,
    account_status = excluded.account_status,
    status_updated_at = excluded.status_updated_at;

-- 3) Ensure one standard portal exists
insert into public.resort_portals (resort_name, brand, booking_base_url, requires_login, supports_deeplink, notes)
values ('Marriott Vacation Club', 'Marriott', 'https://www.marriottvacationclub.com/', true, false, 'Bulk beta default portal')
on conflict (resort_name) do nothing;

-- 4) Clean previous seeded beta data for these accounts
with beta_users as (
  select id
  from auth.users
  where email ilike 'beta-owner%@timeshareconnect.test'
     or email ilike 'beta-traveler%@timeshareconnect.test'
)
delete from public.bookings b
using beta_users bu
where b.owner_id = bu.id or b.traveler_id = bu.id;

with beta_users as (
  select id
  from auth.users
  where email ilike 'beta-owner%@timeshareconnect.test'
     or email ilike 'beta-traveler%@timeshareconnect.test'
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

with owner_users as (
  select id
  from auth.users
  where email ilike 'beta-owner%@timeshareconnect.test'
)
delete from public.listings l
using owner_users ou
where l.owner_id = ou.id;

-- 5) Create one listing per owner with unique weekly window
with owners_ranked as (
  select
    u.id as owner_id,
    u.email,
    row_number() over (order by u.email) as idx
  from auth.users u
  where u.email ilike 'beta-owner%@timeshareconnect.test'
),
portal as (
  select id as portal_id
  from public.resort_portals
  where resort_name = 'Marriott Vacation Club'
  limit 1
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
  o.owner_id,
  p.portal_id,
  'floating_week',
  case when o.idx % 3 = 0 then 'High season' when o.idx % 3 = 1 then 'Shoulder season' else 'Low season' end,
  'Beta Resort ' || lpad(o.idx::text, 2, '0'),
  case when o.idx % 4 = 0 then 'Orlando' when o.idx % 4 = 1 then 'Las Vegas' when o.idx % 4 = 2 then 'Maui' else 'Cabo San Lucas' end,
  case when o.idx % 4 = 0 then 'USA' when o.idx % 4 = 1 then 'USA' when o.idx % 4 = 2 then 'USA' else 'Mexico' end,
  current_date + (20 + ((o.idx - 1) * 7))::int,
  current_date + (27 + ((o.idx - 1) * 7))::int,
  case when o.idx % 3 = 0 then 'studio' when o.idx % 3 = 1 then '1 bedroom' else '2 bedroom' end,
  (900 + o.idx * 20) * 100,
  (1450 + o.idx * 30) * 100,
  'https://www.marriottvacationclub.com/',
  'Bulk beta listing for owner ' || o.email,
  true
from owners_ranked o
cross join portal p;

-- 6) Create one traveler offer each (traveler #N -> owner listing #N)
with owners_ranked as (
  select
    l.id as listing_id,
    row_number() over (order by l.check_in_date, l.id) as idx
  from public.listings l
  join auth.users u on u.id = l.owner_id
  where u.email ilike 'beta-owner%@timeshareconnect.test'
),
travelers_ranked as (
  select
    u.id as traveler_id,
    row_number() over (order by u.email) as idx
  from auth.users u
  where u.email ilike 'beta-traveler%@timeshareconnect.test'
),
pairings as (
  select
    t.traveler_id,
    o.listing_id,
    t.idx
  from travelers_ranked t
  join owners_ranked o on o.idx = t.idx
)
insert into public.offers (listing_id, traveler_id, guest_count, note, status)
select
  p.listing_id,
  p.traveler_id,
  case when p.idx % 3 = 0 then 4 when p.idx % 3 = 1 then 2 else 3 end,
  'Bulk beta request #' || p.idx,
  'new'
from pairings p;

commit;

-- 7) Post-seed summary
select
  'owner_profiles' as metric,
  count(*)::text as value
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'owner'
  and u.email ilike 'beta-owner%@timeshareconnect.test'
union all
select
  'traveler_profiles',
  count(*)::text
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'traveler'
  and u.email ilike 'beta-traveler%@timeshareconnect.test'
union all
select
  'beta_listings',
  count(*)::text
from public.listings l
join auth.users u on u.id = l.owner_id
where u.email ilike 'beta-owner%@timeshareconnect.test'
union all
select
  'beta_offers',
  count(*)::text
from public.offers o
join auth.users u on u.id = o.traveler_id
where u.email ilike 'beta-traveler%@timeshareconnect.test';

-- Show missing auth users (if any)
with expected(email, role) as (
  values
    ('beta-owner01@timeshareconnect.test', 'owner'),
    ('beta-owner02@timeshareconnect.test', 'owner'),
    ('beta-owner03@timeshareconnect.test', 'owner'),
    ('beta-owner04@timeshareconnect.test', 'owner'),
    ('beta-owner05@timeshareconnect.test', 'owner'),
    ('beta-owner06@timeshareconnect.test', 'owner'),
    ('beta-owner07@timeshareconnect.test', 'owner'),
    ('beta-owner08@timeshareconnect.test', 'owner'),
    ('beta-owner09@timeshareconnect.test', 'owner'),
    ('beta-owner10@timeshareconnect.test', 'owner'),
    ('beta-owner11@timeshareconnect.test', 'owner'),
    ('beta-owner12@timeshareconnect.test', 'owner'),
    ('beta-owner13@timeshareconnect.test', 'owner'),
    ('beta-owner14@timeshareconnect.test', 'owner'),
    ('beta-owner15@timeshareconnect.test', 'owner'),
    ('beta-owner16@timeshareconnect.test', 'owner'),
    ('beta-owner17@timeshareconnect.test', 'owner'),
    ('beta-owner18@timeshareconnect.test', 'owner'),
    ('beta-owner19@timeshareconnect.test', 'owner'),
    ('beta-owner20@timeshareconnect.test', 'owner'),
    ('beta-traveler01@timeshareconnect.test', 'traveler'),
    ('beta-traveler02@timeshareconnect.test', 'traveler'),
    ('beta-traveler03@timeshareconnect.test', 'traveler'),
    ('beta-traveler04@timeshareconnect.test', 'traveler'),
    ('beta-traveler05@timeshareconnect.test', 'traveler'),
    ('beta-traveler06@timeshareconnect.test', 'traveler'),
    ('beta-traveler07@timeshareconnect.test', 'traveler'),
    ('beta-traveler08@timeshareconnect.test', 'traveler'),
    ('beta-traveler09@timeshareconnect.test', 'traveler'),
    ('beta-traveler10@timeshareconnect.test', 'traveler'),
    ('beta-traveler11@timeshareconnect.test', 'traveler'),
    ('beta-traveler12@timeshareconnect.test', 'traveler'),
    ('beta-traveler13@timeshareconnect.test', 'traveler'),
    ('beta-traveler14@timeshareconnect.test', 'traveler'),
    ('beta-traveler15@timeshareconnect.test', 'traveler'),
    ('beta-traveler16@timeshareconnect.test', 'traveler'),
    ('beta-traveler17@timeshareconnect.test', 'traveler'),
    ('beta-traveler18@timeshareconnect.test', 'traveler'),
    ('beta-traveler19@timeshareconnect.test', 'traveler'),
    ('beta-traveler20@timeshareconnect.test', 'traveler')
)
select e.role, e.email
from expected e
left join auth.users u on u.email = e.email
where u.id is null
order by e.role, e.email;
