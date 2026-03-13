# Timeshare Connect Dev Changelog

This file tracks major development changes in plain language.

## 2026-03-13

### Searchable Inventory Upload Refresh
- Expanded owner inventory + listing data model to support standardized resort search fields:
  - `resort_key`
  - `description_template`
  - `amenities`
  - `photo_urls`
- Added a new migration for existing databases:
  - `supabase/listing_search_enrichment_migration.sql`
- Added a local resort catalog helper so recognized resorts can prefill:
  - resort name
  - city / country
  - booking URL
  - starter description
  - amenity tags
  - default photos

### Owner Listing Flow Upgrade
- Reworked the add-listing wizard to make saved inventory the primary path:
  - saved properties now show as visual cards instead of a fallback dropdown
  - manual resort entry remains available as a secondary path
- Added smart resort lookup to the listing wizard and inventory-template manager.
- Added amenity-tag selection in the owner flow so traveler filters can match listing metadata.
- Replaced freeform photo-link text entry in listing creation with a photo gallery builder that:
  - preloads recognized resort photos
  - lets owners add hosted image URLs
  - shows photo-count progress toward a stronger listing card
- Added plain-language ownership explanations for:
  - fixed week
  - floating week
  - points
- Improved the date step with more visual, calendar-first framing:
  - larger date inputs
  - stay-length summary
  - week-number confirmation
- Added pricing guidance directly in the listing flow:
  - comparable active listings panel
  - suggested price action
  - live platform fee / owner net / savings view
- Upgraded the final review step into a stronger traveler-style preview card.
- Added local autosave draft / restore behavior for new listings and a dashboard prompt to resume unfinished work.

### Owner Inventory Library Upgrade
- Updated inventory templates so saved resorts can include:
  - resort key
  - description template
  - amenity tags
  - photo URLs
- Refreshed the inventory manager UI with:
  - smart resort lookup
  - ownership guidance
  - amenity tagging
  - photo support
  - richer saved-template cards

### Traveler Search + Listing Details
- Updated `/search` results to show:
  - listing photos
  - amenity chips
  - savings percentage
- Added amenity filtering on traveler search using the new standardized listing tags.
- Updated listing details to show:
  - photo gallery
  - amenity chips
  - ownership summary
  - savings context
  - structured week/season/points details

### Verification
- Verified production build after the inventory/searchability refresh (`npm run build` passed).

### Storage-Backed Listing Photos
- Added public listing media upload support with a dedicated Supabase Storage bucket:
  - `listing-media`
- Added owner-scoped storage policies and DB support for uploaded media paths:
  - `photo_storage_paths` on `owner_inventory`
  - `photo_storage_paths` on `listings`
- Added reusable photo upload UI for owner inventory templates and listing creation:
  - upload files directly to Supabase Storage
  - keep hosted URL fallback support
  - preserve public image URLs for traveler-facing pages
- Added migration for existing databases:
  - `supabase/listing_media_storage_migration.sql`
- Updated Supabase ops docs to include the new migration and troubleshooting guidance.

### Flexible Availability Inventory
- Added a flexible inventory mode so owners can publish:
  - exact stay listings
  - flexible availability windows for floating inventory or points-based stays
- Added listing-level availability fields for:
  - `availability_mode`
  - `available_start_date`
  - `available_end_date`
  - `minimum_nights`
  - `maximum_nights`
- Added offer-level traveler requested date fields:
  - `desired_check_in_date`
  - `desired_check_out_date`
- Added booking-level confirmed stay dates:
  - `confirmed_check_in_date`
  - `confirmed_check_out_date`
- Updated the owner listing wizard to support publishing flexible availability instead of forcing exact dates.
- Updated traveler search, listing detail, owner offers, traveler trips, and booking summary pages to reflect:
  - exact stays
  - flexible windows
  - traveler-requested stay dates
  - booking-confirmed dates after owner acceptance
- Added migration for existing databases:
  - `supabase/flexible_inventory_migration.sql`
- Verified production build after the flexible inventory update (`npm run build` passed).

### Resort Catalog / Portal Additions
- Added `ResortCom` to the resort portal seed list for owner booking portal selection.
- Added `Garza Blanca Resort & Spa Los Cabos` to the local smart resort catalog so owner listing creation can recognize and prefill it.
- Added one-off SQL seed for existing databases:
  - `supabase/resortcom_portal_seed.sql`

## 2026-03-07

### Owner Add-Listing Wizard
- Replaced the owner `Add Listing` long-form page with a guided 4-step wizard:
  - `Your Resort`
  - `Your Week/Unit`
  - `Pricing`
  - `Review & Publish`
- Added a step progress indicator (`Step X of 4`) and progress bar to reduce perceived complexity.
- Added step-level validation and `Back` / `Continue` navigation.
- Added a final review summary card before publishing so owners can confirm listing details and pricing.
- Preserved existing inventory-template autofill, portal selection, pricing lookup, and Supabase listing insert behavior.
- Added an optional photo-link input in the wizard and appends it into the listing description payload.
- Verified build stability after the owner flow refactor (`npm run build` passed).

### Homepage Messaging Cleanup
- Updated the homepage hero headline to: `Designed to put luxury getaways within reach.`
- Removed the "Why this works" explainer box from the hero to keep the page cleaner and less self-referential.
- Verified build stability after the change (`npm run build` passed).

## 2026-03-03

### Luxury Travel Visual Refresh (Public Home)
- Reworked global visual language to feel more premium and travel-forward:
  - richer aspirational palette (coastal blue, warm gold, sunset coral)
  - layered atmospheric gradients and elevated surfaces
  - refreshed button states, badges, and card treatments
- Updated typography system for stronger brand tone and hierarchy:
  - display: `Cormorant Garamond`
  - body: `Plus Jakarta Sans`
  - mono: `Space Mono`
- Redesigned `/` with:
  - luxury hero section and supporting persuasion copy
  - trust/value stat cards
  - improved CTA emphasis while preserving existing search/account flows
- Updated global navigation styling to match the new visual system.
- Updated sign-out control styling for design consistency.
- Verified production build after redesign (`npm run build` passed).

### Vercel Project Alignment
- Updated local Vercel link (`.vercel/project.json`) to target `timeshare-connect-h6pl` so local deploy commands align with the kept Vercel project.

## 2026-02-21

### Resort Portal Foundation
- Added standardized resort portal support and listing linkage:
  - `resort_portals` table + seed data migration
  - listing-level `resort_portal_id`
- Updated owner listing creation to select a resort portal and auto-fill booking base URL.
- Updated traveler listing details to use portal-aware booking link fallback and show portal context.

### Hotel Price Auto Lookup
- Added API route for hotel pricing lookup:
  - `app/api/hotel-pricing/route.ts`
  - integrates with `SERPAPI_API_KEY` and returns estimated nightly/total USD pricing.
- Added traveler-side live price estimate helper on:
  - home search form
  - search results filter form
- Added owner-side automatic estimate for "Normal hotel price" after destination + dates are set, with manual override.

### Search UX Improvements
- Expanded destination/resort suggestion list substantially (US, Canada, Mexico/Caribbean, Europe, APAC, major timeshare brands).
- Upgraded destination suggestions to merge live active listing values (`resort_name`, `city`, `city, country`) with static fallback suggestions.

### Visual Design Refresh (Public/Beta-facing)
- Added a restrained premium visual theme (warm neutral surfaces, deep green primary accents, subtle gold highlights).
- Styled global navigation and feedback widget to match the updated look.
- Refreshed traveler-facing public pages:
  - home search entry
  - search results
  - listing details
  - request form

### SQL and Ops Hygiene
- Added `supabase/health_check.sql` for pre/post migration verification (tables, columns, RLS, policies, triggers, portal seed).
- Added `docs/SUPABASE_RUN_ORDER.md` with a clear non-destructive SQL run sequence.
- Updated `docs/RUNBOOK.md` SQL sequence to align with current schema.
- Removed redundant `supabase/rls_traveler_payments.sql`; consolidated booking update policy behavior into `supabase/rls.sql`.

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
