# Timeshare Connect MVP Plan

## Product Scope

Marketplace for timeshare owners to list available weeks and travelers to request/book in a split-payment flow.

## Timeshare Inventory Model (MVP Update)

The listing flow now reflects real timeshare inventory ownership before pricing:

- `fixed_week`: owner has a specific owned week each year.
  - Capture `home_week` (example: Week 32).
- `floating_week`: owner can book within an allowed season window.
  - Capture `season` (example: Platinum / High Season).
- `points`: owner books using points currency.
  - Capture `points_power` and inventory notes.

Additional owner field:
- `inventory_notes` for transfer restrictions, booking windows, guest certificate rules, and blackout details.

Owner inventory library:
- Owners can save reusable resort templates.
- A template stores key variables: ownership type, resort, unit, season/home week/points profile, resort link, and notes.
- When creating listings, owners can select a template and mainly change week dates and price values.

## User Roles

- Traveler: search, request weeks, pay in 2 steps, track booking status.
- Owner: manage inventory templates + listings, accept/decline requests, upload booking proof.
- Admin: verify proof, refund/cancel, release payouts, monitor KPIs.

## Core Workflow

1. Traveler submits an offer request on a listing.
2. Owner accepts or declines.
3. If accepted, traveler pays first 50%.
4. Owner books externally and uploads confirmation proof.
5. Admin verifies booking proof.
6. Traveler pays final 50%.
7. Platform triggers owner payout and retains fee.

## Initial Build Order

1. Auth + role gating (traveler, owner, admin)
2. Owner inventory-aware listing flow (fixed/floating/points)
3. Listings CRUD + public search
4. Offer request flow (create, accept/decline)
5. Booking state machine + traveler/owner dashboards
6. Admin moderation actions
7. Split payment flow (charge #1, charge #2, payout)

## Screen Map

- `/` home/search entry
- `/search` search results and filters
- `/listings/[listingId]` listing details + request CTA
- `/login` traveler/owner auth
- `/trips` traveler booking/request timeline
- `/dashboard` owner dashboard
- `/inventory` owner inventory library
- `/listings/new` owner add listing
- `/offers` owner offers queue
- `/bookings/[bookingId]` owner booking progress/proof upload
- `/admin` admin operations dashboard

Note: Route groups isolate role sections in `app/` while keeping clean URLs.
