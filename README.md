# Factory

A Next.js starter using Chord UI, InstantDB, and Trigger.dev.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Copy the variables from `.env.example` into `.env.local` and fill them in:

- `NEXT_PUBLIC_INSTANT_APP_ID` from InstantDB
- `UPSTASH_BOX_API_KEY` from Upstash Box
- `TRIGGER_SECRET_KEY` from Trigger.dev
- `APP_PUBLIC_URL`, the public HTTPS origin used for callbacks and webhooks
- `RESEND_API_KEY` and `RESEND_EMAIL_FROM` for supervisor invite emails
- `STRIPE_SECRET_KEY` from Stripe
- `STRIPE_WEBHOOK_SECRET` from the Stripe webhook endpoint
- `STRIPE_PRO_PAYMENT_LINK_URL` for the Pro subscription Payment Link
- `NEXT_PUBLIC_POSTHOG_TOKEN` from PostHog
- `NEXT_PUBLIC_POSTHOG_HOST` from PostHog, defaults to `https://us.i.posthog.com`

Factory and worker sandboxes run on Upstash Box. Boxes auto-pause when idle and
resume when the app reconnects or creates a public URL.

## Trigger.dev

Jobs live in `/jobs`, configured by `trigger.config.ts`.

```bash
npm run trigger:dev
npm run trigger:deploy
```

## Tests

```bash
pnpm test:unit
pnpm test:e2e
```

Unit tests use Node's built-in test runner. Playwright production flows require
an authenticated storage state file in `E2E_AUTH_STORAGE_STATE`; set
`E2E_FACTORY_ID` to exercise existing-factory flows.

## GitHub Deploys

Pushes to `main` run `.github/workflows/deploy.yml`, which typechecks, runs
Biome, runs unit tests, builds and smoke-tests the Next app, pushes the Instant
schema and permissions, then deploys Trigger.dev.

Set `PLAYWRIGHT_E2E_ENABLED=true` as a repository variable to run the Playwright
production-flow job. Configure `E2E_BASE_URL`, `E2E_FACTORY_ID`, and the
`E2E_AUTH_STORAGE_STATE_JSON` secret for that job.

Configure these repository secrets:

- `INSTANT_APP_ID`
- `NEXT_PUBLIC_INSTANT_APP_ID`, optional when it matches `INSTANT_APP_ID`
- `INSTANT_APP_ADMIN_TOKEN`
- `APP_PUBLIC_URL`, or set it as a repository variable
- `TRIGGER_PROJECT_REF`, the Trigger.dev project ref used by `trigger.config.ts`
- `TRIGGER_ACCESS_TOKEN`, a Trigger.dev personal access token from
  https://cloud.trigger.dev/account/tokens

## InstantDB

The starter schema and permissions live in `instant.schema.ts` and
`instant.perms.ts`.

Configure an Instant webhook for the `events` namespace and `create` action:

```text
https://your-public-origin.example/api/instant-webhook
```

New `user_message` events trigger worker execution through this webhook; the
client only writes the worker and event records.

## Stripe

Create the Pro subscription Payment Link in Stripe and set
`STRIPE_PRO_PAYMENT_LINK_URL`. Configure a Stripe webhook endpoint for:

```text
https://your-public-origin.example/api/stripe/webhook
```

Subscribe it to checkout session and customer subscription events so payment
link checkouts and subscription changes update FactoryPlane billing state.

## PostHog

Client-side analytics are initialized in `instrumentation-client.ts`. Leave
`NEXT_PUBLIC_POSTHOG_TOKEN` empty to disable PostHog locally.
