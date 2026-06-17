# Contributing

Thanks for contributing to Chaterface.

## Development

Use the repository package manager:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm lint
corepack pnpm check-types
```

Run app-specific commands from the workspace root with `--filter` when you only need one package, for example:

```bash
corepack pnpm --filter web-app check-types
corepack pnpm --filter api check-types
```

## Pull Requests

- Keep changes focused.
- Include tests or verification notes for behavior changes.
- Do not commit local `.env` files, generated build output, or Trigger `.trigger` artifacts.
- For security-sensitive changes, include the authorization or permission boundary being protected.

## Security

Report vulnerabilities privately using the process in `SECURITY.md`.
