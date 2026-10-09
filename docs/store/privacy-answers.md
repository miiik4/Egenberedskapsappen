# App Store privacy labels and Google Play Data safety (draft)

Draft for LAUNCH.md section 6, redone 2026-10-09 for 1.0. Mikkel answers the forms. Two sets of answers:

1. **1.0, Egenberedskap+ off** (`EGENBEREDSKAP_PLUS_ENABLED = false` in `apps/mobile/src/constants/config.ts`).
   Use these for the first submission.
2. **Egenberedskap+ on** (backup, AI analysis of rooms, restore). Switching it on is an `eas update`, with no new
   build and no store review. Update both forms *before* that update goes out; both can be edited at any time,
   without a new version.

Based on the code (`apps/mobile/src/backup/`, `apps/mobile/src/analysis/`, `apps/mobile/app.json`, `functions/src`)
and on `apps/web/src/pages/personvern.astro`. What was read in code is stated as such. Nothing here has been checked
on a device yet; see «Still to check».

## 1.0, Egenberedskap+ off

### What leaves the phone

| Flow | When | What | Where | Readable by us/Expo? |
| --- | --- | --- | --- | --- |
| **EAS Update check** | every app launch | random per-install `EAS-Client-ID`, IP address, platform, runtime version (`1.3.0`), channel, IDs of the running and embedded update | Expo (650 Industries, USA), `u.expo.dev` | yes |

That is the only flow the app starts itself. `app.json` has `updates.url` set and no `checkAutomatically`, so
expo-updates uses its default (`ON_LOAD`): it checks on every launch. The app has no other `expo-updates` code.

Things the user starts, which go through another app and aren't collected by the app: phone calls (`tel:`), the
meeting place in the maps app, guide links in the browser, and «Gi tilbakemelding» (`mailto:` in the user's own mail
app; the body is pre-filled with the app version and iOS/Android version, and the user sends it or not).

Not sent: no Firebase call (below), no analytics, no crash reporting, no ad SDK, no push token (reminders are local
notifications; there's no `getExpoPushTokenAsync` or FCM), no contacts, no location.

### No Firebase call with the switch off (read in code, 2026-10-09)

- Every Firebase call goes through `apps/mobile/src/backup/firebase.ts`, and that module is only reached through
  `loadFirebase()` / `requireFirebase()` in `load-firebase.ts` (a guarded `require`, never a static import; the
  only static import of it elsewhere is `import type`, which is erased).
- `loadFirebase()` is called from three places:
  - `BackupProvider` and `AnalysisProvider`: only when `EGENBEREDSKAP_PLUS_ENABLED || vaultId !== null`. Every
    sync, sign-in, watch and delete path there is behind that, or behind `vaultId`, or behind a screen that's hidden.
  - `film/index.tsx` (`NotAvailable`): the `film/*` and `sikkerhetskopi` screens are in a `Stack.Protected` guard on
    the switch in `app/_layout.tsx`, as is `gjenopprett`. Every button into them is hidden too (Eiendeler, the room
    page, Husstand, velkommen), and a deep link lands on the start screen.
- `vaultId` is only set by `enable` or `restore` (the Sikkerhetskopi and Gjenopprett screens, hidden) and lives in
  SQLite, which is deleted with the app. So a 1.0 install never has a vault linked. Only development and test
  phones that linked one earlier keep syncing, which is intended.
- Caveat: the native Firebase SDK is still in the build, and `FirebaseApp.configure()` runs natively at launch
  (`@react-native-firebase/app`'s config plugin). That reads the bundled `GoogleService-Info.plist` /
  `google-services.json`; it shouldn't call the network by itself (no Analytics, Crashlytics or Messaging package is
  installed, and App Check is only activated from JS in `ensureAppCheck`), but this has not been seen on a device.

### Apple: App Privacy

- **Do you or your third-party partners collect data from this app?** Yes, because of Expo's update check.
- **Tracking:** No.
- **Data Not Linked to You:**

| Category → type | Purpose | Notes |
| --- | --- | --- |
| Identifiers → Device ID | App Functionality | Expo's random install ID (`EAS-Client-ID`). There's no account or user ID it could be linked to |

- Not collected: everything else, including Contact Info (the feedback email is optional, user-initiated and sent
  from the mail app; it meets Apple's «optional disclosure» criteria), User Content, Health & Fitness, Financial
  Info, Location, Contacts, Usage Data, Diagnostics, Identifiers → User ID.
- If you'd rather declare nothing: Apple counts data collected by third-party partners' code in the app, and Expo
  keeps request logs. Declaring the Device ID is the safe answer.

### Google Play: Data safety

- **Does your app collect or share any of the required user data types?** Yes.
- **Is all of the user data collected by your app encrypted in transit?** Yes (HTTPS to `u.expo.dev`).
- **Do you provide a way for users to request that their data is deleted?** Mikkel decides. Suggested: No. The
  only data is Expo's request logs with a random install ID, which we can't look up per user; the app has no
  accounts, so the account-deletion URL requirement doesn't apply. Everything else is on the phone and goes with
  the app.
- **Shared with third parties:** none (Expo processes it for us as a service provider, which isn't «sharing»).

| Data type | Collected | Shared | Ephemeral | Required / optional | Purposes |
| --- | --- | --- | --- | --- | --- |
| Device or other IDs | Yes (Expo install ID, every launch) | No | No | Required | App functionality |

Not declared: Personal info (incl. User IDs), Photos and videos, Files and docs, Health and fitness, Financial
info, Location (the IP address isn't used to work out a location), Contacts, Messages, Audio, App activity, App
info and performance.

### Mismatches for 1.0

1. **The privacy policy describes Egenberedskap+ as if it were in the app.** `personvern.astro` says what backup
   and AI analysis send, the legal basis is «sikkerhetskopi og KI-analyse», and Firebase/Apple/Google are listed as
   processors. In 1.0 only the Expo part applies. Not wrong, but the forms above will look thinner than the policy.
   One sentence in the policy would line them up, e.g. that backup and KI-analyse aren't in the app yet and nothing
   goes to Google until they are. That's a website change, not made here.
2. **Permission texts mention AI analysis.** The camera and photo texts in `app.json` say «Velger du KI-analyse,
   sendes bildene til analyse i EU». 1.0 has no AI analysis. Harmless for privacy (nothing is sent), but App Review
   may ask. Changing them is native config: a `version` bump and a new build.

## Egenberedskap+ on

Same as the 1.0 answers, plus the flows below. Use these from the `eas update` that turns the switch on.

### What leaves the phone, in addition to the update check

| Flow | When | What | Where | Readable by us/Google? |
| --- | --- | --- | --- | --- |
| Anonymous Firebase sign-in + App Check | only when backup or AI analysis is used | anonymous Firebase UID, App Attest / Play Integrity token, IP address (Firebase Auth and Functions log it, per Firebase's Play disclosure page) | Firebase, Google | yes (UID, IP) |
| Backup records | backup on | ciphertext + record type, record id, `updatedAt`, server timestamp | Firestore `vaults/{id}/records`, europe-north1 | content **no** (E2E); metadata yes |
| Backup files | backup on | ciphertext | Storage `vaults/{id}/files`, europe-north1 | no |
| Vault | backup on | member UIDs, wrapped key (encrypted), proof hash, partner, `entitledUntil`, `createdAt` | Firestore `vaults/{id}` | yes, but no content |
| Room photos | user starts an AI analysis | JPEG stills (never video or sound) | Storage `analysis/{uid}/{jobId}`, then Vertex AI europe-north1 | **yes**, until deleted (normally minutes; leftovers at the next sweep; the job doc lives at most 24 h) |
| Analysis job | same | UID, vaultId, source photo/video, scene home/travel, frame count, phone's public key, status, error code, encrypted result | Firestore `analysisJobs`, ≤ 24 h | yes (metadata); result no |
| Analysis usage | same | per vault: date, count, active job | Firestore `analysisUsage/{vaultId}` | yes, no content |

### Apple: App Privacy

Apple counts data as «collected» when it leaves the phone and is stored *readable* for longer than it takes to
serve the request (developer.apple.com/app-store/app-privacy-details). Ciphertext we can't read is therefore not
collected. Room photos are stored readable in Storage while the job waits, so they are.

- **Tracking:** No.
- **Data Linked to You** (Apple treats data tied to the anonymous UID / vault as linked):

| Category → type | Purpose | Notes |
| --- | --- | --- |
| User Content → Photos or Videos | App Functionality | room photos for AI analysis, deleted after the job |
| Identifiers → User ID | App Functionality | anonymous Firebase UID; also used against abuse (App Check, daily limit), which Apple files under App Functionality |

- **Data Not Linked to You:** Identifiers → Device ID (Expo's install ID), as in 1.0.
- Optional, conservative: User Content → Other User Content, for backup *metadata* (record type and timestamps,
  not content). Apple's definition probably doesn't require it; leave it out unless you prefer to over-disclose.
- Not collected: Contact Info, Health & Fitness (medicine lists stay on the phone or are E2E encrypted),
  Financial Info, Location, Contacts, Browsing/Search History, Usage Data, Diagnostics, Purchases, Sensitive Info.

### Google Play: Data safety

Google doesn't count data sent with end-to-end encryption that no intermediary, the developer included, can read
(Play Console help, answer 10787469). Service providers processing on our behalf (Google Cloud, Expo) are not
«sharing».

- **Does your app collect or share any of the required user data types?** Yes.
- **Is all user data encrypted in transit?** Yes (TLS to Firebase, Vertex AI and Expo).
- **Do you provide a way for users to request that their data is deleted?** Yes: «Slett sikkerhetskopien» in
  Sikkerhetskopi deletes the vault at once; analysis photos are deleted automatically. The app has no user-created
  accounts (anonymous Firebase users only), so the account-deletion URL requirement shouldn't apply; give the
  privacy policy URL if the form asks.
- **Shared with third parties:** none.

| Data type | Collected | Shared | Ephemeral | Required / optional | Purposes |
| --- | --- | --- | --- | --- | --- |
| Photos and videos → Photos | Yes | No | No (stored in Storage until the job ends) | Optional | App functionality |
| Personal info → User IDs | Yes (anonymous Firebase UID) | No | No | Optional (only with backup / AI) | App functionality; Fraud prevention, security and compliance |
| Device or other IDs | Yes (Expo install ID, every launch) | No | No | Required | App functionality |

Not declared: backup content and files (E2E), App activity, App info and performance, Location, Contacts,
Financial info, Health and fitness, Messages, Audio, Files and docs (documents never leave the phone unencrypted).

Note on Firebase's own disclosure page (firebase.google.com/docs/android/play-data-disclosure): Auth and Functions
collect IP addresses for security, and the Functions SDK lists an FCM token. The app has no
`@react-native-firebase/messaging`, so no FCM token should exist; worth one look in a release build.

### Open points before switching it on

1. **Vertex AI abuse-monitoring logging** (LAUNCH.md section 2). Until Google grants the exception, Google may log
   prompts for abuse monitoring. The policy now says so («Google kan for en kort periode logge …»); if the
   exception is granted, that sentence can go.
2. **`analysisUsage/{vaultId}`** isn't deleted by `deleteVault`, so «Da slettes alt med en gang» is slightly off.
   The fix is in `functions/`.
3. **Activation codes and partners.** The vault stores which partner a code came from. No partner may be named
   anywhere before a signed agreement (LAUNCH.md section 7).

## Still to check

- [ ] A release build with Egenberedskap+ off, behind a proxy (e.g. Proxyman or Charles): only `u.expo.dev` on
      launch, nothing to `*.googleapis.com` / `firebase*`, also after using every screen. This is what confirms the
      1.0 answers above.
- [ ] Same build with the switch on (an `eas update` to a test channel): the flows in the table, and no FCM token.
