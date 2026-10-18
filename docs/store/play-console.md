# Google Play Console: «Konfigurer appen din», answers for 1.0

Written 2026-10-18 for the first production release (build 41eee8db, 1.6.0, version code 3, Egenberedskap+ off).
The answers follow `privacy-answers.md` and `listing.md`; what the app does was checked in code and on the
OnePlus 6 (`docs/android-device-test-2026-10-17.md`). Redo the Data safety and content rating answers in the version
that turns Egenberedskap+ on.

## Oppgi informasjon om innholdet i appen din

| Task | Answer | Why |
| --- | --- | --- |
| Angi personvernregler | `https://egenberedskapappen.no/personvern` once the website is deployed to prod hosting (LAUNCH.md section 8); until then the only live copy is `https://egenberedskapsappen-test.web.app/personvern` | The policy has to be reachable when Google reviews |
| Påloggingsinformasjon (app access) | «Alle funksjoner er tilgjengelige uten spesiell tilgang» | No accounts, no login |
| Annonser | «Nei, appen inneholder ikke annonser» | No ad SDK (AGENTS.md) |
| Innholdsvurdering (IARC) | Category: Utility, productivity, communication or other. Every content question «Nei»: no violence, sexuality, language, controlled substances, gambling; no user interaction or sharing of user content or location; no digital purchases; no personal info shared with third parties online | Gives PEGI 3 / Everyone |
| Målgruppe og innhold | Target age: 18 and over only. «Appeals to children»: No | Household preparedness for adults; keeps the app out of the Families policy |
| Datasikkerhet | See `privacy-answers.md`, «Google Play: Data safety», 1.0 set: collects Device or other IDs (Expo's install ID on every launch, required, app functionality), not shared, encrypted in transit, no deletion request mechanism. Everything else «not collected» | The only data that leaves the phone in 1.0 |
| Offentlige apper (government apps) | No, not developed by or for a government | Private company, no DSB affiliation |
| Økonomifunksjoner (financial features) | No financial features | The insurance sum is the user's own note; nothing is bought, paid or transferred |
| Helse | No health features | A photographed medicine list is a document the user keeps on the phone, not a health function |

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
