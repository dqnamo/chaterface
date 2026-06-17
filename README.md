# chaterface

Turborepo monorepo with two Next.js apps, pnpm, Biome, and Overmind.

## Apps

| App | Package | Dev URL |
| --- | --- | --- |
| `website` | `website` | http://localhost:3000 |
| `web-app` | `web-app` | http://localhost:3001 |
| `api` | `api` | http://localhost:3002 |

Shared UI lives in `packages/ui`.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) 9
- [Overmind](https://github.com/DarthSim/overmind) — `brew install overmind` on macOS
- [ngrok](https://ngrok.com/) — `brew install ngrok` on macOS (paid plan; used by `pnpm dev` to expose `web-app` and `api`)

## Develop

Start the apps and ngrok tunnels (see `ngrok.yml`):

```sh
pnpm install
pnpm dev
```

ngrok merges `ngrok.yml` with your user config (where `ngrok config add-authtoken` stores the token). If you see `ERR_NGROK_4018`, run:

```sh
ngrok config add-authtoken YOUR_TOKEN
```

ngrok exposes:

| Service | Local | Public |
| --- | --- | --- |
| `web-app` | :3001 | https://app.interface.ngrok.pro |
| `api` | :3002 | https://api.interface.ngrok.pro |

Set `NEXT_PUBLIC_API_URL` in `apps/web-app/.env.local` to the API URL (see `.env.example`). Both Next.js apps allow ngrok origins in dev via `allowedDevOrigins` in each `next.config.js`.

To enable PostHog web and product analytics, set these variables for both
`apps/website` and `apps/web-app`:

```sh
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

To enable Vercel-style GitHub repository selection, create a GitHub App with
setup URL `https://app.interface.ngrok.pro/api/github/app/install/callback` in
dev and set these variables in `apps/web-app/.env.local`:

```sh
GITHUB_APP_ID=
GITHUB_APP_SLUG=
GITHUB_APP_PRIVATE_KEY=
```

Set the GitHub App repository permissions to at least Contents: read & write,
Pull requests: read & write, and Metadata: read-only. `GITHUB_APP_STATE_SECRET`
can override the install state signing secret; otherwise `SECRET_ENCRYPTION_KEY`
is used. The API and task worker environments also need `GITHUB_APP_ID` and
`GITHUB_APP_PRIVATE_KEY` so they can mint installation tokens for repository
clones, branch pushes, pull request creation, and pull request merging.

If either tunnel fails to start, reserve `*.interface.ngrok.pro` in the [ngrok dashboard](https://dashboard.ngrok.com/domains).

Or run via Turborepo (no ngrok):

```sh
pnpm dev:turbo
```

Skip ngrok but keep Overmind for the Next.js apps:

```sh
OVERMIND_PROCESSES=website,web-app pnpm dev
```

Run a single app:

```sh
pnpm --filter website dev
pnpm --filter web-app dev
pnpm --filter api dev
```

## Lint & format

[Biome](https://biomejs.dev/) is configured with tabs and 2-space tab width.

```sh
pnpm lint
pnpm format
pnpm check
```

## Build

```sh
pnpm build
```

## Post-Deploy Checklist

After deploying the Chaterface rename, verify the runtime configuration before
turning off the previous deployment.

1. Configure the production environment variables:

```sh
NEXT_PUBLIC_API_URL=
TASK_API_AUTH_TOKEN=
TASK_API_URL=
PREVIEWS_DOMAIN=
NEXT_PUBLIC_PREVIEWS_DOMAIN=
PREVIEW_COOKIE_DOMAIN=
PREVIEW_COOKIE_NAME=
PREVIEW_SESSION_SECRET=
EXPO_PUBLIC_API_URL=
```

Keep the existing preview signing value when moving it to
`PREVIEW_SESSION_SECRET`; rotate it later if needed. Remove any previous
branded environment variable names only after the new deployment is serving
traffic successfully.

2. Update domains and callback URLs:

- Point `app.chaterface.com`, `api.chaterface.com`, and
  `*.previews.chaterface.com` at the deployed services.
- Update GitHub App setup and callback URLs to the Chaterface app origin.
- Update Slack OAuth redirect URLs, event subscriptions, and any slash-command
  request URLs to the Chaterface app origin.
- Update webhook senders to use the `x-chaterface-webhook-secret` header.
- Confirm MCP OAuth callback origins match the deployed Chaterface app URL.

3. Check persisted data compatibility:

- Run a one-time data migration for historical `event.type` values if existing
  task timelines need to keep rendering under the `chaterface.*` namespace.
- Confirm repository secret fingerprint files use the `.chaterface/` path in
  new sandboxes.
- Confirm generated agent sandboxes receive `TASK_API_AUTH_TOKEN`,
  `TASK_API_URL`, `WORKSPACE_ID`, `TASK_ID`, and `WORKSPACE`.

4. Smoke test production:

- Sign in on the web app and mobile app.
- Create a task, send a follow-up message, and confirm both appear in the task
  timeline.
- Start and stop a preview service, then open its preview URL through
  `*.previews.chaterface.com`.
- Attach or create a pull request from an agent task.
- Trigger a workflow decision, webhook task, and Slack-triggered task if those
  integrations are enabled.

## InstantDB schema

The schema source of truth is `packages/db/src/schema.ts`.
The web app's `instant.schema.ts` re-exports `@repo/db/schema`, which resolves
through `packages/db/dist` for normal CLI imports. Push with:

```sh
pnpm --filter web-app instant:push-schema
```

This builds `@repo/db` first so Instant CLI reads the current schema.
