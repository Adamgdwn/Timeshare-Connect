This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Start Here

If you are setting up or deploying this project, read these first:

- `docs/RUNBOOK.md` - local setup, env vars, SQL run order, troubleshooting.
- `docs/SUPABASE_RUN_ORDER.md` - exact SQL migration sequence for existing databases.
- `docs/RELEASE_CHECKLIST.md` - pre-deploy and post-deploy checks.
- `docs/CHANGELOG_DEV.md` - plain-language history of implemented changes.
- `docs/PARKING_LOT.md` - deferred items and future architecture decisions.
- `docs/BETA_TESTER_GUIDE.md` - script for testers and how to submit feedback.
- `docs/PUBLISH_AND_SHARE_GUIDE.md` - exact steps to publish and share beta builds.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Tech conventions

- Next.js App Router, TypeScript, Tailwind.
- Supabase for auth + DB, helpers in `lib/supabase/*`.
- Search destination suggestions combine live active listing values with a broad fallback datalist.
- Routes:
  - `app/(public)/` – home/search
  - `app/(auth)/` – login/signup
  - `app/(buyer)/trips`
  - `app/(owner)/dashboard`, `/owner/listings`, `/owner/offers`
- Core tables (Supabase):
  - profiles, listings, listing_views, offers, bookings.
