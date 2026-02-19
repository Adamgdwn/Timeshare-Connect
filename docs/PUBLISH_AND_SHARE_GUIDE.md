# Publish And Share Guide

Use this to publish a beta build and share it with testers.

## 1. Prepare Code

From project root:

```bash
npm run lint
npm run build
git status
```

If clean:

```bash
git add .
git commit -m "Beta build prep"
git push origin main
```

## 2. Verify Supabase

Run required SQL migrations in this order (if not already applied):

1. `supabase/user_moderation_and_reviews.sql`
2. `supabase/resort_reviews_migration.sql`
3. `supabase/booking_cancel_fields.sql`
4. `supabase/role_both_migration.sql`
5. `supabase/owner_inventory_migration.sql`
6. `supabase/listing_inventory_migration.sql`
7. `supabase/rls.sql`

## 3. Configure Vercel Environment Variables

In Vercel project settings -> `Environment Variables`, set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_ADMIN_CONTACT_EMAIL`
- `ADMIN_CONTACT_EMAIL`
- `RESEND_API_KEY`
- `FEEDBACK_FROM_EMAIL`

Apply to `Production`, `Preview`, and `Development` as needed.

## 4. Deploy

If auto-deploy is enabled on `main`, push triggers deploy.

Otherwise deploy manually in Vercel dashboard.

## 5. Smoke Test Live URL

1. Open deployed URL.
2. Test login.
3. Traveler: search -> listing -> request.
4. Owner: offers -> accept/decline.
5. Booking timeline status updates.
6. Inventory template save/use flow.
7. `Report a bug/idea` sends successfully.

## 6. Share With Testers

Share:
- Live URL
- Test credentials (traveler/owner)
- `docs/BETA_TESTER_GUIDE.md` content (or copy into email/Notion)

Suggested message:

"Please test both traveler and owner flows and use in-app `Report a bug` / `Report an idea` for all feedback."

## 7. Track Feedback

Create a simple triage board:
- `Critical bug`
- `Normal bug`
- `UX improvement`
- `Feature request`

Review daily during beta and ship fixes in small batches.

