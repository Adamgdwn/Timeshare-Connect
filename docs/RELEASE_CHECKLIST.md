# Release Checklist

Use this before deploying to Vercel.

## 1. Code Quality

- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] No unresolved TypeScript/runtime errors in browser.

## 2. Database State

- [ ] Required migrations are applied in Supabase.
- [ ] `rls.sql` has been applied after latest schema/migrations.
- [ ] RLS smoke checks pass for traveler/owner/admin scenarios.

## 3. Environment Variables (Vercel)

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- [ ] Stripe vars as needed for current release scope

## 4. Functional Smoke Test

- [ ] Traveler login/signup works.
- [ ] Owner login/signup works.
- [ ] Listing search and details load.
- [ ] Request week creates an offer.
- [ ] Owner accept/decline works.
- [ ] Booking timeline updates for both users.
- [ ] Cancel with reason works.
- [ ] Admin booking table loads and actions work.
- [ ] Admin user moderation actions work.
- [ ] Owner + resort ratings can be submitted and displayed.

## 5. Deployment

- [ ] Correct Git branch set for Vercel project.
- [ ] Root directory is correct (`./`).
- [ ] Deploy succeeded with no runtime env errors.
- [ ] Post-deploy smoke test completed on live URL.

## 6. Post-Release Notes

- [ ] Add a dated entry to `docs/CHANGELOG_DEV.md`.
- [ ] Capture follow-up bugs/enhancements in your planning doc.

