/**
 * Renders the app icon, Android adaptive icon, splash image, Android notification icon and the
 * iOS 26 Icon Composer layers from one mark: the website favicon (apps/web/public/favicon.svg) drawn on a
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
 * Android's small notification icon: only its alpha is drawn, so it's the white mark on
 * transparent, cropped close so it doesn't look tiny in the status bar. 96 px, as
 * expo-notifications asks for.
 */
const notificationSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="160 160 704 704">${tile(white)}${barTrack(white, 0.35)}${barFill(white)}</svg>`;
await sharp(Buffer.from(notificationSvg)).resize(96, 96).png().toFile(join(images, 'notification-icon.png'));

/**
 * Header button icons for Android, where toolbar buttons and menus need an image (iOS uses SF
 * Symbols or text). Material Symbols glyphs (Apache 2.0) on a 24 dp grid in 1x–3x, black on
 * transparent: the header tints them. Same format as plus.png and more.png.
 */
const toolbarGlyphs = {
  // Material Symbols «home»
  home: 'M240-200h120v-240h240v240h120v-360L480-740 240-560v360Zm-80 80v-480l320-240 320 240v480H520v-240h-80v240H160Zm320-350Z',
  // Material Symbols «edit»
  edit: 'M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z',
};
const toolbarIcons = join(brand, '..', 'icons');
await Promise.all(
  Object.entries(toolbarGlyphs).flatMap(([name, d]) =>
    [1, 2, 3].map((scale) => {
      const size = 24 * scale;
      const glyph = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 -960 960 960"><path d="${d}" fill="#000000"/></svg>`;
      const file = scale === 1 ? `${name}.png` : `${name}@${scale}x.png`;
      return sharp(Buffer.from(glyph)).resize(size, size).png().toFile(join(toolbarIcons, file));
    }),
  ),
);

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
