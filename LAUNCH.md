# Launch checklist

The single list of remaining work. **Ship first**: launch with the features that exist now, and build new
ones only when real users ask for them.

How to use it:

- Work only on items in this list. A new idea goes under *After launch* and is not built now.
- Tick an item off (`[x]`) only when it is done **and verified**, with the date and commit or what was checked.
  Nothing is marked verified that a person hasn't actually checked.
- Items marked **(Mikkel)** need a decision or an account that only Mikkel has.

## 1. Content and facts

- [ ] **(Mikkel)** Confirm the company details in `apps/web/src/company.ts` (org.nr., address, email, phone come
      from Tarjei's draft). The privacy policy and contact page don't go live before this.
- [ ] Check every figure in `packages/core/src/guidance.ts` against DSB's current advice (sikkerhverdag.no), and
      cite the page. Remove its `TODO(before launch)` only then.
- [ ] Check the stockpile list in `packages/core/src/catalogue.ts` the same way.
- [ ] Check every guide in `apps/mobile/src/guides/guides.ts` the same way. Link to DSB; no DSB slogans, and no DSB
      concepts presented as ours.

## 2. AI analysis of rooms, on the test project

- [x] Vertex AI API enabled, `roles/aiplatform.user` granted to the functions' service account (2026-10-08)
- [x] `gemini-2.5-pro` and `gemini-2.5-flash` answer in europe-north1 (2026-10-08)
- [x] Vertex prompt cache turned off for the project (`cacheConfig.disableCache`) (2026-10-08)
- [x] Deploy `firestore,storage,functions` to test: all nine functions live, `sweepAnalyses` in europe-west1
      (Cloud Scheduler isn't offered in europe-north1); backup end-to-end test still 11/11 (2026-10-08)
- [ ] Try it without the app: `functions/scripts/try-analysis.mjs` on our own photos
- [ ] Film a room end to end in a development build: photos deleted after the job, answer arrives encrypted,
      crops made on the phone, nothing from the content in the function logs

## 3. Prod Firebase (`egenberedskapsappen`), in this order

- [ ] Auth: turn on **Anonymous**
- [ ] Storage: default bucket in **europe-north1**, and `roles/firebaserules.firestoreServiceAgent` for the
      Storage service agent
- [ ] Vertex AI: the same steps as for test in section 2 (API, role, models in the region, cache off)
- [ ] `functions/.env.prod` with the three `ANALYSIS_*` values (the deploy refuses to run without them)
- [ ] Deploy `firestore,storage,functions --project prod`, then a container cleanup policy
      (`functions:artifacts:setpolicy`) in both europe-north1 and europe-west1
- [ ] `roles/firebaseappcheck.tokenVerifier` for the functions' service account
- [ ] App Check: register **App Attest** (needs the Apple Team ID) and **Play Integrity** (needs the app in Play
      Console with its SHA-256)
- [ ] Only after a release build has been seen passing App Check: **enforce** it for Firestore and Storage

## 4. Stores

- [ ] **(Mikkel)** Apple Developer and Google Play Console accounts for Holm & Tall AS
- [ ] App records for `no.htas.egenberedskap` in both stores, and `submit.production` filled in in
      `apps/mobile/eas.json`
- [ ] Store listings in Norwegian: text, real screenshots, the privacy policy URL
- [ ] Privacy labels (App Store) and Data safety (Play) that match the privacy policy, including the room photos
      sent for AI analysis
- [ ] Production build with EAS, seen passing App Check and running against prod
- [ ] Submit for review

## 5. Insurers and Egenberedskap+

- [ ] **(Tarjei)** Is entering innbo by hand free and local? Proposed, not agreed yet.
- [ ] **(Tarjei)** Should the Beredskapssjekk tick itself off from the stockpile data instead of yes/no questions?
      Worth doing if he wants it.
- [ ] Activation codes for the first partner in prod (`functions/scripts/create-codes.mjs`)
- [ ] No partner or sponsor named anywhere, in the app or on the website, until there is a signed agreement

## 6. Website

- [ ] Replace the «Kvartalssjekk» section in `apps/web/src/pages/index.astro` with «Beredskapssjekk» and its
      choice of interval, once the app version that has it is out
- [ ] App Store and Google Play links
- [ ] Nothing advertised that the released app doesn't have
- [ ] Deploy to the prod hosting site with the real domain; indexing on only there

## After launch (1.1 and later, only when users ask)

- Buying Egenberedskap+ in the app (subscription, 29 kr/mnd; consider a yearly price and the store's 15–30 %)
- «Meld en skade» guide on top of the damage claims already stored on the phone
- Ideas waiting for user demand: «Jeg er trygg», hazard warnings, power-saving mode, evacuation bag, barcode
  scanning, blog

## Not doing

- Shared beredskapsvenn feature (needs a server and linking people; breaks local-first and no accounts). The guide
  «Avtal en beredskapsvenn» is enough.
- DSB slogans, or anything that makes the app look affiliated with DSB
- Ad SDKs or third-party tracking; sponsored content inside emergency flows
