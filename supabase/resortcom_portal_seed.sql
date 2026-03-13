-- Add ResortCom portal support for existing databases.
-- Run this in Supabase SQL Editor if ResortCom is missing from the owner listing portal dropdown.

begin;

insert into public.resort_portals (resort_name, brand, booking_base_url, requires_login, supports_deeplink, notes)
values (
  'ResortCom',
  'ResortCom',
  'https://reservation.resortcom.com/account',
  true,
  false,
  'Owner/member login required to search inventory and complete bookings.'
)
on conflict (resort_name) do update
set brand = excluded.brand,
    booking_base_url = excluded.booking_base_url,
    requires_login = excluded.requires_login,
    supports_deeplink = excluded.supports_deeplink,
    notes = excluded.notes;

commit;
