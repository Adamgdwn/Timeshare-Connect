-- Add flexible availability inventory support for listings, offers, and bookings.
-- Run this after existing listing/booking migrations and RLS.

begin;

alter table public.listings
  add column if not exists availability_mode text not null default 'exact',
  add column if not exists available_start_date date,
  add column if not exists available_end_date date,
  add column if not exists minimum_nights integer,
  add column if not exists maximum_nights integer;

alter table public.listings
  alter column check_in_date drop not null,
  alter column check_out_date drop not null;

alter table public.listings
  drop constraint if exists listings_date_range_chk,
  drop constraint if exists listings_availability_mode_check,
  drop constraint if exists listings_availability_shape_chk;

alter table public.listings
  add constraint listings_availability_mode_check
  check (availability_mode in ('exact', 'flex'));

alter table public.listings
  add constraint listings_availability_shape_chk
  check (
    (
      availability_mode = 'exact'
      and check_in_date is not null
      and check_out_date is not null
      and check_out_date > check_in_date
    )
    or (
      availability_mode = 'flex'
      and available_start_date is not null
      and available_end_date is not null
      and available_end_date >= available_start_date
      and minimum_nights is not null
      and minimum_nights > 0
      and (maximum_nights is null or maximum_nights >= minimum_nights)
    )
  );

alter table public.offers
  add column if not exists desired_check_in_date date,
  add column if not exists desired_check_out_date date;

alter table public.offers
  drop constraint if exists offers_desired_date_range_chk;

alter table public.offers
  add constraint offers_desired_date_range_chk
  check (
    desired_check_in_date is null
    or desired_check_out_date is null
    or desired_check_out_date > desired_check_in_date
  );

alter table public.bookings
  add column if not exists confirmed_check_in_date date,
  add column if not exists confirmed_check_out_date date;

alter table public.bookings
  drop constraint if exists bookings_confirmed_date_range_chk;

alter table public.bookings
  add constraint bookings_confirmed_date_range_chk
  check (
    confirmed_check_in_date is null
    or confirmed_check_out_date is null
    or confirmed_check_out_date > confirmed_check_in_date
  );

create index if not exists listings_availability_mode_idx on public.listings(availability_mode);
create index if not exists listings_available_window_idx on public.listings(available_start_date, available_end_date);

commit;
