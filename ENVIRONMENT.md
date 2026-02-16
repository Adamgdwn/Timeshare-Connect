# Environment Setup

Use `.env.local` for machine-specific secrets (logins, API keys, tokens).

## Quick Start

1. Copy `.env.example` to `.env.local`.
2. Fill in values for the services you are using.
3. Restart the dev server after any env change.

## Security Rules

- Keep real secrets only in `.env.local`.
- Never commit `.env.local`.
- Rotate keys immediately if a secret is exposed.

## Variable Notes

- `NEXT_PUBLIC_*`: exposed to browser code. Never put private secrets here.
- Server-only vars (no `NEXT_PUBLIC_` prefix): safe for backend use only.
- `AUTH_SECRET`: long random secret used for session/token signing.
- `DATABASE_URL`: database connection string.
- `STRIPE_*`: payment integration credentials.
- `SMTP_*`: email login and sender settings.
- `S3_*`: file storage credentials.

## Optional Profiles

If you need environment-specific files:

- `.env.local` for local development
- `.env.staging` for staging
- `.env.production` for production

Load them via your deployment platform or CI secrets manager.
