# FactoryPlane

FactoryPlane is a pnpm monorepo with two applications:

- `apps/website`: Astro marketing website for `factoryplane.com`
- `apps/app`: Next.js platform app for `app.factoryplane.com`

## Getting Started

```bash
pnpm install
pnpm dev:website
pnpm dev:app
```

The website runs on Astro's dev server. The platform app runs on Next.js at
`http://localhost:3000` by default.

## Environment

Copy `apps/app/.env.example` to `apps/app/.env.local` and fill in:

- `NEXT_PUBLIC_INSTANT_APP_ID` from InstantDB
- `UPSTASH_BOX_API_KEY` from Upstash Box
- `TRIGGER_SECRET_KEY` from Trigger.dev
- `APP_PUBLIC_URL`, the platform HTTPS origin used for callbacks and webhooks,
  usually `https://app.factoryplane.com`
- `RESEND_API_KEY` and `RESEND_EMAIL_FROM` for supervisor invite emails
- `STRIPE_SECRET_KEY` from Stripe
- `STRIPE_WEBHOOK_SECRET` from the Stripe webhook endpoint
- `STRIPE_PRO_PAYMENT_LINK_URL` for the Pro subscription Payment Link
- `NEXT_PUBLIC_POSTHOG_TOKEN` from PostHog
- `NEXT_PUBLIC_POSTHOG_HOST` from PostHog, defaults to `https://us.i.posthog.com`

Factory and worker sandboxes run on Upstash Box. Boxes auto-pause when idle and
resume when the app reconnects or creates a public URL.

## Commands

```bash
pnpm build
pnpm typecheck
pnpm check
pnpm test:unit
pnpm test:e2e
```

Root scripts delegate to the app packages. Use `pnpm dev:website` for the Astro
site and `pnpm dev:app` for the platform.

## Trigger.dev

Jobs live in `apps/app/jobs`, configured by `apps/app/trigger.config.ts`.

```bash
pnpm trigger:dev
pnpm trigger:deploy
```

## GitHub Deploys

Pushes to `main` run `.github/workflows/deploy.yml`, which typechecks, runs
Biome, runs unit tests, builds both applications, smoke-tests the platform app,
pushes the Instant schema and permissions, then deploys Trigger.dev.

Set `PLAYWRIGHT_E2E_ENABLED=true` as a repository variable to run the Playwright
production-flow job. Configure `E2E_BASE_URL`, `E2E_FACTORY_ID`, and the
`E2E_AUTH_STORAGE_STATE_JSON` secret for that job.

Configure these repository secrets:

- `INSTANT_APP_ID`
- `NEXT_PUBLIC_INSTANT_APP_ID`, optional when it matches `INSTANT_APP_ID`
- `INSTANT_APP_ADMIN_TOKEN`
- `APP_PUBLIC_URL`, or set it as a repository variable
- `TRIGGER_PROJECT_REF`, the Trigger.dev project ref used by
  `apps/app/trigger.config.ts`
- `TRIGGER_ACCESS_TOKEN`, a Trigger.dev personal access token from
  https://cloud.trigger.dev/account/tokens

## InstantDB

The schema and permissions live in `apps/app/instant.schema.ts` and
`apps/app/instant.perms.ts`.

Configure an Instant webhook for the `events` namespace and `create` action:

```text
https://app.factoryplane.com/api/instant-webhook
```

New `user_message` events trigger worker execution through this webhook; the
client only writes the worker and event records.

## Stripe

Create the Pro subscription Payment Link in Stripe and set
`STRIPE_PRO_PAYMENT_LINK_URL`. Configure a Stripe webhook endpoint for:

```text
https://app.factoryplane.com/api/stripe/webhook
```

Subscribe it to checkout session and customer subscription events so payment
link checkouts and subscription changes update FactoryPlane billing state.

## PostHog

Client-side analytics are initialized in `apps/app/instrumentation-client.ts`.
Leave `NEXT_PUBLIC_POSTHOG_TOKEN` empty to disable PostHog locally.

## License

FactoryPlane is licensed under the Apache License, Version 2.0. See
[LICENSE](LICENSE) for details.
