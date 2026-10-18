# Google Play Console: «Konfigurer appen din», answers for 1.0

Written 2026-10-18 for the first production release (build 41eee8db, 1.6.0, version code 3, Egenberedskap+ off).
The answers follow `privacy-answers.md` and `listing.md`; what the app does was checked in code and on the
OnePlus 6 (`docs/android-device-test-2026-10-17.md`). Redo the Data safety and content rating answers in the version
that turns Egenberedskap+ on.

## Oppgi informasjon om innholdet i appen din

| Task | Answer | Why |
| --- | --- | --- |
| Angi personvernregler | `https://egenberedskapappen.no/personvern` once the website is deployed to prod hosting (LAUNCH.md section 8); until then the only live copy is `https://egenberedskapsappen-test.web.app/personvern` | The policy has to be reachable when Google reviews |
| Påloggingsinformasjon (app access) | «Nei», no part of the app is restricted | No accounts or login. Google lists device biometrics under «Ja», but that path demands a username and password, which don't exist; the document gate is the phone's own screen lock, which a reviewer's device has too |
| Annonser | «Nei, appen inneholder ikke annonser» | No ad SDK (AGENTS.md) |
| Innholdsvurdering (IARC) | Category: Utility, productivity, communication or other. Every content question «Nei»: no violence, sexuality, language, controlled substances, gambling; no user interaction or sharing of user content or location; no digital purchases; no personal info shared with third parties online | Gives PEGI 3 / Everyone |
| Målgruppe og innhold | Target age: 18 and over only. «Appeals to children»: No | Household preparedness for adults; keeps the app out of the Families policy |
| Datasikkerhet | See `privacy-answers.md`, «Google Play: Data safety», 1.0 set: collects Device or other IDs (Expo's install ID on every launch, required, app functionality), not shared, encrypted in transit, no deletion request mechanism. Everything else «not collected» | The only data that leaves the phone in 1.0 |
| Annonserings-ID | «Nei», the app does not use the advertising ID | No ad or analytics SDK; the APK requests no `com.google.android.gms.permission.AD_ID` (checked in the installed build) |
| Offentlige apper (government apps) | «Nei», not developed by or for a government | Private company, no DSB affiliation |
| Økonomifunksjoner (financial features) | No financial features | The insurance sum is the user's own note; nothing is bought, paid or transferred |
| Helse | «Appen min har ingen helsefunksjoner» | A photographed medicine list is a document the user keeps on the phone, not a health function. The emergency numbers are dial shortcuts, not first-aid content, so «Nødhjelp og førstehjelp» was not ticked; worth a second look if Google asks |

Filled in by Claude in Play Console on 2026-10-18 with these answers. Data safety is answered through its preview
and saved as a draft: Play won't accept it until the privacy policy URL is set; the content rating came out as PEGI 3 / ESRB Everyone / 3+. The IARC terms were accepted as part of
the questionnaire, with kontakt@holmtall.no as the contact address.

## Butikkoppføring

| Field | Value |
| --- | --- |
| App name | Egenberedskapsappen |
| Short description | Se hvor mange døgn husstanden klarer seg, og hva som mangler. |
| Full description | `listing.md`, «Full description» |
| App icon 512×512 | from `apps/mobile/assets/images/icon.png` (`sips -Z 512`) |
| Feature graphic 1024×500 | `feature-graphic.png` (source `feature-graphic.html`, logo and font from `docs/marketing`) |
| Phone screenshots | From the OnePlus 6 with the demo household, scaled to 1080×1920 with navy side bars (Play wants 16:9 to 9:16) |
| Category | Livsstil (alternative: Verktøy) |
| Contact email | kontakt@holmtall.no |
| Website | https://egenberedskapappen.no |
| Tags | Beredskap, Husholdning |

## Priser og distribusjon

Free, no in-app products. Countries: Norway first (the app is Norwegian only); more can be added later. No ads
declaration is in the content section above.
