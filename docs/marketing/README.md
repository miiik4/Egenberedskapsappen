# Logo and launch posters

Drafts, 2026-10-11. Rebuild everything with `node docs/marketing/render.mjs` (needs Google Chrome installed).

## Logo (`logo/`)

The app icon's mark (white tile and days bar on navy, from `apps/mobile/assets/brand`) next to the website's wordmark:
Archivo, 700 weight, 112 % width. The letters are outlines, so the SVGs look right without the font installed.

| File | Use |
| --- | --- |
| `logo-light` | Default: on white or light backgrounds |
| `logo-dark` | On navy or dark photos |
| `logo-black` | One-colour print |
| `logo-stacked-*` | Square spaces: stands, the top of a flyer |
| `mark`, `profile-1024.png` | Mark alone; profile picture for social media |

**Alternatives** (`logo/alternativer/`, drafts to compare; `sammenligning.png` shows all three as logo and icon):

- `hus`: a house whose floor is the days bar. The household and how long it manages, readable at icon size.
- `ring`: seven segments, one per day of the week DSB recommends, four lit, as the part-filled ring in Lager.
  «appen» in the accent colour, which also breaks up the long word.

- `skjold`: a shield with the days bar across it. At small sizes the bar can read as an on/off switch.
- `skjold-hus`: a shield with a house cut out of it, the days bar as its floor. A safe home.
- `skjold-halv`: a shield half filled with blue, which also reads as a water level. Simplest, but closest to a
  generic security app. `skjold-sammenligning.png` shows the three shields.

- What the app holds: `sjekkliste` (clipboard, two of three ticked), `hylle` (a shelf of water, tins and a torch),
  `kasse` (storage box with the days bar), `kanne` (water can, half full), `lykt` (torch and beam).
- Combinations: `hus-sjekk`, `hus-hylle` (a stocked shelf at home), `skjold-sjekkliste`, `kasse-skjold`.

- From Mikkel's references (`referanser.png`): `dokument` (an info sheet with a plus badge), `koffert` (first-aid
  case), `koffert-dager` (the case with the days bar), `kasse-7` (a storage box labelled 7, the days DSB
  recommends), `kasse-pluss`. The plus is blue or white, never red: a red cross is a protected emblem. The box is our
  own drawing, not Røde Kors's box or label.

`alle-merker.png` shows every mark side by side, large and at home-screen size. These are sketches to pick a
direction from; the chosen one gets a proper pass (optical balance, monochrome and Android themed versions).

Shields are kept plain on purpose: no orange and blue triangle (civil defence), no red cross (a protected emblem),
nothing like a coat of arms or DSB's logo.

Picking one of them for the app icon too means a new native build and a `version` bump (`apps/mobile/AGENTS.md`).

Keep clear space of at least a quarter of the mark's height around the logo. Don't recolour the mark or set the
wordmark in another font.

## Posters (`posters/`)

| Poster | Message |
| --- | --- |
| `dogn` | «Hvor lenge klarer dere dere uten strøm og vann?» with the days card from Oversikt |
| `nodinfo` | «Ingen dekning? Nødinfoen ligger på telefonen.» with the Nødinfo screen |
| `utlop` | «Vannet går ut på dato. Appen sier fra.» with the Lager screen |

Each comes as `-a3.pdf` (vector, for print at any A size), `-a3.png` (preview), `-feed.png` (1080×1350) and
`-story.png` (1080×1920).

**Check before printing or posting**

- The release line «Gratis på iPhone og Android fra 26. oktober» assumes go/no-go on 19 October passes.
  `RELEASE_LINE` in `render.mjs`.
- The URL is `egenberedskapappen.no` (without the s), the domain we own. `URL` in `render.mjs`.
- Claims are ones the website and store listing already make. No DSB slogans or DSB look, no partner names, no
  mention of Egenberedskapsuka (it's DSB's campaign).
- No App Store or Google Play badges yet: add them, following Apple's and Google's badge rules, once the store links
  exist.
- The figures on the days card are the website's demo household, not a recommendation.
- Print shops usually want CMYK and 3 mm bleed: the PDFs are RGB with no bleed. Ask the printer, or have the
  backgrounds extended.
