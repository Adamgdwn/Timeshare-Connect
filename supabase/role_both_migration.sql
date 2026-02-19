-- Allow profiles.role = 'both' in existing databases.
-- Run this once if your current constraint only allows traveler/owner/admin.

begin;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('traveler', 'owner', 'both', 'admin'));

commit;
