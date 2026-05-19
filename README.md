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
- `NEXT_PUBLIC_POSTHOG_TOKEN` from PostHog
- `NEXT_PUBLIC_POSTHOG_HOST` from PostHog, defaults to `https://us.i.posthog.com`

## Trigger.dev

Jobs live in `/jobs`, configured by `trigger.config.ts`.

```bash
npm run trigger:dev
npm run trigger:deploy
```

## InstantDB

The starter schema and permissions live in `instant.schema.ts` and
`instant.perms.ts`.

## PostHog

Client-side analytics are initialized in `instrumentation-client.ts`. Leave
`NEXT_PUBLIC_POSTHOG_TOKEN` empty to disable PostHog locally.
