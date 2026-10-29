# App Store Connect: answers for the first iOS release

Written 2026-10-29, the day Apple approved the developer account, for the first App Store version (1.7.2 or
later, Egenberedskap+ off). It follows `listing.md`, `privacy-answers.md` and the Play answers in
`play-console.md`; where Apple asks something Play didn't, the answer is marked **(Mikkel)** until he has decided.

## Account

| What | Value |
| --- | --- |
| Team | Holm & Tall AS, Team ID `979DRPJKZL`, enrolled as an organisation (Account Holder: Mikkel) |
| Bundle ID | `no.htas.egenberedskap` (production builds; the dev build is `no.htas.egenberedskap.dev`) |
| Capabilities | Registered 2026-10-29 with none ticked; EAS turns on what the entitlements in `app.json` ask for (Data Protection, Complete) on the first build. App Attest for App Check is still open (LAUNCH.md section 3) |
| App Store Connect app | Apple ID `6828561866` (`ascAppId` in `apps/mobile/eas.json`), created 2026-10-29 by Claude on Mikkel's go, with the values under «New app»; company name «Holm & Tall AS» |
| Agreements | Apple Developer Program License Agreement accepted 2026-10-29. The Paid Applications Agreement isn't needed while the app is free with no in-app purchases |

## New app

| Field | Value |
| --- | --- |
| Platform | iOS |
| Name | Egenberedskapsappen |
| Primary language | Norwegian (Bokmål) |
| Bundle ID | `no.htas.egenberedskap` |
| SKU | `egenberedskapsappen` |
| User access | Full access |

## App information

| Field | Value |
| --- | --- |
| Subtitle | Beredskapslager og nødinfo (`listing.md`) |
| Category | Lifestyle; secondary Utilities |
| Content rights | Doesn't contain, show or access third-party content. DSB's shelter list is open data (NLOD) shown inside the app with credit, which Apple doesn't count as third-party content |
| Age rating | Every question «None» / «No»: no violence, sexual content, profanity, drugs, gambling, horror, medical treatment information, user-generated content, messaging or unrestricted web access. The guides are general preparedness advice, not medical treatment. Gives 4+ |
| Privacy policy URL | https://egenberedskapsappen.no/personvern |
| Copyright | 2026 Holm & Tall AS |

## Pricing and availability

Free, Norway only (the app is Norwegian only, as on Play). EU storefronts need a trader status under the Digital
Services Act (Business → trader status); with Norway only it isn't required, but it has to be done before any EU
country is added.

## App Privacy

From `privacy-answers.md`, «Apple: App Privacy», 1.0 set, unchanged by 1.7:

- Data collection: Yes. Tracking: No.
- Data Not Linked to You: Identifiers → Device ID, purpose App Functionality (Expo's install ID on every launch).
- Everything else not collected. Location stays «not collected»: the position is used on the phone to sort the
  shelter list and is never sent. The map fetches tiles from Apple. Whether Apple wants MapKit's own requests
  declared hasn't been checked against Apple's guidance; Mikkel decides, as for the Maps SDK on Play.

## Version page (1.0 for the App Store)

| Field | Value |
| --- | --- |
| Screenshots, iPhone 6.9″ | `skjermbilder/ios/1-oversikt.png` … `6-guide.png` (1320×2868), composed by `render-screenshots.mjs --ios` from simulator captures in `skjermbilder/ios/kilde/` (demo household). Apple scales them down for the smaller iPhones. No iPad set: `supportsTablet` is false |
| Promotional text | `listing.md`, «Promotional text» |
| Description | `listing.md`, «Full description» (the iPhone wording: «låst med Face ID eller kode» and the line about the locked phone) |
| Keywords | `listing.md`, «Keywords» |
| Support URL | https://egenberedskapsappen.no/kontakt |
| Marketing URL | https://egenberedskapsappen.no |
| Build | The production build from EAS, once it has processed in TestFlight |
| Version release | «Manually release this version» |

## App Review information

| Field | Value |
| --- | --- |
| Sign-in required | No. There are no accounts |
| Contact | Mikkel Holmberg, kontakt@holmtall.no, +47 404 04 506 **(Mikkel: his own phone and email instead?)** |
| Notes | Below, in English for the reviewer |

> Egenberedskapsappen helps a Norwegian household keep a home emergency supply. The app is in Norwegian only and
> has no accounts: everything is stored on the device and works without a network connection.
>
> - Onboarding asks who lives in the home; the overview then shows how many days the household can manage without
>   power and water, based on the supplies entered under «Lager».
> - «Nødinfo» lists Norway's emergency numbers and the user's emergency contacts. «Tilfluktsrom og
>   informasjonspunkter» uses the location (when in use only) to list the nearest public shelters from the Norwegian
>   Directorate for Civil Protection's open data. Outside Norway every shelter is more than 50 km away, so the screen
>   says so instead of showing a list.
> - Documents (for example a passport photo) are protected with Face ID or the device passcode.
> - The app has no ads, no tracking and no in-app purchases.

## Export compliance

Mikkel answered «standard/exempt encryption: yes» in the first `eas build` (2026-10-29): HTTPS, plus the end-to-end
backup encryption (`packages/sync`, standard algorithms, hidden while Egenberedskap+ is off). EAS couldn't write the
answer to the dynamic config, so `ios.config.usesNonExemptEncryption: false` was added to `app.json` by hand
afterwards; it sets `ITSAppUsesNonExemptEncryption` in Info.plist. The first iOS build (1.7.2) went up without it,
so its encryption question is answered once in TestFlight. No `version` bump: it's a declaration only, and no
earlier iOS build exists for an update to reach.
