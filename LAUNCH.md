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

## 1. Content and facts

- [ ] **(Mikkel)** Confirm the company details in `apps/web/src/company.ts` (org.nr., address, email, phone come
      from Tarjei's draft). The privacy policy and contact page don't go live before this.
- [x] Compare `guidance.ts`, `catalogue.ts` and `guides.ts` with DSB's pages, with sources: `docs/dsb-check.md`
      (2026-10-08, draft; nothing changed in the code)
- [ ] **(Mikkel)** Decide on the differences in `docs/dsb-check.md`: water (DSB now says about 20 L per person for
      the week, no per-day figure), the iodine hint, «Kan spises kald» for canned dinners, items DSB lists that we
      don't, and the water and power-outage guides
- [ ] Decisions applied in the code with sources (7ad8aca); remove the three `TODO(before launch)` notes once signed off
- [x] Guidance in words instead of from `guidance.ts`: «en uke» in `lager/kategori/[id].tsx` and `guides.ts`,
      «innen en måned» in `beredskapssjekk.tsx`; and «2 personer trenger 21 hver» is missing «måltider»

## 2. Privacy

- [x] Security review of rules and functions before prod: nothing blocking; photos can no longer outlive their
      job, and deleting the backup erases the analysis data too (bdd002d, deployed to test, end-to-end 11/11)
- [x] Soft delete off on both Firebase Storage buckets, and a 1-day lifecycle rule on `analysis/` as a backstop
      (2026-10-08)
- [ ] **(Mikkel)** Ask Google for the Vertex AI abuse-monitoring exception (prompt logging) for test and prod, or
      soften «vi lagrer ikke bildene» in the privacy policy until it's granted
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
- [ ] App Check: register **App Attest** (needs the Apple Team ID) and **Play Integrity** (needs the app in Play
      Console with its SHA-256)
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
- [ ] Android blockers: adding/editing a property (header menu with no icon, `eiendeler/index.tsx`) and «Rediger»
      on a stock item (`lager/vare/[id].tsx`) don't render on Android
- [ ] Date picker saves the day before on Android (local midnight passed as UTC, `fields.tsx`)
- [ ] Android dark mode: unreadable headers and menus; force light (`android.userInterfaceStyle`) and set the
      navigation theme and tab bar colours explicitly
- [ ] Android layout: forms and the Beredskapssjekk under the status bar; subtitles clipped by `marginTop: -16`;
      keyboard covering fields; back on Velkommen leaves the app
- [ ] Android native config: notification icon, `blockedPermissions` for overlay, storage and media permissions
- [ ] Android documents: relock while adding a file, «fingeravtrykk» wording, no pinch-zoom, «Åpne PDF» opening a
      share sheet; report PDF margins and the file deleted before the mail app reads it
- [ ] Run the 16 device checks in `docs/android-review.md` on a real Android phone or emulator
- [ ] Walk through every flow in the simulator, including with no network (the QA agent couldn't: it needs simulator
      access)
- [ ] **(Mikkel)** EAS updates and the project ID belong to the personal Expo account «mkl96», not the company

## 6. Stores

- [x] Drafts of the listing text and the privacy-label answers: `docs/store/` (2026-10-08; check before use)
- [ ] **(Mikkel)** Apple Developer and Google Play Console accounts for Holm & Tall AS
- [ ] App records for `no.htas.egenberedskap` in both stores, and `submit.production` filled in in
      `apps/mobile/eas.json`
- [ ] Store listings in Norwegian: text, real screenshots, the privacy policy URL
- [ ] Privacy labels (App Store) and Data safety (Play) that match the privacy policy, including the room photos
      sent for AI analysis
- [ ] Production build with EAS, seen passing App Check and running against prod
- [ ] Submit for review

## 7. Insurers and Egenberedskap+

- [ ] **(Tarjei)** Is entering innbo by hand free and local? Proposed, not agreed yet.
- [ ] **(Tarjei)** Should the Beredskapssjekk tick itself off from the stockpile data instead of yes/no questions?
      Worth doing if he wants it.
- [ ] Activation codes for the first partner in prod (`functions/scripts/create-codes.mjs`)
- [ ] No partner or sponsor named anywhere, in the app or on the website, until there is a signed agreement

## 8. Website

- [ ] Replace the «Kvartalssjekk» section in `apps/web/src/pages/index.astro` with «Beredskapssjekk» and its
      choice of interval, once the app version that has it is out
- [ ] App Store and Google Play links
- [x] Every claim checked against the app; false ones fixed (287df93)
- [ ] **(Mikkel)** The Egenberedskap+ section sells the innbo list, receipts and PDF as paid, but the app lets
      anyone add things by hand (depends on Tarjei's answer in section 7)
- [x] **(Mikkel)** «Sponset innhold er alltid merket» describes sponsored content the app doesn't have: keep it as a
      promise, or say «ingen reklame eller sporing»
- [x] «Lageret følger DSBs liste» → «bygger på DSBs liste», as the app says; «i Porsgrunn» depends on the company
      details
- [ ] When the Kvartalssjekk section is replaced, also replace the hero alt text and `oversikt.webp`
- [ ] Deploy to the prod hosting site with the real domain; indexing on only there

## After launch (1.1 and later, only when users ask)

- Buying Egenberedskap+ in the app (subscription, 29 kr/mnd; consider a yearly price and the store's 15–30 %).
  Check Apple's guidelines 3.1.1 and 3.1.3(b) and Google's payments policy as they stand then: insurer codes are
  safest once the same thing can also be bought in the app. Needs a function that checks receipts and extends
  `entitledUntil`, and Mikkel's paid-apps agreements with bank and tax details in both stores.
- Server counts for insurers (codes redeemed, active backups, analyses per month), without tracking users
- «Meld en skade» guide on top of the damage claims already stored on the phone
- Removing a phone from a backup (devices are only ever added; after 20 reinstalls a vault is full)
- Ideas waiting for user demand: «Jeg er trygg», hazard warnings, power-saving mode, evacuation bag, barcode
  scanning, blog

## Not doing

- Shared beredskapsvenn feature (needs a server and linking people; breaks local-first and no accounts). The guide
  «Avtal en beredskapsvenn» is enough.
- DSB slogans, or anything that makes the app look affiliated with DSB
- Ad SDKs or third-party tracking; sponsored content inside emergency flows
