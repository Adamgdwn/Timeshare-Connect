-- Add storage-backed public listing media support.
-- Run this after existing listing/inventory migrations and RLS setup.

begin;

alter table public.owner_inventory
  add column if not exists photo_storage_paths text[] not null default '{}';

alter table public.listings
  add column if not exists photo_storage_paths text[] not null default '{}';

insert into storage.buckets (id, name, public)
values ('listing-media', 'listing-media', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists listing_media_public_read on storage.objects;
create policy listing_media_public_read
on storage.objects
for select
to public
using (bucket_id = 'listing-media');

drop policy if exists listing_media_owner_insert on storage.objects;
create policy listing_media_owner_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'listing-media'
  and (
    (
      public.current_user_role() in ('owner', 'both')
      and auth.uid()::text = (storage.foldername(name))[1]
    )
    or public.current_user_role() = 'admin'
  )
);

drop policy if exists listing_media_owner_update on storage.objects;
create policy listing_media_owner_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'listing-media'
  and (
    (
      public.current_user_role() in ('owner', 'both')
      and auth.uid()::text = (storage.foldername(name))[1]
    )
    or public.current_user_role() = 'admin'
  )
)
with check (
  bucket_id = 'listing-media'
  and (
    (
      public.current_user_role() in ('owner', 'both')
      and auth.uid()::text = (storage.foldername(name))[1]
    )
    or public.current_user_role() = 'admin'
  )
);

drop policy if exists listing_media_owner_delete on storage.objects;
create policy listing_media_owner_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'listing-media'
  and (
    (
      public.current_user_role() in ('owner', 'both')
      and auth.uid()::text = (storage.foldername(name))[1]
    )
    or public.current_user_role() = 'admin'
  )
);

commit;
