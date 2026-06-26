# Chaterface

Chaterface is an open-source workspace for running cloud software agents. It
brings agent tasks, repositories, secrets, previews, integrations, and review
workflows into one shared interface.

The project is built as a TypeScript monorepo with a Next.js product app, a
public website, a Hono API, and shared packages for data, encryption, and UI.

## Project Status

Chaterface is under active development. The core app is usable locally, but some
workflows depend on third-party services such as InstantDB, Redis/BullMQ, E2B,
GitHub Apps, Slack, PostHog, Cloudflare, and a public tunnel for OAuth/webhooks.

You do not need the maintainer's tunnel domains to contribute. The default
contributor setup should run against `localhost`.

## What Chaterface Does

- Runs prompt-driven coding tasks in cloud sandboxes.
- Gives teams a shared interface for supervising long-running agents.
- Connects GitHub repositories for cloning, branching, pull requests, and merges.
- Stores workspace secrets, package setup, commands, repositories, and MCP server
  configuration.
- Provides preview URLs for services started inside agent sandboxes.
- Supports integration points for Slack, MCP, GitHub Apps, Redis/BullMQ,
  InstantDB, E2B, and PostHog.

## Repository Layout

| Path | Description |
| --- | --- |
| `apps/website` | Public Chaterface website. Runs on `localhost:3000`. |
| `apps/web-app` | Main product app. Runs on `localhost:3001`. |
| `apps/api` | Hono API used by the web app and agent sandboxes. Runs on `localhost:3002`. |
| `apps/worker` | Persistent BullMQ worker that runs long-running agent jobs. |
| `apps/previews` | Preview proxy for services started inside sandboxes. |
| `packages/db` | Shared InstantDB schema, client helpers, and admin helpers. |
| `packages/encryption` | Shared encryption helpers. |
| `packages/ui` | Shared React UI primitives. |
| `packages/typescript-config` | Shared TypeScript configuration. |
| `docs` | Deployment and operations notes. |

## Tech Stack

- [Next.js](https://nextjs.org/) and React for the website and product app.
- [Hono](https://hono.dev/) for the API service.
- [InstantDB](https://www.instantdb.com/) for auth, data, and realtime state.
- [BullMQ](https://bullmq.io/) and Redis for persistent background processing.
- [E2B](https://e2b.dev/) for cloud sandboxes.
- [Turborepo](https://turbo.build/repo), pnpm, TypeScript, and Biome for the
  monorepo toolchain.

## Requirements

- Node.js 20.10 or newer.
- pnpm 9.
- Optional: Overmind if you want one command to run the local process group.
- Optional: Redis if you want to run background agent jobs locally.
- Optional: ngrok, Cloudflare Tunnel, or another tunnel provider for testing
  OAuth callbacks and webhooks from external services.

Install pnpm with Corepack:

```sh
corepack enable
corepack prepare pnpm@9.0.0 --activate
```

On macOS, you can install Overmind with:

```sh
brew install overmind
```

## Quick Start

Install dependencies:

```sh
pnpm install
```

Create local environment files:

```sh
cp apps/api/.env.example apps/api/.env.local
touch apps/web-app/.env.local
touch apps/worker/.env.local
```

At minimum, fill in InstantDB and encryption values:

```sh
# apps/api/.env.local
NEXT_PUBLIC_INSTANT_APP_ID=
INSTANT_APP_ADMIN_TOKEN=
SECRET_ENCRYPTION_KEY=
PORT=3002

# apps/web-app/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3002
NEXT_PUBLIC_INSTANT_APP_ID=
INSTANT_APP_ADMIN_TOKEN=
SECRET_ENCRYPTION_KEY=

# apps/worker/.env.local
WORKER_REDIS_URL=redis://localhost:6379
```

Start the main local services in separate terminals:

```sh
pnpm --filter api dev
pnpm --filter web-app dev
pnpm --filter worker dev
pnpm --filter website dev
```

Then open:

| Service | URL |
| --- | --- |
| Website | <http://localhost:3000> |
| Web app | <http://localhost:3001> |
| API | <http://localhost:3002> |

Optional services:

```sh
pnpm --filter previews dev
```

## Running With Overmind

The root `pnpm dev` command starts the `Procfile` with Overmind:

```sh
pnpm dev
```

The current `Procfile` includes website, web app, API, worker, and ngrok
processes. Because the checked-in `ngrok.yml` references maintainer-owned
reserved domains, most contributors should run only the processes they need:

```sh
OVERMIND_PROCESSES=website,web-app,api,worker pnpm dev
OVERMIND_PROCESSES=web-app,api,worker pnpm dev
```

There is also a Turborepo command that starts every workspace `dev` script:

```sh
pnpm dev:turbo
```

Use it when you intentionally want all local services, including the preview
proxy.

If you need public URLs for OAuth callbacks or webhooks, use your own tunnel and
set app environment variables to your tunnel origins. For example:

```sh
NEXT_PUBLIC_API_URL=https://your-api-tunnel.example.com
```

Do not rely on `app.interface.ngrok.pro` or `api.interface.ngrok.pro`; those are
maintainer development domains.

## Environment Variables

Required for the API and web app:

| Variable | Used by | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_INSTANT_APP_ID` | API, web app | InstantDB app ID. |
| `INSTANT_APP_ADMIN_TOKEN` | API, web app | InstantDB admin token for server-side operations. |
| `SECRET_ENCRYPTION_KEY` | API, web app | Secret used to encrypt stored credentials and integration tokens. Also secures internal workflow calls when `WORKFLOW_INTERNAL_SECRET` is unset. |
| `NEXT_PUBLIC_API_URL` | web app | Base URL for the API. Use `http://localhost:3002` for local development. |
| `WORKER_REDIS_URL` | web app, worker | Redis connection URL used by BullMQ to enqueue and process long-running jobs. `BULLMQ_REDIS_URL` and `REDIS_URL` are also accepted. |
| `PORT` | API | API port. Defaults to `3002` in local setup. |

Common optional variables:

| Variable | Used by | Description |
| --- | --- | --- |
| `WORKFLOW_INTERNAL_SECRET` | web app | Optional secret for internal workflow HTTP routes. Falls back to `SECRET_ENCRYPTION_KEY`. |
| `NEXT_PUBLIC_APP_URL` | web app | Optional explicit web app origin for legacy workflow self-calls. Falls back to `VERCEL_URL` or `http://localhost:3001`. |
| `GITHUB_APP_ID` | web app | GitHub App ID for repository access. |
| `GITHUB_APP_SLUG` | web app | GitHub App slug for install flows. |
| `GITHUB_APP_PRIVATE_KEY` | web app | GitHub App private key. |
| `GITHUB_APP_STATE_SECRET` | web app | Optional override for signing GitHub install state. |
| `SLACK_CLIENT_ID` | web app | Slack OAuth app client ID. |
| `SLACK_CLIENT_SECRET` | web app | Slack OAuth app client secret. |
| `SLACK_SIGNING_SECRET` | web app | Slack event/request signing secret. |
| `PREVIEWS_DOMAIN` | API, previews | Base domain for sandbox preview URLs. |
| `NEXT_PUBLIC_PREVIEWS_DOMAIN` | web app | Browser-visible preview base domain. |
| `PREVIEW_COOKIE_DOMAIN` | previews | Cookie domain for preview auth. |
| `PREVIEW_COOKIE_NAME` | previews | Cookie name for preview auth. |
| `PREVIEW_SESSION_SECRET` | web app, previews | Signing secret for preview sessions. |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | website, web app | Optional PostHog project token. |
| `NEXT_PUBLIC_POSTHOG_HOST` | website, web app | Optional PostHog host. |
| `CLOUDFLARE_ACCOUNT_ID` | web app, API | Cloudflare account ID for email or AI Gateway integrations. |
| `CLOUDFLARE_API_TOKEN` | web app, API | Cloudflare API token fallback. |
| `CLOUDFLARE_EMAIL_API_TOKEN` | web app | Cloudflare token for invite email. |
| `CLOUDFLARE_AI_GATEWAY_ID` | API | Cloudflare AI Gateway ID for task naming. |

For local-only work, start with the required variables and add optional services
only when you are working on those integrations.

## GitHub App Setup

Repository operations require a GitHub App. For local development:

1. Create a GitHub App in your GitHub account or organization.
2. Set the callback URL to your local or tunneled web app origin:
   `http://localhost:3001/api/github/app/install/callback` for local-only
   testing, or `https://your-web-app-tunnel.example.com/api/github/app/install/callback`
   when GitHub needs to redirect to a public URL.
3. Give the app these minimum permissions:
   - Contents: read and write.
   - Pull requests: read and write.
   - Metadata: read-only.
4. Add `GITHUB_APP_ID`, `GITHUB_APP_SLUG`, and `GITHUB_APP_PRIVATE_KEY` to
   `apps/web-app/.env.local`.
5. Add `GITHUB_APP_ID` and `GITHUB_APP_PRIVATE_KEY` to the web app environment
   so background workflows can mint installation tokens.

## Database Schema

The InstantDB schema source of truth is
`packages/db/src/schema.ts`. The web app's `instant.schema.ts` re-exports
`@repo/db/schema`, which resolves through `packages/db/dist` for CLI imports.

Push the schema with:

```sh
pnpm --filter web-app instant:push-schema
```

This builds `@repo/db` first so the Instant CLI reads the current schema.

You can also push permissions:

```sh
pnpm --filter web-app instant:push-perms
```

## Quality Checks

Run these before opening a pull request:

```sh
pnpm lint
pnpm check-types
pnpm build
```

Useful formatting commands:

```sh
pnpm format
pnpm check
```

## Deployment

Production deployment requires coordinated configuration for the app, API,
preview proxy, OAuth callbacks, webhooks, and sandbox environment. See
[`docs/deployment-checklist.md`](docs/deployment-checklist.md) before moving
traffic to a new deployment.

## Contributing

Contributions are welcome. Until a dedicated `CONTRIBUTING.md` exists:

1. Keep changes focused on the app or package they affect.
2. Prefer existing patterns over introducing new libraries or architecture.
3. Update docs when adding environment variables, external services, schema
   changes, or deployment steps.
4. Run `pnpm lint`, `pnpm check-types`, and any relevant app-level build before
   opening a pull request.
5. Include screenshots or screen recordings for user-facing UI changes.

## Security

Do not commit real `.env.local` files, API keys, tunnel credentials, private
keys, or service tokens. Use local environment files and provider dashboards for
secret management.

## License

No license file is currently included. Add a `LICENSE` file before publishing
the project for broad external use.
