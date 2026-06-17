# Chaterface

Chaterface is an open-source, collaborative software workspace for running Codex
agents in the cloud. It gives teams one place to create tasks, supervise
long-running workers, connect tools, manage workspace secrets, and land code
through GitHub.

## Features

- Cloud workers for prompt-driven software tasks.
- Shared workspaces for product, engineering, and operations supervision.
- GitHub repository setup for cloning, branching, pull requests, and merges.
- Workspace-level secrets, packages, commands, repositories, and MCP server configuration.
- Preview service forwarding for apps started inside agent sandboxes.
- Slack, MCP, GitHub App, Trigger.dev, InstantDB, E2B, and PostHog integration points.

## Monorepo layout

| Path | Description |
| --- | --- |
| `apps/website` | Public marketing/docs site at `localhost:3000`. |
| `apps/web-app` | Main Chaterface web app at `localhost:3001`. |
| `apps/api` | Hono API used by agent sandboxes at `localhost:3002`. |
| `apps/previews` | Preview proxy for services started inside sandboxes. |
| `packages/db` | Shared InstantDB schema and client/admin helpers. |
| `packages/encryption` | Shared encryption helpers. |
| `packages/ui` | Shared React UI primitives. |
| `packages/typescript-config` | Shared TypeScript configuration. |

## Tech stack

- [Next.js](https://nextjs.org/) and React for the website and web app.
- [Hono](https://hono.dev/) for the API service.
- [InstantDB](https://www.instantdb.com/) for auth, data, and realtime state.
- [Trigger.dev](https://trigger.dev/) for task processing.
- [E2B](https://e2b.dev/) for cloud sandboxes.
- [Turborepo](https://turbo.build/repo), pnpm, TypeScript, and Biome for the
  workspace.
- [Overmind](https://github.com/DarthSim/overmind) and ngrok for the full local
  dev stack.

## Prerequisites

- Node.js 18 or newer.
- pnpm 9.
- Overmind for running the local process group.
- ngrok with access to the reserved `*.interface.ngrok.pro` domains when using
  the default `pnpm dev` workflow.

On macOS:

```sh
brew install overmind ngrok
```

## Quick start

Install dependencies:

```sh
pnpm install
```

Start the local stack with Overmind and ngrok:

```sh
pnpm dev
```

This starts:

| Service | Local URL | Public dev URL |
| --- | --- | --- |
| Website | <http://localhost:3000> | n/a |
| Web app | <http://localhost:3001> | <https://app.interface.ngrok.pro> |
| API | <http://localhost:3002> | <https://api.interface.ngrok.pro> |

If ngrok reports `ERR_NGROK_4018`, add your auth token:

```sh
ngrok config add-authtoken YOUR_TOKEN
```

If either reserved tunnel fails, confirm `app.interface.ngrok.pro` and
`api.interface.ngrok.pro` are reserved in the
[ngrok dashboard](https://dashboard.ngrok.com/domains).

## Development

Run the full stack without ngrok:

```sh
pnpm dev:turbo
```

Run only the Next.js apps through Overmind:

```sh
OVERMIND_PROCESSES=website,web-app pnpm dev
```

Run a single app:

```sh
pnpm --filter website dev
pnpm --filter web-app dev
pnpm --filter api dev
```

Run Trigger.dev locally for the web app task worker:

```sh
pnpm --filter web-app trigger:dev
```

## Environment

The API includes a starting template at `apps/api/.env.example`:

```sh
NEXT_PUBLIC_INSTANT_APP_ID=
INSTANT_APP_ADMIN_TOKEN=
SECRET_ENCRYPTION_KEY=
PORT=3002
```

For the web app, set `NEXT_PUBLIC_API_URL` to the API origin. In the default
ngrok workflow, use:

```sh
NEXT_PUBLIC_API_URL=https://api.interface.ngrok.pro
```

Both Next.js apps allow the configured ngrok origins during development through
`allowedDevOrigins` in their `next.config.js` files.

Optional analytics variables for `apps/website` and `apps/web-app`:

```sh
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

Optional GitHub App variables for repository selection and agent GitHub operations:

```sh
GITHUB_APP_ID=
GITHUB_APP_SLUG=
GITHUB_APP_PRIVATE_KEY=
```

In local development, use
`https://app.interface.ngrok.pro/api/github/app/install/callback` as the GitHub
App setup callback URL. The GitHub App needs at least:

- Contents: read and write.
- Pull requests: read and write.
- Metadata: read-only.

`GITHUB_APP_STATE_SECRET` can override the install state signing secret. If it
is not set, `SECRET_ENCRYPTION_KEY` is used. The API and task worker
environments also need `GITHUB_APP_ID` and `GITHUB_APP_PRIVATE_KEY` so they can
mint installation tokens.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the Overmind process group from `Procfile`. |
| `pnpm dev:turbo` | Start all package `dev` scripts through Turborepo. |
| `pnpm build` | Build all apps and packages through Turborepo. |
| `pnpm lint` | Run Biome checks. |
| `pnpm format` | Format files with Biome. |
| `pnpm check` | Run Biome checks and apply safe fixes. |
| `pnpm check-types` | Run TypeScript checks across the workspace. |

## Database schema

The InstantDB schema source of truth is `packages/db/src/schema.ts`. The web
app's `instant.schema.ts` re-exports `@repo/db/schema`, which resolves through
`packages/db/dist` for normal CLI imports.

Push the schema with:

```sh
pnpm --filter web-app instant:push-schema
```

This builds `@repo/db` first so the Instant CLI reads the current schema.

## Deployment notes

Production deployment requires coordinated app, API, preview, webhook, OAuth,
and sandbox environment configuration. See
[docs/deployment-checklist.md](docs/deployment-checklist.md) before moving
traffic to a new deployment.

## Contributing

This repository does not currently include a separate contributing guide. For now:

1. Keep changes scoped to the relevant app or package.
2. Run `pnpm lint` and `pnpm check-types` before opening a pull request.
3. Include setup or migration notes when a change adds environment variables,
   external services, or schema changes.

## License

No license file is currently included in this repository.
