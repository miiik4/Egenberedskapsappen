# Google Play Console: «Konfigurer appen din», answers for 1.0

Written 2026-10-18 for the first production release (1.6.0, Egenberedskap+ off; sent for review as version code 4, build 6319b9e8).
The answers follow `privacy-answers.md` and `listing.md`; what the app does was checked in code and on the
OnePlus 6 (`docs/android-device-test-2026-10-17.md`). Redo the Data safety and content rating answers in the version
that turns Egenberedskap+ on.

## Oppgi informasjon om innholdet i appen din

| Task | Answer | Why |
| --- | --- | --- |
| Angi personvernregler | `https://egenberedskapsappen.no/personvern`, changed 2026-10-27 when the domain with the s became the main one and sent for review (first set 2026-10-18 to the domain without the s) | Play also requires the link inside the app: Innstillinger has a «Personvernerklæring» row from 304d8ad |
| Påloggingsinformasjon (app access) | «Nei», no part of the app is restricted | No accounts or login. Google lists device biometrics under «Ja», but that path demands a username and password, which don't exist; the document gate is the phone's own screen lock, which a reviewer's device has too |
| Annonser | «Nei, appen inneholder ikke annonser» | No ad SDK (AGENTS.md) |
| Innholdsvurdering (IARC) | Category: Utility, productivity, communication or other. Every content question «Nei»: no violence, sexuality, language, controlled substances, gambling; no user interaction or sharing of user content or location; no digital purchases; no personal info shared with third parties online | Gives PEGI 3 / Everyone |
| Målgruppe og innhold | Target age: 18 and over only. «Appeals to children»: No | Household preparedness for adults; keeps the app out of the Families policy |
| Datasikkerhet | See `privacy-answers.md`, «Google Play: Data safety», 1.0 set: collects Device or other IDs (Expo's install ID on every launch, required, app functionality), not shared, encrypted in transit, no deletion request mechanism. Everything else «not collected» | The only data that leaves the phone in 1.0 |
| Annonserings-ID | «Nei», the app does not use the advertising ID | No ad or analytics SDK; the APK requests no `com.google.android.gms.permission.AD_ID` (checked in the installed build) |
| Offentlige apper (government apps) | «Nei», not developed by or for a government | Private company, no DSB affiliation |
| Økonomifunksjoner (financial features) | No financial features | The insurance sum is the user's own note; nothing is bought, paid or transferred |
| Helse | «Appen min har ingen helsefunksjoner» | A photographed medicine list is a document the user keeps on the phone, not a health function. The emergency numbers are dial shortcuts, not first-aid content, so «Nødhjelp og førstehjelp» was not ticked; worth a second look if Google asks |

Filled in by Claude in Play Console on 2026-10-18 with these answers. Data safety was saved once the privacy policy
URL was set; the content rating came out as PEGI 3 / ESRB Everyone / 3+. The IARC terms were accepted as part of
the questionnaire, with kontakt@holmtall.no as the contact address.

## Butikkoppføring

| Field | Value |
| --- | --- |
| App name | Egenberedskapsappen |
| Short description | Se hvor mange døgn husstanden klarer seg, og hva som mangler. |
| Full description | `listing.md`, «Full description» |
| App icon 512×512 | from `apps/mobile/assets/images/icon.png` (`sips -Z 512`) |
| Feature graphic 1024×500 | `feature-graphic.png` (source `feature-graphic.html`, logo and font from `docs/marketing`) |
| Phone screenshots | `skjermbilder/1-oversikt.png` … `6-guide.png` (1080×1920): a Norwegian headline over the app screen on navy, composed by `render-screenshots.mjs` from the raw OnePlus 6 captures in `skjermbilder/kilde/` (demo household). Replaced the first set, which was the captures padded with navy side bars, on 2026-10-23 |
| Category | Livsstil (alternative: Verktøy) |
| Contact email | kontakt@holmtall.no |
| Website | https://egenberedskapsappen.no, set 2026-10-27 (was https://holmtall.no): people on the listing want the app's site, and the developer name already shows the company. Store settings publish at once, no review |
| Tags | Beredskap, Husholdning |

## Priser og distribusjon

Free, no in-app products. Countries: Norway first (the app is Norwegian only); more can be added later. No ads
declaration is in the content section above.

## Produksjonsutgave og innsending (2026-10-18)

| Step | What was done |
| --- | --- |
| Bundle | Version code 4 (1.6.0, EAS build `6319b9e8`), uploaded by Mikkel to internal testing, added to the production release from the library («Legg til fra biblioteket»; «Promoter» was blocked because the production track already had a draft) |
| Release name | `4 (1.6.0)`, Play's suggestion |
| Release notes | `listing.md`, «Release notes», inside `<no-NO>` … `</no-NO>` tags (the listing language is no-NO, not nb-NO). Play rejected blank lines inside the tags («Linje 3: Forventet </no-NO>»), so the notes have none |
| Countries | Norway only |
| Managed publishing | On, so an approval does not publish before 26 Oct. Publish from Publiseringsoversikt on release day |
| Submission | 15 changes sent for review (production release, countries, listing, content declarations, category). Play's quick checks take up to 14 minutes first, then the review, «usually within 7 days» |
| Warning | No deobfuscation file for the bundle. Harmless: nothing is minified in a way that needs a mapping file for crash reports yet; worth adding to the EAS build later |
