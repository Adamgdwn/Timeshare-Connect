-- Allow traveler payment status transitions on their own bookings.
-- Run this after supabase/rls.sql

begin;

drop policy if exists bookings_update_owner_or_admin on public.bookings;

create policy bookings_update_owner_traveler_or_admin
on public.bookings
for update
using (
  (owner_id = auth.uid() and public.current_user_role() in ('owner', 'both'))
  or (traveler_id = auth.uid() and public.current_user_role() in ('traveler', 'both'))
  or public.current_user_role() = 'admin'
)
with check (
  (
    owner_id = auth.uid()
    and public.current_user_role() in ('owner', 'both')
  )
  or (
    traveler_id = auth.uid()
    and public.current_user_role() in ('traveler', 'both')
    and status in ('first_payment_paid', 'fully_paid', 'awaiting_first_payment', 'verified_awaiting_final_payment', 'canceled')
  )
  or public.current_user_role() = 'admin'
);

commit;
