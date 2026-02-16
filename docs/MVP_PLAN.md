# Timeshare Connect MVP Plan

## Product Scope

Marketplace for timeshare owners to list available weeks and travelers to request/book in a split-payment flow.

## User Roles

- Traveler: search, request weeks, pay in 2 steps, track booking status.
- Owner: manage listings, accept/decline requests, upload booking proof.
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
2. Listings CRUD + public search
3. Offer request flow (create, accept/decline)
4. Booking state machine + traveler/owner dashboards
5. Admin moderation actions
6. Split payment flow (charge #1, charge #2, payout)

## Screen Map

- `/` home/search entry
- `/search` search results and filters
- `/listings/[listingId]` listing details + request CTA
- `/login` traveler/owner auth
- `/trips` traveler booking/request timeline
- `/dashboard` owner dashboard
- `/listings/new` owner add listing
- `/offers` owner offers queue
- `/bookings/[bookingId]` owner booking progress/proof upload
- `/admin` admin operations dashboard

Note: Route groups isolate role sections in `app/` while keeping clean URLs.
