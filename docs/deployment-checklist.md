# Deployment Checklist

Use this checklist when deploying Chaterface or moving traffic from a previous deployment.

## Runtime configuration

Configure production environment variables:

```sh
NEXT_PUBLIC_API_URL=
TASK_API_AUTH_TOKEN=
TASK_API_URL=
PREVIEWS_DOMAIN=
NEXT_PUBLIC_PREVIEWS_DOMAIN=
PREVIEW_COOKIE_DOMAIN=
PREVIEW_COOKIE_NAME=
PREVIEW_SESSION_SECRET=
```

Keep the existing preview signing value when moving it to
`PREVIEW_SESSION_SECRET`; rotate it later if needed. Remove previous branded
environment variable names only after the new deployment is serving traffic
successfully.

## Domains and callbacks

- Point `app.chaterface.com`, `api.chaterface.com`, and
  `*.previews.chaterface.com` at the deployed services.
- Update GitHub App setup and callback URLs to the Chaterface app origin.
- Update Slack OAuth redirect URLs, event subscriptions, and any slash-command
  request URLs to the Chaterface app origin.
- Update webhook senders to use the `x-chaterface-webhook-secret` header.
- Confirm MCP OAuth callback origins match the deployed Chaterface app URL.

## Persisted data compatibility

- Run a one-time data migration for historical `event.type` values if existing
  task timelines need to keep rendering under the `chaterface.*` namespace.
- Confirm repository secret fingerprint files use the `.chaterface/` path in
  new sandboxes.
- Confirm generated agent sandboxes receive `TASK_API_AUTH_TOKEN`,
  `TASK_API_URL`, `WORKSPACE_ID`, `TASK_ID`, and `WORKSPACE`.

## Smoke test

- Sign in on the web app.
- Create a task, send a follow-up message, and confirm both appear in the task timeline.
- Start and stop a preview service, then open its preview URL through `*.previews.chaterface.com`.
- Attach or create a pull request from an agent task.
- Trigger a workflow decision, webhook task, and Slack-triggered task if those
  integrations are enabled.
