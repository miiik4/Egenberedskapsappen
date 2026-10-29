# Releasing: builds and updates

How to build the app and publish over-the-air updates. Written 2026-10-09, when the project moved to the
company Expo account; updates were code-signed from then until 2026-10-17 (see «Why updates aren't signed»).

## Accounts

| What | Where |
| --- | --- |
| Expo project | `@holm-and-tall-as/egenberedskapsappen` (project ID `b92cddc0-f00c-4701-b7f9-99dfcf4a2ccc`), `owner` in `apps/mobile/app.json` |
| Firebase | `egenberedskapsappen-test` (alias `test`) and `egenberedskapsappen` (`prod`), see README |
| Apple | Holm & Tall AS, Team ID `979DRPJKZL` (approved 2026-10-29); App Store Connect answers in `docs/store/app-store-connect.md` |
| Google Play | Holm & Tall AS; answers in `docs/store/play-console.md` |

The project was transferred from the personal account `mkl96`; its ID and update URL stayed the same.

## Build profiles (`apps/mobile/eas.json`)

| Profile | What | Firebase | Channel |
| --- | --- | --- | --- |
| `development-simulator` | Dev client for the iOS simulator | test | `development` |
| `development` | Dev client for a phone | test | `development` |
| `preview` | Release build for testing; Android gives an installable APK (arm64) | test | `preview` |
| `production` | Store build (AAB on Android); `version` from app.json, build number increments automatically | prod | `production` |

```sh
cd apps/mobile
npx eas-cli build --profile preview --platform android      # test APK, no store account needed
npx eas-cli build --profile production --platform ios       # needs the Apple Developer account
npx eas-cli build --profile production --platform android   # first AAB is uploaded to Play Console by hand
```

Android builds go to Play's internal testing track by themselves (since 2026-10-27):

```sh
npx eas-cli build --profile production --platform android --auto-submit   # build, then upload to internal testing
npx eas-cli submit --platform android --profile production --id <build id>  # upload a build that's already made
```

Then, in Play Console, add the bundle to a production release (Produksjon → Opprett ny utgave → Legg til fra
biblioteket), write the release notes from `docs/store/listing.md`, and send it to review in the publishing overview.
The upload uses the service account `eas-submit@egenberedskapsappen.iam.gserviceaccount.com` in the prod Cloud project
(Google Play Android Developer API on). Its key is stored on EAS (Credentials → Android → `no.htas.egenberedskap`) and in
Mikkel's password manager, never in the repo. In Play it may only release to testing tracks, so production stays a step
a person takes. The submit profile names the app (`applicationId` in `eas.json`).

Run the first production build of each platform in your own terminal: EAS asks for the Apple login and creates the
signing credentials interactively.

The only EAS secret is `EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN` in the `preview` environment (test builds only).
Production builds use App Attest and Play Integrity and need no secrets.

## When a new build is needed

Over-the-air updates only reach builds with the same `version` in `app.json` (runtime policy `appVersion`).

- **JS-only change:** publish an update (below).
- **Native change** (a new native package, a config plugin, app.json native settings such as permissions, icons,
  `infoPlist`, the `updates` block): bump `version`, then make new builds. Otherwise an update could reach a build that
  lacks the native code and crash it.
- **Egenberedskap+:** switched on only in a new version through store review, never with an update
  (LAUNCH.md, «Decided 2026-10-08»).

## Updates

### Publishing an update

Only Mikkel publishes updates. Use the script (it runs `npx eas-cli`, so no global `eas` is needed):

```sh
cd apps/mobile
npm run publish-update -- --channel preview --message "…"        # to the test builds first
npm run publish-update -- --channel production --message "Kort beskrivelse"
```

Before publishing: `npm test`, `npm run typecheck` and `npm run lint` from the root, and try the change on a
`preview` build. An update reaches a build on its next launch and is used from the launch after that, so close and
reopen the app twice to see it.

### Why updates aren't signed

From 2026-10-09 to 2026-10-17 updates were code-signed with a key kept on Mikkel's Mac, so a stolen Expo account
couldn't ship code. Publishing the first signed update failed: «EAS Update code signing requires a subscription to
the EAS Production or Enterprise plan» (USD 199 a month in October 2026), and the account is on the free plan. Mikkel
decided on 2026-10-17 to drop signing and stay on the free plan for 1.0: `codeSigningCertificate` and
`codeSigningMetadata` left app.json (`version` went to 1.6.0, since that's native config), the certificate left the
repo, and the private key on the Mac and in the password manager is no longer used.

What protects the update channel now is the Expo account: keep two-factor login on `holm-and-tall-as`, keep it to
Mikkel, and revoke any access token that isn't needed. If the plan is ever bought, signing comes back with
`npx expo-updates codesigning:generate` and a `version` bump (the old key pair can be reused if it's still in the
password manager).

The free plan covers updates for 1 000 monthly active users; above that Expo bills usage, and the Starter plan
(USD 19 a month) covers 3 000.

## Websites

Two Astro sites, two Hosting targets in `firebase.json` and `.firebaserc`: `app` is `apps/web` (the app's site,
egenberedskapsappen.no) and `firma` is `apps/firma` (the company's site, holmtall.no). Both build in the predeploy
step; a plain `--only hosting` deploys both.

```sh
npx firebase-tools deploy --only hosting:app --project prod    # egenberedskapsappen.no, indexed
npx firebase-tools deploy --only hosting:app --project test    # egenberedskapsappen-test.web.app, noindex
npx firebase-tools deploy --only hosting:firma --project prod  # the company site
```

The `firma` target points at the Hosting sites `holmtall` (prod, https://holmtall.web.app) and `holmtall-test`
(test, https://holmtall-test.web.app), both created and deployed 2026-10-23. The custom domains `holmtall.no` and
`www.holmtall.no` (a redirect to the apex) are added to the prod site; they go live once the DNS at the registrar
points at Hosting (the records are in LAUNCH.md, *After launch*).

The headers (cache, CSP, no framing) are listed once per target in `firebase.json`; change both together.
