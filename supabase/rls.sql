-- Timeshare Connect MVP RLS policies
-- Run this after supabase/schema.sql

begin;

-- Helper: resolve the current authenticated user's role from profiles.
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
  limit 1
$$;

alter table public.profiles enable row level security;
alter table public.owner_inventory enable row level security;
alter table public.listings enable row level security;
alter table public.listing_views enable row level security;
alter table public.offers enable row level security;
alter table public.bookings enable row level security;
alter table public.user_reviews enable row level security;
alter table public.resort_reviews enable row level security;

drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin
on public.profiles
for select
using (
  id = auth.uid()
  or public.current_user_role() = 'admin'
);

drop policy if exists profiles_insert_self_or_admin on public.profiles;
create policy profiles_insert_self_or_admin
on public.profiles
for insert
with check (
  id = auth.uid()
  or public.current_user_role() = 'admin'
);

drop policy if exists profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin
on public.profiles
for update
using (
  id = auth.uid()
  or public.current_user_role() = 'admin'
)
with check (
  id = auth.uid()
  or public.current_user_role() = 'admin'
);

drop policy if exists profiles_delete_admin_only on public.profiles;
create policy profiles_delete_admin_only
on public.profiles
for delete
using (public.current_user_role() = 'admin');

drop policy if exists listings_select_public_owner_admin on public.listings;
create policy listings_select_public_owner_admin
on public.listings
for select
using (
  is_active = true
  or owner_id = auth.uid()
  or public.current_user_role() = 'admin'
);

drop policy if exists owner_inventory_select_owner_or_admin on public.owner_inventory;
create policy owner_inventory_select_owner_or_admin
on public.owner_inventory
for select
using (
  owner_id = auth.uid()
  or public.current_user_role() = 'admin'
);

drop policy if exists owner_inventory_insert_owner_or_admin on public.owner_inventory;
create policy owner_inventory_insert_owner_or_admin
on public.owner_inventory
for insert
with check (
  (owner_id = auth.uid() and public.current_user_role() in ('owner', 'both'))
  or public.current_user_role() = 'admin'
);

drop policy if exists owner_inventory_update_owner_or_admin on public.owner_inventory;
create policy owner_inventory_update_owner_or_admin
on public.owner_inventory
for update
using (
  (owner_id = auth.uid() and public.current_user_role() in ('owner', 'both'))
  or public.current_user_role() = 'admin'
)
with check (
  (owner_id = auth.uid() and public.current_user_role() in ('owner', 'both'))
  or public.current_user_role() = 'admin'
);

drop policy if exists owner_inventory_delete_owner_or_admin on public.owner_inventory;
create policy owner_inventory_delete_owner_or_admin
on public.owner_inventory
for delete
using (
  (owner_id = auth.uid() and public.current_user_role() in ('owner', 'both'))
  or public.current_user_role() = 'admin'
);

drop policy if exists listings_insert_owner_or_admin on public.listings;
create policy listings_insert_owner_or_admin
on public.listings
for insert
with check (
  (owner_id = auth.uid() and public.current_user_role() in ('owner', 'both'))
  or public.current_user_role() = 'admin'
);

drop policy if exists listings_update_owner_or_admin on public.listings;
create policy listings_update_owner_or_admin
on public.listings
for update
using (
  (owner_id = auth.uid() and public.current_user_role() in ('owner', 'both'))
  or public.current_user_role() = 'admin'
)
with check (
  (owner_id = auth.uid() and public.current_user_role() in ('owner', 'both'))
  or public.current_user_role() = 'admin'
);

drop policy if exists listings_delete_owner_or_admin on public.listings;
create policy listings_delete_owner_or_admin
on public.listings
for delete
using (
  (owner_id = auth.uid() and public.current_user_role() in ('owner', 'both'))
  or public.current_user_role() = 'admin'
);

drop policy if exists listing_views_select_owner_or_admin on public.listing_views;
create policy listing_views_select_owner_or_admin
on public.listing_views
for select
using (
  public.current_user_role() = 'admin'
  or exists (
    select 1
    from public.listings l
    where l.id = listing_views.listing_id
      and l.owner_id = auth.uid()
  )
);

drop policy if exists listing_views_insert_public on public.listing_views;
create policy listing_views_insert_public
on public.listing_views
for insert
to public
with check (
  viewer_id is null
  or viewer_id = auth.uid()
);

drop policy if exists listing_views_delete_admin_only on public.listing_views;
create policy listing_views_delete_admin_only
on public.listing_views
for delete
using (public.current_user_role() = 'admin');

drop policy if exists offers_select_related_or_admin on public.offers;
create policy offers_select_related_or_admin
on public.offers
for select
using (
  traveler_id = auth.uid()
  or exists (
    select 1
    from public.listings l
    where l.id = offers.listing_id
      and l.owner_id = auth.uid()
  )
  or public.current_user_role() = 'admin'
);

drop policy if exists offers_insert_traveler_or_admin on public.offers;
create policy offers_insert_traveler_or_admin
on public.offers
for insert
with check (
  (
    traveler_id = auth.uid()
    and public.current_user_role() in ('traveler', 'both')
    and exists (
      select 1
      from public.listings l
      where l.id = offers.listing_id
        and l.is_active = true
    )
  )
  or public.current_user_role() = 'admin'
);

drop policy if exists offers_update_related_or_admin on public.offers;
create policy offers_update_related_or_admin
on public.offers
for update
using (
  traveler_id = auth.uid()
  or exists (
    select 1
    from public.listings l
    where l.id = offers.listing_id
      and l.owner_id = auth.uid()
  )
  or public.current_user_role() = 'admin'
)
with check (
  traveler_id = auth.uid()
  or exists (
    select 1
    from public.listings l
    where l.id = offers.listing_id
      and l.owner_id = auth.uid()
  )
  or public.current_user_role() = 'admin'
);

drop policy if exists offers_delete_related_or_admin on public.offers;
create policy offers_delete_related_or_admin
on public.offers
for delete
using (
  traveler_id = auth.uid()
  or exists (
    select 1
    from public.listings l
    where l.id = offers.listing_id
      and l.owner_id = auth.uid()
  )
  or public.current_user_role() = 'admin'
);

drop policy if exists bookings_select_related_or_admin on public.bookings;
create policy bookings_select_related_or_admin
on public.bookings
for select
using (
  traveler_id = auth.uid()
  or owner_id = auth.uid()
  or public.current_user_role() = 'admin'
);

drop policy if exists bookings_insert_owner_or_admin on public.bookings;
create policy bookings_insert_owner_or_admin
on public.bookings
for insert
with check (
  (
    owner_id = auth.uid()
    and public.current_user_role() in ('owner', 'both')
    and exists (
      select 1
      from public.offers o
      join public.listings l on l.id = o.listing_id
      where o.id = bookings.offer_id
        and o.listing_id = bookings.listing_id
        and o.traveler_id = bookings.traveler_id
        and l.owner_id = auth.uid()
    )
  )
  or public.current_user_role() = 'admin'
);

drop policy if exists bookings_update_owner_or_admin on public.bookings;
create policy bookings_update_owner_or_admin
on public.bookings
for update
using (
  (owner_id = auth.uid() and public.current_user_role() in ('owner', 'both'))
  or public.current_user_role() = 'admin'
)
with check (
  (owner_id = auth.uid() and public.current_user_role() in ('owner', 'both'))
  or public.current_user_role() = 'admin'
);

drop policy if exists bookings_delete_admin_only on public.bookings;
create policy bookings_delete_admin_only
on public.bookings
for delete
using (public.current_user_role() = 'admin');

drop policy if exists user_reviews_select_authenticated on public.user_reviews;
create policy user_reviews_select_authenticated
on public.user_reviews
for select
to authenticated
using (true);

drop policy if exists user_reviews_insert_participant_or_admin on public.user_reviews;
create policy user_reviews_insert_participant_or_admin
on public.user_reviews
for insert
with check (
  (
    reviewer_id = auth.uid()
    and exists (
      select 1
      from public.bookings b
      where b.id = user_reviews.booking_id
        and b.status = 'fully_paid'
        and (
          (b.traveler_id = reviewer_id and b.owner_id = reviewed_user_id)
          or (b.owner_id = reviewer_id and b.traveler_id = reviewed_user_id)
        )
    )
  )
  or public.current_user_role() = 'admin'
);

drop policy if exists user_reviews_update_admin_only on public.user_reviews;
create policy user_reviews_update_admin_only
on public.user_reviews
for update
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists user_reviews_delete_admin_only on public.user_reviews;
create policy user_reviews_delete_admin_only
on public.user_reviews
for delete
using (public.current_user_role() = 'admin');

drop policy if exists resort_reviews_select_authenticated on public.resort_reviews;
create policy resort_reviews_select_authenticated
on public.resort_reviews
for select
to authenticated
using (true);

drop policy if exists resort_reviews_insert_traveler_or_admin on public.resort_reviews;
create policy resort_reviews_insert_traveler_or_admin
on public.resort_reviews
for insert
with check (
  (
    reviewer_id = auth.uid()
    and exists (
      select 1
      from public.bookings b
      where b.id = resort_reviews.booking_id
        and b.status = 'fully_paid'
        and b.traveler_id = reviewer_id
        and b.listing_id = resort_reviews.listing_id
    )
  )
  or public.current_user_role() = 'admin'
);

drop policy if exists resort_reviews_update_admin_only on public.resort_reviews;
create policy resort_reviews_update_admin_only
on public.resort_reviews
for update
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists resort_reviews_delete_admin_only on public.resort_reviews;
create policy resort_reviews_delete_admin_only
on public.resort_reviews
for delete
using (public.current_user_role() = 'admin');

commit;
