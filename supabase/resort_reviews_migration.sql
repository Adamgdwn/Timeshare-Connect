-- Add resort-level reviews for existing databases.
-- Run this once in Supabase SQL Editor.

begin;

create table if not exists public.resort_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  constraint resort_reviews_unique_triplet unique (booking_id, reviewer_id, listing_id)
);

create index if not exists resort_reviews_listing_id_idx on public.resort_reviews(listing_id);
create index if not exists resort_reviews_booking_id_idx on public.resort_reviews(booking_id);

commit;
