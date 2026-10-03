# Egenberedskapsappen

npm workspaces monorepo: `apps/mobile` (Expo), `packages/core` (domain logic) and `packages/store` (on-device storage). See README.md.

- Expo changes every SDK. Read `apps/mobile/AGENTS.md` before touching Expo, EAS or React Native APIs.
- Domain logic belongs in `packages/core`, with tests. It must not import React or React Native, so the app, functions and web can all share it. Consumed as TypeScript source, with no build step.
- The app is local-first: the stockpile, contacts and documents must work with no network. All data lives in SQLite through `packages/store`; screens read it with `useData()` and write with `useActions()`, which reloads after every write.
- Schema changes are new entries appended to `MIGRATIONS` in `packages/store/src/schema.ts`. Never edit a migration that has shipped.
- With the React Compiler on, don't use `x!.prop` inside handlers for something that may be undefined: the compiler can read it during render. Narrow first (`x && …`).
- Guidance figures (days, litres) live only in `packages/core/src/guidance.ts`. Don't hard-code them elsewhere.
- UI copy is Norwegian bokmål. Avoid "ferdig" and "100 %"; use "på plass".
- Privacy is a core promise; the data includes passports and medicine lists:
  - iOS files use `NSFileProtectionComplete`: nothing on disk, the database included, can be read while the phone is locked. Any future background work (sync, background fetch) must cope with that.
  - Document files live in `dokumenter/`, kept out of iCloud and Android backups (`modules/backup-exclusion`). Never move them somewhere that's backed up.
  - Document screens go inside `<DocumentGate>` (Face ID or code, hidden from the app switcher). Emergency numbers and contacts must never be locked.
  - Nothing sensitive leaves the phone unencrypted. Backup is end-to-end encrypted (`packages/sync`): the data key lives in the Keychain, the cloud only ever holds ciphertext plus record type and timestamps, and the recovery code is never stored or sent.
- Backup has no accounts. Each install is an anonymous Firebase user; a vault is found and joined through hashes of the recovery code (`vaultIdentity`). Insurers pay through activation codes, checked by the functions in `functions/`. Without an entitlement a vault is readable but not writable.
- Firebase isn't in Expo Go: anything that touches it must check `firebaseAvailable()` so the rest of the app still runs there.
- New synced tables go in `TABLES` in `packages/store/src/sync-source.ts`, parents before children.
- No ad SDKs or third-party tracking. Sponsored content is served first-party and labelled "Sponset".
- Run `npm test`, `npm run typecheck` and `npm run lint` from the root before calling something done.
