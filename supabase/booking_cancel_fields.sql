-- Add booking cancellation fields for existing databases.
-- Run this once in Supabase SQL Editor.

begin;

alter table public.bookings
  add column if not exists cancel_reason text,
  add column if not exists canceled_by uuid references public.profiles(id) on delete set null,
  add column if not exists canceled_at timestamptz;

commit;
