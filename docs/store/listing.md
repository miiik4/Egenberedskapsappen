# Store listings (draft, bokmål)

Draft for LAUNCH.md section 6, rewritten 2026-10-09 for 1.0. Describes only what 1.0 has: checked against
`apps/mobile/src/app` with `EGENBEREDSKAP_PLUS_ENABLED = false` (`apps/mobile/src/constants/config.ts`). No backup,
no AI analysis, no activation codes, no insurers as partners. No partner names, no DSB slogans, no claim of DSB
affiliation.

**Check before submitting**

- 1.0 is free and has no in-app purchases. Nothing here mentions Egenberedskap+; the website shows it as «Kommer»,
  the stores don't. When Egenberedskap+ is switched on (an `eas update`, no new build), update this listing in the
  same go. On the App Store only the promotional text can change without submitting a new version.
- «forsikring» in the text means the household's own contents insurance (the insurance-sum warning and the PDF
  report the user sends themselves), not a partnership. Keep it that way.
- «Innboet: free and local» is still to be confirmed with Tarjei (LAUNCH.md section 7). If that changes, the
  EIENDELER section changes with it.
- Review screenshots must come from the release build, with Egenberedskap+ off (no «Dokumenter med KI», no
  Sikkerhetskopi row).

Character limits: App Store name 30, subtitle 30, promotional text 170, keywords 100, description 4000.
Google Play title 30, short description 80, full description 4000.

## Shared

- **Name / title:** Egenberedskapsappen (19)
- **Category:** Lifestyle (Apple: Livsstil; Play: Livsstil). Alternative: Utilities / Verktøy.
- **Price:** Free. No in-app purchases.
- **Age rating:** 4+ / PEGI 3 (nothing shared between users, no web browsing beyond opening links).
- **Privacy policy URL:** https://<real domain>/personvern (the domain is still open, LAUNCH.md section 8)
- **Support URL:** https://<real domain>/kontakt

## App Store

**Subtitle (26):** Beredskapslager og nødinfo

**Promotional text (147):**
Se hvor mange døgn husstanden klarer seg uten strøm og vann, hva som mangler, og hva som snart går ut. Alt ligger
på telefonen og virker uten nett.

**Keywords (98, comma-separated, no spaces):**
beredskap,egenberedskap,strømbrudd,nødlager,vann,krise,nødnummer,innbo,forsikring,dokumenter,liste

**Description:** see «Full description» below (same text in both stores).

## Google Play

**Short description (61):** Se hvor mange døgn husstanden klarer seg, og hva som mangler.

## Full description

(About 1 760 characters; limit 4 000.)

Hvor lenge klarer husstanden seg hvis strømmen og vannet blir borte? Egenberedskapsappen regner det ut, viser
hva som mangler, og minner dere på det som snart går ut. Appen er gratis, og alt dere legger inn blir på
telefonen.

LAGER
• Se hvor mange døgn dere har vann, mat og varme til, regnet ut fra hvor mange som bor hjemme, også barn og dyr.
• En sjekkliste for vann, mat, varme, lys og strøm, kommunikasjon, førstehjelp og hygiene, basert på rådene fra
  norske myndigheter.
• Det som mangler blir en handleliste.
• Legg inn holdbarhetsdatoer og få påminnelse før noe går ut. Merk vannet som byttet med ett trykk.

BEREDSKAPSSJEKK
• Appen ber dere gå gjennom lageret med jevne mellomrom: hver måned, hver tredje måned eller hvert halvår.

NØDINFO, ALLTID ÅPEN
• Nødnumrene 110, 112, 113 og legevakt 116 117, ett trykk unna.
• Nødkontakter og møtested, som virker uten nett.
• Viktige dokumenter som pass, førerkort og medisinliste, låst med Face ID eller kode.

GUIDER
• Korte guider om strømbrudd om vinteren, å planlegge for en uke, lagring av vann, barn og dyr, og om å avtale en
  beredskapsvenn.

EIENDELER
• Dokumenter innboet rom for rom, med bilde, verdi og kvittering.
• Legg inn forsikringssummen og få beskjed hvis innboet nærmer seg den.
• Lag en innbooversikt som PDF og del den selv med forsikringsselskapet ditt.

PERSONVERN
• Ingen konto, ingen reklame, ingen sporing.
• Alt dere legger inn lagres bare på telefonen. På iPhone kan ingenting leses mens telefonen er låst.
• Om husstanden lagres bare antall per aldersgruppe, ikke navn eller fødselsdatoer.

Savner dere noe? Trykk «Gi tilbakemelding» under Husstand og skriv til oss.

Appen er ikke laget av eller tilknyttet DSB eller andre myndigheter. Les myndighetenes råd på sikkerhverdag.no.
