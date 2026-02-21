# Timeshare Connect Runbook

Operational setup and troubleshooting guide.

## 1. Local App Start

1. Install dependencies:
```bash
npm install
```
2. Start dev server:
```bash
npm run dev
```
3. Open:
```text
http://localhost:3000
```

## 2. Required Environment Variables

In `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...    # server-only
STRIPE_SECRET_KEY=...            # placeholder if Stripe not wired yet
NEXT_PUBLIC_ADMIN_CONTACT_EMAIL=...
ADMIN_CONTACT_EMAIL=...
RESEND_API_KEY=...
FEEDBACK_FROM_EMAIL=...
```

Notes:
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be present (name must match exactly).
- If you used Supabase "Publishable key", still map it to `NEXT_PUBLIC_SUPABASE_ANON_KEY` in this codebase.

## 3. Supabase SQL Run Order (Existing DB)

Run in Supabase SQL Editor, in this order:

1. `supabase/health_check.sql` (baseline)
2. `supabase/owner_inventory_migration.sql`
3. `supabase/listing_inventory_migration.sql`
4. `supabase/booking_cancel_fields.sql`
5. `supabase/user_moderation_and_reviews.sql`
6. `supabase/resort_reviews_migration.sql`
7. `supabase/resort_portals_migration.sql`
8. `supabase/role_both_migration.sql`
9. `supabase/rls.sql`
10. `supabase/health_check.sql` (post-check)

For a focused SQL order doc, see `docs/SUPABASE_RUN_ORDER.md`.

If starting from scratch instead:
1. `supabase/schema.sql`
2. `supabase/rls.sql`

## 4. Quick Verification Checklist

1. Signup/login works.
2. Traveler can search and open listing detail.
3. Traveler can request week (creates `offers` row).
4. Owner can see request in `/offers` and accept.
5. Booking timeline updates for both sides.
6. Traveler can cancel with reason.
7. Admin sees bookings and user moderation controls.
8. Traveler can submit owner and resort ratings when booking is `fully_paid`.
9. Owner dashboard shows rating summary/comments.
10. Owner can save templates in `/inventory` and use them in `/listings/new`.
11. "Report a bug/idea" sends successfully from in-app dialog.

## 5. Common Errors

### Error: `relation "public.user_reviews" does not exist`
- Cause: `rls.sql` ran before reviews migration.
- Fix: run `supabase/user_moderation_and_reviews.sql`, then re-run `supabase/rls.sql`.

### Error: Invalid API key
- Cause: env var mismatch or stale dev server process.
- Fix:
  1. Check `.env.local` key names.
  2. Restart `npm run dev`.

### Error: `bookings.cancel_reason does not exist`
- Cause: cancellation migration not applied.
- Fix: run `supabase/booking_cancel_fields.sql`.

### Error: `Could not find the table 'public.owner_inventory' in the schema cache`
- Cause: owner inventory migration not applied.
- Fix:
  1. Run `supabase/owner_inventory_migration.sql`
  2. Re-run `supabase/rls.sql`

## 6. Lint/Build Commands

```bash
npm run lint
npm run build
```
