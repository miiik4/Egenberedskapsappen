/**
 * Composes the App Store creative assets: the product page header (21:9, 3840×1646) and the search results image
 * (3:2, 3840×2560). Navy, a short headline, and whole iPhone screens from the same simulator captures as the
 * screenshots (skjermbilder/ios/kilde/, demo household).
 *
 *   node docs/store/render-creative.mjs
 *
 * Apple's guidance (developer.apple.com/app-store/asset-best-practices): one clear idea, the focal point in the
 * centre so nothing important is clipped, no URLs, prices or copyright marks, and no transparency. Every headline
 * is a claim the listing (listing.md) already makes. Writes skjermbilder/ios/header.png and sokeresultat.png.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const fonts = join(root, 'node_modules', '@fontsource-variable');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const source = join(here, 'skjermbilder', 'ios', 'kilde');
const out = join(here, 'skjermbilder', 'ios');

/** From apps/mobile/src/constants/theme.ts. */
const NAVY = '#0B2B4A';
const MUTED = '#BBD6F2';
/** Rows of the capture under the status bar, painted over as in render-screenshots.mjs. */
const STATUS_BAR = 186;

const fontFace = `
@font-face { font-family: 'Archivo'; font-weight: 100 900; font-stretch: 62% 125%;
  src: url('${pathToFileURL(join(fonts, 'archivo', 'files', 'archivo-latin-wdth-normal.woff2'))}') format('woff2'); }
@font-face { font-family: 'Source Sans 3'; font-weight: 200 900;
  src: url('${pathToFileURL(join(fonts, 'source-sans-3', 'files', 'source-sans-3-latin-wght-normal.woff2'))}') format('woff2'); }`;

const work = join(tmpdir(), 'egenberedskap-creative');
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });

/** The capture with its status bar painted in the screen's own background, so the phone shows the app alone. */
const screen = async (name) => {
  const file = join(source, `${name}.png`);
  const { width } = await sharp(file).metadata();
  const { data } = await sharp(file).extract({ left: 4, top: 170, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
  const cover = await sharp({ create: { width, height: STATUS_BAR, channels: 3, background: { r: data[0], g: data[1], b: data[2] } } })
    .png()
    .toBuffer();
  const target = join(work, `${name}.png`);
  await sharp(file).composite([{ input: cover, left: 0, top: 0 }]).png().toFile(target);
  return pathToFileURL(target).href;
};

/**
 * One page, laid out in CSS pixels at a quarter of the output and scaled up by Chrome. The phones are whole
 * (all four corners), the middle one forward.
 */
const page = ({ width, height, phoneHeight, headline, lead, screens, gap }) => `<!doctype html><html lang="nb"><head>
<meta charset="utf-8"><style>
${fontFace}
* { box-sizing: border-box; margin: 0; }
html, body { width: ${width}px; height: ${height}px; overflow: hidden; }
body {
  background: radial-gradient(120% 90% at 50% 100%, #12406b 0%, ${NAVY} 60%); color: #fff;
  font-family: 'Source Sans 3', sans-serif;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: ${gap}px;
}
header { display: flex; flex-direction: column; gap: 6px; text-align: center; max-width: 80%; }
h1 { font-family: 'Archivo', sans-serif; font-weight: 800; font-stretch: 112%; font-size: 30px; line-height: 1.08;
  letter-spacing: -0.02em; text-wrap: balance; }
p { font-size: 15px; line-height: 1.3; color: ${MUTED}; text-wrap: balance; }
.phones { display: flex; align-items: center; justify-content: center; gap: ${Math.round(phoneHeight * 0.06)}px; }
.phone {
  height: ${phoneHeight}px; aspect-ratio: 1320 / 2868; padding: 4px; background: #0d1620; border-radius: 22px;
  box-shadow: 0 0 0 0.5px #2b3a48, 0 10px 30px -8px rgb(0 0 0 / 0.55);
}
.phone.side { height: ${Math.round(phoneHeight * 0.88)}px; }
.phone img { display: block; width: 100%; height: 100%; border-radius: 18px; }
</style></head><body>
${headline ? `<header><h1>${headline}</h1>${lead ? `<p>${lead}</p>` : ''}</header>` : ''}
<div class="phones">${screens.map((src, i) => `<figure class="phone${i === 1 ? '' : ' side'}"><img src="${src}" alt=""></figure>`).join('')}</div>
</body></html>`;

const SCALE = 4;
const render = async (name, [outW, outH], options) => {
  // Chrome needs whole CSS pixels (1646 / 4 isn't); the resize below brings it to the exact size.
  const [width, height] = [Math.round(outW / SCALE), Math.round(outH / SCALE)];
  const html = join(work, `${name}.html`);
  writeFileSync(html, page({ width, height, ...options }));
  const shot = join(work, `${name}-shot.png`);
  execFileSync(
    chrome,
    ['--headless=new', '--hide-scrollbars', '--allow-file-access-from-files', `--window-size=${width},${height}`,
      `--force-device-scale-factor=${SCALE}`, '--virtual-time-budget=3000', `--screenshot=${shot}`, pathToFileURL(html).href],
    { stdio: 'pipe' },
  );
  // Apple refuses images with an alpha channel.
  await sharp(shot).resize(outW, outH, { fit: 'cover', position: 'top' }).removeAlpha().png().toFile(join(out, `${name}.png`));
  console.log('Wrote', join(out, `${name}.png`));
};

const screens = [await screen('2-lager'), await screen('1-oversikt'), await screen('3-nodinfo')];

// Header, 21:9: wide and low, so the phones stand beside each other under one line.
await render('header', [3840, 1646], {
  phoneHeight: 300,
  gap: 22,
  headline: 'Hvor lenge klarer dere dere uten strøm og vann?',
  screens,
});

// Search results, 3:2: what the app is, at a glance.
await render('sokeresultat', [3840, 2560], {
  phoneHeight: 480,
  gap: 34,
  headline: 'Hvor lenge klarer dere dere uten strøm og vann?',
  lead: 'Appen regner det ut fra det dere har hjemme, og viser hva som mangler.',
  screens,
});

rmSync(work, { recursive: true, force: true });
