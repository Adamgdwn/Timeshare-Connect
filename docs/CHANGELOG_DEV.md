# Timeshare Connect Dev Changelog

This file tracks major development changes in plain language.

## 2026-02-19

### Platform and Auth
- Created Next.js App Router project with TypeScript and Tailwind.
- Added Supabase helpers in `lib/supabase/client.ts` and `lib/supabase/server.ts`.
- Added route protection with role-aware access checks.
- Added login/signup flow with role support:
  - `traveler`
  - `owner`
  - `both`
  - `admin` (managed via profile role)

### Database and Security
- Added MVP schema and indexes in `supabase/schema.sql`.
- Added RLS policies in `supabase/rls.sql`.
- Added migration scripts:
  - `supabase/role_both_migration.sql`
  - `supabase/booking_cancel_fields.sql`
  - `supabase/user_moderation_and_reviews.sql`
  - `supabase/resort_reviews_migration.sql`
- Added RLS smoke test script: `supabase/rls_smoke_test.sql`.

### Traveler Experience
- Added search page and listing details page.
- Added request flow from listing details to owner offers.
- Added traveler "My Trips" page with booking status actions.
- Added booking timeline page and payment placeholders.
- Added cancellation flow with reason capture.
- Added owner rating and resort rating submission after completed bookings.

### Owner Experience
- Added owner dashboard with listing table and key listing details.
- Added owner offers page with accept/decline flow.
- Added booking progress page with owner proof submission flow.
- Added listing sharing UI.
- Added owner inventory library (`/inventory`) for reusable resort templates.
- Connected add-listing flow to saved inventory templates for faster week-by-week publishing.
- Added owner workspace nav consistency (`Dashboard`, `Offers`, `Inventory`, `Add listing`).
- Added owner KPI cards and clickable filtered routes from dashboard.
- Added season/home-week/unit dropdown patterns with `Custom` entry support.
- Added city/country type-ahead lookup for owner forms.
- Added owner quality section:
  - average traveler rating
  - recent traveler comments

### Admin Experience
- Added admin dashboard with booking list and status actions.
- Added moderation controls for user account status:
  - active
  - on_hold
  - banned
- Added rating visibility in admin user table.

### Pricing / Fees
- Added 5% platform fee model in UI with owner net payout calculations.
- Added fee display to booking/admin/owner surfaces.

### Navigation and UX
- Added global `Back` and `Home` controls.
- Added role-aware Home routing (`/home`) to direct owners/admins to their workspace.
- Added logout controls to protected pages.
- Fixed share dialog close behavior.
- Fixed booking page/query compatibility when optional DB columns were missing.
- Added global `Report a bug` and `Report an idea` widget on all pages.
- Replaced `mailto:` feedback flow with direct API submission endpoint (`/api/feedback`).
