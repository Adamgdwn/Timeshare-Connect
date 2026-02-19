-- Timeshare Connect RLS smoke test
-- Prereqs:
-- 1) Run schema.sql, then rls.sql
-- 2) Create 3 real Auth users in Supabase Auth UI and copy their UUIDs
-- 3) Replace placeholders below

-- ============================================================================
-- 0) Replace IDs here
-- ============================================================================
-- Replace these before running:
--   ADMIN_UUID
--   OWNER_UUID
--   TRAVELER_UUID

begin;

-- Seed profiles (run as postgres/service role in SQL editor)
insert into public.profiles (id, role, full_name)
values
  ('540e5a0d-d7db-41bb-8a8b-75011ab2cc23', 'admin', 'Admin User'),
  ('9b1f8b0f-73b0-45fb-940a-330fcb65f2d9', 'owner', 'Owner User'),
  ('12d12e78-a9be-4c1c-b4c7-5843ee748457', 'traveler', 'Traveler User')
on conflict (id) do update
set role = excluded.role,
    full_name = excluded.full_name;

-- Seed one listing owned by OWNER
with upsert_listing as (
  insert into public.listings (
    owner_id,
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
  values (
    '9b1f8b0f-73b0-45fb-940a-330fcb65f2d9',
    'Test Resort',
    'Orlando',
    'USA',
    current_date + 30,
    current_date + 37,
    '2 bedroom',
    120000,
    220000,
    'https://example.com/resort',
    'RLS smoke-test listing',
    true
  )
  returning id
)
select id as seeded_listing_id from upsert_listing;

commit;

-- ============================================================================
-- 1) Traveler tests
-- Expected:
-- - Can read active listings
-- - Can insert own offer
-- - Cannot create listing
-- ============================================================================
begin;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"12d12e78-a9be-4c1c-b4c7-5843ee748457","role":"authenticated"}',
  true
);

-- Should return at least 1 row (active listing)
select id, resort_name, city from public.listings where is_active = true limit 5;

-- Should succeed (traveler creates own offer)
insert into public.offers (listing_id, traveler_id, guest_count, note)
select l.id, '12d12e78-a9be-4c1c-b4c7-5843ee748457', 4, 'Traveler test offer'
from public.listings l
where l.owner_id = '9b1f8b0f-73b0-45fb-940a-330fcb65f2d9'
limit 1;

-- Should fail (traveler cannot create listing)
do $$
begin
  begin
    insert into public.listings (
      owner_id, resort_name, city, check_in_date, check_out_date, unit_type, owner_price_cents, normal_price_cents
    )
    values ('12d12e78-a9be-4c1c-b4c7-5843ee748457', 'Bad Insert', 'Miami', current_date + 40, current_date + 47, 'studio', 100000, 150000);

    raise exception 'FAIL: traveler listing insert unexpectedly succeeded';
  exception
    when sqlstate '42501' then
      raise notice 'PASS: traveler cannot create listing (RLS enforced)';
  end;
end $$;

rollback;

-- ============================================================================
-- 2) Owner tests
-- Expected:
-- - Can see own listings and related offers
-- - Can update own listing
-- - Cannot edit another owner's listing
-- ============================================================================
begin;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"9b1f8b0f-73b0-45fb-940a-330fcb65f2d9","role":"authenticated"}',
  true
);

-- Should return owner listing
select id, resort_name from public.listings where owner_id = '9b1f8b0f-73b0-45fb-940a-330fcb65f2d9';

-- Should return offers on owner listing
select o.id, o.status, o.traveler_id
from public.offers o
join public.listings l on l.id = o.listing_id
where l.owner_id = '9b1f8b0f-73b0-45fb-940a-330fcb65f2d9'
limit 10;

-- Should succeed (owner edits own listing description)
update public.listings
set description = 'Updated by owner during RLS test'
where owner_id = '9b1f8b0f-73b0-45fb-940a-330fcb65f2d9';

-- Should fail (owner tries to edit someone else listing)
do $$
begin
  declare updated_count integer;
  begin
    update public.listings
    set description = 'Should fail'
    where owner_id <> '9b1f8b0f-73b0-45fb-940a-330fcb65f2d9';

    get diagnostics updated_count = row_count;

    if updated_count = 0 then
      raise notice 'PASS: owner cannot edit other owners listings (0 rows updated)';
    else
      raise exception 'FAIL: owner cross-listing update unexpectedly changed % rows', updated_count;
    end if;
  end;
end $$;

rollback;

-- ============================================================================
-- 3) Admin tests
-- Expected:
-- - Can read all major tables
-- - Can update booking status
-- ============================================================================
begin;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"540e5a0d-d7db-41bb-8a8b-75011ab2cc23","role":"authenticated"}',
  true
);

-- Should succeed
select count(*) as profiles_count from public.profiles;
select count(*) as listings_count from public.listings;
select count(*) as offers_count from public.offers;
select count(*) as bookings_count from public.bookings;

-- Seed a booking as service role if needed, then admin can update status:
-- update public.bookings set status = 'verified_awaiting_final_payment' where id = '<BOOKING_UUID>';

rollback;

-- ============================================================================
-- 4) Notes
-- ============================================================================
-- - "Should fail" statements are intentional and confirm RLS enforcement.
-- - Remove or comment fail-cases if you want a fully green script.
