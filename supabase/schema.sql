-- Timeshare Connect MVP schema
-- This script will reset the core MVP tables and recreate them.

begin;

create extension if not exists "pgcrypto";

drop table if exists public.bookings cascade;
drop table if exists public.offers cascade;
drop table if exists public.listing_views cascade;
drop table if exists public.listings cascade;
drop table if exists public.profiles cascade;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('traveler', 'owner', 'both', 'admin')),
  account_status text not null default 'active' check (account_status in ('active', 'on_hold', 'banned')),
  status_reason text,
  status_updated_at timestamptz,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  resort_name text not null,
  city text not null,
  country text,
  check_in_date date not null,
  check_out_date date not null,
  unit_type text not null,
  owner_price_cents integer not null check (owner_price_cents > 0),
  normal_price_cents integer not null check (normal_price_cents > 0),
  resort_booking_url text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listings_date_range_chk check (check_out_date > check_in_date)
);

create trigger listings_set_updated_at
before update on public.listings
for each row execute function public.set_updated_at();

create table public.listing_views (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  viewer_id uuid references public.profiles(id) on delete set null,
  viewed_at timestamptz not null default now()
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  traveler_id uuid not null references public.profiles(id) on delete cascade,
  guest_count integer not null check (guest_count > 0),
  note text,
  offered_price_cents integer check (offered_price_cents is null or offered_price_cents > 0),
  status text not null default 'new' check (status in ('new', 'accepted', 'declined', 'withdrawn', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger offers_set_updated_at
before update on public.offers
for each row execute function public.set_updated_at();

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null unique references public.offers(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  traveler_id uuid not null references public.profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'requested' check (
    status in (
      'requested',
      'awaiting_first_payment',
      'first_payment_paid',
      'owner_booked_pending_verification',
      'verified_awaiting_final_payment',
      'fully_paid',
      'canceled',
      'refunded'
    )
  ),
  confirmation_number text,
  proof_file_path text,
  cancel_reason text,
  canceled_by uuid references public.profiles(id) on delete set null,
  canceled_at timestamptz,
  first_payment_paid_at timestamptz,
  final_payment_paid_at timestamptz,
  admin_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

create table public.user_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewed_user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  constraint user_reviews_reviewer_not_reviewed_chk check (reviewer_id <> reviewed_user_id),
  constraint user_reviews_unique_triplet unique (booking_id, reviewer_id, reviewed_user_id)
);

create table public.resort_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  constraint resort_reviews_unique_triplet unique (booking_id, reviewer_id, listing_id)
);

create index listings_owner_id_idx on public.listings(owner_id);
create index listings_city_idx on public.listings(city);
create index listings_dates_idx on public.listings(check_in_date, check_out_date);
create index listings_active_idx on public.listings(is_active);
create index listing_views_listing_id_idx on public.listing_views(listing_id);
create index offers_listing_id_idx on public.offers(listing_id);
create index offers_traveler_id_idx on public.offers(traveler_id);
create index offers_status_idx on public.offers(status);
create index bookings_listing_id_idx on public.bookings(listing_id);
create index bookings_owner_id_idx on public.bookings(owner_id);
create index bookings_traveler_id_idx on public.bookings(traveler_id);
create index bookings_status_idx on public.bookings(status);
create index user_reviews_reviewed_user_id_idx on public.user_reviews(reviewed_user_id);
create index user_reviews_booking_id_idx on public.user_reviews(booking_id);
create index resort_reviews_listing_id_idx on public.resort_reviews(listing_id);
create index resort_reviews_booking_id_idx on public.resort_reviews(booking_id);

commit;
