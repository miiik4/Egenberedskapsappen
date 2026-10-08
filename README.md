# Egenberedskapsappen

A free app for household preparedness (egenberedskap) in Norway: how many days the household manages on its own, what's missing, and what's about to expire. Belongings documentation and a damage guide sit underneath as modules.

Funded by partners, not by users and not by ads. Sponsored content is always labelled, never appears in emergency flows, and no personal data goes to sponsors.

## Layout

| Path | What |
| --- | --- |
| `apps/mobile` | Expo app (iOS + Android), Expo Router, SDK 57 |
| `apps/web` | Marketing site (Astro, static). Its calculator uses the days calculation from `packages/core`; the phone pictures are rendered from the iOS v2 design |
| `packages/core` | Shared TypeScript: domain types, the days-covered calculation, guidance figures. No React, fully tested |
| `packages/store` | On-device storage: SQLite schema, migrations and every read and write. Tested against real SQLite (`node:sqlite`); the app runs it on expo-sqlite |
| `packages/sync` | End-to-end encryption and the sync engine for backup. Pure TypeScript, tested with two simulated phones |
| `functions` | Cloud Functions (europe-north1) for vaults, activation codes and the AI analysis of rooms. Not a workspace: it deploys on its own (`npm test` inside it runs its unit tests) |

A blog on `apps/web` is planned.

## Backend

Firebase projects `egenberedskapsappen-test` (alias `test`, the default) and `egenberedskapsappen` (`prod`), all in europe-north1.

```sh
npx firebase-tools deploy --only firestore,storage,functions --project test
node --test functions/test/backend.test.mjs    # end-to-end check against the TEST project
node functions/scripts/create-codes.mjs egenberedskapsappen-test <partner> <count>   # activation codes
```

### App Check

Only our app may reach the backend. The functions require App Check and take each token once (no replays); Firestore and Storage enforce it in the test project.

- Development builds use the **debug provider**. Its token lives in `apps/mobile/.env.local` as `EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN` (never committed) and is registered for the `.dev` apps in the test project only. The production build never uses it.
- The release build uses **App Attest** (DeviceCheck fallback) on iOS and **Play Integrity** on Android.

### AI analysis of rooms

«Film et rom» sends photos of a room to Gemini on Vertex AI, which lists the things in them with a category, an estimated value and where each one is (`functions/src/analysis`). It is the one place content leaves the phone unencrypted, so:

- Only photos go up, never video or sound: when a room is filmed, the phone takes still frames from the recording and deletes it. The photos are deleted as soon as the analysis is done, and a sweep every hour removes anything left behind.
- The answer is text only, encrypted to a key made on the phone for that one analysis (X25519, `packages/sync/src/analysis.ts`). The phone cuts each thing's picture from its own copy of the photo.
- It runs in the EU and needs a vault with a current entitlement: the insurer pays for it as for backup. One analysis at a time per household, at most 20 a day.

Before it works in a project:

1. Enable the **Vertex AI API**, and grant `roles/aiplatform.user` to the functions' service account.
2. Check that the models (`ANALYSIS_MODEL`, default `gemini-2.5-pro`, and `ANALYSIS_VERIFIER_MODEL`, default `gemini-2.5-flash`) are offered in `ANALYSIS_LOCATION` (default `europe-north1`). If not, set it to another EU region in `functions/.env.<project>`.
3. Check the data governance settings for Vertex AI in the project (no caching or logging of prompts), and name the processing in the privacy policy.
4. Deploying `firestore` creates the TTL policy on `analysisJobs.expiresAt` as a backstop for the sweep.

Try it on your own photos, without the app: `cd functions && npm run build && node scripts/try-analysis.mjs room1.jpg room2.jpg`. It prints what was found and writes a contact sheet of the crops.

### Before launch: prod checklist

The prod project (`egenberedskapsappen`) has its Firestore database (europe-north1), Blaze and the budget alert, but nothing else yet. In order:

1. Firebase Auth: *Get started* in the console, turn on **Anonymous**.
2. Storage: create the default bucket in **europe-north1**, and grant `roles/firebaserules.firestoreServiceAgent` to the Firebase Storage service agent (Storage rules read vaults from Firestore).
3. Deploy: `npx firebase-tools deploy --only firestore,storage,functions --project prod`, then a container cleanup policy (`functions:artifacts:setpolicy`).
4. Grant `roles/firebaseappcheck.tokenVerifier` to the functions' service account (needed to consume tokens).
5. App Check: register **App Attest** (needs the Apple Team ID) and **Play Integrity** (needs the app in Play Console, linked to the project, with its SHA-256).
6. Only after a release build has been seen passing App Check: **enforce** it for Firestore and Storage. Enforcing earlier locks everyone out.

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
npm --workspace web run dev     # the website, on http://localhost:4321
```

In development, opening `exp://<host>:8081/--/utvikling` wipes the local database and fills it with the household from the design.

Add app dependencies with `npx expo install <pkg>` from `apps/mobile`, never plain `npm install`, so versions match the SDK.
