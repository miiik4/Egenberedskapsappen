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
