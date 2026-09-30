# Egenberedskapsappen

npm workspaces monorepo: `apps/mobile` (Expo) and `packages/core` (shared TypeScript). See README.md.

- Expo changes every SDK. Read `apps/mobile/AGENTS.md` before touching Expo, EAS or React Native APIs.
- Domain logic belongs in `packages/core`, with tests. It must not import React or React Native, so the app, functions and web can all share it. Consumed as TypeScript source, with no build step.
- The app is local-first: the stockpile, contacts and documents must work with no network.
- Guidance figures (days, litres) live only in `packages/core/src/guidance.ts`. Don't hard-code them elsewhere.
- UI copy is Norwegian bokmål. Avoid "ferdig" and "100 %"; use "på plass".
- No ad SDKs or third-party tracking. Sponsored content is served first-party and labelled "Sponset".
- Run `npm test`, `npm run typecheck` and `npm run lint` from the root before calling something done.
