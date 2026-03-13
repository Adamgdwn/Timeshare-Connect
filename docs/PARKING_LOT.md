# Parking Lot

Deferred product/engineering items that are important, but not in current MVP scope.

## Booking Fulfillment Model (Owner-Mediated)

Status: Deferred by design for MVP.

Current decision:
- Booking remains owner-mediated.
- Traveler requests and pays in Timeshare Connect.
- Owner logs into resort/timeshare portal and completes booking or guest certificate flow.
- Owner uploads proof in app for verification.

Why this is parked:
- Direct resort integrations are not broadly available and vary by brand.
- Owner-mediated flow is the fastest realistic path for MVP launch.

Future options to revisit:
1. Concierge mode:
   Platform operations team performs owner-side booking steps for participating owners.
2. Semi-automation:
   Portal-specific helper workflows, saved step templates, auto-generated checklists.
3. Deep integrations:
   Resort/brand APIs, partner access, or enterprise booking connectors where available.

## Listing Media + Owner/Traveler Handoff

Status: Next practical layer after searchable inventory standardization.

Why this matters:
- Listing quality now depends on structured photos and amenities, but photo input is still URL-based.
- Once a traveler engages, the owner and traveler need a cleaner back-and-forth around proof, expectations, and booking milestones.
- This is the bridge between "searchable inventory" and a more trustworthy booking workflow.

Recommended implementation sequence:
1. Storage-backed listing photos
   - Add a Supabase Storage bucket for listing photos.
   - Let owners upload resort/unit photos directly in the listing flow instead of pasting URLs.
   - Store normalized file metadata on listings so search cards and detail pages can render reliably.
2. Booking handoff artifacts
   - Add structured booking artifacts for guest certificate files, confirmations, screenshots, and transfer instructions.
   - Separate public listing photos from private booking proof/documents.
   - Show required artifact status on owner and traveler booking timelines.
3. Secure message thread upgrades
   - Add attachment support to owner/traveler threads for confirmations, resort instructions, and check-in details.
   - Add milestone-aware prompts:
     - traveler request sent
     - owner accepted
     - booking proof uploaded
     - traveler confirmed details received
4. Notification layer
   - Send transactional email first.
   - Add SMS later only for time-sensitive booking states.
   - Trigger notifications from draft-abandonment, offer acceptance, proof upload, and final booking confirmation events.

Suggested technical split:
- Phase 1:
  listing photo uploads + DB metadata + storage policies
- Phase 2:
  booking artifact model + UI on booking pages
- Phase 3:
  message attachments + notification jobs

Key guardrails:
- Keep traveler-visible media separate from private owner/traveler booking documents.
- Keep uploads tied to explicit ownership and booking/listing IDs in storage paths.
- Do not add SMS until the event model is stable and email content is proven useful.
