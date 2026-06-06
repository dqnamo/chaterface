# factoryplane

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
