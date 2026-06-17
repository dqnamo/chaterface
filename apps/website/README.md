# Chaterface Website

This Next.js app powers the public Chaterface website. It contains the landing
page, public UI components, theme handling, and PWA assets.

## Development

From the repository root:

```sh
pnpm --filter website dev
```

The site runs at <http://localhost:3000>.

## Environment

PostHog analytics are optional:

```sh
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

## Quality checks

```sh
pnpm --filter website lint
pnpm --filter website check-types
pnpm --filter website build
```
