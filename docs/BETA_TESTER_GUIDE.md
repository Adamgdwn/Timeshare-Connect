# Beta Tester Guide

Thank you for testing Timeshare Connect.

## Goal

Help validate that travelers and owners can complete core workflows smoothly and report bugs/ideas quickly.

## Test Accounts

Ask the app owner for:
- 1 traveler login
- 1 owner login
- Optional admin login (for advanced testing)

For larger cohorts, see:
- `docs/BETA_ACCOUNTS.md`
- `supabase/beta_bulk_seed.sql`

## What To Test (Traveler)

1. Log in as traveler.
2. Search for a listing (`/search`).
3. Open listing details and submit `Request this week`.
4. Open `My Trips` and confirm status updates.
5. Open booking timeline and test available actions.
6. If booking is completed, submit:
   - owner rating
   - resort rating

## What To Test (Owner)

1. Log in as owner.
2. Open `Inventory` and save a reusable template.
3. Open `Add listing` and create listing from template.
4. Open `Offers` and review traveler requests.
5. Accept/decline an offer.
6. Open booking timeline and submit owner-side updates.

## Feedback Submission

Use the bottom-right buttons on any page:
- `Report a bug`
- `Report an idea`

Please include:
- What page you were on
- What you expected
- What happened
- Steps to reproduce (for bugs)

## What Good Feedback Looks Like

Example bug report:
- "On `/inventory`, clicking save with fixed week selected but no home week should show validation. Instead it saved."

Example idea report:
- "Add duplicate template button in inventory page so I can copy and tweak faster."

## Known MVP Limits

- Payments are still partially placeholder.
- Availability is owner-entered (not live resort integrations).
- Verification is semi-manual.
