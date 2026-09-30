# Egenberedskapsappen

A free app for household preparedness (egenberedskap) in Norway: how many days the household manages on its own, what's missing, and what's about to expire. Belongings documentation and a damage guide sit underneath as modules.

Funded by partners, not by users and not by ads. Sponsored content is always labelled, never appears in emergency flows, and no personal data goes to sponsors.

## Layout

| Path | What |
| --- | --- |
| `apps/mobile` | Expo app (iOS + Android), Expo Router, SDK 57 |
| `packages/core` | Shared TypeScript: domain types, the days-covered calculation, guidance figures. No React, fully tested |

Planned: `functions/` (Cloud Functions) and `apps/web` (marketing site and blog) once the Firebase project exists.

## Getting started

Needs Node 24 (`nvm use`).

```sh
npm install
npm test            # all workspaces
npm run typecheck
npm run lint
npm run mobile      # Expo dev server; scan the QR code with Expo Go
```

Add app dependencies with `npx expo install <pkg>` from `apps/mobile`, never plain `npm install`, so versions match the SDK.
