# App Store privacy labels and Google Play Data safety (draft)

Draft for LAUNCH.md section 4, 2026-10-08. Based on `apps/web/src/pages/personvern.astro` and on the code
(`apps/mobile/src/backup/firebase.ts`, `functions/src`, `apps/mobile/package.json`). Mikkel answers the forms;
read «Mismatches» first, since two of them change the answers.

## What actually leaves the phone

| Flow | When | What | Where | Readable by us/Google? |
| --- | --- | --- | --- | --- |
| Anonymous Firebase sign-in + App Check | only when backup or AI analysis is used | anonymous Firebase UID, App Attest / Play Integrity token, IP address (Firebase Auth and Functions log it, per Firebase's Play disclosure page) | Firebase, Google | yes (UID, IP) |
| Backup records | backup on | ciphertext + record type, record id, `updatedAt`, server timestamp | Firestore `vaults/{id}/records`, europe-north1 | content **no** (E2E); metadata yes |
| Backup files | backup on | ciphertext | Storage `vaults/{id}/files`, europe-north1 | no |
| Vault | backup on | member UIDs, wrapped key (encrypted), proof hash, partner, `entitledUntil`, `createdAt` | Firestore `vaults/{id}` | yes, but no content |
| Room photos | user starts an AI analysis | JPEG stills (never video or sound) | Storage `analysis/{uid}/{jobId}`, then Vertex AI europe-north1 | **yes**, until deleted (normally minutes; stuck jobs at the next hourly sweep; the job doc lives at most 24 h) |
| Analysis job | same | UID, vaultId, source photo/video, scene home/travel, frame count, phone's public key, status, error code, encrypted result | Firestore `analysisJobs`, ≤ 24 h | yes (metadata); result no |
| Analysis usage | same | per vault: date, count, active job | Firestore `analysisUsage/{vaultId}` | yes, no content |
| **EAS Update check** | **every app launch** | random per-install `EAS-Client-ID`, IP, platform, runtime version, update IDs (`node_modules/expo-updates/.../FileDownloader.*` sets the header) | Expo (650 Industries, USA) | yes |

Not sent: no analytics, no crash reporting, no ad SDK, no push token (reminders are local notifications), no
contacts, no location (the meeting place opens in the maps app on the phone).

## Apple: App Privacy

Apple counts data as «collected» when it leaves the phone and is stored *readable* for longer than it takes to
serve the request (developer.apple.com/app-store/app-privacy-details). Ciphertext we can't read is therefore not
collected. Room photos are stored readable in Storage while the job waits, so they are.

- **Data used to track you:** none. **Tracking:** No.
- **Data linked to you** (Apple treats personal data as linked; tied to the anonymous UID / vault):

| Category → type | Purpose | Notes |
| --- | --- | --- |
| User Content → Photos or Videos | App Functionality | room photos for AI analysis, deleted after the job |
| Identifiers → User ID | App Functionality | anonymous Firebase UID; also used against abuse (App Check, daily limit), which Apple files under App Functionality |
| Identifiers → Device ID | App Functionality | **only if EAS Update stays on** in production (EAS client ID). Decision below |

- Optional, conservative: User Content → Other User Content, for backup *metadata* (record type and timestamps,
  not content). Apple's definition probably doesn't require it; leave it out unless you prefer to over-disclose.
- Not collected: Contact Info, Health & Fitness (medicine lists stay on the phone or are E2E encrypted),
  Financial Info, Location, Contacts, Browsing/Search History, Usage Data, Diagnostics, Purchases, Sensitive Info.

## Google Play: Data safety

Google doesn't count data sent with end-to-end encryption that no intermediary, the developer included, can read
(Play Console help, answer 10787469). Service providers processing on our behalf (Google Cloud) are not «sharing».

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
| Device or other IDs | **Yes if EAS Update stays on** (EAS client ID, every launch) | No | No | Required | App functionality |

Not declared: backup content and files (E2E), App activity, App info and performance, Location, Contacts,
Financial info, Health and fitness, Messages, Audio, Files and docs (documents never leave the phone unencrypted).

Note on Firebase's own disclosure page (firebase.google.com/docs/android/play-data-disclosure): Auth and Functions
collect IP addresses for security, and the Functions SDK lists an FCM token. The app has no
`@react-native-firebase/messaging`, so no FCM token should exist; worth one look in a release build.

## Mismatches between the privacy policy and the code

1. **Expo / EAS Update isn't in the policy.** `expo-updates` checks u.expo.dev on every launch with a stable random
   install ID and the IP address. The policy says «Bare to funksjoner sender noe fra telefonen» and lists only
   Google, Apple. Expo is a US company. **Decision:** name Expo as a processor (and the transfer basis), or turn
   off automatic update checks in production. This also decides the Device ID rows above.
2. **Vertex AI abuse-monitoring logging.** Google's zero-data-retention page says Google may log prompts to Google
   models for abuse monitoring unless the customer gets an exception. The cache is off in both projects, but
   that's a separate setting. Until an exception is granted, «slettes så snart analysen er gjort» / «Vi lagrer
   ikke bildene» may not hold for Google's side. **Needs Mikkel:** request the abuse-monitoring exception for
   test and prod, or soften the wording.
3. **europe-west1.** `sweepAnalyses` runs in europe-west1 (Belgium), because Cloud Scheduler isn't offered in
   europe-north1. The policy says everything is in europe-north1 «med mindre annet står her» and nothing else is
   stated. It's still the EU; add one line.
4. **Stuck-job photos.** The policy says leftovers are cleared «innen en time». The sweep only touches jobs older
   than 30 minutes and runs hourly, so the worst case is about 90 minutes. «Aldri mer enn et døgn» holds.
5. **Not listed under what we store:** analysis job metadata (≤ 24 h) and `analysisUsage/{vaultId}` (date, count).
   `deleteVault` doesn't delete `analysisUsage/{vaultId}`, so «Da slettes alt med en gang» is slightly off. That
   fix is in `functions/`, so not made here.
6. **IP addresses** go to Firebase and Expo and aren't mentioned in the policy.
