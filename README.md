# Egenberedskapsappen

A free app for household preparedness (egenberedskap) in Norway: how many days the household manages on its own, what's missing, and what's about to expire. Belongings documentation and a damage guide sit underneath as modules.

Funded by partners, not by users and not by ads. Sponsored content is always labelled, never appears in emergency flows, and no personal data goes to sponsors.

## Layout

| Path | What |
| --- | --- |
| `apps/mobile` | Expo app (iOS + Android), Expo Router, SDK 57 |
| `packages/core` | Shared TypeScript: domain types, the days-covered calculation, guidance figures. No React, fully tested |
| `packages/store` | On-device storage: SQLite schema, migrations and every read and write. Tested against real SQLite (`node:sqlite`); the app runs it on expo-sqlite |
| `packages/sync` | End-to-end encryption and the sync engine for backup. Pure TypeScript, tested with two simulated phones |
| `functions` | Cloud Functions (europe-north1) for vaults and activation codes. Not a workspace: it deploys on its own |

Planned: `apps/web` (marketing site and blog).

## Backend

Firebase projects `egenberedskapsappen-test` (alias `test`, the default) and `egenberedskapsappen` (`prod`), all in europe-north1.

```sh
npx firebase-tools deploy --only firestore:rules,storage,functions --project test
node --test functions/test/backend.test.mjs    # end-to-end check against the TEST project
node functions/scripts/create-codes.mjs egenberedskapsappen-test <partner> <count>   # activation codes
```

Before launch: App Check (App Attest / Play Integrity) on the functions, Firestore and Storage, and the same deploy to prod.

## Builds

Backup needs the native Firebase SDK, so it only works in a development build, not in Expo Go (everything else still does).

```sh
cd apps/mobile
npx eas-cli build --profile development-simulator --platform ios   # simulator
npx expo start --dev-client
```

## Getting started

Needs Node 24 (`nvm use`).

```sh
npm install
npm test            # all workspaces
npm run typecheck
npm run lint
npm run mobile      # Expo dev server; scan the QR code with Expo Go
```

In development, opening `exp://<host>:8081/--/utvikling` wipes the local database and fills it with the household from the design.

Add app dependencies with `npx expo install <pkg>` from `apps/mobile`, never plain `npm install`, so versions match the SDK.
