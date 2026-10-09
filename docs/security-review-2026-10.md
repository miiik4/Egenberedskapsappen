# Security review, 2026-10-09

The review covered the app (`apps/mobile`), `packages/sync`, `packages/store`, `functions/src`, `firestore.rules`, `storage.rules`, `firebase.json` and `apps/web`, checked against the privacy promises in `AGENTS.md`. It also checked yesterday's commits (`5088e91..1313137`) for correctness. The backend review behind bdd002d was not redone; its fixes were checked to see that they hold. Line numbers refer to the working tree after the fixes below, unless a line says otherwise.

**Nothing has been committed or deployed.** All fixes are in the app and in `packages/sync`. None of them touches `functions/`, the rules or hosting, so nothing needs a backend deploy. The app changes are JS-only (no native config, no `version` bump). With Egenberedskap+ off they still need a build or update to reach phones.

Checks run after the fixes: `npm test`, `npm run typecheck` and `npm run lint` at the root, and `npm test` in `functions/`.

## Summary

| # | Severity | Finding | Status |
| --- | --- | --- | --- |
| 1 | Major | Document screens lose app-switcher/screenshot protection while documents are still on screen, and at the moment the app goes to the background | Fixed |
| 2 | Major | Document images are cached to disk by expo-image, outside `dokumenter/`, and survive deleting the document or «Slett alle data» | Fixed |
| 3 | Major | The sync record's `updatedAt` and `deleted` are not authenticated: whoever controls the backend can delete documents from every linked phone, or roll records back | Fixed (format v2) |
| 4 | Major | OTA updates aren't code-signed, and they come from a personal Expo account: whoever holds that account can ship JS that reads every passport | Not fixed (needs Mikkel) |
| 5 | Minor | File names from synced records are used as paths (path traversal from a vault member) | Fixed |
| 6 | Minor | The PDF viewer would render a non-PDF file (e.g. HTML) in the WebView if its MIME type said PDF | Fixed |
| 7 | Minor | «Slett alle data» leaves scheduled reminders naming stockpile items | Fixed |
| 8 | Minor | Web hosting has no CSP, `frame-ancestors` or X-Frame-Options | Not fixed (out of LAUNCH.md scope; was reverted once) |
| 9 | Minor | Reminder notifications show item names (could be medicine) on the lock screen | Not fixed (copy decision) |
| 10 | Minor | The recovery-code screen isn't kept out of the app switcher | Not fixed (feature hidden; product decision) |
| 11 | Minor | Picked analysis photos and an interrupted recording stay in the cache folder | Not fixed |
| 12 | Minor | `importFile` deletes the picker's copy before the record is saved, so a failed save can't be retried with the same pick | Not fixed |
| 13 | Minor | Already-expired items are left out of the Beredskapssjekk count and «Byttet» | Not fixed (deliberate and tested; flag for Tarjei/Mikkel) |
| 14 | Minor | Dependency advisories (`npm audit --omit=dev`) | Not fixed (judged; see below) |
| 15–22 | Info | See the Info section | – |

No critical findings.

## Major

### 1. Document protection is dropped while documents are still visible — fixed

`apps/mobile/src/documents/lock.tsx` (before the fix: `Protected`, about lines 107–118)

Each `DocumentGate` mounted a `Protected` that called `usePreventScreenCapture('documents')` with one **shared key**, and `enableAppSwitcherProtectionAsync` / `disableAppSwitcherProtectionAsync` without counting. expo-screen-capture keeps a `Set` of keys (`node_modules/expo-screen-capture/src/ScreenCapture.ts:42-66`), so the first unmount re-allowed capture for everyone.

- *Scenario A:* Open a document (`nodinfo/[id]`, thumbnails of a passport), then a file (`fil`, also gated), then close the file. The file screen's cleanup removes the shared key and turns off the iOS blur, but the document page underneath still shows the passport thumbnails. On Android FLAG_SECURE is gone, so the Recents thumbnail and screenshots show the passport. On iOS the app-switcher snapshot does.
- *Scenario B:* The gate rendered `Protected` only while unlocked. Going to the background sets `unlocked = false`, which unmounts `Protected` and turns protection **off** just as iOS takes its app-switcher snapshot (and Android its Recents thumbnail). Whether the snapshot shows the document or the lock screen came down to a race.

**Fix:** `useScreenProtection()` (`lock.tsx:117-128`) gives each screen its own key (`documents-${useId()}`) and counts mounted screens for the iOS blur. `DocumentGate` calls it whether locked or not (`lock.tsx:88`), so locking on the way to the background never lifts the protection.

**Verified:** by reading the library source and through typecheck and lint. Not run on a device. Worth checking in the simulator walkthrough (LAUNCH.md §5): open a file, close it, then switch apps.

### 2. Passport images cached outside `dokumenter/` — fixed

`apps/mobile/src/app/(tabs)/nodinfo/[id].tsx:92-98`, `apps/mobile/src/app/fil.tsx:111-118`

expo-image defaults to `cachePolicy: 'disk'` (`node_modules/expo-image/ios/Utils/ImageUtils.swift:213-215`). Every document photo shown as a thumbnail or full screen was therefore written to SDWebImage's disk cache (Glide's on Android), outside `dokumenter/`.

- *Scenario:* A user deletes a passport document, or uses «Slett alle data». The decoded passport image stays in `Library/Caches/…` until the OS evicts it. That breaks the promise that documents live only in `dokumenter/`, and erasure is no longer complete. (Caches is excluded from iCloud backup and protected by `NSFileProtectionComplete`, so this is about persistence after deletion, not exfiltration.)

**Fix:** the document thumbnails and the file viewer use `cachePolicy="memory"`. `deleteEverything` (`apps/mobile/src/data/delete-everything.ts`) now also calls `Image.clearDiskCache()` and `clearMemoryCache()`, which removes copies already cached by earlier builds and belonging photos.

**Not changed:** belonging photos and analysis crops (`gjenstand.tsx`, `film/forslag.tsx`) still use the disk cache. They aren't documents, and «Slett alle data» now clears that cache.

### 3. Sync metadata not authenticated — fixed

`packages/sync/src/vault.ts:13-26, 52-74`, used by `packages/sync/src/engine.ts`

A record's AAD was `record/<type>/<id>`. `updatedAt` and `deleted` travel in the clear, and the phones act on them: last-writer-wins, soft delete, and for file rows `files.delete(fileName)` plus a remote delete (`engine.ts:110-115`). The code comment claimed the server "can't swap one sealed record for another", but it could change the metadata freely.

- *Scenario:* Anyone with write access to Firestore (a compromised Firebase project or service account, or a malicious operator; the E2E design treats the cloud as untrusted) sets `deleted: true` and a future `updatedAt` on a household's `document_files` records. On the next sync **every linked phone deletes its local passport files** and the records. The server could also replay an old ciphertext with a new `updatedAt` to roll a record back. Confidentiality held; integrity and availability of local data did not.

**Fix:** a new `v2` record envelope whose AAD is `egenberedskapsappen/v2/record/` followed by the JSON of `[type, id, updatedAt, deleted]`. A record whose metadata was changed no longer decrypts, and sync stops with `DecryptionError` rather than acting on it. `v1` records (written before this change) are still read. Egenberedskap+ has never shipped and prod has no activation codes, so they can only exist in development and test vaults. **Before Egenberedskap+ is switched on, consider deleting the test vaults and removing `v1` acceptance (`vault.ts:68-72`).** As long as `v1` is accepted, a server can still replay those old records with altered metadata.

Phones running an older dev build can't read `v2` records. That only affects development and test.

**Tests:** `vault.test.ts` ("fails if the server marks a record as deleted, or passes an old version off as new" and "still reads records written before 1.3.0"). `engine.test.ts` ("refuses a deletion the server made up, and keeps the document").

### 4. Unsigned OTA updates on a personal account — not fixed

`apps/mobile/app.json:93-98` (`updates.url`, `runtimeVersion`). There is no `updates.codeSigningCertificate`.

The JS bundle can read the database, every document file and the Keychain data key, and it is replaced by `eas update` with no end-to-end signature. The project belongs to the personal Expo account «mkl96» (already in LAUNCH.md §5).

- *Scenario:* someone takes over that Expo account (phished password, leaked token, no 2FA) and publishes an update to the `production` channel. Every installed phone downloads JS that uploads passports and medicine lists.

**Recommendation:**
1. Move the project to a company account with 2FA (already a LAUNCH item).
2. Turn on expo-updates code signing (`codeSigningCertificate` + `codeSigningMetadata`), keeping the private key offline. This is native config, so it needs a `version` bump and new builds. It is easiest to do now, before 1.0 ships.
3. Keep the decision in eecd14d not to unlock features by update.

**Status:** not fixed. It needs Mikkel's account and a key, and it changes native config.

## Minor

### 5. Path traversal through synced file names — fixed

`packages/sync/src/engine.ts:45-51, 108`, `apps/mobile/src/documents/files.ts:15-19`

`file_name` comes from records written by other phones in the vault. `storedFile(name)` joined it onto `dokumenter/`. Decryption is authenticated, so only a vault member, who already knows the recovery code, could do this.

- *Scenario:* a member's compromised phone writes `../SQLite/egenberedskap.db` as a file name with `deleted: true`. Every other phone then deletes its database. Or it plants a file outside the backup-excluded folder.

**Fix:** `isSafeFileName` accepts only a name plus an extension with no path characters. The engine skips unsafe names, and `storedFile` refuses them. **Test:** `engine.test.ts` ("never writes or deletes a file outside the folder…"). Every file name the app has ever made is `randomUUID().ext`; checked in the git history.

### 6. The PDF WebView renders whatever it is given — fixed

`apps/mobile/src/app/fil.tsx:71-72`

On iOS a file whose MIME type is `application/pdf` opened in a WKWebView with file-read access to `dokumenter/`. WKWebView picks the renderer from the file's extension, not the MIME type. A synced record (see 5) could pair `mime_type: application/pdf` with an `.html` file, and the WebView would then run it as a page with JS. The WebView now opens only files named `*.pdf`; anything else gets the "open in another app" path.

### 7. Reminders survive «Slett alle data» — fixed

`apps/mobile/src/data/delete-everything.ts`. After a wipe `onboarded` is false, so `NotificationsProvider` never reschedules, and the old schedule kept firing with the deleted items' names («Insulin går ut …»). The wipe now cancels all scheduled notifications.

### 8. Web hosting lacks clickjacking/CSP headers — not fixed

`firebase.json:29-37` sets nosniff, Referrer-Policy and Permissions-Policy only. The site is static: nothing takes input, and the calculator writes only `textContent`. The impact is low. Firebase Hosting already sends HSTS.

These headers were added in 278d048 and reverted wholesale in 63c0363 along with unplanned features. Adding `X-Frame-Options: DENY` and `Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; object-src 'none'` is safe; a full `script-src` needs checking against Astro's inlined scripts. This should go into LAUNCH.md §8 if wanted, and it needs a hosting deploy.

### 9. Item names on the lock screen

`apps/mobile/src/notifications/copy.ts:18`. «Insulin går ut 12. okt.» can be read on a locked phone. Consider a generic body, or `hiddenContentsPreview` behaviour. This is a copy decision.

### 10. Recovery code in the app switcher

`apps/mobile/src/app/sikkerhetskopi.tsx:103-117`. The code that opens the whole backup can appear in the app-switcher snapshot. `useScreenProtection()` would fix it in one line, but it also blocks screenshots on Android, so whether users may screenshot their code is a product decision. The feature is hidden in 1.0.

### 11. Analysis inputs left in the cache

`apps/mobile/src/analysis/analysis-provider.tsx:190`. Picked photos (the picker's cache copies) aren't deleted after `preparePhoto`. A recording is deleted only when frame extraction finishes, so an interruption leaves it behind. The cache is excluded from backups but keeps pictures of the home. The feature is hidden in 1.0.

### 12. `importFile` cleanup order (correctness)

`apps/mobile/src/documents/files.ts:54`. The coordinator asked whether this can delete a file that isn't a cache copy. **It can't:** it deletes only URIs under `Paths.cache`. Every caller passes a picker copy (DocumentPicker with `copyToCacheDirectory: true`, ImagePicker), the demo's own temp file, or an analysis crop, which lives in `Documents/analyse` and so isn't touched.

It does delete the picker's copy before `record()` runs. If saving then fails, the user's pick is gone and retrying the same sheet (`gjenstand.tsx`) fails until they pick again. Rare; not fixed.

### 13. Beredskapssjekk ignores already-expired items (correctness)

`packages/core/src/check.ts:28`. `left >= 0` leaves out expired items. «Ingen varer går ut innen …» can therefore show while something has already expired, and «Byttet» doesn't renew it. This is deliberate and covered by `check.test.ts`, and the old screen did the same, so it was left as is; it's worth a product decision.

The save order in `beredskapssjekk.tsx:65-77` is sound: dates are written first, the check only after, and a retry recomputes from the reloaded stock, so nothing is renewed twice. However, the error is rethrown from `onPress` and never shown to the user.

### 14. Dependencies (`npm audit --omit=dev`)

- **Root:** 42 advisories (30 high, 12 moderate). Almost all are build tooling (metro, micromatch/braces, @expo/cli, config-plugins → xcode → uuid), which isn't in the app bundle.
- **Shipped code:**
  - `decode-uri-component` 0.2.2 through `expo-router` → `query-string` 7.1.3: a crafted deep link could cost CPU while parsing. Low.
  - `node-forge` through `expo-updates` code signing: unused until code signing is turned on (finding 4); revisit then.
  - `@grpc/grpc-js` through the `firebase` JS SDK that `@react-native-firebase/app` depends on: Node-only and not used by the native SDK.
- **functions/:** `uuid` through `gaxios` (moderate, bounds check with a caller-supplied buffer): not reachable. `npm audit fix` there is non-breaking and can be done at the next functions deploy.

Nothing was upgraded.

## Info

15. **Crypto reviewed and sound:**
    - AES-256-GCM with a fresh random 12-byte nonce per seal (`apps/mobile/src/backup/crypto.ts`). No reuse risk at these volumes.
    - The recovery code carries 120 bits, so a domain-separated SHA-256 is an adequate KDF (`recovery.ts:39-44`).
    - `vaultId` and `proof` use separate labels, and the server stores only `sha256(proof)`, compared with `timingSafeEqual` (`functions/src/index.ts:97-99`).
    - Analysis sealing uses X25519 + HKDF(salt = server‖phone public) + GCM with the job id as AAD, a fresh server key per job, and a strictly validated phone key (`seal.ts`).
    - The data key is kept with `WHEN_UNLOCKED_THIS_DEVICE_ONLY` (`keychain.ts:12`).
    - Neither keys nor the recovery code are logged or stored. The recovery code leaves the app only through the user's own Share tap (`sikkerhetskopi.tsx:115`).
16. **Files:** a file's AAD binds it only to its name. That is enough, because names are fresh UUIDs and never rewritten.
17. **The database is in iCloud and Android backups** (only `dokumenter/`, `analyse/` and SecureStore are excluded). That matches AGENTS.md, but the DB holds document names, contacts, owner name and birth date, and the per-analysis secret keys. The privacy policy should say so.
18. **Firebase native SDK:** `@react-native-firebase/app` configures FirebaseApp natively at every launch, even with Egenberedskap+ off. No JS path loads Firebase for a phone with no linked backup: `BackupProvider`/`AnalysisProvider` gate on `wanted`, and the only top-level import of `@react-native-firebase/*` is `backup/firebase.ts`, loaded via `require` behind the guard. With no Analytics, Messaging or Installations in the build, no network traffic is expected. The privacy answers (86299bf) state that only Expo's update check leaves the phone, so confirm this once with a proxy (Proxyman/Charles) on a release build.
19. **Hidden routes:** every top-level route file is declared in `_layout.tsx`. `gjenopprett`, `film/*` and `sikkerhetskopi` sit behind `Stack.Protected guard={EGENBEREDSKAP_PLUS_ENABLED && …}`, and `utvikling` behind `__DEV__`. Unlisted routes would be reachable by deep link; none exist. The «KI-analyse» list in Eiendeler only shows if analyses already exist, which can't happen on a fresh 1.0 install.
20. **Keychain cleared at `user_version` 0** (`data-provider.tsx:80-101`; coordinator question). Safe:
    - `migrate()` sets `user_version` inside each migration's transaction (`packages/store/src/schema.ts:295-299`), so it is 0 only for a database that has never completed a migration.
    - `reset()` («Slett alle data») deletes rows but leaves `user_version` alone.
    - A failed migration on an existing DB leaves the old non-zero version.
    - Reopening after an error, or a hot reload, sees a migrated DB.
    - An iCloud or device-transfer restore brings the DB (non-zero) but never the `THIS_DEVICE_ONLY` key.
    - Under `NSFileProtectionComplete` a locked phone fails to open the DB rather than creating a new one.
    - The check runs in `onInit`, before any provider renders, so the key can't have been read yet.
    
    One remaining gap: the anonymous Firebase Auth user also survives a reinstall in the iOS Keychain and stays a vault member. It can only read ciphertext.
21. **«Slett alle data» with the lock on** (coordinator question) asks for Face ID or the code before wiping (`husstand.tsx:61`). It also asks while the phone's lock state is still being checked (`method === undefined`). The wipe doesn't erase the cloud backup, by design, and the dialog says so when Egenberedskap+ is on.
22. **bdd002d holds:**
    - The sweep runs every 30 minutes, deletes frames of any job older than 30 minutes, and times running jobs from `claimedAt` (`jobs.ts:214-249`).
    - Deleting an `analysing` job doesn't free the slot (`jobs.ts:205`); the running analysis frees it in its `finally`.
    - The trigger runs with `concurrency: 1` (`jobs.ts:134`).
    - Frames are checked as JPEG and ≤ 50 MP before decoding.
    - `deleteVault` sets `deleting` and `entitledUntil = now` first (`index.ts:150`), so `joinVault`/`extendVault` refuse and the rules and `startAnalysis` refuse writes and new jobs. It then deletes jobs, usage, records and files, and the files once more.
    - TTL on `analysisJobs.expiresAt` is set in `firestore.indexes.json`.
    - Logs carry counts and error kinds only (`pipeline.ts:56-60`, `jobs.ts:186-188`).
    
    The rules match what the code needs: vault and record access only for members, writes only while entitled, analysis uploads only by the owner while `uploading`, numbered frames under 2 MB as `image/jpeg`, and everything else denied. App Check isn't enforced on Firestore and Storage in prod yet; that is already a LAUNCH item.

Other things checked with nothing found:
- The PDF report escapes all text, and the data URIs are made by the app (`report-html.ts`).
- Deep-link params trigger no side effects on mount outside `utvikling`.
- No secrets are committed. `.env.local` is ignored and was never in history; `functions/.env.*` hold only model and region names.
- `console.error` calls log error objects only, never content.
- Contact phone numbers go to `tel:` lightly cleaned (`nodinfo/index.tsx:20`). The OS asks before dialling.
