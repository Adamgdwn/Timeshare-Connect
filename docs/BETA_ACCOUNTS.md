# Beta Accounts

Use this file to run a larger beta cohort without overlapping weekly listing inventory.

## Admin

- Keep one admin account for now (your account).

## Owner Accounts (20)

1. beta-owner01@timeshareconnect.test
2. beta-owner02@timeshareconnect.test
3. beta-owner03@timeshareconnect.test
4. beta-owner04@timeshareconnect.test
5. beta-owner05@timeshareconnect.test
6. beta-owner06@timeshareconnect.test
7. beta-owner07@timeshareconnect.test
8. beta-owner08@timeshareconnect.test
9. beta-owner09@timeshareconnect.test
10. beta-owner10@timeshareconnect.test
11. beta-owner11@timeshareconnect.test
12. beta-owner12@timeshareconnect.test
13. beta-owner13@timeshareconnect.test
14. beta-owner14@timeshareconnect.test
15. beta-owner15@timeshareconnect.test
16. beta-owner16@timeshareconnect.test
17. beta-owner17@timeshareconnect.test
18. beta-owner18@timeshareconnect.test
19. beta-owner19@timeshareconnect.test
20. beta-owner20@timeshareconnect.test

## Traveler Accounts (20)

1. beta-traveler01@timeshareconnect.test
2. beta-traveler02@timeshareconnect.test
3. beta-traveler03@timeshareconnect.test
4. beta-traveler04@timeshareconnect.test
5. beta-traveler05@timeshareconnect.test
6. beta-traveler06@timeshareconnect.test
7. beta-traveler07@timeshareconnect.test
8. beta-traveler08@timeshareconnect.test
9. beta-traveler09@timeshareconnect.test
10. beta-traveler10@timeshareconnect.test
11. beta-traveler11@timeshareconnect.test
12. beta-traveler12@timeshareconnect.test
13. beta-traveler13@timeshareconnect.test
14. beta-traveler14@timeshareconnect.test
15. beta-traveler15@timeshareconnect.test
16. beta-traveler16@timeshareconnect.test
17. beta-traveler17@timeshareconnect.test
18. beta-traveler18@timeshareconnect.test
19. beta-traveler19@timeshareconnect.test
20. beta-traveler20@timeshareconnect.test

## Setup Flow

1. Create these users in Supabase Auth (Authentication -> Users).
2. Run `supabase/beta_bulk_seed.sql`.
3. Review final output:
   - seeded owner/traveler profile counts
   - beta listings/offers counts
   - missing auth users list (should be empty)

## Notes

- `supabase/beta_bulk_seed.sql` creates one unique weekly listing window per owner.
- This reduces owner-to-owner overlap for testing listing discovery and request routing.
- If you want to use real tester emails instead, replace addresses in `supabase/beta_bulk_seed.sql` and this file.
