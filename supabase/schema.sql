-- Timeshare Connect MVP schema draft (Supabase Postgres)
-- No RLS or functions yet; this is a foundation for table shape and statuses.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('traveler', 'owner', 'admin')),
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  resort_name text not null,
  city text not null,
  country text,
  check_in_date date not null,
  check_out_date date not null,
  unit_type text not null,
  owner_price_cents integer not null,
  normal_price_cents integer not null,
  resort_booking_url text,
  description text,
  views_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.offer_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  traveler_id uuid not null references public.profiles(id) on delete cascade,
  guest_count integer not null,
  note text,
  offered_price_cents integer,
  status text not null check (status in ('new', 'accepted', 'declined', 'canceled')) default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  offer_request_id uuid not null unique references public.offer_requests(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  traveler_id uuid not null references public.profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (
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
  ) default 'requested',
  confirmation_number text,
  proof_file_path text,
  admin_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  payment_stage text not null check (payment_stage in ('first_half', 'second_half')),
  amount_cents integer not null,
  processor text not null default 'stripe',
  processor_payment_id text,
  status text not null check (status in ('pending', 'paid', 'failed', 'refunded')),
  created_at timestamptz not null default now()
);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  gross_amount_cents integer not null,
  platform_fee_cents integer not null,
  net_amount_cents integer not null,
  processor text not null default 'stripe',
  processor_payout_id text,
  status text not null check (status in ('pending', 'paid', 'failed')) default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists listings_owner_id_idx on public.listings(owner_id);
create index if not exists listings_city_idx on public.listings(city);
create index if not exists offer_requests_listing_id_idx on public.offer_requests(listing_id);
create index if not exists offer_requests_traveler_id_idx on public.offer_requests(traveler_id);
create index if not exists bookings_owner_id_idx on public.bookings(owner_id);
create index if not exists bookings_traveler_id_idx on public.bookings(traveler_id);
create index if not exists bookings_status_idx on public.bookings(status);
create index if not exists payments_booking_id_idx on public.payments(booking_id);
