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
- `TRIGGER_SECRET_KEY` from Trigger.dev
- `APP_PUBLIC_URL`, the public HTTPS origin used for callbacks and webhooks
- `NEXT_PUBLIC_POSTHOG_TOKEN` from PostHog
- `NEXT_PUBLIC_POSTHOG_HOST` from PostHog, defaults to `https://us.i.posthog.com`

## Trigger.dev

Jobs live in `/jobs`, configured by `trigger.config.ts`.

```bash
npm run trigger:dev
npm run trigger:deploy
```

## GitHub Deploys

Pushes to `main` run `.github/workflows/deploy.yml`, which typechecks, runs
Biome, pushes the Instant schema and permissions, then deploys Trigger.dev.

Configure these repository secrets:

- `INSTANT_APP_ID`
- `INSTANT_APP_ADMIN_TOKEN`
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

## PostHog

Client-side analytics are initialized in `instrumentation-client.ts`. Leave
`NEXT_PUBLIC_POSTHOG_TOKEN` empty to disable PostHog locally.
