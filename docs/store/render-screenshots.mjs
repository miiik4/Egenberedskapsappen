/**
 * Composes the Google Play phone screenshots: a Norwegian headline over the app screen, 1080×1920.
 *
 *   node docs/store/render-screenshots.mjs
 *
 * Sources in skjermbilder/kilde/ are raw captures from the OnePlus 6 with the demo household (1080×2280, here
 * scaled to 1920 high and padded with navy to 9:16, the most Play accepts). The script trims the padding, crops
 * the Android status bar and the system navigation bar, and prints each page with headless Chrome to
 * skjermbilder/<n>-<name>.png. Fonts come from the website's packages, as for the posters in docs/marketing.
 *
 * Every headline is a claim the listing (listing.md) already makes. No DSB slogans, no partner names.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const fonts = join(root, 'node_modules', '@fontsource-variable');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const source = join(here, 'skjermbilder', 'kilde');
const out = join(here, 'skjermbilder');

const W = 1080;
const H = 1920;
/** From apps/mobile/src/constants/theme.ts. */
const NAVY = '#0B2B4A';
const MUTED = '#BBD6F2';

/** Headline and one line under it, per source file (without the .png). */
const copy = {
  '1-oversikt': ['Hvor lenge klarer dere dere uten strøm og vann?', 'Appen regner det ut fra det dere har hjemme.'],
  '2-lager': ['Se hva som mangler, og hva som snart går ut', 'Sjekklisten blir en handleliste, med påminnelse før noe går ut.'],
  '3-nodinfo': ['Nødinfo som virker uten nett', 'Nødnumre, nødkontakter og møtested, alltid åpne.'],
  '4-beredskapssjekk': ['Fire raske spørsmål holder tallet riktig', 'Appen minner dere på beredskapssjekken.'],
  '5-eiendeler': ['Dokumenter innboet rom for rom', 'Med bilde, verdi og kvittering, lagret på telefonen.'],
  '6-guide': ['Korte guider for når det skjer', 'Strømbrudd om vinteren, vann, barn og dyr.'],
};

/** Pixels to cut from the top (status bar) and bottom (system navigation) of the 1920-high capture. */
const STATUS_BAR = 72;
const NAV_BAR = 92;

/** The navy padding, if any: columns where three sample rows are all navy. */
const screenBounds = async (file) => {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const [r, g, b] = [0x0b, 0x2b, 0x4a];
  const navy = (x, y) => {
    const i = (y * info.width + x) * info.channels;
    return Math.abs(data[i] - r) < 6 && Math.abs(data[i + 1] - g) < 6 && Math.abs(data[i + 2] - b) < 6;
  };
  const rows = [Math.round(info.height * 0.05), Math.round(info.height * 0.5), Math.round(info.height * 0.8)];
  let left = 0;
  while (left < info.width / 2 && rows.every((y) => navy(left, y))) left++;
  let right = info.width - 1;
  while (right > info.width / 2 && rows.every((y) => navy(right, y))) right--;
  return { left, width: right - left + 1, height: info.height };
};

const fontFace = `
@font-face { font-family: 'Archivo'; font-weight: 100 900; font-stretch: 62% 125%;
  src: url('${pathToFileURL(join(fonts, 'archivo', 'files', 'archivo-latin-wdth-normal.woff2'))}') format('woff2'); }
@font-face { font-family: 'Source Sans 3'; font-weight: 200 900;
  src: url('${pathToFileURL(join(fonts, 'source-sans-3', 'files', 'source-sans-3-latin-wght-normal.woff2'))}') format('woff2'); }`;

const page = (screen, ratio, [headline, lead]) => `<!doctype html><html lang="nb"><head><meta charset="utf-8"><style>
${fontFace}
* { box-sizing: border-box; margin: 0; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
body {
  background: ${NAVY}; color: #fff; font-family: 'Source Sans 3', sans-serif;
  display: flex; flex-direction: column; align-items: center; gap: 56px;
  padding: 104px 72px 0;
}
header { display: flex; flex-direction: column; gap: 22px; text-align: center; max-width: 936px; }
h1 {
  font-family: 'Archivo', sans-serif; font-weight: 800; font-stretch: 112%;
  font-size: 66px; line-height: 1.06; letter-spacing: -0.02em; text-wrap: balance;
}
p { font-size: 36px; line-height: 1.3; color: ${MUTED}; text-wrap: balance; }
.visual { flex: 1; min-height: 0; width: 100%; display: flex; justify-content: center; container-type: size; }
.phone {
  /* The screen keeps the capture's own shape; bezel and corners follow the phone's height. Bleeds off the bottom
     edge by the bottom bezel so the screen runs to the edge of the picture. */
  --h: 100cqh;
  --bezel: 16px;
  box-sizing: content-box; height: calc(var(--h) - var(--bezel));
  aspect-ratio: ${ratio};
  background: #f4f7fa; border: var(--bezel) solid #0d1620; border-bottom: 0;
  border-radius: 64px 64px 0 0;
  box-shadow: 0 0 0 1px #2b3a48, 0 -24px 80px -20px rgb(0 0 0 / 0.5);
  overflow: hidden;
}
.phone img { display: block; width: 100%; height: 100%; }
</style></head><body>
<header><h1>${headline}</h1><p>${lead}</p></header>
<div class="visual"><figure class="phone"><img src="${pathToFileURL(screen).href}" alt=""></figure></div>
</body></html>`;

const work = join(tmpdir(), 'egenberedskap-play-screenshots');
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
mkdirSync(out, { recursive: true });

for (const name of readdirSync(source).filter((f) => f.endsWith('.png')).sort()) {
  const base = name.replace('.png', '');
  if (!copy[base]) throw new Error(`No headline for ${name} in render-screenshots.mjs`);
  const file = join(source, name);
  const { left, width, height } = await screenBounds(file);
  const cropped = join(work, name);
  const h = height - STATUS_BAR - NAV_BAR;
  await sharp(file).extract({ left, top: STATUS_BAR, width, height: h }).png().toFile(cropped);
  const html = join(work, `${base}.html`);
  writeFileSync(html, page(cropped, `${width} / ${h}`, copy[base]));
  execFileSync(
    chrome,
    ['--headless=new', '--hide-scrollbars', '--allow-file-access-from-files', `--window-size=${W},${H}`,
      '--force-device-scale-factor=1', '--virtual-time-budget=3000', `--screenshot=${join(out, name)}`, pathToFileURL(html).href],
    { stdio: 'pipe' },
  );
  console.log('Wrote', join(out, name));
}
rmSync(work, { recursive: true, force: true });
