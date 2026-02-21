# Supabase SQL Run Order

Use this sequence for an **existing** Timeshare Connect database (non-destructive catch-up).

## Before You Start

- Do **not** run `supabase/schema.sql` unless you intentionally want a full reset.
- In Supabase SQL Editor, run scripts one at a time in this order.

## Recommended Order

1. `supabase/health_check.sql` (baseline snapshot)
2. `supabase/owner_inventory_migration.sql`
3. `supabase/listing_inventory_migration.sql`
4. `supabase/booking_cancel_fields.sql`
5. `supabase/user_moderation_and_reviews.sql`
6. `supabase/resort_reviews_migration.sql`
7. `supabase/resort_portals_migration.sql`
8. `supabase/role_both_migration.sql`
9. `supabase/rls.sql`
10. `supabase/health_check.sql` (post-migration verification)

## Notes

- `supabase/rls.sql` is the source of truth for active policies.
- `health_check.sql` includes a booking update policy sanity query to detect duplicate policy instances.

## Quick Success Criteria

After step 10:

- All expected tables appear in health check output.
- RLS is enabled for protected tables.
- Booking `UPDATE` policy shows one canonical policy.
- `resort_portals` has seeded rows.
