# Chaterface Web App

This Next.js app is the main Chaterface product interface. It handles workspace
setup, task timelines, agent interaction, integrations, repository settings,
secrets, preview sessions, and Trigger.dev task processing.

## Development

From the repository root:

```sh
pnpm --filter web-app dev
```

The app runs at <http://localhost:3001>.

For the full local workflow with the API and ngrok tunnel, use the root command:

```sh
pnpm dev
```

Run the Trigger.dev worker locally:

```sh
pnpm --filter web-app trigger:dev
```

## Environment

Common local variables:

```sh
NEXT_PUBLIC_API_URL=http://localhost:3002
NEXT_PUBLIC_INSTANT_APP_ID=
INSTANT_APP_ADMIN_TOKEN=
SECRET_ENCRYPTION_KEY=
TRIGGER_PROJECT_REF=
TRIGGER_SECRET_KEY=
```

Use `NEXT_PUBLIC_API_URL=https://api.interface.ngrok.pro` when running the
default ngrok workflow.

Optional integrations include PostHog, GitHub App credentials,
Slack OAuth/signing secrets, preview session settings, and Cloudflare email/API
settings. See the root README for the broader setup notes.

## Quality checks

```sh
pnpm --filter web-app lint
pnpm --filter web-app check-types
pnpm --filter web-app build
```
