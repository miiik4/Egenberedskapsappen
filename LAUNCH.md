# Launch checklist

The single list of remaining work. **Ship first**: launch with the features that exist now, and build new
ones only when real users ask for them.

How to use it:

- Work only on items in this list. A new idea goes under *After launch* and is not built now.
- Tick an item off (`[x]`) only when it is done **and verified**, with the date and commit or what was checked.
  Nothing is marked verified that a person hasn't actually checked.
- Items marked **(Mikkel)** need a decision or an account that only Mikkel has.

## Decided 2026-10-08

- **1.0 is free, with Egenberedskap+ hidden in the app.** Backup and AI analysis can't be bought in the app yet, and no
  insurer has signed. They come in a new version through store review (never with `eas update`; Apple guidelines
  2.3.1, 2.5.2), and on iPhone only together with the in-app purchase, even if an insurer signs first (3.1.1,
  3.1.3(b)).
  The website keeps Egenberedskap+, clearly marked «Kommer» with the planned price, so nobody feels misled later.
- **Free is what stays on the phone; Egenberedskap+ is what needs our servers** (backup, AI analysis). Entering innbo
  by hand, receipts and the PDF report are free. (To be confirmed with Tarjei.)
- **A way to hear users without tracking:** a «Gi tilbakemelding» row that opens an email, and counts the server
  already sees (codes redeemed, active backups, analyses per month).

## Release date: Monday 26 October 2026 (decided 2026-10-10)

1.0 goes live in both stores the day Egenberedskapsuka starts (week 44, DSB's digital kick-off at 11:00). Working
back from that:

| By | What |
| --- | --- |
| Mon 12 Oct | D-U-N-S applied for; Apple Developer and Google Play enrolment started as **organisation** accounts (an organisation Play account skips the 14-day closed test that new personal accounts need) |
| Fri 16 Oct | Company details, DSB sign-off and domain in place; Android preview build tested on a phone |
| **Mon 19 Oct** | **Go/no-go.** Production builds submitted to both stores (Google's first review of a new account can take up to a week) |
| Wed 21 Oct | Last day to answer review questions or resubmit |
| Mon 26 Oct, before 11:00 | Release: App Store «Manually release this version», Play «Managed publishing»; website live on the real domain with store links |

If Apple hasn't approved the developer account in time, 1.0 launches on Android alone and iOS follows when it's
ready (Mikkel, 2026-10-14).

If the builds aren't submitted by 19 October, privacy and QA items are not cut to make it. Mikkel decides the new
date then (the strategy review suggests mid-November, with the winter outage season as the hook).

## 1. Content and facts

- [x] **(Mikkel)** Confirm the company details in `apps/web/src/company.ts` (org.nr., address, email, phone come
      from Tarjei's draft). The privacy policy and contact page don't go live before this. (Mikkel: correct,
      2026-10-14)
- [x] Compare `guidance.ts`, `catalogue.ts` and `guides.ts` with DSB's pages, with sources: `docs/dsb-check.md`
      (2026-10-08, draft; nothing changed in the code)
- [x] **(Mikkel)** Decide on the differences in `docs/dsb-check.md`: water (DSB now says about 20 L per person for
      the week, no per-day figure), the iodine hint, «Kan spises kald» for canned dinners, items DSB lists that we
      don't, and the water and power-outage guides (decided 2026-10-17, see below)
- [x] Decisions applied in the code with sources (7ad8aca); remove the three `TODO(before launch)` notes once signed off
      (2026-10-17: Mikkel asked Claude to decide from DSB's pages and to take out anything uncertain; pages
      fetched again, decisions in `docs/dsb-check.md`, TODOs removed. The new copy hasn't been read in the app by
      a person yet)
- [x] Guidance in words instead of from `guidance.ts`: «en uke» in `lager/kategori/[id].tsx` and `guides.ts`,
      «innen en måned» in `beredskapssjekk.tsx`; and «2 personer trenger 21 hver» is missing «måltider»

## 2. Privacy

- [x] Security review of rules and functions before prod: nothing blocking; photos can no longer outlive their
      job, and deleting the backup erases the analysis data too (bdd002d, deployed to test, end-to-end 11/11)
- [x] Soft delete off on both Firebase Storage buckets, and a 1-day lifecycle rule on `analysis/` as a backstop
      (2026-10-08)
- [x] **(Mikkel)** Ask Google for the Vertex AI abuse-monitoring exception (prompt logging) for test and prod, or
      soften «vi lagrer ikke bildene» in the privacy policy until it's granted (already softened: `personvern.astro`
      says «Google kan for en kort periode logge …», checked 2026-10-14. AI analysis is hidden in 1.0, so asking
      Google moves to the «Before Egenberedskap+» item)
- [x] **(Mikkel)** Expo update checks send an install ID and IP address to Expo (USA) on every launch: name Expo in
      the privacy policy, or turn update checks off in production
- [x] Privacy policy: also mention IP addresses (Firebase, Expo), the analysis job records (up to 24 h), and that
      the iOS Keychain key can survive deleting the app (or clear it on first launch)
- [x] Documents can be renamed and deleted without unlocking: the toolbar in `nodinfo/[id].tsx` sits outside
      `<DocumentGate>`
- [x] Picked files are left in the cache after `importFile` copies them into `dokumenter/` (`use-documents.ts`,
      `files.ts`): delete the cached copy
- [x] The recovery and activation code fields allow autocorrect (`gjenopprett.tsx`, `sikkerhetskopi.tsx`)
- [x] A release build has no way to delete all data («Slett alle data» is `__DEV__` only, `husstand.tsx`)
- [x] Camera and photo permission texts say that photos may be sent for AI analysis in the EU

- [x] Security review of the app, sync, backend and website: no critical issues; three major ones fixed (9a48948),
      full report in `docs/security-review-2026-10.md`
- [x] ~~Over-the-air updates are code-signed~~ Signing dropped again 2026-10-17 (Mikkel): EAS only signs updates on
      its Production plan (USD 199/month), and 1.0 stays on the free plan. Updates are published from the company
      account «holm-and-tall-as», which is now what protects the channel; `version` 1.6.0, new builds needed
- [x] **(Mikkel)** Two-factor login on the Expo account «holm-and-tall-as», and no access tokens that aren't needed,
      since the account alone guards the update channel now (two-factor on, Mikkel 2026-10-18)
- [x] Publish one update to a preview build and see it arrive (2026-10-17: update group `ec3663ec` to channel
      `preview`, downloaded by preview build `b5397291` (1.6.0) on the OnePlus 6 at the first launch and running at the
      second, when the server answered «no update available»; checked in logcat by Claude, not seen by a person)
- [x] Website: clickjacking and CSP headers in `firebase.json` hosting (1ac953b, live on the test site)
- [x] Reminders show item names on the lock screen (medicine names); use a neutral text (1ac953b)
- [x] The recovery-code screen is visible in the app switcher (decide: protect it, which also blocks screenshots of
      the code on Android) (Mikkel, 2026-10-14: not protected)
- [ ] Before Egenberedskap+: drop v1 sync records, delete analysis photos from the phone's cache after the job, and
      ask Google for the Vertex AI abuse-monitoring exception for test and prod (then the policy can drop the sentence
      about Google's logging)

## 3. AI analysis of rooms, on the test project

- [x] Vertex AI API enabled, `roles/aiplatform.user` granted to the functions' service account (2026-10-08)
- [x] `gemini-2.5-pro` and `gemini-2.5-flash` answer in europe-north1 (2026-10-08)
- [x] Vertex prompt cache turned off for the project (`cacheConfig.disableCache`) (2026-10-08)
- [x] Deploy `firestore,storage,functions` to test: all nine functions live, `sweepAnalyses` in europe-west1
      (Cloud Scheduler isn't offered in europe-north1); backup end-to-end test still 11/11 (2026-10-08)
- [ ] Try it without the app: `functions/scripts/try-analysis.mjs` on our own photos
- [ ] Film a room end to end in a development build: photos deleted after the job, answer arrives encrypted,
      crops made on the phone, nothing from the content in the function logs

## 4. Prod Firebase (`egenberedskapsappen`), in this order

- [x] Auth: **Anonymous** is on, and the only sign-in method (checked 2026-10-08)
- [x] Storage: default bucket in **europe-north1**, and `roles/firebaserules.firestoreServiceAgent` for the
      Storage service agent (2026-10-08)
- [x] Vertex AI: API on, `roles/aiplatform.user`, both models answer in europe-north1, cache off (2026-10-08)
- [x] `functions/.env.prod` with the three `ANALYSIS_*` values (5ffcb36)
- [x] Deploy `firestore,storage,functions --project prod`: all nine functions live, cleanup policy in
      europe-north1 and europe-west1 (2026-10-08)
- [x] `roles/firebaseappcheck.tokenVerifier` for the functions' service account (2026-10-08)
- [ ] **(Mikkel)** The functions' service account also got `roles/editor` by default, as on test. Keep it, or cut it
      down to the roles it needs
- [ ] App Check: register **App Attest** (needs the Apple Team ID) and ~~**Play Integrity**~~ *(Play Integrity done
      2026-10-18 by Claude on Mikkel's go: Play Console «Beskyttet med Play» → Play Integrity API linked to the prod Cloud
      project `egenberedskapsappen` (374868390030), which also enabled the API; the Play app signing certificate's
      SHA-256 `5A:BD:E2:B6:…:C7:16` added to the prod Android app with `firebase apps:android:sha:create`; the App Check
      registration for the Android app uses Play Integrity with that fingerprint and a 1-hour token TTL. Storage,
      Firestore and Auth are still «Unenforced». Nothing seen passing yet: 1.0 never initialises App Check while
      Egenberedskap+ is off, so the proof waits for the first build with it on, installed from Play)*
- [ ] Only after a release build has been seen passing App Check: **enforce** it for Firestore and Storage

## 5. App, before the store build

- [x] App icon, splash and Android adaptive icon are still Expo's template (`assets/images/icon.png`,
      `assets/expo.icon`, colours in `app.json`); the name is cut to «Egenbereds…» on the home screen
- [x] Hide Egenberedskap+ (backup, AI analysis, restore from backup) in 1.0 behind one switch, so it can be turned on
      without a new native build
- [x] «Gi tilbakemelding» row that opens an email to the contact address
- [x] The stockpile category footer still says «Typene følger DSBs liste» (→ «bygger på»), and the hygiene page
      doesn't say nappies only show for households with infants
- [x] Remove the unfinished «Reise» tab and the «Meld en skade» row from Eiendeler (both say «kommer i en senere
      versjon»)
- [x] Beredskapssjekk: «Byttet» doesn't change the item's date; it looks only 30 days ahead whatever the interval;
      «Lagre sjekken» can be tapped twice
- [x] The day count shows «10 døgn» on Oversikt but «7+ døgn» in the rows
- [x] Deleting an item from its detail page leaves «Varen er slettet.» with no way on
- [x] A failed database load or migration shows a blank screen with no message
- [x] `/utvikling` can be opened by deep link in a release build
- [x] Static Android review: `docs/android-review.md` (2026-10-09; nothing run on a device)
- [ ] *(fixed in code, 5de5d53; check on a device)* Android blockers: adding/editing a property (header menu with no icon, `eiendeler/index.tsx`) and «Rediger»
      on a stock item (`lager/vare/[id].tsx`) don't render on Android
- [ ] *(fixed in code, 5de5d53; check on a device)* Date picker saves the day before on Android (local midnight passed as UTC, `fields.tsx`)
- [ ] *(fixed in code, 5de5d53; check on a device)* Android dark mode: unreadable headers and menus; force light (`android.userInterfaceStyle`) and set the
      navigation theme and tab bar colours explicitly
- [ ] *(fixed in code, 5de5d53; check on a device)* Android layout: forms and the Beredskapssjekk under the status bar; subtitles clipped by `marginTop: -16`;
      keyboard covering fields; back on Velkommen leaves the app
- [ ] *(fixed in code, 5de5d53; check on a device)* Android native config: notification icon, `blockedPermissions` for overlay, storage and media permissions
- [ ] *(fixed in code, 5de5d53 and the commit after; check on a device)* Android documents: relock while adding a
      file, sensor wording, pinch-zoom, report PDF margins and timing
- [x] **(Mikkel)** On Android «Åpne PDF» can only share the file, so a passport PDF is one tap from mail apps. Opening
      it in a viewer needs expo-intent-launcher (a new native package, so a `version` bump). Before 1.0, or later?
      (Decided 2026-10-14: later. 1.0 keeps the share sheet with the button «Del eller åpne PDF-en» and a note that the
      list also has apps that send it on; the viewer is under *After launch*)
- [x] «Velg fra kontaktene» on Ny nødkontakt opens the phone's own contact picker (expo-contacts, a native package;
      `version` 1.4.0, so new builds). iOS asks for no permission (the picker hands over the one contact); Android
      asks for READ_CONTACTS the first time, WRITE_CONTACTS is blocked. Checked 2026-10-17 in the iOS simulator and
      on a OnePlus 6 (Android 11, preview build 530d5e64): the prompt, deny → «Ingen tilgang til kontaktene», allow →
      picker, a contact with two numbers, saving; the APK requests READ_CONTACTS only
- [x] A form's save could run twice on the OnePlus 6 when the sheet was slow to close (two copies of the same
      contact). `FormSheet` now ignores taps while a save is in flight, for all forms; three fast taps on the
      OnePlus 6 (preview build 2c0bc005) saved one contact
- [ ] *(seen on the OnePlus 6, not fixed)* «Hold tallet riktig» in Kom i gang: the «Hver tredje måned» picker draws
      as a flat grey box on Android, unlike the rest of the form
- [ ] Run the 16 device checks in `docs/android-review.md` on a real Android phone or emulator
- [ ] *(walked through over adb on the OnePlus 6 by Claude, 2026-10-17: `docs/android-device-test-2026-10-17.md`;
      not checked by a person)* Every flow from a fresh install worked except four bugs, all fixed in code the
      same day and not yet seen on the phone: the keyboard didn't open when a field was focused by code (the
      onboarding amounts, Møtested, Ny eiendom); «Rediger hjemme» was a blank row in the Eiendeler property
      menu; no notification channel was created on Android 12 and older; «Neste å gjøre» led with water
      whatever the gap. The Android dropdowns and switches were restyled to the design at the same time (the
      «Hver tredje måned» item above). Adding photos and files, the relock and the PDF content still need a
      person with the phone
- [x] App language declared as Norwegian on iOS, so system parts (date picker) show Norwegian (5de5d53)
- [ ] Walk through every flow in the simulator, including with no network (the QA agent couldn't: it needs simulator
      access)
- [x] EAS updates and the project ID moved from the personal Expo account «mkl96» to «holm-and-tall-as» (2026-10-09)

## 5b. UX review (decided 2026-10-10)

From the review of the user journeys; sketches in `docs/ux/ux-forslag.html`. All in code, JS only (no `version` bump).
Checked in the iOS simulator on the test household: Oversikt, Lager, the check's expiry list, Eiendeler and «+».

- [ ] *(in code; Lager checked in the simulator)* Lager ticks water and food off only at 7 days, shows a part-filled
      ring and the amount, a «Kjøp 30 liter vann» row in the section, and days in the section header, which opens the
      category page
- [ ] *(in code; not run)* «Kom i gang» ends with «Hold tallet riktig»: a date to swap the onboarding water (12 months
      ahead), the check interval, and «Slå på påminnelser» / «Ikke nå». «Hopp over» is gone from the first step, and
      the amounts start empty instead of one day's worth
- [ ] *(in code; Oversikt checked in the simulator, the new tasks not seen yet)* «Neste å gjøre» asks for an
      emergency contact and a meeting place after the biggest gap, and keeps what the check left to fix
      (`followUps`, a new synced setting, migration 9). The check is one quiet line until 14 days before it's due.
      A gear opens «Innstillinger» (was «Husstand»)
- [ ] *(in code; the list checked in the simulator, saving not run)* Beredskapssjekk lists what expires and renews
      only what's ticked off; «OK» when nothing expires; «Må fikses» waits on Oversikt; «Legg til nødkontakter» when
      there are none; every fix is kept, not just the first
- [ ] *(in code; checked in the simulator)* Eiendeler: «+» opens Ny gjenstand with a room to pick, «Legg til ting»
      instead of «Dokumenter», and a line on why until the first thing is added
- [ ] *(in code; not run)* Smaller: Rapport says why the button is off; «kan åpnes uten nett» in Nødinfo and on the
      website; «lageret» instead of «beredskapslageret»; website copy for the onboarding result, Lager and the check
- [ ] *(in code; checked in the simulator with food as the limit)* The days card on Oversikt always shows water, food
      and heat, the limit in yellow, «Ut fra det dere har lagt inn», and the limit as a link («Kjøp mat for 5 døgn
      til»), as sketched in `docs/ux/dognkortet.html`. «klarer husstanden seg» in the app and the website's calculator.
      The 0 and 7+ states not seen yet
- [ ] Walk through all of the above on Android, and the onboarding on a fresh install

## 6. Stores

- [x] Drafts of the listing text and the privacy-label answers: `docs/store/` (2026-10-08; check before use)
- [x] D-U-N-S number for Holm & Tall AS (from Tarjei; used for the Apple enrolment)
- [ ] **(Mikkel)** Apple Developer account for Holm & Tall AS: enrolment sent 2026-10-05, waiting for Apple to verify
      that Mikkel can sign for the company (Apple may contact Tarjei, whose address is the work email). No news as of
      2026-10-14; not blocking, Android launches alone if needed
- [x] **(Mikkel)** Google Play Console account for Holm & Tall AS, as an organisation (uses the same D-U-N-S number)
      (2026-10-14: set up and phone number verified, Mikkel)
- [ ] App records for `no.htas.egenberedskap` in both stores, and `submit.production` filled in in
      `apps/mobile/eas.json`
- [ ] Store listings in Norwegian: text, real screenshots, the privacy policy URL. *(2026-10-18, Claude in Play Console:
      app name corrected to «Egenberedskapsappen», short and full description entered and saved as a draft; category
      Livsstil, tag Hus og hjem, contact e-mail, phone and website set; the privacy policy URL is set to
      https://egenberedskapappen.no/personvern. Icon, feature graphic and the six screenshots uploaded by Mikkel the same
      day. Play's side is complete and sent for review; the App Store listing remains)*
- [ ] Privacy labels (App Store) and Data safety (Play) that match the privacy policy, including the room photos
      sent for AI analysis. *(Play, 2026-10-18: Data safety answered per `docs/store/privacy-answers.md` and saved as a
      saved once the privacy policy URL was in place. The other eight content declarations are
      saved: app access, ads, advertising ID, content rating PEGI 3, target audience 18+, government, financial,
      health; answers in `docs/store/play-console.md`)*
- [ ] *(built 2026-10-17: EAS build `41eee8db`, version 1.6.0, version code 3, package `no.htas.egenberedskap`, from
      commit 0cdaa7a; the AAB is in Mikkel's Downloads as `Egenberedskapsappen-1.6.0-production.aab`. Mikkel wants
      this as the release. Superseded the same day: Play requires a privacy policy link inside the app, so Innstillinger
      got a «Personvernerklæring» row (304d8ad) and a new production build was made: EAS build `6319b9e8`, version 1.6.0,
      version code 4, `Egenberedskapsappen-1.6.0-production-vc4.aab` in Mikkel's Downloads. Upload that one, not version
      code 3. Status 2026-10-18: Mikkel uploaded version code 4 to internal testing; Claude added the same bundle from
      the library to the production release «4 (1.6.0)» with Norway as the only country, and sent it for review (below).
      App Check not seen passing yet; Play Integrity registration is still open in section 3)*
      Production build with EAS, seen passing App Check and running against prod. On Android through Play's
      **internal testing** track (decided 2026-10-14): Play Integrity only trusts an app installed from Play, so a
      sideloaded APK can't prove App Check. The first upload is by hand in Play Console; after that `eas submit`
      (`submit.production.android.track` is `internal`) with a Play service account key added to EAS credentials
- [x] Submit for review (Android: promote the build that passed internal testing to production, no rebuild)
      *(Play, 2026-10-18 by Claude on Mikkel's go: production release «4 (1.6.0)» (EAS build `6319b9e8`) with Norwegian
      release notes from `docs/store/listing.md`, **managed publishing on**, 15 changes sent to Google for review; Play
      says reviews usually finish within 7 days. Play's only warning is the missing R8 mapping file, harmless. On
      26 Oct: Publiseringsoversikt → «Publiser endringene». iOS waits for the Apple account)*
      ***Live on Google Play since 2026-10-23 (Mikkel), three days before the planned date:
      https://play.google.com/store/apps/details?id=no.htas.egenberedskap. The listing showed «Mikkel Holmberg» as the
      developer; Mikkel changed the developer name to the company under Kontodetaljer the same day (Google reviews
      the change before it shows). iOS still waits for the Apple account.
      2026-10-23: the padded phone screenshots replaced with six composed ones (`docs/store/skjermbilder/`, built by
      `docs/store/render-screenshots.mjs`); Mikkel picked the files, Claude sent the change for review. When Google
      approves it: Publiseringsoversikt → «Publiser endringene».***

## 7. Insurers and Egenberedskap+

- [ ] **(Tarjei)** Is entering innbo by hand free and local? Proposed, not agreed yet.
- [ ] **(Tarjei)** Should the Beredskapssjekk tick itself off from the stockpile data instead of yes/no questions?
      Worth doing if he wants it.
- [ ] Activation codes for the first partner in prod (`functions/scripts/create-codes.mjs`)
- [ ] No partner or sponsor named anywhere, in the app or on the website, until there is a signed agreement

## 8. Website

- [x] Replace the «Kvartalssjekk» section in `apps/web/src/pages/index.astro` with «Beredskapssjekk» and its
      choice of interval (2026-10-10, ahead of the app on Mikkel's say; seen in the local preview, not deployed)
- [ ] App Store and Google Play links *(2026-10-23: the Play link is on the front page, in the hero, the closing card
      and the FAQ, with «iPhone-versjonen kommer snart»; deployed to prod hosting the same day and seen live on
      egenberedskapappen.no. The App Store link waits for Apple)*
- [x] Every claim checked against the app; false ones fixed (287df93)
- [x] *(resolved: the innbo list, receipts and PDF are shown as free, df22ba5)* The Egenberedskap+ section sells the innbo list, receipts and PDF as paid, but the app lets
      anyone add things by hand (depends on Tarjei's answer in section 7)
- [x] **(Mikkel)** «Sponset innhold er alltid merket» describes sponsored content the app doesn't have: keep it as a
      promise, or say «ingen reklame eller sporing»
- [x] «Lageret følger DSBs liste» → «bygger på DSBs liste», as the app says; «i Porsgrunn» depends on the company
      details
- [x] When the Kvartalssjekk section is replaced, also replace the hero alt text and `oversikt.webp` (2026-10-10:
      the eight 1.0 screenshots are now from the app in the simulator, demo household from `lib/demo-data.ts`; the
      three Egenberedskap+ ones are still design renders)
- [ ] Logo and three launch posters (A3 PDF, 4:5 feed and story PNGs) drafted in `docs/marketing/` (2026-10-11);
      not reviewed by a person yet. Check the release line and URL before anything is printed or posted
- [x] Deploy to the prod hosting site with the real domain; indexing on only there (2026-10-18, Mikkel's go: `firebase
      deploy --only hosting --project prod`; https://egenberedskapappen.no/personvern and /kontakt answer 200 with no
      noindex tag)
- [x] Domain `egenberedskapappen.no` (without the s) in place (Mikkel, 2026-10-10)
- [x] **(Tarjei)** Buy `egenberedskapsappen.no` (with the s, as the app is named); suggested as the main domain, with
      the other one redirecting to it (both bought, Mikkel 2026-10-14)
- [x] DNS for `egenberedskapsappen.no` (with the s), redirecting to `egenberedskapappen.no` (checked with curl
      2026-10-26: http and https on the bare domain answer 301 to https://egenberedskapappen.no/, certificate active)
- [x] `www.egenberedskapsappen.no` and `www.egenberedskapappen.no` failed with a certificate error: their CNAMEs
      point at the bare domains, so they reached Firebase, but they weren't custom domains in Hosting, so Firebase
      answered with its `*.firebaseapp.com` certificate. Both added in prod Hosting as redirects to
      `egenberedskapappen.no` through the Hosting API (2026-10-26); checked with curl the same evening: http and https
      on both `www` names end on https://egenberedskapappen.no/ with 200
- [ ] **(Mikkel)** At the registrar, change both `www` CNAMEs from the bare domain to **`egenberedskapsappen.web.app`**,
      as Hosting recommends, so the certificates keep renewing if the bare domains ever move. Not urgent: it works today

## 9. Nearest shelter (Mikkel decided 2026-10-26 to build it now)

DSB's «Tilfluktsrom – offentlige» from Geonorge (NLOD, credit DSB): 556 public shelters, 297 187 places on
2026-10-26, with room number, places and address, but no municipality or opening status. Private shelters (~20 000,
for the people in that building) have no public data. Meeting points are a different thing: **kommunale
informasjonspunkter** (DSB's *Veileder om kommunale informasjonspunkter ved bortfall av elektronisk kommunikasjon*),
where the municipality gives information when power, phone and internet are down. There is no national dataset;
each municipality publishes its own (Oslo: schools per bydel; Bergen: one per bydel).

- [x] Snapshot in the app: `packages/core/scripts/update-shelters.mjs` reads DSB's WFS in EPSG:4326 and writes
      `packages/core/src/shelters-data.ts` (58 KB). Coordinates match DSB's own 4326 output exactly (an earlier
      reprojection from UTM 33 was up to 42 m off in eastern Finnmark, so it was dropped). Refresh: run the script,
      commit, `eas update`
- [x] `nearestShelters`, distance and compass direction in `packages/core/src/shelters.ts`, with tests; all on the
      phone, the position goes nowhere
- [ ] Screen Nødinfo → «Nærmeste tilfluktsrom» (`nodinfo/tilfluktsrom.tsx`): map (Apple Maps on iPhone, Google Maps
      on Android), the five nearest with distance, direction and places, tap for walking directions in Kart. DSB's
      72-hour caveat, private shelters not included, and what an informasjonspunkt is. The list works without
      network; the map needs it for tiles. Farther than 50 km it says so and gives DSB's advice. *(2026-10-26: seen
      in the iOS simulator at Oslo S: permission prompt, five rooms from 160 m, markers on the map. Not yet on a real
      phone, not on Android)* *(2026-10-26, OnePlus 6, preview build 1.7.0: the screen opens, but no map. Expo strips
      `android.config` from the config the app reads, so the key check was always false; fixed in a873a7e with
      `extra.androidMaps`. Needs `npm run publish-update -- --channel preview --environment preview` (Mikkel) or a new
      preview build, then the map, list, directions and flight mode checked on the phone. Location was off on it)*
- [x] More shelters where there are many (Mikkel, 2026-10-26): every public shelter within 3 km (about 40 minutes on
      foot), at least the nearest 3, at most 30 (`sheltersNear` in core); 10 rows, then «Vis alle». The map shows them
      all and zooms to the farthest. From DSB's list: Oslo S 30, Bergen sentrum 12, Porsgrunn 7, Hammerfest 3 (before:
      five, the last 78 km away). Seen in the iOS simulator at Oslo S
- [x] Back to Nødinfo: a link straight to the shelters or a document opened with nothing underneath, so Android had
      no back arrow and the tab did nothing; the Nødinfo stack now always has its list underneath
      (`unstable_settings`, as Lager has). Opened from the row it already worked (checked on the OnePlus)
- [ ] Native code (expo-location, expo-maps), so `version` is 1.7.0 and it needs new store builds; never `eas update`
      it onto 1.6.0
- [ ] Google Maps key for Android. *(2026-10-26: «Maps SDK for Android» enabled in the prod Cloud project, with the
      EEA Terms of Service for Google Maps Platform accepted (Mikkel's go). Key «Google Maps Android (tilfluktsrom)»
      created, only for that API and the apps `no.htas.egenberedskap` with Play's app signing SHA-1 `20:5E:3A:85:…`
      and the upload key `D1:99:3E:AC:…`, and `no.htas.egenberedskap.dev` with the EAS dev keystore `3E:49:DE:58:…`.)*
      **(Mikkel)** Put it in EAS as `GOOGLE_MAPS_ANDROID_API_KEY` for production, preview and development, then check
      the map on the OnePlus with a preview build. A new signing key (Play key upgrade or a new EAS keystore) needs
      its SHA-1 added to the key
- [ ] Privacy *(2026-10-26: drafted, not deployed or submitted: «Kart over tilfluktsrom» on `/personvern`, and the
      1.7.0 Data safety additions for the Maps SDK in `docs/store/privacy-answers.md`; 1.7.0 release notes in
      `docs/store/listing.md`. Mikkel reads all three and updates the Data safety form before 1.7.0 goes to production)*:
      the position stays on the phone, but the map view fetches tiles from Apple or Google. Say so on
      `/personvern` and in the store privacy answers (App Store «Data not collected» for location still holds if
      nothing leaves; check Play's data safety for the Maps SDK). A person must read the final wording
- [ ] Informasjonspunkter: link to the user's municipality's page, once there's a way to know the municipality
      without sending the position anywhere (e.g. a bundled municipality list to choose from). A typed-in list of
      points must be checked by a person before it's shown

## 10. Partner pages from a CMS (Mikkel decided 2026-10-26 to build it now)

`egenberedskapappen.no/for/<partner>` from one template (`apps/web/src/pages/for/[slug].astro`, built on Mikkel's
draft page), with each partner a `partner` document in Sanity (project `8ej8zl2c`, dataset `production`, which is
public: anyone can read published documents, never drafts).

- [x] Studio in `apps/studio` (`npm --workspace studio run dev`), schema `partner` with bokmål fields: name, address
      (slug), «Avtale signert» and «Om avtalen», logo and dark-mode logo, headline, lead, share text, code, the
      Egenberedskap+ discount section on or off with its sentence, and what the partner gets to know. Schema
      deployed to the project with `sanity schema deploy` (2026-10-26)
- [x] The site fetches published partners with `agreementSigned == true` at build time (`apps/web/src/partners.ts`),
      no token. Logos are inlined as data: URLs, so the CSP stays `'self'` and the browser never talks to Sanity.
      Pages say noindex. No signed partner means no `/for/` pages; Sanity unreachable or a signed partner with a
      missing field fails the build rather than deploying without the page (checked 2026-10-26: live build has no
      `/for/` pages; a stubbed signed partner rendered in the local preview, light and dark, desktop and phone width,
      copy button works; a wrong project id failed the build)
- [x] Small scripts are emitted as files, not inlined (`astro.config.mjs`), so the copy button passes `script-src 'self'`
- [ ] **(Mikkel)** Create each partner in the Studio once the agreement is signed, and only then turn on «Avtale
      signert». A draft «Eksempelpartner» (unsigned, never to be published) shows the fields; discard it when done.
      Mikkel's original draft page is kept, unbuilt and uncommitted, in `docs/marketing/partnerside-utkast.astro`, and
      its logos in `apps/web/src/assets/`: upload them to that partner's document instead
- [x] CTC Bilpartner: Mikkel said 2026-10-26 the agreement is in place and to set them up without a code.
      Published as `partner-ctc-bilpartner` (`/for/ctc-bilpartner`), logos from Mikkel's draft, discount section off.
      Without a code the page makes no promise of an in-app greeting («Ingen reklame eller sporing» instead of
      «Merket «Sponset»») and the title says «i samarbeid med». Headline, lead, share text and privacy line written
      for the no-code page; **a person should read them** before the link is handed out. Seen in a local build
      (noindex, nothing loaded from Sanity in the browser). Deployed to prod hosting 2026-10-26 on Mikkel's go;
      https://egenberedskapappen.no/for/ctc-bilpartner answers 200 (also via www and the domain with the s), noindex,
      logos inline, no console errors
- [ ] **(Mikkel)** Publishing in Sanity does not change the site: rebuild and deploy (`firebase deploy --only
      hosting:app --project prod`). A Sanity webhook that triggers a deploy can come later
- [ ] **(Mikkel)** Hosted Studio, if wanted: `npm --workspace studio exec sanity deploy` (publishes a sanity.studio URL)
- [x] Partner greeting without typing, Android (Mikkel chose the Play Install Referrer, 2026-10-26). The partner
      page's Play link carries `referrer=utm_source=partner&utm_campaign=<slug>` (`partnerReferrer` in
      `packages/core/src/partners.ts`; Play Console can count installs per partner from the utm values, no tracking of
      ours). On first launch the app reads it once with `expo-application`'s `getInstallReferrerAsync` (already in
      the native build through expo-notifications, so no `version` bump), stores the partner on this phone only
      (settings `partner`, `partnerReferrer`, never synced) and fetches `egenberedskapappen.no/partnere/<slug>.json`,
      built from the new Studio field «Hilsen i appen» (schema deployed 2026-10-26). Oversikt shows it in a card
      marked «Sponset» with «Skjul»; never in Nødinfo. iPhone has no install referrer and gets nothing yet. Checked:
      core and store tests; the card and «Skjul» in the iOS simulator with `utvikling?handling=partner&kode=…&hilsen=…`
      (SVG data URL logos render); CTC's real logos pass the app's check. **Not checked:** a real install from Play
      with the referrer, which only works through Play (internal testing track), not a sideloaded APK
- [ ] **(Mikkel)** Order matters: ship the app release with this first, then write CTC's «Hilsen i appen» in the
      Studio and deploy the site. The greeting also makes `/for/ctc-bilpartner` promise «Merket «Sponset»». The
      privacy page has a new «Hilsen fra en samarbeidspartner» part and a changed «Reklame og sporing» sentence
      (committed, **not deployed**); a person must read both before they go live with the release
- [ ] Test on the OnePlus via Play: uninstall the app, open the Play link from `/for/ctc-bilpartner` (with the
      phone's account on the internal testing list), install, open; the card should appear once the greeting exists
- [ ] The app's «Har du en kode?», the partner greeting and a shared campaign code don't exist yet; activation codes
      today are single-use and only unlock backup. Don't sign off a partner page that promises them until they do

## After launch (1.1 and later, only when users ask)

- Buying Egenberedskap+ in the app (subscription, 29 kr/mnd; consider a yearly price and the store's 15–30 %).
  Check Apple's guidelines 3.1.1 and 3.1.3(b) and Google's payments policy as they stand then: insurer codes are
  safest once the same thing can also be bought in the app. Needs a function that checks receipts and extends
  `entitledUntil`, and Mikkel's paid-apps agreements with bank and tax details in both stores.
- Open PDFs in a viewer on Android (expo-intent-launcher with `ACTION_VIEW`, a native package, so a `version` bump)
  instead of the share sheet, so a passport PDF isn't one tap from mail apps (`fil.tsx`, `docs/android-review.md` 3.4)
- Server counts for insurers (codes redeemed, active backups, analyses per month), without tracking users
- «Meld en skade» guide on top of the damage claims already stored on the phone
- Removing a phone from a backup (devices are only ever added; after 20 reinstalls a vault is full)
- Ideas waiting for user demand: «Jeg er trygg», hazard warnings, power-saving mode, evacuation bag, barcode
  scanning, blog
- Company site for Holm & Tall AS, `apps/firma` (Mikkel asked for it 2026-10-23): one page in bokmål about the
  company, the app, insurers and contact, plus a privacy page. Mikkel checked the page and the names and roles on it
  (Tarjei grunnlegger og daglig leder, Mikkel medgrunnlegger og utvikler) on 2026-10-23. Live the same day on
  https://holmtall.web.app (Hosting target `firma`; `holmtall-test.web.app` with noindex for test). `holmtall.no` and
  `www.holmtall.no` (redirect to the apex) are added as custom domains, waiting on DNS. **(Mikkel)** At the registrar:
  change the A record for `holmtall.no` from 185.126.36.19 to **199.36.158.100**; add a TXT record on `holmtall.no`
  with **`hosting-site=holmtall`** (keep the existing google-site-verification and SPF TXT records); change the CNAME
  for `www.holmtall.no` from `holmtall.no` to **`holmtall.web.app`**. Hosting checks the records itself and issues
  the certificate; nothing to click. Today 185.126.36.19 answers for holmtall.no, so check that nothing else is served
  there before the A record changes (mail is unaffected: MX records stay, and the SPF record names the IP directly). The Krokstadelva origin story from
  the app's «Om oss» is on it too (Mikkel's choice, 2026-10-23)

## Not doing

- Shared beredskapsvenn feature (needs a server and linking people; breaks local-first and no accounts). The guide
  «Avtal en beredskapsvenn» is enough.
- DSB slogans, or anything that makes the app look affiliated with DSB
- Ad SDKs or third-party tracking; sponsored content inside emergency flows
