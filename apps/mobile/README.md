# Chaterface Mobile

Expo React Native client for the main Chaterface workspace/task flow.

## Setup

Create `apps/mobile/.env.local` with the same Instant app id used by the web app:

```sh
EXPO_PUBLIC_INSTANT_APP_ID=your_instant_app_id
```

## Run

```sh
pnpm --filter mobile start
pnpm --filter mobile ios
pnpm --filter mobile android
```

Expo 56 requires Node `>=20.19.4`.
