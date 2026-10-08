/**
 * Renders the app icon, Android adaptive icon, splash image and the iOS 26 Icon Composer
 * layers from one mark: the website favicon (apps/web/public/favicon.svg) drawn on a
 * 1024 grid. A white tile and the days bar from the navy preparedness card on Oversikt.
 *
 * Run from the repo root after changing the mark:
 *   node apps/mobile/assets/brand/render-icons.mjs
 *
 * Uses sharp, which the workspace already has through Expo's tooling.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const brand = dirname(fileURLToPath(import.meta.url));
const images = join(brand, '..', 'images');
const iconComposer = join(brand, '..', 'app.icon');

/** From apps/mobile/src/constants/theme.ts (Colors.hero). */
const navy = '#0B2B4A';
const track = '#23517C';
const bar = '#5FA3F0';
const white = '#FFFFFF';

/** The favicon's 64-unit shapes times 16, centred on 512,512. */
const tile = (fill) => `<rect x="224" y="288" width="224" height="224" rx="48" fill="${fill}"/>`;
const barTrack = (fill, opacity = 1) =>
  `<rect x="224" y="608" width="576" height="128" rx="64" fill="${fill}" fill-opacity="${opacity}"/>`;
const barFill = (fill) => `<rect x="224" y="608" width="352" height="128" rx="64" fill="${fill}"/>`;

const svg = (body, { background, scale = 1 } = {}) => {
  const bg = background ? `<rect width="1024" height="1024" fill="${background}"/>` : '';
  const t = scale === 1 ? '' : ` transform="translate(512 512) scale(${scale}) translate(-512 -512)"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${bg}<g${t}>${body}</g></svg>\n`;
};

const mark = tile(white) + barTrack(track) + barFill(bar);

/**
 * Android's adaptive icon shows only a circle of 66 of its 108 dp, so the mark is scaled to
 * fit inside it (half-diagonal 365 × 0.8 = 292 < 313 px).
 */
const androidScale = 0.8;

const sources = {
  'icon.svg': svg(mark, { background: navy }),
  'android-icon-foreground.svg': svg(mark, { scale: androidScale }),
  // Themed icons use only alpha: the track stays faint so the bar still reads as a bar.
  'android-icon-monochrome.svg': svg(tile(white) + barTrack(white, 0.35) + barFill(white), {
    scale: androidScale,
  }),
  'splash-icon.svg': svg(mark, { scale: androidScale }),
};

for (const [name, content] of Object.entries(sources)) writeFileSync(join(brand, name), content);

const png = (source, out, { flatten = false } = {}) => {
  let image = sharp(Buffer.from(sources[source])).resize(1024, 1024);
  if (flatten) image = image.flatten({ background: navy }).removeAlpha();
  return image.png().toFile(join(images, out));
};

await Promise.all([
  // App Store and iOS want a full square with no transparency; the OS rounds the corners.
  png('icon.svg', 'icon.png', { flatten: true }),
  png('android-icon-foreground.svg', 'android-icon-foreground.png'),
  png('android-icon-monochrome.svg', 'android-icon-monochrome.png'),
  png('splash-icon.svg', 'splash-icon.png'),
]);

/**
 * The iOS 26 icon (Icon Composer format): a solid navy fill and the mark as two layers, so
 * the system can give the tile and the bar their own glass and depth, and make the dark and
 * tinted variants itself.
 */
const hex = (c) => [1, 3, 5].map((i) => (parseInt(c.slice(i, i + 2), 16) / 255).toFixed(5));
mkdirSync(join(iconComposer, 'Assets'), { recursive: true });
writeFileSync(join(iconComposer, 'Assets', 'tile.svg'), svg(tile(white)));
writeFileSync(join(iconComposer, 'Assets', 'bar.svg'), svg(barTrack(track) + barFill(bar)));
writeFileSync(
  join(iconComposer, 'icon.json'),
  JSON.stringify(
    {
      fill: { solid: `srgb:${hex(navy).join(',')},1.00000` },
      groups: [
        {
          layers: [
            { 'image-name': 'tile.svg', name: 'tile' },
            { 'image-name': 'bar.svg', name: 'bar' },
          ],
          shadow: { kind: 'neutral', opacity: 0.5 },
          translucency: { enabled: false, value: 0.5 },
        },
      ],
      'supported-platforms': { squares: 'shared' },
    },
    null,
    2,
  ) + '\n',
);

console.log('Rendered icons into', images, 'and', iconComposer);
