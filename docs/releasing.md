# Releasing: builds, updates and signing

How to build the app, publish over-the-air updates, and keep the update signing key safe. Written 2026-10-09,
when the project moved to the company Expo account and updates became code-signed.

## Accounts

| What | Where |
| --- | --- |
| Expo project | `@holm-and-tall-as/egenberedskapsappen` (project ID `b92cddc0-f00c-4701-b7f9-99dfcf4a2ccc`), `owner` in `apps/mobile/app.json` |
| Firebase | `egenberedskapsappen-test` (alias `test`) and `egenberedskapsappen` (`prod`), see README |
| Apple / Google | Not set up yet (LAUNCH.md section 6) |

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

Run the first production build of each platform in your own terminal: EAS asks for the Apple login and creates the
signing credentials interactively.

The only EAS secret is `EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN` in the `preview` environment (test builds only).
Production builds use App Attest and Play Integrity and need no secrets.

## When a new build is needed

Over-the-air updates only reach builds with the same `version` in `app.json` (runtime policy `appVersion`).

- **JS-only change:** publish a signed update (below).
- **Native change** (a new native package, a config plugin, app.json native settings such as permissions, icons,
  `infoPlist`, code signing): bump `version`, then make new builds. Otherwise an update could reach a build that
  lacks the native code and crash it.
- **Egenberedskap+:** switched on only in a new version through store review, never with an update
  (LAUNCH.md, «Decided 2026-10-08»).

## Signed updates

Every build only accepts updates signed with the key behind `apps/mobile/certs/certificate.pem`. An update published
without it, for example by someone who gets into the Expo account, is rejected by the app.

| | Where | In git |
| --- | --- | --- |
| Private key | `~/.egenberedskapsappen/keys/private-key.pem` on Mikkel's Mac (mode 600), backup in Mikkel's password manager | Never (`*.pem` is ignored) |
| Public key | `~/.egenberedskapsappen/keys/public-key.pem` (not needed by the app) | No |
| Certificate | `apps/mobile/certs/certificate.pem`, valid 10 years from 2026-10-09, common name «Holm & Tall AS» | Yes |
| Settings | `updates.codeSigningCertificate` and `codeSigningMetadata` (`keyid: main`, `rsa-v1_5-sha256`) in app.json | Yes |

The key is never uploaded: `eas update` signs on the Mac and sends only the signature. Builds don't need the key.

### Publishing an update

Only Mikkel publishes updates. Always use the script, which passes the key:

```sh
cd apps/mobile
npm run publish-update -- --channel production --message "Kort beskrivelse"
npm run publish-update -- --channel preview --message "…"     # to test builds first
```

Before publishing: `npm test`, `npm run typecheck` and `npm run lint` from the root, and try the change on a
`preview` build.

### Testing that signing works

Not yet done (LAUNCH.md section 2). Once:

1. Build and install a `preview` build that includes the certificate (any build made after 8663ef2).
2. Make a small visible JS change, publish it with `npm run publish-update -- --channel preview`.
3. Close and reopen the app twice; the change should appear.
4. Optional negative test: publish to `preview` with `npx eas-cli update` without the key. The app must keep running
   the previous update.

### Moving the key to a new Mac

Restore `private-key.pem` from the password manager to `~/.egenberedskapsappen/keys/private-key.pem`, then
`chmod 700 ~/.egenberedskapsappen ~/.egenberedskapsappen/keys` and `chmod 600` on the file.

### If the key is lost or leaked

Builds already installed can't receive updates signed with a new key. Then:

1. Generate a new pair, keeping the key outside the repo:
   ```sh
   cd apps/mobile
   npx expo-updates codesigning:generate --key-output-directory ~/.egenberedskapsappen/keys \
     --certificate-output-directory certs --certificate-validity-duration-years 10 \
     --certificate-common-name "Holm & Tall AS"
   ```
2. Back up the new key in the password manager.
3. Bump `version` in app.json, make new builds and submit them.
4. If the key leaked: rotate the Expo account password and tokens as well, since signing is what stops a stolen
   account from shipping code.

Before the certificate expires (2036), make a new one the same way and ship it in a new version.

## Website

```sh
npx firebase-tools deploy --only hosting --project test   # egenberedskapsappen-test.web.app, noindex
```

Prod hosting waits for the confirmed company details and the real domain (LAUNCH.md section 8).
