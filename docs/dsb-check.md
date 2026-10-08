# DSB check (LAUNCH.md section 1), draft for review

Prepared 2026-10-08 against DSB's pages as served that day. sikkerhverdag.no/egenberedskap now redirects to
dsb.no/sikkerhverdag/egenberedskap. **Nothing in the code has been changed and no TODO removed.** Mikkel reviews
this first. The DSB wording below is paraphrased; the source column says where to read the original.

Status: **match**, **differs** (DSB says something else), **partly** (matches in part, or DSB says more),
**not found** (no DSB source found), **n/a** (an app setting or our own wording, not a DSB fact).

Sources used (all fetched 2026-10-08):

| Key | URL |
| --- | --- |
| S-list | https://www.dsb.no/sikkerhverdag/egenberedskap/slik-bidrar-du-til-norges-beredskap/ (checklist on the page) |
| S-pdf | https://www.dsb.no/siteassets/sikkerhverdag/egenberedskap/sjekkliste-egenberedskap-a4-bokmal.pdf |
| S-faq | https://www.dsb.no/sikkerhverdag/egenberedskap/ofte-stilte-sporsmal-om-egenberedskap/ |
| S-water | https://www.dsb.no/sikkerhverdag/egenberedskap/vann-i-beredskap/ |
| S-store | https://www.dsb.no/sikkerhverdag/egenberedskap/slik-lagrer-du-drikkevann/ |
| S-food | https://www.dsb.no/sikkerhverdag/egenberedskap/mat-du-bor-ha-i-hus-i-tilfelle-krise/ |
| S-power | https://www.dsb.no/sikkerhverdag/egenberedskap/slik-beholder-du-varme-og-lys-hvis-strommen-gar/ |
| S-co | https://www.dsb.no/sikkerhverdag/gass-og-brannfarlig-vaske/slik-unngar-du-kullosforgiftning/ |
| S-med | https://www.dsb.no/sikkerhverdag/egenberedskap/legemidler-og-forstehjelpsutstyr-du-bor-ha-hjemme/ |
| S-hyg | https://www.dsb.no/sikkerhverdag/egenberedskap/god-hygiene-nar-vatnet-forsvinn/ |
| S-pets | https://www.dsb.no/sikkerhverdag/egenberedskap/egenberedskap-for-kjaledyr/ |
| S-kids | https://www.dsb.no/sikkerhverdag/egenberedskap/korleis-snakke-med-barn-og-unge-om-krise-og-krig/ |
| S-plan | https://www.dsb.no/sikkerhverdag/egenberedskap/planlegg-din-eigenberedskap/ |
| S-alert | https://www.dsb.no/sikkerhverdag/egenberedskap/varsling-i-kriser/ |
| S-friend | https://www.dsb.no/feature/finn-din-beredskapsvenn/ |
| S-shared | https://www.dsb.no/sikkerhverdag/egenberedskap/felles-egenberedskap/ |
| FAL | https://lovdata.no/dokument/NL/lov/1989-06-16-69 (forsikringsavtaleloven § 8-5) |

## Decisions for Mikkel

1. **Water.** DSB's current pages give **about 20 litres per person**, enough for a week and covering drinking,
   cooking *and* hygiene (S-water, S-store, S-faq). They give no per-day figure. We use 3 L per person per day for
   drinking and cooking (7 days = 21 L). The totals are close, but «3 liter per døgn» can't be cited to a current
   DSB page. Options: keep 3 L/day and cite it as ours («omtrent 20 liter i uka, som DSB anbefaler»), or change
   the model to 20 L per person per week.
2. **Iodine** hint is wrong: DSB says children and adults **under 40**, pregnant and **breastfeeding** women
   (S-med, S-pdf). We say «For barn, unge og gravide».
3. **«Hermetikk og ferdigretter – Kan spises kald».** DSB lists *middagshermetikk* among foods that need heating,
   and *påleggshermetikk*, canned lentils and beans among those that don't (S-food). The hint is too broad.
4. **Items on DSB's checklist that we don't have** (S-list, S-pdf): grill, kokeapparat eller stormkjøkken; ekstra
   gassbeholder eller brennstoff; avtale om overnatting (if no other heating); liste på papir med viktige
   telefonnummer; flere betalingskort (we have only cash); bleier and menstruasjonsprodukter (hygiene);
   varme klær. Adding items is content, not a new feature, but it changes the list, so it's your call.
5. **Water storage guide** leaves out DSB's cleaning step (soap, then 2 caps of household chlorine per 10 L, 30
   minutes, rinse) and «la vannet renne til det er kaldt» (S-store), and the purification advice leaves out
   filter → fosskok → cool, and «don't drink if it may be chemically polluted» (S-water).
6. **Power outage guide**: DSB also says to agree on somewhere to stay if you can't heat the home, and to check
   smoke alarms and extinguishers since open flames raise the fire risk (S-power); CO alarm (S-co).
7. The comment in `catalogue.ts` calls the list «DSB's list». It is our selection based on DSB's checklist, and
   the hints and amounts are ours. Worth rewording before citing it.

## packages/core/src/guidance.ts

| Constant | Ours | DSB / source | Source | Status |
| --- | --- | --- | --- | --- |
| `TARGET_DAYS` | 7 | Norwegian authorities recommend being ready to manage on your own for one week | S-list, S-faq | match |
| `SCALE_MAX_DAYS` | 10 | display cap | none | n/a |
| `WATER_LITRES_PER_PERSON_PER_DAY` | 3 L, drinking and cooking | about 20 L per person for a week, incl. hygiene; no per-day figure | S-water, S-store, S-faq | differs (see decision 1) |
| `WATER_LITRES_PER_DOG_PER_DAY` | 1 L | store enough drinking water for pets too; no amount | S-pets | not found (figure) |
| `WATER_LITRES_PER_CAT_PER_DAY` | 0.25 L | as above | S-pets | not found (figure) |
| `MEALS_PER_PERSON_PER_DAY` | 3 | food for a week for everyone at home; no meal count | S-food | n/a (our model) |
| `STORED_WATER_SHELF_LIFE_MONTHS` | 12 | change the water once a year for taste; it keeps safe for years | S-store | match (reason is taste, not safety) |
| `EXPIRY_WARNING_DAYS` | 14 | none | none | n/a |
| `EXPIRY_REMINDER_DAYS` | 7 | none | none | n/a |
| `CHECK_INTERVALS_MONTHS` / default | 1, 3, 6 / 3 | go through the stock at least once a year; check it regularly | S-plan, S-list | n/a (ours is more frequent; compatible) |
| `CHECK_EXPIRY_LOOKAHEAD_DAYS` | 30 | none | none | n/a |
| `EXPIRY_REVIEW_AFTER_DAYS` | 7 | none | none | n/a |
| `INSURANCE_ALERT_SHARE` | 0.9 | none | none | n/a |
| `CLAIM_DEADLINE_MONTHS` | 12 | claim lost unless reported within a year of learning the facts (§ 8-5 first paragraph) | FAL | match (law, not DSB) |
| `CLAIM_DEADLINE_WARNING_DAYS` | 30 | none | none | n/a |

## packages/core/src/catalogue.ts

| Type | Ours (name · hint) | DSB | Source | Status |
| --- | --- | --- | --- | --- |
| `drinkingWater` | Drikkevann på kanner · 3 liter per person per døgn | clean drinking water stored in jugs or bottles; about 20 L per person | S-list, S-water | item match; hint differs (decision 1) |
| `purificationTablets` | Vannrensetabletter · Hvis vannet blir forurenset | not on the checklist; filter and boil, «products for purifying water also exist» | S-water | partly |
| `cannedMeals` | Hermetikk og ferdigretter · Kan spises kald | food that keeps at room temperature; middagshermetikk needs heating | S-list, S-food | item match; hint differs (decision 3) |
| `crispbread` | Knekkebrød og kjeks · Lang holdbarhet | knekkebrød, kjeks named | S-food | match |
| `oats` | Havregryn og müsli · Kan lages med kaldt vann | havregryn named (no-heat list); müsli not named | S-food | match |
| `driedFruitNuts` | Tørket frukt og nøtter | tørket frukt, nøtter named | S-food | match |
| `babyFood` | Barnemat · Grøt, velling og morsmelkerstatning | plan for foods someone at home depends on; baby food not named | S-food | partly |
| `petFood` | Fôr til dyr · Én uke per dyr | food for the pet for at least one week | S-pets, S-list | match |
| `heatSource` | Ved eller annen varmekilde · Som virker uten strøm | wood if you have a stove or fireplace; gas or paraffin heater made for indoor use | S-list, S-power | match |
| `woolBlankets` | Ullpledd og soveposer · Én per person | warm clothes and blankets, duvets or sleeping bags | S-list | match («ull», «én per person» are ours) |
| `matches` | Fyrstikker og lighter | fyrstikker (checklist); fyrstikker eller lighter (power page) | S-list, S-power | match |
| `torch` | Lommelykt eller hodelykt | torches or head torches on batteries, crank or solar | S-list | match |
| `batteries` | Batterier · Til lykt og radio | batterier og ladet batteribank | S-list | match |
| `candles` | Stearinlys | fyrstikker og stearinlys | S-list | match |
| `powerBank` | Ladet powerbank | ladet batteribank | S-list | match |
| `radio` | DAB-radio på batteri · NRK sender viktig informasjon | DAB radio on batteries, crank or solar; NRK P1 is the emergency channel | S-list, S-alert | match |
| `cash` | Kontanter · Når kortterminaler ikke virker | litt kontanter og flere betalingskort | S-list, S-faq | partly (no «flere betalingskort») |
| `firstAidKit` | Førstehjelpsskrin | legemidler og førstehjelpsutstyr (+ detailed list) | S-list, S-med | match |
| `medicines` | Faste medisiner for en uke | at least seven days' extra supply of regular medicines | S-med | match |
| `iodine` | Jodtabletter · For barn, unge og gravide | children and adults under 40, pregnant and breastfeeding | S-med, S-pdf | differs (decision 2) |
| `wetWipes` | Våtservietter og håndsprit | våtservietter, håndsprit | S-list, S-hyg | match |
| `toiletPaper` | Toalettpapir og søppelsekker | toalettpapir; avfallsposar | S-pdf, S-hyg | match |
| (missing) | — | grill/kokeapparat/stormkjøkken; ekstra gass/brennstoff; avtale om overnatting; telefonliste på papir; bleier, menstruasjonsprodukter; varme klær | S-list, S-pdf | not in catalogue (decision 4) |

## apps/mobile/src/guides/guides.ts

### winterPowerOutage «Klar for strømbrudd i vinter»

| Point | DSB | Source | Status |
| --- | --- | --- | --- |
| Heat source without power, wood for a week | approved stove and chimney, enough wood; indoor gas/paraffin heater; be ready for a week without power | S-power | match |
| Wool blankets or sleeping bags for everyone | warm clothes, blankets, duvets or sleeping bags | S-power | match |
| Torch, batteries, DAB radio in a fixed place | items match; «fast sted» not found | S-list | partly |
| Water and food for 7 days, some cash | week; litt kontanter | S-list | match |
| Gather in one room, keep doors shut | close doors or hang blankets between rooms and over windows | S-power | partly («ett rom» not found) |
| Layers, wool innermost | not found | — | not found |
| Listen to NRK on DAB | NRK P1 is the emergency channel, on DAB | S-alert, S-faq | match |
| Never use outdoor gas appliances indoors (CO) | outdoor gas appliances must never be used indoors | S-co | match |
| Save the phone battery | not found | — | not found |
| Check on neighbours | find out who may need your help | S-shared | match |
| (missing) | agree where to stay if you can't heat the home; smoke alarms and extinguisher with more open flame | S-power | not in guide (decision 6) |

### planSevenDays «Lag en plan for 7 døgn»

| Point | DSB | Source | Status |
| --- | --- | --- | --- |
| Agree a meeting place | not found on DSB's household pages | — | not found |
| Write down emergency contacts, incl. one elsewhere | list **on paper** of important numbers: emergency, legevakt, vet, family, friends, neighbours | S-list | partly (DSB says paper; consider saying «også på papir») |
| Who fetches the children, who sees to the animals | agree with neighbours, friends or family who can help with pets | S-pets | partly |
| «DSB anbefaler at husstanden klarer seg selv i 7 døgn» | «Norske myndigheter anbefaler…» one week | S-list | match (DSB attributes it to the authorities) |
| Fill in Lager / do the beredskapssjekk | app | — | n/a |

### storeWater «Lagre og rense vann»

| Point | DSB | Source | Status |
| --- | --- | --- | --- |
| 3 L per person per day for drinking and cooking; pets extra | about 20 L per person per week incl. hygiene; pets too | S-water, S-pets | differs (decision 1) |
| Clean jugs or bottles made for drinking water | wash with soap, then chlorine (2 caps per 10 L, 30 min), rinse | S-store | partly (decision 5) |
| Fill from the tap, store dark and cool | fill to the brim with cold tap water; dark, cool, frost-free, away from petrol and chemicals | S-store | partly |
| Change it every 12 months; the app reminds you | once a year for taste | S-store | match |
| If polluted: follow the municipality's advice | not on DSB's page | — | not found (sensible; keep) |
| Boil, or use purification tablets | filter, bring to a rolling boil, cool naturally; purification products exist; don't drink if chemical pollution is possible | S-water | partly (decision 5) |

### childrenAndPets «Beredskap med barn og dyr»

| Point | DSB | Source | Status |
| --- | --- | --- | --- |
| Baby food, nappies, what the child needs for a week | bleier on the checklist; plan for foods someone depends on | S-pdf, S-food | partly |
| Talk calmly; give them a task | honest but not frightening, listen, ask; «task» not found | S-kids | partly |
| Something familiar, a teddy or a game without power | not found | — | not found |
| Food for a week per animal, water on top | food for at least a week; water for pets too | S-pets | match |
| Cage, lead, medicines if you must leave | carrier, extra medicines, first aid, sanitary items, toys; lead not named | S-pets | partly |

### preparednessFriend «Avtal en beredskapsvenn»

| Point | DSB | Source | Status |
| --- | --- | --- | --- |
| What a beredskapsvenn is | friends, neighbours and family cooperating and helping each other | S-friend | match |
| «Det er DSB som oppfordrer alle…» | DSB encourages everyone to become a beredskapsvenn | S-friend | match (credits DSB, as required) |
| Agree what to help with (look in, share water, charge phone, stay over, fetch children) | DSB's list: first aid, care, stay over on evacuation, explain information, practical help, shopping and transport, lend equipment, lend a phone on another network, cook together | S-friend, S-shared | partly (only «overnatte» overlaps) |
| Tell each other about medicines and needs | not found | — | not found |
| Save them as an emergency contact | app | — | n/a |
| Make contact; go and look if it's safe | not found | — | not found |
| Link `https://www.dsb.no/feature/finn-din-beredskapsvenn/` | returns 200 on 2026-10-08 | S-friend | match |

Note: «beredskapsvenn» is DSB's campaign word (Språkrådet's word of the year 2024, per S-friend). The guide credits
DSB and links to them, which fits LAUNCH.md's rule. «Beredskapssjekk» was not found on DSB's pages.
