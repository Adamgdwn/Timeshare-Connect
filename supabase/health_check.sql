-- Timeshare Connect DB health check
-- Run in Supabase SQL Editor before and after migrations.

-- 1) Core tables present
select
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles',
    'owner_inventory',
    'resort_portals',
    'listings',
    'listing_views',
    'offers',
    'bookings',
    'user_reviews',
    'resort_reviews'
  )
order by table_name;

-- 2) Critical columns present
select
  table_name,
  column_name
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'profiles' and column_name in ('role', 'account_status', 'status_reason', 'status_updated_at')) or
    (table_name = 'listings' and column_name in ('inventory_id', 'resort_portal_id', 'ownership_type', 'season', 'home_week', 'points_power', 'inventory_notes')) or
    (table_name = 'bookings' and column_name in ('cancel_reason', 'canceled_by', 'canceled_at'))
  )
order by table_name, column_name;

-- 3) RLS enabled status
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles',
    'owner_inventory',
    'resort_portals',
    'listings',
    'listing_views',
    'offers',
    'bookings',
    'user_reviews',
    'resort_reviews'
  )
order by tablename;

-- 4) Policy inventory by table
select
  tablename,
  cmd,
  policyname
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles',
    'owner_inventory',
    'resort_portals',
    'listings',
    'listing_views',
    'offers',
    'bookings',
    'user_reviews',
    'resort_reviews'
  )
order by tablename, cmd, policyname;

-- 5) Booking UPDATE policy sanity (should be exactly one row after latest rls.sql)
select
  tablename,
  cmd,
  count(*) as policy_count,
  string_agg(policyname, ', ' order by policyname) as policies
from pg_policies
where schemaname = 'public'
  and tablename = 'bookings'
  and cmd = 'UPDATE'
group by tablename, cmd;

-- 6) Trigger presence for updated_at helper
select
  event_object_table as table_name,
  trigger_name
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name in (
    'profiles_set_updated_at',
    'owner_inventory_set_updated_at',
    'resort_portals_set_updated_at',
    'listings_set_updated_at',
    'offers_set_updated_at',
    'bookings_set_updated_at'
  )
order by table_name, trigger_name;

-- 7) Seed data sanity for resort portals
select
  count(*) as resort_portal_count
from public.resort_portals;

select
  resort_name,
  brand,
  booking_base_url
from public.resort_portals
order by resort_name
limit 20;

