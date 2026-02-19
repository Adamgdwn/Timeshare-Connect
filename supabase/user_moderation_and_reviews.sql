-- Add user moderation fields and shared user reviews to an existing DB.
-- Run this once in Supabase SQL Editor.

begin;

alter table public.profiles
  add column if not exists account_status text not null default 'active',
  add column if not exists status_reason text,
  add column if not exists status_updated_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_account_status_check;

alter table public.profiles
  add constraint profiles_account_status_check
  check (account_status in ('active', 'on_hold', 'banned'));

create table if not exists public.user_reviews (
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

create index if not exists user_reviews_reviewed_user_id_idx on public.user_reviews(reviewed_user_id);
create index if not exists user_reviews_booking_id_idx on public.user_reviews(booking_id);

commit;
