/**
 * Renders the logo and the launch posters.
 *
 *   node docs/marketing/render.mjs
 *
 * Logo: the app icon's mark (apps/mobile/assets/brand) with the website's wordmark (Archivo, bold, 112 % wide),
 * the letters turned into outlines so the SVGs look the same without the font installed. Written to logo/.
 *
 * Posters: one HTML page per poster, printed by headless Chrome to an A3 PDF for print and to PNGs for social
 * media (1080×1350 feed, 1080×1920 story). Written to posters/.
 *
 * Every claim on a poster is one the website and store listing already make. No DSB slogans, nothing that looks
 * affiliated with DSB, no partner names. Check RELEASE_LINE and URL before anything is printed.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { create } from 'fontkitten';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const fonts = join(root, 'node_modules', '@fontsource-variable');
const shots = join(root, 'apps', 'web', 'src', 'assets', 'skjermbilder');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/** The launch date is planned, not certain (go/no-go 19 October). Change it here if it moves. */
const RELEASE_LINE = 'Gratis på iPhone og Android fra 26. oktober';
/** The domain we own today. If egenberedskapsappen.no (with the s) becomes the main one, change it here. */
const URL = 'egenberedskapappen.no';

/** From apps/mobile/src/constants/theme.ts. */
const C = {
  navy: '#0B2B4A',
  track: '#23517C',
  bar: '#5FA3F0',
  limit: '#F1B95B',
  muted: '#BBD6F2',
  caption: '#A9C5DD',
  link: '#8EC2FF',
  page: '#F4F7FA',
  body: '#33506A',
  accent: '#0E5FC0',
  warmPage: '#FFF1D6',
  warmText: '#8A5300',
  white: '#FFFFFF',
};

// ---------------------------------------------------------------- Logo

/**
 * Archivo at 700 weight and 112 % width, cut from the variable font with fontTools (fontkitten can't instance
 * WOFF2):  fonttools varLib.instancer archivo-latin-wdth-normal.woff2 wght=700 wdth=112 --static
 * SIL Open Font License, Copyright 2020 The Archivo Project Authors.
 */
const archivo = create(readFileSync(join(here, 'fonts', 'archivo-bold-112.ttf')));
const unitsPerEm = archivo.unitsPerEm;

/** The word as one outlined path, baseline at y = 0, `size` px per em. Returns the path and its width. */
const word = (text, size, tracking = -0.005) => {
  const scale = size / unitsPerEm;
  let x = 0;
  const parts = [];
  for (const glyph of archivo.glyphsForString(text)) {
    parts.push(`<path transform="translate(${(x * scale).toFixed(2)} 0) scale(${scale} ${-scale})" d="${glyph.path.toSVG()}"/>`);
    x += glyph.advanceWidth + tracking * unitsPerEm;
  }
  return { paths: parts.join(''), width: (x - tracking * unitsPerEm) * scale };
};

/** The app icon's mark, `s` px square: a navy rounded square, a white tile and the days bar. */
const mark = (s, { plate = C.navy, tile = C.white, track = C.track, bar = C.bar } = {}) => {
  const u = s / 64;
  return `<g transform="scale(${u})">
    <rect width="64" height="64" rx="14" fill="${plate}"/>
    <rect x="14" y="18" width="14" height="14" rx="3" fill="${tile}"/>
    <rect x="14" y="38" width="36" height="8" rx="4" fill="${track}"/>
    <rect x="14" y="38" width="22" height="8" rx="4" fill="${bar}"/>
  </g>`;
};

const themes = {
  // On white or the light page.
  light: { text: C.navy, mark: {} },
  // On navy: the plate lifts a step so the mark doesn't disappear into the background.
  dark: { text: C.white, mark: { plate: '#123A62', track: '#2C5F8F' }, background: C.navy },
  // One colour, for print that can't do colour (stamps, embroidery, newspaper).
  black: { text: '#000000', mark: { plate: '#000000', tile: '#FFFFFF', track: '#5A5A5A', bar: '#FFFFFF' } },
};

const svgDoc = (w, h, body, background) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
  (background ? `<rect width="${w}" height="${h}" fill="${background}"/>` : '') +
  body +
  '</svg>\n';

/** Mark beside the word: the default logo. Padding is clear space of a quarter of the mark. */
const horizontal = (theme, { pad = 24 } = {}) => {
  const s = 96;
  const w = word('Egenberedskapsappen', 46);
  const gap = 26;
  const width = pad * 2 + s + gap + w.width;
  const height = pad * 2 + s;
  // Cap height of Archivo is about 0.7 em: centre the capitals on the mark.
  const baseline = pad + s / 2 + 46 * 0.35;
  return svgDoc(
    Math.ceil(width),
    height,
    `<g transform="translate(${pad} ${pad})">${mark(s, theme.mark)}</g>` +
      `<g fill="${theme.text}" transform="translate(${pad + s + gap} ${baseline})">${w.paths}</g>`,
    theme.background,
  );
};

/** Mark over the word, for square spaces (profile pictures, stands, the top of a poster). */
const stacked = (theme, { pad = 40 } = {}) => {
  const s = 200;
  const w = word('Egenberedskapsappen', 52);
  const width = Math.ceil(Math.max(s, w.width) + pad * 2);
  const height = pad * 2 + s + 36 + 52 * 0.72;
  return svgDoc(
    width,
    Math.ceil(height),
    `<g transform="translate(${(width - s) / 2} ${pad})">${mark(s, theme.mark)}</g>` +
      `<g fill="${theme.text}" transform="translate(${(width - w.width) / 2} ${pad + s + 36 + 52 * 0.72})">${w.paths}</g>`,
    theme.background,
  );
};

// ---------------------------------------------------------------- Alternative marks (drafts to compare)

/** A house whose floor is the days bar: the household, and how many days it manages. */
const markHus = (s, { plate = C.navy, house = C.white, track = '#C9DDF2', bar = C.accent } = {}) => `
  <g transform="scale(${s / 64})">
    <rect width="64" height="64" rx="14" fill="${plate}"/>
    <path d="M32 12.5 L51 28 Q52 29 52 30.5 V48 Q52 51 49 51 H15 Q12 51 12 48 V30.5 Q12 29 13 28 Z" fill="${house}" stroke="${house}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="18.5" y="38" width="27" height="6" rx="3" fill="${track}"/>
    <rect x="18.5" y="38" width="15.4" height="6" rx="3" fill="${bar}"/>
  </g>`;

/** Seven segments in a ring, one per day of DSB's week, four of them lit: the part-filled ring from Lager. */
const markRing = (s, { plate = C.navy, lit = C.white, dim = C.track, dot = C.bar, litCount = 4 } = {}) => {
  const r = 17;
  // Square ends: round dashes in a ring read as a loading spinner.
  const gap = 0.2;
  const arcs = Array.from({ length: 7 }, (_, i) => {
    const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / 7 + gap / 2;
    const a1 = a0 + (2 * Math.PI) / 7 - gap;
    const p = (a) => `${(32 + r * Math.cos(a)).toFixed(2)} ${(32 + r * Math.sin(a)).toFixed(2)}`;
    return `<path d="M${p(a0)} A${r} ${r} 0 0 1 ${p(a1)}" fill="none" stroke="${i < litCount ? lit : dim}" stroke-width="8"/>`;
  }).join('');
  return `<g transform="scale(${s / 64})"><rect width="64" height="64" rx="14" fill="${plate}"/>${arcs}<circle cx="32" cy="32" r="5" fill="${dot}"/></g>`;
};

/** A shield, on the 64 grid: safety. Kept plain so it doesn't read as a coat of arms or an official emblem. */
const SHIELD = 'M32 9.5 L49.5 15.5 Q52 16.4 52 19 V31 C52 42.5 43.5 50 32 54.5 C20.5 50 12 42.5 12 31 V19 Q12 16.4 14.5 15.5 Z';

/** Shield with the days bar across it: the current mark's bar, protected. */
const markSkjold = (s, { plate = C.navy, shield = C.white, track = '#C9DDF2', bar = C.accent } = {}) => `
  <g transform="scale(${s / 64})">
    <rect width="64" height="64" rx="14" fill="${plate}"/>
    <path d="${SHIELD}" fill="${shield}"/>
    <rect x="20" y="29" width="24" height="6.5" rx="3.25" fill="${track}"/>
    <rect x="20" y="29" width="13.7" height="6.5" rx="3.25" fill="${bar}"/>
  </g>`;

/** Shield with a house cut out of it: a safe home. */
const markSkjoldHus = (s, { plate = C.navy, shield = C.white, bar = C.bar } = {}) => `
  <g transform="scale(${s / 64})">
    <rect width="64" height="64" rx="14" fill="${plate}"/>
    <path d="${SHIELD}" fill="${shield}"/>
    <path d="M32 20 L42.5 28.2 V40.5 Q42.5 42 41 42 H23 Q21.5 42 21.5 40.5 V28.2 Z" fill="${plate}" stroke="${plate}" stroke-width="1.5" stroke-linejoin="round"/>
    <rect x="25.5" y="35" width="13" height="3.6" rx="1.8" fill="${bar}"/>
  </g>`;

/** Half the shield filled: the household partly prepared. Simplest, and the most like a generic security app. */
const markSkjoldHalv = (s, { plate = C.navy, shield = C.white, fill = C.bar } = {}) => `
  <g transform="scale(${s / 64})">
    <rect width="64" height="64" rx="14" fill="${plate}"/>
    <defs><clipPath id="halv"><path d="${SHIELD}"/></clipPath></defs>
    <path d="${SHIELD}" fill="${shield}"/>
    <rect x="0" y="34" width="64" height="30" fill="${fill}" clip-path="url(#halv)"/>
  </g>`;

/** Mark beside the word, as `horizontal`, for any mark. `split` sets «appen» in the accent colour. */
const lockup = (markFn, { text = C.navy, accent = C.accent, background, split = false, pad = 24 } = {}) => {
  const s = 96;
  const size = 46;
  const gap = 26;
  const first = word(split ? 'Egenberedskaps' : 'Egenberedskapsappen', size);
  const second = split ? word('appen', size) : null;
  const width = pad * 2 + s + gap + first.width + (second ? second.width : 0);
  const baseline = pad + s / 2 + size * 0.35;
  const x = pad + s + gap;
  return svgDoc(
    Math.ceil(width),
    pad * 2 + s,
    `<g transform="translate(${pad} ${pad})">${markFn(s)}</g>` +
      `<g fill="${text}" transform="translate(${x} ${baseline})">${first.paths}</g>` +
      (second ? `<g fill="${accent}" transform="translate(${x + first.width} ${baseline})">${second.paths}</g>` : ''),
    background,
  );
};

const altDir = join(here, 'logo', 'alternativer');
mkdirSync(altDir, { recursive: true });
const alternatives = {
  'hus-light.svg': lockup((s) => markHus(s)),
  'hus-dark.svg': lockup((s) => markHus(s, { plate: '#123A62', track: '#2C5F8F', bar: C.bar }), { text: C.white, background: C.navy }),
  'hus-icon.svg': svgDoc(64, 64, markHus(64)),
  'ring-light.svg': lockup((s) => markRing(s), { split: true }),
  'ring-dark.svg': lockup((s) => markRing(s, { plate: '#123A62', dim: '#2C5F8F' }), { text: C.white, accent: C.bar, split: true, background: C.navy }),
  'ring-icon.svg': svgDoc(64, 64, markRing(64)),
  'skjold-light.svg': lockup((s) => markSkjold(s)),
  'skjold-dark.svg': lockup((s) => markSkjold(s, { plate: '#123A62', track: '#2C5F8F', bar: C.bar }), { text: C.white, background: C.navy }),
  'skjold-icon.svg': svgDoc(64, 64, markSkjold(64)),
  'skjold-hus-light.svg': lockup((s) => markSkjoldHus(s)),
  'skjold-hus-dark.svg': lockup((s) => markSkjoldHus(s, { plate: '#123A62' }), { text: C.white, background: C.navy }),
  'skjold-hus-icon.svg': svgDoc(64, 64, markSkjoldHus(64)),
  'skjold-halv-light.svg': lockup((s) => markSkjoldHalv(s)),
  'skjold-halv-dark.svg': lockup((s) => markSkjoldHalv(s, { plate: '#123A62' }), { text: C.white, background: C.navy }),
  'skjold-halv-icon.svg': svgDoc(64, 64, markSkjoldHalv(64)),
};
for (const [name, svg] of Object.entries(alternatives)) {
  writeFileSync(join(altDir, name), svg);
  await sharp(Buffer.from(svg), { density: 72 * 4 }).png().toFile(join(altDir, name.replace('.svg', '.png')));
}

const logoDir = join(here, 'logo');
mkdirSync(logoDir, { recursive: true });
const logos = {};
for (const [name, theme] of Object.entries(themes)) {
  logos[`logo-${name}.svg`] = horizontal(theme);
  logos[`logo-stacked-${name}.svg`] = stacked(theme);
}
logos['mark.svg'] = svgDoc(64, 64, mark(64));
for (const [name, svg] of Object.entries(logos)) {
  writeFileSync(join(logoDir, name), svg);
  const png = name.replace('.svg', '.png');
  await sharp(Buffer.from(svg), { density: 72 * 4 }).png().toFile(join(logoDir, png));
}
// A square profile picture for social media: the mark on navy, nothing else.
await sharp(Buffer.from(svgDoc(1024, 1024, `<g transform="translate(112 112)">${mark(800)}</g>`, C.navy)))
  .png()
  .toFile(join(logoDir, 'profile-1024.png'));

// ---------------------------------------------------------------- Posters

const fontFace = `
@font-face { font-family: 'Archivo'; font-weight: 100 900; font-stretch: 62% 125%;
  src: url('${pathToFileURL(join(fonts, 'archivo', 'files', 'archivo-latin-wdth-normal.woff2'))}') format('woff2'); }
@font-face { font-family: 'Source Sans 3'; font-weight: 200 900;
  src: url('${pathToFileURL(join(fonts, 'source-sans-3', 'files', 'source-sans-3-latin-wght-normal.woff2'))}') format('woff2'); }`;

const inlineLogo = (theme) => horizontal(themes[theme], { pad: 0 }).replace('<svg ', '<svg class="logo" ');
const shot = (name) => pathToFileURL(join(shots, `${name}.webp`)).href;

/** The days card from Oversikt, drawn in HTML so it stays sharp at A3. Figures are the website's demo household. */
const daysCard = `
<div class="card">
  <p class="card-label">Uten strøm og vann klarer husstanden seg i</p>
  <p class="card-days"><b>4</b> døgn</p>
  <p class="card-caption">Ut fra det dere har lagt inn</p>
  ${[
    ['Vann', '7 døgn', 1, false],
    ['Mat', '4 døgn', 4 / 7, true],
    ['Varme', '7+ døgn', 1, false],
  ]
    .map(
      ([label, value, part, limit]) => `
  <div class="row"><span>${label}</span><span>${value}</span></div>
  <div class="track"><div class="fill${limit ? ' limit' : ''}" style="width:${part * 100}%"></div></div>`,
    )
    .join('')}
  <p class="card-link">Kjøp mat for 3 døgn til</p>
</div>`;

const footer = (theme) => `
<footer>
  ${inlineLogo(theme)}
  <div class="footer-text">
    <p class="release">${RELEASE_LINE}</p>
    <p class="url">${URL}</p>
  </div>
</footer>`;

const posters = {
  // The question the website opens with, and the answer the app gives.
  dogn: {
    theme: 'dark',
    body: `
<main class="split">
  <div class="copy">
    <h1>Hvor lenge klarer dere dere uten strøm og vann?</h1>
    <p class="lead">Appen regner ut hvor mange døgn husstanden klarer seg selv, og hva som mangler.</p>
    <p class="points">Gratis · Uten konto · Virker uten nett</p>
  </div>
  <div class="visual">${daysCard}</div>
</main>`,
  },
  // Emergency info works with no network: the promise the app keeps for every user.
  nodinfo: {
    theme: 'light',
    body: `
<main class="split">
  <div class="copy">
    <h1>Ingen dekning? Nødinfoen ligger på telefonen.</h1>
    <p class="lead">Nødnumre, nødkontakter, møtested og viktige dokumenter, lagret på telefonen og klare uten nett.</p>
    <p class="points">Gratis · Uten konto · Ingen reklame</p>
  </div>
  <div class="visual"><figure class="phone"><img src="${shot('nodinfo')}" alt=""></figure></div>
</main>`,
  },
  // Expiry reminders: the reason to keep the app after the first day.
  utlop: {
    theme: 'warm',
    body: `
<main class="split">
  <div class="copy">
    <h1>Vannet går ut på dato. Appen sier fra.</h1>
    <p class="lead">Legg inn utløpsdatoen, så får dere beskjed en uke før noe går ut, og en påminnelse om å ta beredskapssjekken.</p>
    <p class="points">Gratis · Uten konto · Alt blir på telefonen</p>
  </div>
  <div class="visual"><figure class="phone"><img src="${shot('lager')}" alt=""></figure></div>
</main>`,
  },
};

const palettes = {
  dark: { bg: C.navy, text: C.white, lead: C.muted, points: C.link, logo: 'dark' },
  light: { bg: C.page, text: C.navy, lead: C.body, points: C.accent, logo: 'light' },
  warm: { bg: C.warmPage, text: C.navy, lead: '#5A4520', points: C.warmText, logo: 'light' },
};

/** One poster page at w×h CSS px. `u` is 1 % of the short side, so type scales with the format. */
const page = (poster, w, h) => {
  const p = palettes[poster.theme];
  const tall = h / w > 1.6;
  // 4:5 feed posts are short: the headline and the days card shrink so the card fits.
  const short = h / w < 1.35;
  return `<!doctype html><html lang="nb"><head><meta charset="utf-8"><style>
${fontFace}
@page { size: ${w}px ${h}px; margin: 0; }
* { box-sizing: border-box; margin: 0; }
html, body { width: ${w}px; height: ${h}px; }
body {
  --u: ${w / 100}px;
  --c: calc(var(--u) * ${short ? 0.72 : 1});
  background: ${p.bg}; color: ${p.text};
  font-family: 'Source Sans 3', sans-serif;
  display: flex; flex-direction: column;
  padding: calc(var(--u) * 7) calc(var(--u) * 7) calc(var(--u) * 6);
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.split { flex: 1; display: flex; flex-direction: column; gap: calc(var(--u) * ${tall ? 7 : 5}); min-height: 0; }
.copy { display: flex; flex-direction: column; gap: calc(var(--u) * 3); }
h1 {
  font-family: 'Archivo', sans-serif; font-weight: 800; font-stretch: 112%;
  font-size: calc(var(--u) * ${tall ? 9.6 : short ? 7.4 : 8.4}); line-height: 1.02; letter-spacing: -0.02em;
  text-wrap: balance;
}
.lead { font-size: calc(var(--u) * 3.5); line-height: 1.3; color: ${p.lead}; max-width: 30em; text-wrap: pretty; }
.points { font-size: calc(var(--u) * 2.9); font-weight: 700; color: ${p.points}; }
.visual { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; container-type: size; }
.phone {
  /* Bezel and corners follow the phone's own height (--h), not the poster, so a small phone keeps an iPhone's
     proportions: the screen's corners come to about 12 % of its width and never cut into the status bar.
     content-box, so the screen inside the bezel keeps the screenshot's own shape and nothing is cropped. */
  --h: min(100cqh, calc(var(--u) * 140));
  --bezel: calc(var(--h) * 0.012);
  box-sizing: content-box; height: calc(var(--h) - 2 * var(--bezel));
  aspect-ratio: 960 / 2078;
  background: #f4f7fa; border: var(--bezel) solid #0d1620; border-radius: calc(var(--h) * 0.068);
  box-shadow: 0 0 0 1px #2b3a48, 0 calc(var(--u) * 4) calc(var(--u) * 8) calc(var(--u) * -3) rgb(11 43 74 / 0.45);
  overflow: hidden;
}
.phone img { display: block; width: 100%; height: 100%; }
.card {
  width: 100%; max-width: calc(var(--c) * 72);
  background: #123A62; border-radius: calc(var(--c) * 4.4);
  padding: calc(var(--c) * 4.5) calc(var(--c) * 5) calc(var(--c) * 4);
  color: #fff; font-size: calc(var(--c) * 2.6);
}
.card-label { color: ${C.muted}; }
.card-days { font-family: 'Archivo', sans-serif; font-weight: 600; font-size: calc(var(--c) * 3.6); margin-top: calc(var(--c) * 0.5); }
.card-days b { font-size: calc(var(--c) * 11); font-weight: 800; line-height: 1; margin-right: calc(var(--c) * 1); }
.card-caption { color: ${C.caption}; font-size: calc(var(--c) * 2.5); margin: calc(var(--c) * 0.5) 0 calc(var(--c) * 1.5); }
.row { display: flex; justify-content: space-between; font-weight: 700; margin-top: calc(var(--c) * 2); }
.track { height: calc(var(--c) * 1); background: ${C.track}; border-radius: 99px; margin-top: calc(var(--c) * 0.9); overflow: hidden; }
.fill { height: 100%; background: ${C.bar}; border-radius: 99px; }
.fill.limit { background: ${C.limit}; }
.card-link {
  margin-top: calc(var(--c) * 3.5); padding-top: calc(var(--c) * 2.8); border-top: 1px solid #2C5F8F;
  color: ${C.link}; font-weight: 700; font-size: calc(var(--c) * 2.8);
}
footer {
  display: flex; align-items: center; justify-content: space-between; gap: calc(var(--u) * 4);
  margin-top: calc(var(--u) * 6); padding-top: calc(var(--u) * 4);
  border-top: 2px solid color-mix(in srgb, ${p.text} 18%, transparent);
}
.logo { height: calc(var(--u) * 4.8); width: auto; flex: none; }
.footer-text { text-align: right; }
.release { white-space: nowrap; font-weight: 700; font-size: calc(var(--u) * 2.2); }
.url { font-size: calc(var(--u) * 2.2); color: ${p.lead}; }
</style></head><body>${poster.body}${footer(p.logo)}</body></html>`;
};

const formats = {
  // A3 at 96 px per inch; the PDF is vector, so it prints sharp at any A size (A4, A2, A1 have the same ratio).
  a3: { w: 1123, h: 1587, pdf: true },
  feed: { w: 1080, h: 1350 },
  story: { w: 1080, h: 1920 },
};

const posterDir = join(here, 'posters');
mkdirSync(posterDir, { recursive: true });
const work = join(tmpdir(), 'egenberedskap-posters');
mkdirSync(work, { recursive: true });
const run = (args) => execFileSync(chrome, ['--headless=new', '--hide-scrollbars', '--allow-file-access-from-files', ...args], { stdio: 'pipe' });

for (const [name, poster] of Object.entries(posters)) {
  for (const [format, { w, h, pdf }] of Object.entries(formats)) {
    const html = join(work, `${name}-${format}.html`);
    writeFileSync(html, page(poster, w, h));
    const url = pathToFileURL(html).href;
    if (pdf) {
      run(['--no-pdf-header-footer', `--print-to-pdf=${join(posterDir, `${name}-a3.pdf`)}`, url]);
    }
    // Twice the pixels for the A3 preview; social formats are posted at their own size.
    const scale = pdf ? 2 : 1;
    run([`--window-size=${w},${h}`, `--force-device-scale-factor=${scale}`, '--virtual-time-budget=3000', `--screenshot=${join(posterDir, `${name}-${format}.png`)}`, url]);
  }
}
rmSync(work, { recursive: true, force: true });
console.log('Wrote', logoDir, 'and', posterDir);
