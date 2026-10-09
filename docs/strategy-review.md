# Strategy review: Egenberedskapsappen 1.0 and Egenberedskap+

Written 2026-10-09 as an outside product and go-to-market review. It is advice, not a decision: nothing here changes
LAUNCH.md until Mikkel and Tarjei agree. Facts from the web are cited at the end; estimates and guesses are marked
as such. Nothing here has been checked with an insurer, Apple, Google or Datatilsynet.

---

## Kort sammendrag (for Tarjei)

- **Å lansere gratis med Egenberedskap+ skjult er riktig.** Men planen om å slå det på med en `eas update`, uten ny
  versjon gjennom Apples gjennomgang, bør droppes. Skjulte funksjoner som slås på i etterkant er nettopp det Apples
  regel 2.3.1 forbyr, og aktiveringskoder uten kjøp i appen bryter regel 3.1.1. Egenberedskap+ bør komme i en ny
  versjon som går gjennom gjennomgangen, med kjøp i appen fra første dag.
- **Det betyr at kjøp i appen må på plass før den første forsikringsavtalen kan tas i bruk på iPhone.** Det er ikke
  «det som kommer først» av de to, men begge samtidig.
- **Forbrukerabonnementet blir ikke en forretning alene.** 29 kr/mnd gir omtrent 19–20 kr til oss etter moms og
  butikkens andel. Med realistiske tall blir det noen titalls til et par hundre tusen kroner i året. Det er
  forsikringsselskapene som kan bære selskapet. Abonnementet trengs likevel, både for Apples regler og som
  prisanker overfor forsikringsselskapene.
- **Pris:** behold 29 kr/mnd, men gjør årsprisen til hovedtilbudet (forslag 249 kr/år). KI-analysen er noe man
  gjør én gang og oppdaterer av og til, så månedspris passer dårlig alene.
- **Forsikringsselskap:** selg en betalt pilot med fast pris (anslag 150–400 000 kr for 6–12 måneder), og deretter
  pris per aktiv husstand per år med et minimumsbeløp. Ikke pris per utdelt kode. Regn med at de vil ha
  DPIA, sikkerhetsdokumentasjon, en plan for hva som skjer hvis vi legger ned, og en DORA-vurdering, og at det tar
  måneder. Fremtind (SpareBank 1 og DNB) er et naturlig førstevalg etter Krokstadelva-brannen, men ikke inngå
  eksklusivitet.
- **Tidspunkt:** Egenberedskapsuka er 26. oktober–1. november, og årets tema er hvordan man klarer seg når mobilnett
  og internett ikke virker. En app som virker uten nett passer perfekt. Prøv å være i butikkene før 26. oktober,
  men ikke kutt personvern eller testing for å rekke det. Vinteren (stormer og strømbrudd) er det neste vinduet.
- **Kanaler uten sporing:** presse (lokalaviser, NRK distrikt, forbruker- og teknologistoff), kommuner og
  Sivilforsvaret som lenker til appen, Google-søk til nettsiden, og forsikringsselskapene selv. Ikke betalt
  annonsering.
- **Mål for 1.0 som kan måles uten sporing:** nedlastinger og aktive enheter fra App Store Connect og Play Console
  (Apples og Googles egne tall), vurderinger, antall tilbakemeldinger på e-post, omtaler, og om et
  forsikringsselskap går med på en pilot.
- **Største risiko utenom butikkreglene:** at gratisappen mister alt hvis telefonen blir borte, i en app som er født
  av en brann. Vurder en gratis kryptert eksportfil etter lansering.
- **Ikke gjør de neste 3–6 månedene:** nye funksjoner, analyseverktøy, eksklusivitet, betalt annonsering, DSBs
  kampanjemateriell, Sverige/Danmark, eller et dashbord for forsikringsselskaper før noen ber om det.

---

## Bottom line

The 1.0 sequencing is right: ship the local, free app now, and keep everything that needs servers and money out of
it. Three things in the current plan need to change, though, and one assumption needs to be dropped:

1. **Don't turn Egenberedskap+ on with an OTA update.** `docs/store/privacy-answers.md` and `config.ts` describe
   switching it on with `eas update`, "with no new build and no store review". That is a dormant feature activated
   after review (guideline 2.3.1), changing functionality by downloaded code (2.5.2), and, with activation codes,
   unlocking functionality without IAP (3.1.1). Of the three, this is the one most likely to get the developer
   account in trouble rather than just one build rejected. Ship Egenberedskap+ as a reviewed binary, described in the
   review notes.
2. **IAP is on the critical path for insurers, not an alternative to them.** LAUNCH.md says Egenberedskap+ goes on
   "when the purchase ships or the first insurer signs, whichever comes first". On iOS, insurer codes are only safe
   under 3.1.3(b) when the same thing is also sold as IAP. Insurer-paid codes for consumers are not "enterprise
   services" under 3.1.3(c), which covers employees and students. So: IAP and codes go live together.
3. **The store listing draft describes features 1.0 doesn't have.** `docs/store/listing.md` still has the section
   «SIKKERHETSKOPI OG KI-ANALYSE (MED AKTIVERINGSKODE)». It has to come out of the 1.0 listing completely, not just
   the insurer sentence.
4. **Drop the assumption that consumers will fund this.** Consumer subscriptions are a pricing anchor, a compliance
   requirement and a small revenue line. Insurers (or another B2B2C payer) decide whether Holm & Tall has a
   business here. Plan and staff for that.

Smaller inconsistencies found while reading: the README still says the app is "funded by partners, not by users",
which contradicts the 29 kr/mnd plan; the README says the analysis sweep runs "every hour" while the code
(`functions/src/analysis/jobs.ts`) and the privacy policy say every 30 minutes. The website's «Kvartalssjekk»
section is already tracked in LAUNCH.md section 8.

---

## What 1.0 actually is

Read from `apps/mobile/src/app` and the config, not from the marketing copy:

- **Oversikt:** days covered against the 7-day target, household setup (counts by age group, pets), guides,
  Beredskapssjekk with a chosen interval, «Gi tilbakemelding» by email.
- **Lager:** categories based on DSB's list, quantities scaled to the household, expiry dates and local reminders,
  shopping list of what's missing.
- **Nødinfo:** emergency numbers, contacts, meeting place, never locked; documents behind `<DocumentGate>`.
- **Eiendeler:** rooms, items with photo, value and receipt, sum-insured warning, PDF report. Free.
- **Hidden behind `EGENBEREDSKAP_PLUS_ENABLED = false`:** backup, restore, «Film et rom» (AI analysis). Firebase
  isn't loaded, so the only network call is the Expo update check.
- **No crash reporting, no analytics.** You will be relying on Apple's and Google's built-in crash data (Xcode
  Organizer, Play vitals) at launch. That is consistent with the privacy promise, but check those dashboards daily
  in the first two weeks.

That is a credible, complete free product. Stockpile tracking alone is commoditised (see Risks), but the
combination of stockpile, offline emergency info, locked documents and innbo documentation, with a strict privacy
story, is unusual in the Norwegian stores as far as I could find.

---

## 1. Is free-with-Egenberedskap+-hidden the right sequencing?

**Yes**, for four reasons:

- Nobody can buy Egenberedskap+ today: no IAP, no insurer. Showing a locked tier in the app would look like
  bait, invite "where do I pay?" support mail, and, with codes but no IAP, risk rejection on iOS.
- The free app is the asset you will sell to insurers. An insurer will ask "how many Norwegian households use it,
  and do they like it?" before anything else. You can only answer that by shipping.
- It keeps the first review simple: no subscriptions, no Firebase, no AI processing to explain to App Review or in
  the privacy labels.
- Winter is the season where preparedness is in the news. Being in the stores before it matters more than the paid
  tier.

**What to change:**

- Turn Egenberedskap+ on through a **new binary**, not `eas update`. Keep the code in 1.0 if you like (unreachable
  code behind a flag is common and rarely an issue on its own), but the moment it becomes reachable, it should be
  in a build Apple has reviewed, with the features described in the review notes, as 2.3.1 requires. Bump
  `version` in `app.json` for that build anyway, which AGENTS.md's runtime policy already supports.
- Keep «Kommer» on the website, but stop at the planned price; don't promise a date. Write «Kommer» copy so that it
  still reads well if Egenberedskap+ takes six months.

### Success criteria for 1.0, measurable without tracking

All of these come from data Apple, Google, Expo or people send you anyway; none needs an SDK. Apple's App Analytics
only covers users who agreed to share with developers, so treat it as a trend, not a count.

| Measure | Source | 90-day target (my estimate, adjust) |
| --- | --- | --- |
| First-time downloads | App Store Connect, Play Console | 10 000 total; below 3 000 by mid-January is a signal to rethink positioning |
| Active devices / retention | App Store Connect App Analytics (opt-in users), Play Console retained installers | Day-30 retention of 20 % or more on the opted-in sample |
| Rating | Both stores | 4.5 or higher with at least 50 ratings |
| Crash-free sessions | Xcode Organizer, Play vitals | 99.5 % or higher |
| Feedback emails | «Gi tilbakemelding» inbox | 30 or more, tagged by theme (what people ask for is the input to 1.1) |
| Earned media | Manual log | 5 or more articles or segments, at least one national |
| Third-party links | Manual log | 10 or more municipalities, Sivilforsvar districts or organisations linking or recommending |
| Insurer pipeline | Manual log | 3 insurer meetings held, 1 signed pilot or letter of intent |

Two more signals worth considering, both privacy-preserving but each a decision for Mikkel:

- **EAS Update request counts.** The app already sends a random install ID to Expo on every launch (disclosed in
  the privacy policy). If Expo's dashboard shows unique installs checking for updates per day, that is a decent
  daily-active proxy you already pay for in privacy terms. I haven't checked what Expo shows; verify before relying
  on it.
- **A voluntary, anonymous one-question survey** (a mailto or a static web form linked from the app after some
  weeks of use): "Hvor mange døgn klarer dere dere nå, og hvor mange var det da dere begynte?" Self-reported, but it
  is exactly the outcome evidence insurers and press will want.

---

## 2. Revenue model

### Consumer subscription: necessary, small

Rough unit economics for 29 kr/mnd (prices in Norwegian stores include 25 % MVA, which the stores remit):

- 29 kr incl. MVA → 23.20 kr ex MVA → about **19.70 kr** after a 15 % store commission. Apple's Small Business
  Program gives 15 % from the first year for developers under USD 1M in proceeds; Google's subscription rate is
  15 % (as of 2026 split into a 10 % service fee and a 5 % billing fee for Play Billing). Enrol in Apple's program
  before the first IAP goes live; it isn't automatic.
- 1 000 paying households on monthly ≈ 236 000 kr/year. Reaching 1 000 needs perhaps 20 000–100 000 active users at
  typical free-to-paid rates of 1–5 % for utility apps (an industry rule of thumb, not data for this category).

Variable cost is small: storage for an encrypted backup of a household is cents per month, and one AI analysis with
Gemini 2.5 Pro plus a Flash verifier is, by my estimate, in the range of 1–5 kr depending on the number of frames.
Check Vertex AI pricing against real jobs from the test project before setting prices. The real cost is people:
support, App Store administration, and keeping two subscription systems working.

**What's wrong with monthly-only:** the AI room analysis is a one-time job you refresh once a year; backup is a
hygiene feature people expect from iCloud or Google for free. A monthly subscription invites "sign up, film the
house, cancel". Recommendations:

- **Lead with yearly: 249 kr/år** (≈ 28 % off monthly), monthly at 29 kr as the alternative. Show the yearly price
  per month («under 21 kr i måneden»).
- Consider a **family-sharing** flag on the subscription: the vault is per household already, and Apple's Family
  Sharing matches that.
- Be careful with free trials of AI analysis: a trial is when the cost and the cancel-after-use risk are highest.
  If you trial, trial backup, not analysis.
- Price changes after launch are painful (store rules on price increases for existing subscribers). It's easier to
  start at 29/249 and discount for insurer customers than to raise later.

### Insurers (B2B2C): the business

What insurers plausibly care about, in roughly this order (from general industry knowledge; validate in meetings):

1. **Claims handling cost and speed after a total loss.** Krokstadelva (July 2026, 133 dwellings, Fremtind alone
   reported at least 170 claims) is the case: every household had to reconstruct its contents from memory. A
   documented innbo list shortens that, and cuts disputes. This is the strongest argument you have.
2. **Underinsurance.** The app warns when documented contents approach the sum insured. For the insurer that means
   correct premiums and fewer unpleasant surprises at claim time. This is commercially attractive to them, and also
   the place where users may suspect the app is an upsell tool; keep the warning neutral and the user in charge.
3. **Customer loyalty and contact frequency.** Insurers struggle to have reasons to talk to customers between
   renewals. A Beredskapssjekk reminder is a positive touchpoint, but note that under the privacy design the insurer
   gets none of that contact data. Be explicit that this is brand association, not a channel.
4. **Reputation and social responsibility**, especially in Totalforsvarsåret 2026: being seen to help customers
   prepare.
5. **Loss prevention.** Weak argument for preparedness specifically; don't oversell it.

What they will want as evidence before paying beyond a pilot:

- Usage: installs, active households, share of active households that documented at least one room, average number
  of items and documented value. All of these can be server counts without user tracking once Egenberedskap+ is on,
  but some (rooms documented) only exist on the phone today. Decide now which aggregate counts the free app may
  report, if any, and put that in the privacy policy before it's needed, or accept that the pilot evidence will be
  codes redeemed, active vaults and analyses run.
- Customer satisfaction: store ratings, a short survey to code holders.
- Security and compliance: a DPIA for the AI analysis, a description of the encryption, penetration test or at least
  an independent review, data processing agreements, incident handling. **Insurers in Norway are under DORA since
  1 July 2025**, so you will be an ICT third-party provider in their register, with contract clauses to match.
  Have a one-page answer ready; it's a common reason small vendors stall in procurement.
- Continuity: what happens to customers' backups if Holm & Tall stops. A written exit plan (data stays on phones;
  vaults kept readable for N months; export) answers it.

**Pricing to insurers** (all figures are my estimates, to be tested, not market data):

- **Not per code issued.** Insurers will hand out many more codes than get redeemed; per-code pricing either
  overcharges them (and they stop) or undercharges you.
- **Phase 1: paid pilot, flat fee.** 6–12 months, a defined customer segment (e.g. one region or new innbo
  customers), fixed price somewhere around 150 000–400 000 kr including setup, co-branded codes and a monthly count
  report. A free pilot is tempting and usually a mistake: it signals low value and nobody inside the insurer owns it.
- **Phase 2: per active household per year, with a minimum.** Something like 60–120 kr per household with a current
  entitlement that has synced in the last 90 days, with an annual minimum. That is 20–40 % of the consumer yearly
  price, which is normal for a wholesale channel, and a small fraction of a typical innbo premium (likely in the low
  thousands of kroner per year; verify).
- **Exclusivity costs extra and is time-limited**, if offered at all. The Norwegian non-life market is dominated by a
  handful of players (Gjensidige, If, Tryg, Fremtind are the obvious ones); exclusivity with one of them can close
  the door to the rest.

**Partner shortlist** (reasoning, not contacts): Fremtind (SpareBank 1 and DNB customers, and the Krokstadelva claims
experience); Gjensidige (largest, but has its own app and BankID-based customer relationship, so the
"we already have an app" objection will be strongest); If and Tryg; smaller and mutual insurers and the
bank-owned brands, which move faster and value differentiation more. Also consider **OBOS and other housing
co-operatives** and **Huseierne** as B2B2C payers outside insurance: they have members, a safety mandate and fewer
procurement rules. Treat all of these as hypotheses.

### Both, but sequenced

Do both, because Apple requires the IAP for codes to be safe and because the consumer price anchors the insurer
price. But put 80 % of the commercial effort into insurers and similar payers, and treat consumer revenue as a
bonus. If after six months there is no signed pilot and no realistic path to one, that's the moment to reconsider
the paid tier, not to add features.

---

## 3. Go-to-market in Norway

### Timing

- **Egenberedskapsuka 2026 is week 44, 26 October–1 November**, digital kick-off Monday 26 October at 11:00. DSB's
  digital campaign material is embargoed until 21 October. The theme is how to cope **when mobile networks and the
  internet don't work as normal**. An app whose whole point is that it works offline fits the theme better than in
  any previous year.
- DSB's own figures show where attention goes: during the 2025 week, dsb.no/egenberedskap had about 8 600 visitors
  from the campaign, most traffic to DSB's preparedness content came from Google, and 66 municipalities were
  visibly active. National TV picked up the opening event.
- **Being live before 26 October is worth pushing for, but it's tight.** Today is 9 October. LAUNCH.md still lacks
  the Apple and Google organisation accounts (Apple's organisation enrolment needs a D-U-N-S number and can take
  days to weeks), App Check registration, a production build and review. Set a decision date (say 19 October): if
  the build isn't submitted by then, don't cut privacy or QA items to make it; aim instead for a mid-November launch
  with the winter storm and power-outage season as the hook.
- **Winter (November–February)** is the second window: storms, cold snaps and outages make the "how many days can
  you manage" question concrete. Prepare a press note you can send the day a major outage hits the news, with the
  calculator on the website as the call to action.
- **Spring (renewal and moving season)** is the natural window for the innbo angle, and a better time to pitch
  insurers on results from winter.

### Channels without paid tracking

1. **Press.** The story is not "new app"; it's "half of Norwegians say they aren't well prepared for a week at home
   without power, water or network" (DSB's population survey, February 2026) plus "a free app from Porsgrunn that
   works without network and doesn't collect your data". Targets: Varden/Telemark press (home town), Drammens
   Tidende (with great care, see below), NRK distrikt, Dinside/Forbrukerrådet-type consumer journalism, Digi.no and
   Kode24 for the privacy architecture. Have screenshots, a fact sheet and a spokesperson ready before 21 October.
2. **Municipalities and Sivilforsvaret.** They run information points during the week and are hungry for practical
   things to show. Ask for a neutral mention or link, not an endorsement; many will decline because you're a
   commercial actor, and that's fine. Make it easy: a one-page PDF with what the app does, that it's free, with no
   ads, no tracking and no account. Don't use DSB's campaign material: DSB allows it for municipalities, voluntary
   organisations and authorities, **not for commercial purposes**.
3. **Voluntary organisations.** Sanitetskvinnene, Røde Kors, Norsk Folkehjelp run preparedness activities. Same
   approach as municipalities.
4. **Search (the website).** DSB's own evaluation says Google drives most preparedness traffic. The website's
   calculator is the best organic asset you have. A small number of evergreen pages answering the questions people
   actually search («hvor mye vann per person», «egenberedskap liste», «strømbrudd vinter») would do more than any
   campaign. The blog is under *After launch*; I'd argue for promoting two or three such pages, but that's a scope
   decision for LAUNCH.md.
5. **Insurers, housing co-operatives, employers** as distribution once there's a pilot.
6. **Schools:** low priority. The buyer is the household; schools reach children, and children don't manage the
   stockpile. Skip for now.

**On Krokstadelva:** the origin story on the website is genuine and strong, but the fire was three months ago and
people there are still rebuilding. Don't use it in press pitches or anything that looks like marketing off a
disaster. If local press asks, let it come up; don't lead with it. Consider offering free Egenberedskap+ to affected
households when it exists, quietly.

### Norwegian ASO

- **Name and subtitle carry the most weight.** The App Store name field allows 30 characters; «Egenberedskapsappen»
  uses 19. Consider «Egenberedskapsappen: Beredskap» or similar, so the short, common word is indexed on its own (I
  can't confirm how Apple tokenises Norwegian compounds; assume it doesn't split them). Subtitle «Beredskapslager og
  nødinfo» is good.
- **Keywords field:** don't repeat words already in the name or subtitle. Candidates: egenberedskap, strømbrudd,
  nødlager, krise, vann, matlager, holdbarhet, utløpsdato, innbo, forsikring, nødnummer, dokumenter, sjekkliste,
  storm. Leave out words for features you don't have (tilfluktsrom, jod).
- **Screenshots:** the first two should answer "what is this" without reading: the days count, and «virker uten
  nett». Put the privacy promise in a screenshot caption, not just the description.
- **Category:** Lifestyle is crowded; Utilities may rank a niche app higher. Either is defensible; pick one and
  don't switch often.
- **Ratings:** ask for a rating (Apple's `SKStoreReviewController`/Play In-App Review) at a moment of success, e.g.
  after the first completed Beredskapssjekk, never at launch.
- **Competitor names** must not be used as keywords.

---

## 4. Risks

### Competition (uncertain; based on store listings and websites found on 2026-10-09)

- **Other Norwegian preparedness apps exist and are free:** *Beredt* (Beredt Norge AS, Stord; free, shelters, stock
  planning, expiry dates, numbers and documents), *Egenberedskap* (Didit AS), *72klar!*, *Min Beredskap*,
  *Beredskapslageret* (iOS, with a 29 kr Pro purchase), *Frisk Beredskap* (in testing) and *360beredskap*. I
  couldn't verify download numbers for any of them. Implication: stockpile tracking is not a moat, and
  "beredskapsapp" search results will be crowded. Your differentiation is innbo documentation, locked documents,
  the offline guarantee, and the privacy architecture. Lead with those.
- **DSB's own materials** (dsb.no/egenberedskap, the brochure that 6 in 10 say they've read) are free, authoritative
  and not an app. They are a complement, not a competitor, as long as the app never looks like it's affiliated.
  The risk is the reverse: DSB launching an official app would hurt badly. I found no sign of one, but it's not
  impossible in a total-defence year.
- **Insurers' own apps** (Gjensidige requires BankID and focuses on policies and claims) don't appear to offer innbo
  registration as far as I could find, but I couldn't verify each insurer's app. If one adds it, that insurer
  becomes a competitor rather than a customer. Ask in the first meeting.
- **Apple and Google** could ship household inventory or emergency features in the OS. Low probability, high impact;
  nothing to do about it except be the best Norwegian-specific option.

### Dependence on one insurer

A single insurer as the only revenue source gives them pricing power and makes the company fragile to one
procurement decision. Mitigations: no exclusivity (or short and paid), at least one non-insurer B2B2C conversation
running in parallel (housing co-operatives, employers' benefit schemes), and consumer IAP live so there is always a
direct path.

### GDPR and the sensitive data

- **On the phone:** documents and medicine lists never leave the phone in 1.0, so they're outside your processing
  in practice. The privacy policy's legal basis section is right to say so. Keep it that way.
- **AI analysis is the real exposure.** Photos of a home routinely show people, medicine packages, documents, mail
  and children's rooms, so you will process special-category data (Article 9) incidentally even though you don't
  intend to. Before switching it on: write a **DPIA** (new technology plus AI on personal data is very likely on
  Datatilsynet's list; a DPIA is cheap insurance either way), get the Vertex AI abuse-monitoring exception
  (already in LAUNCH.md) or soften the policy wording, and consider telling users in the capture flow to avoid
  filming people and documents. Insurers will ask for the DPIA anyway.
- **Activation codes and insurers:** make sure codes can't be tied back to a named customer on your side. If the
  insurer keeps a list of which customer got which code, they can learn who uses the app from redemption counts
  per code. Prefer batch codes or report counts only in aggregate per partner (which is what the privacy policy
  promises).

### Store rules

- **3.1.1 / 3.1.3(b):** codes only alongside IAP for the same entitlement, on iOS. Google Play's payments policy has
  a similar requirement for digital goods; I couldn't find a definitive statement on third-party-paid codes, so check
  the current Play payments policy and Play Console help before launch of Egenberedskap+.
- **2.3.1 / 2.5.2:** don't enable Egenberedskap+ by OTA (above).
- **3.2.1(v)** says insurance apps must be free and can't use IAP. You are not an insurance app, but co-branding with
  an insurer shouldn't make the app look like one. Keep the insurer's name to the code redemption screen.
- **The EU's new App Store terms (October 2026, alternative payments)** are under the DMA. I couldn't confirm that
  they apply to the Norwegian storefront; the DMA's EEA status was still listed as under scrutiny. Don't plan
  around them.

### Hosting costs

Low risk at current design: per-household caps (one analysis at a time, 20 a day), a budget alert on Blaze, no
egress of photos. The two things to watch are a viral spike in analyses after an insurer rollout (set a global
daily cap you can raise) and Gemini model price changes or deprecations (`gemini-2.5-pro` won't be offered forever;
budget a migration every year).

### Company risk

Holm & Tall is small, and Mikkel is the launch bottleneck (LAUNCH.md says so). An insurer will see that too. Being
local-first is the best answer: if the company stopped, the app keeps working. Write that down as part of the exit
plan.

### Product risk I'd take most seriously

**The free app loses everything if the phone is lost**, in an app whose origin story is a fire. The FAQ is honest
about it, but the first 1-star review saying "mistet alt" will hurt. A free, user-initiated **encrypted export file**
(saved wherever the user chooses) would close most of that gap without servers and without undermining the paid
automatic backup. That is a new feature, so it belongs under *After launch* in LAUNCH.md, but I'd put it first there.

---

## 5. What NOT to do in the next 3–6 months

- **Don't build new features** before users ask (the LAUNCH.md list is right: «Jeg er trygg», hazard warnings,
  barcode scanning, evacuation bag, the blog beyond a few evergreen pages). The exception I'd argue for is the export
  file above.
- **Don't turn Egenberedskap+ on with `eas update`**, and don't hand out codes on iOS before IAP is live.
- **Don't add analytics, crash or attribution SDKs**, even "privacy-friendly" ones. The no-tracking promise is part of
  the product; Apple's and Google's built-in data is enough for now.
- **Don't buy ads.** Without tracking you can't measure them, and DSB's 2025 campaign shows that a national
  preparedness message moves through press, municipalities and Google search, not ad spend you'd outbid anyway.
- **Don't sign exclusivity** with an insurer, and don't name any partner before a signed agreement (already a rule).
- **Don't use DSB's campaign material, logos or slogans**, and don't time press releases to look like part of DSB's
  week. Be relevant to it, not part of it.
- **Don't build an insurer dashboard, SSO, claims API or white-label version** until a paying insurer asks for it in
  writing. The first pilot can run on a monthly email with counts.
- **Don't expand to Sweden, Denmark or Finland.** Each has its own authority guidance (MSB's brochure in Sweden, for
  example), language and insurers. Win Norway first.
- **Don't change the price** after Egenberedskap+ launches without a strong reason.
- **Don't market off Krokstadelva.**

---

## 6. Prioritised 90-day plan after launch

Day 0 is the day 1.0 is live in both stores. If that slips past week 44, the plan holds; only the press hooks change.

**Before day 0 (now)**

1. Finish LAUNCH.md sections 1, 4–6 as written. Set a go/no-go date (19 October) for a pre-Egenberedskapsuka
   launch.
2. Remove the backup/AI section from `docs/store/listing.md` for 1.0; add the ASO changes above.
3. Change the Egenberedskap+ rollout plan in `docs/store/privacy-answers.md` and `config.ts` comments: new binary,
   not OTA.
4. Press kit: fact sheet, screenshots, one-paragraph story, spokesperson, the DSB survey figures with sources.
5. A one-page PDF for municipalities, Sivilforsvar districts and voluntary organisations.

**Days 0–30: launch and listen**

1. Press push in week 44 (or on launch day), local first, then national.
2. Send the one-pager to Telemark and Viken/Buskerud municipalities and the Sivilforsvar districts first, where you
   can follow up in person; then wider.
3. Read and answer every feedback email within two working days; tag themes in a simple sheet.
4. Watch crashes and reviews daily; ship fixes with `eas update` (JS-only, as AGENTS.md describes).
5. Book first meetings with two or three insurers, using the free app as the demo. Goal: learn what they'd pay for
   and what evidence they need, not sell.
6. Enrol in Apple's Small Business Program; set up the paid-apps agreements in both stores.

**Days 31–60: build the paid path**

1. Build IAP (yearly 249 kr, monthly 29 kr), receipt validation in `functions`, and codes on the same entitlement.
   This is the one big engineering item.
2. Write the DPIA for the AI analysis; get the Vertex AI exception decided; update the privacy policy and store
   privacy answers for Egenberedskap+.
3. Prepare the insurer pack: pricing (pilot plus per-active-household), security one-pager, DORA answers, exit plan,
   sample monthly count report.
4. Decide, with Tarjei, whether the export file goes into 1.1.
5. Winter outage press note ready to send.

**Days 61–90: launch Egenberedskap+ and sign a pilot**

1. Submit the Egenberedskap+ build for review with IAP and code redemption, described in the review notes.
2. Negotiate one paid pilot; target signature by day 90, start in the new year.
3. First review of the 1.0 success criteria. If downloads and ratings are well below target, revisit positioning and
   the store listing before spending time on anything else.
4. Plan 1.1 from the feedback themes, not from the idea list.

---

## Assumptions to test (and who can test them)

| Assumption | How to test |
| --- | --- |
| Insurers see value in innbo documentation they can't see | First insurer meetings; ask directly what they'd need to see |
| Households will document innbo at all, by hand | No usage data per tab exists by design, so ask: feedback emails and the anonymous survey |
| 29 kr/mnd and 249 kr/år are acceptable | After IAP ships: compare conversion between yearly and monthly; ask in the survey before |
| Municipalities will mention a commercial app | Count replies to the one-pager |
| The AI analysis cost per job is 1–5 kr | Measure real jobs in the test project before setting insurer prices |
| Apple accepts codes alongside IAP for an insurer-paid benefit | Describe it exactly in the review notes; if unsure, ask App Review before building the insurer flow |

---

## Sources

- DSB, Egenberedskapsuka (dates, theme, kick-off, material only for non-commercial use, embargo):
  [dsb.no/egenberedskapsuka](https://www.dsb.no/egenberedskapsuka/) and
  [Informasjon om Egenberedskapsuka, Totalforsvarsåret 2026 (PDF)](https://www.dsb.no/siteassets/egenberedskapsuka/informasjon-om-egenberedskapsuka---en-del-av-totalforsvarsaret-2026.pdf)
- DSB, Evaluering av Egenberedskapsuka 2025 (visitors, Google traffic, 66 municipalities, media):
  [PDF](https://www.dsb.no/contentassets/61439f51db3e45ce8350f8901ab75451/181225_evaluering-egenberedskapsuka-2025.pdf)
- DSB/Norstat, Befolkningsundersøkelse om egenberedskap, February 2026 (half not well prepared for a week; 37 %
  strengthened their preparedness; cost and storage space as barriers; 6 in 10 read the brochure):
  [PDF](https://www.dsb.no/siteassets/rapporter-og-publikasjoner/rapporter/befolkningsunderokelse-egenberedskap-2026.pdf)
- Apple App Review Guidelines (2.3.1, 2.5.2, 3.1.1, 3.1.3(b), 3.1.3(c), 3.2.1(v)):
  [developer.apple.com/app-store/review/guidelines](https://developer.apple.com/app-store/review/guidelines/);
  developer reports of 3.1.1/3.1.3(b) rejections:
  [Apple Developer Forums thread 740710](https://developer.apple.com/forums/thread/740710)
- Apple Small Business Program (15 %): [Business Wire, 2020](https://www.businesswire.com/news/home/20201118005376/en/Apple-Announces-App-Store-Small-Business-Program)
- Google Play service fees: [Play Console Help](https://support.google.com/googleplay/android-developer/answer/112622?hl=en);
  2026 fee split: [Adapty](https://adapty.io/blog/google-play-billing-changes-subscriptions-fees)
- Apple EU terms, October 2026: [developer.apple.com/support/apps-in-the-eu](https://developer.apple.com/support/apps-in-the-eu/);
  DMA EEA status: [EFTA EEA-Lex 32022R1925](https://www.efta.int/eea-lex/32022r1925)
- DORA in Norway from 1 July 2025: [Finanstilsynet](https://www.finanstilsynet.no/nyhetsarkiv/nyheter/2025/ny-lov-om-digital-operasjonell-motstandsdyktighet-i-finanssektoren-dora-loven-trer-i-kraft-1.-juli)
- DPIA criteria in Norway (secondary): [Helsedirektoratet, Normen](https://www.helsedirektoratet.no/normen/personvern-og-informasjonssikkerhet-i-forsknings-og-kvalitetsprosjekter/personvernkonsekvensvurdering-dpia)
- Krokstadelva fire, July 2026: [lokalhistoriewiki.no](https://lokalhistoriewiki.no/wiki/Storbrannen_i_Krokstadelva_juli_2026);
  Fremtind claims: [TU/NTB](https://www.tu.no/nyhetsstudio/erstatningsadvokat-de-uten-forsikring-i-krokstadelva-kan-likevel-ha-krav/126781)
- Competitors: [Beredt](https://beredtnorge.no/),
  [Beredt on Google Play](https://play.google.com/store/apps/details?id=app.beredt.beredt&hl=en_US),
  [Egenberedskap (Didit)](https://play.google.com/store/apps/details?id=no.didit.app&hl=en_US),
  [Beredskapslageret](https://apps.apple.com/no/app/beredskapslageret/id6756976779), [72klar!](https://72klar.no/),
  [Min Beredskap](https://www.min-beredskap.no/no), [Frisk Beredskap](https://www.friskberedskap.no/),
  [360beredskap](https://360beredskap.no/)
- Gjensidige app (BankID, policy and claims focus): [App Store](https://apps.apple.com/app/id374040427)
