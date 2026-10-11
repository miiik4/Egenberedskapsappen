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

// More drafts: what the app holds (checklist, stockpile, water, equipment), alone and combined with home and shield.
const PALE = '#C9DDF2';
const plate = (body, fill = C.navy) => (s) =>
  `<g transform="scale(${s / 64})"><rect width="64" height="64" rx="14" fill="${fill}"/>${body}</g>`;
const tick = (x, y, size, stroke) =>
  `<path d="M${x} ${y} l${size * 0.35} ${size * 0.35} l${size * 0.65} ${-size * 0.7}" fill="none" stroke="${stroke}" stroke-width="${size * 0.28}" stroke-linecap="round" stroke-linejoin="round"/>`;
/** A checklist row at y: box (ticked or not) and a line of text. */
const row = (x, y, done, lineWidth, { box = 7 } = {}) =>
  (done
    ? `<rect x="${x}" y="${y}" width="${box}" height="${box}" rx="2" fill="${C.accent}"/>${tick(x + box * 0.22, y + box * 0.52, box * 0.58, C.white)}`
    : `<rect x="${x + 0.9}" y="${y + 0.9}" width="${box - 1.8}" height="${box - 1.8}" rx="1.6" fill="none" stroke="${PALE}" stroke-width="1.8"/>`) +
  `<rect x="${x + box + 3.5}" y="${y + box / 2 - 1.8}" width="${lineWidth}" height="3.6" rx="1.8" fill="${done ? PALE : '#E3ECF6'}"/>`;
const HOUSE = 'M32 12.5 L51 28 Q52 29 52 30.5 V48 Q52 51 49 51 H15 Q12 51 12 48 V30.5 Q12 29 13 28 Z';

const moreMarks = {
  // A clipboard with two of three ticked: the stockpile list and the Beredskapssjekk.
  sjekkliste: plate(`
    <rect x="15" y="12" width="34" height="42" rx="6" fill="${C.white}"/>
    <rect x="25" y="9" width="14" height="7" rx="3.5" fill="${C.bar}"/>
    ${row(20, 21, true, 17)}${row(20, 31, true, 13)}${row(20, 41, false, 15)}`),
  // A shelf at home: water, tins and a torch, the categories of the Lager tab.
  hylle: plate(`
    <rect x="11" y="31" width="42" height="3.5" rx="1.75" fill="${C.white}"/>
    <rect x="11" y="49" width="42" height="3.5" rx="1.75" fill="${C.white}"/>
    <path d="M15 31 V19 Q15 16 18 16 H22 L25 13 H27 V31 Z" fill="${C.bar}"/>
    <rect x="30" y="21" width="8" height="10" rx="1.5" fill="${C.white}"/>
    <rect x="40" y="21" width="8" height="10" rx="1.5" fill="${C.white}"/>
    <rect x="30" y="20" width="8" height="2.2" rx="1.1" fill="${PALE}"/>
    <rect x="40" y="20" width="8" height="2.2" rx="1.1" fill="${PALE}"/>
    <rect x="15" y="39" width="15" height="10" rx="2" fill="${C.white}"/>
    <rect x="20" y="42" width="5" height="2.2" rx="1.1" fill="${C.navy}"/>
    <rect x="34" y="41" width="15" height="5" rx="2.5" fill="${C.white}"/>
    <path d="M49 41 L53 38.5 V48.5 L49 46 Z" fill="${C.white}"/>`),
  // A storage box with the days bar on its front.
  kasse: plate(`
    <rect x="11" y="18" width="42" height="9" rx="3" fill="${C.white}"/>
    <path d="M14 29 H50 V46 Q50 50 46 50 H18 Q14 50 14 46 Z" fill="${C.white}"/>
    <rect x="27" y="21" width="10" height="3" rx="1.5" fill="${C.navy}"/>
    <rect x="20" y="36" width="24" height="6" rx="3" fill="${PALE}"/>
    <rect x="20" y="36" width="13.7" height="6" rx="3" fill="${C.accent}"/>`),
  // A water can, a little over half full: water is the first thing the app counts.
  kanne: plate(`
    <defs><clipPath id="kanne"><path d="M18 22 Q18 17 23 17 H41 Q46 17 46 22 V48 Q46 53 41 53 H23 Q18 53 18 48 Z"/></clipPath></defs>
    <path d="M24 17 V12.5 Q24 11 25.5 11 H31.5 Q33 11 33 12.5 V17" fill="none" stroke="${C.white}" stroke-width="3"/>
    <rect x="36" y="11" width="7" height="6" rx="1.5" fill="${C.white}"/>
    <path d="M18 22 Q18 17 23 17 H41 Q46 17 46 22 V48 Q46 53 41 53 H23 Q18 53 18 48 Z" fill="${C.white}"/>
    <rect x="0" y="33" width="64" height="30" fill="${C.bar}" clip-path="url(#kanne)"/>`),
  // A torch and its beam: equipment, and light when the power is gone.
  lykt: plate(`
    <path d="M30 25 L53 15 V49 L30 39 Z" fill="${C.bar}" opacity="0.45"/>
    <path d="M30 25 L53 15 V27 L30 30 Z" fill="${C.bar}" opacity="0.35"/>
    <rect x="11" y="27" width="14" height="10" rx="3" fill="${C.white}"/>
    <path d="M24 25 H29 Q31 25 31 27 V37 Q31 39 29 39 H24 Z" fill="${C.white}"/>
    <rect x="15" y="30" width="5" height="4" rx="1.5" fill="${C.accent}"/>`),
  // Combinations.
  'hus-sjekk': plate(`
    <path d="${HOUSE}" fill="${C.white}" stroke="${C.white}" stroke-width="3" stroke-linejoin="round"/>
    ${tick(23.5, 39, 17, C.accent)}`),
  'hus-hylle': plate(`
    <path d="${HOUSE}" fill="${C.white}" stroke="${C.white}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="17" y="37" width="30" height="2.6" rx="1.3" fill="${C.navy}"/>
    <path d="M20 37 V30 Q20 28 22 28 H23.5 L25.5 26 H27 V37 Z" fill="${C.accent}"/>
    <rect x="29.5" y="31" width="6" height="6" rx="1.2" fill="${C.bar}"/>
    <rect x="37.5" y="31" width="6" height="6" rx="1.2" fill="${C.bar}"/>
    <rect x="20" y="42.5" width="24" height="3.4" rx="1.7" fill="${PALE}"/>`),
  'skjold-sjekkliste': plate(`
    <path d="${SHIELD}" fill="${C.white}"/>
    ${row(20.5, 23, true, 16, { box: 6.5 })}${row(20.5, 32.5, true, 12, { box: 6.5 })}${row(23, 42, false, 8, { box: 6.5 })}`),
  'kasse-skjold': plate(`
    <path d="${SHIELD}" fill="${C.white}"/>
    <rect x="21" y="23" width="22" height="5" rx="1.8" fill="${C.navy}"/>
    <path d="M22.5 29.5 H41.5 V38.5 Q41.5 41 39 41 H25 Q22.5 41 22.5 38.5 Z" fill="${C.navy}"/>
    <rect x="29" y="33" width="6" height="2.6" rx="1.3" fill="${C.bar}"/>`),
};

// Drafts after Mikkel's references (2026-10-11): a document with a plus, a first-aid case, a storage box labelled
// with the days. The plus is never red: a red cross is a protected emblem.
const plus = (cx, cy, size, fill) => {
  const t = size * 0.34;
  return `<rect x="${cx - t / 2}" y="${cy - size / 2}" width="${t}" height="${size}" rx="${t * 0.22}" fill="${fill}"/>` +
    `<rect x="${cx - size / 2}" y="${cy - t / 2}" width="${size}" height="${t}" rx="${t * 0.22}" fill="${fill}"/>`;
};
/**
 * A storage box: an overhanging lid and a body that narrows towards the bottom, with a handle slot. No clips on
 * the lid, which made it read as a calendar. `front` draws on its face (about x 14–50, y 28–51).
 */
const crate = (front) => `
    <rect x="8.5" y="17" width="47" height="8" rx="2.5" fill="${C.white}"/>
    <path d="M11.5 26.5 H52.5 L50 49 Q49.7 52 46.7 52 H17.3 Q14.3 52 14 49 Z" fill="${C.white}"/>
    <rect x="27" y="20" width="10" height="2.6" rx="1.3" fill="${C.navy}"/>
    ${front}`;
const seven = (() => {
  const w = word('7', 15);
  return `<g fill="${C.white}" transform="translate(${25 - w.width / 2} 45.7)">${w.paths}</g>`;
})();

const referenceMarks = {
  // A document with rows, each with its own small sign, and a plus badge: the app's emergency info.
  dokument: plate(`
    <path d="M14 11 H36 L45 20 V51 Q45 53 43 53 H16 Q14 53 14 51 V13 Q14 11 16 11 Z" fill="${C.white}"/>
    <path d="M36 11 V18 Q36 20 38 20 H45 Z" fill="${PALE}"/>
    <rect x="19" y="21" width="6.5" height="6.5" rx="1.6" fill="${C.navy}"/>
    <path d="M22.25 22.4 L24.5 24.3 V26.3 H20 V24.3 Z" fill="${C.white}"/>
    <rect x="28.5" y="22.9" width="10" height="2.8" rx="1.4" fill="${PALE}"/>
    <rect x="19" y="30.5" width="6.5" height="6.5" rx="1.6" fill="${C.accent}"/>
    <path d="M22.25 31.7 Q24.4 34.2 24.4 35 A2.15 2.15 0 0 1 20.1 35 Q20.1 34.2 22.25 31.7 Z" fill="${C.white}"/>
    <rect x="28.5" y="32.4" width="12" height="2.8" rx="1.4" fill="${PALE}"/>
    <rect x="19" y="40" width="6.5" height="6.5" rx="1.6" fill="${C.navy}"/>
    <rect x="21.45" y="41.3" width="1.6" height="2.6" rx="0.8" fill="${C.white}"/>
    <circle cx="22.25" cy="45.1" r="0.85" fill="${C.white}"/>
    <circle cx="44.5" cy="44.5" r="11.5" fill="${C.accent}" stroke="${C.navy}" stroke-width="3"/>
    ${plus(44.5, 44.5, 12, C.white)}`),
  // A first-aid case with a blue plus.
  koffert: plate(`
    <path d="M25 22 V17.5 Q25 14.5 28 14.5 H36 Q39 14.5 39 17.5 V22" fill="none" stroke="${C.white}" stroke-width="3.5"/>
    <rect x="10" y="21" width="44" height="31" rx="5.5" fill="${C.white}"/>
    ${plus(32, 36.5, 19, C.accent)}`),
  // The case again, with the days bar under the plus: first aid and how long it lasts.
  'koffert-dager': plate(`
    <path d="M25 22 V17.5 Q25 14.5 28 14.5 H36 Q39 14.5 39 17.5 V22" fill="none" stroke="${C.white}" stroke-width="3.5"/>
    <rect x="10" y="21" width="44" height="31" rx="5.5" fill="${C.white}"/>
    ${plus(32, 33, 13, C.accent)}
    <rect x="20" y="43" width="24" height="4.5" rx="2.25" fill="${PALE}"/>
    <rect x="20" y="43" width="13.7" height="4.5" rx="2.25" fill="${C.bar}"/>`),
  // A storage box labelled with the seven days DSB recommends.
  'kasse-7': plate(crate(`
    <rect x="17" y="31.5" width="16" height="16.5" rx="2.2" fill="${C.navy}"/>
    ${seven}
    <rect x="37" y="34.5" width="10" height="2.8" rx="1.4" fill="${PALE}"/>
    <rect x="37" y="40.5" width="7" height="2.8" rx="1.4" fill="${PALE}"/>`)),
  // The box with a plus on its label.
  'kasse-pluss': plate(crate(`
    <rect x="23" y="31" width="18" height="17.5" rx="2.5" fill="${C.accent}"/>
    ${plus(32, 39.75, 11, C.white)}`)),
};

// Box variants (2026-10-11): Mikkel picked the box as the direction, but not kasse-7 as drawn.
/** A number set in the wordmark's font, centred on cx with its baseline at y. */
const digit = (text, size, cx, y, fill) => {
  const w = word(text, size);
  return `<g fill="${fill}" transform="translate(${cx - w.width / 2} ${y})">${w.paths}</g>`;
};
/** A box seen from the corner. `left` draws on the left face in flat coordinates (x 12–32, y 16–38). */
const isoBox = (left = '', { top = C.white, leftFace = '#EAF2FB', rightFace = '#B5CDE6', band = '#9BB9D8' } = {}) => `
    <path d="M32 11 L53 21.5 L32 32 L11 21.5 Z" fill="${top}"/>
    <path d="M11 21.5 L32 32 V54 L11 43.5 Z" fill="${leftFace}"/>
    <path d="M32 32 L53 21.5 V43.5 L32 54 Z" fill="${rightFace}"/>
    <path d="M11 25.5 L32 36 L53 25.5" fill="none" stroke="${band}" stroke-width="1.4"/>
    <g transform="matrix(1 0.5 0 1 0 0)">${left}</g>`;

const boxMarks = {
  // From the corner, like a real crate, with 7 on the label.
  '3d-7': plate(isoBox(`
    <rect x="15.5" y="21" width="13" height="13" rx="1.8" fill="${C.navy}"/>
    ${digit('7', 11, 22, 31.6, C.white)}`)),
  // From the corner, with the days bar along the side.
  '3d-dager': plate(isoBox(`
    <rect x="15" y="25" width="14" height="4.5" rx="2.25" fill="${PALE}"/>
    <rect x="15" y="25" width="8" height="4.5" rx="2.25" fill="${C.accent}"/>`)),
  // A cardboard box with water and a tin showing: supplies, ready.
  papp: plate(`
    <rect x="21" y="14" width="9" height="20" rx="2.2" fill="${C.bar}"/>
    <rect x="23.2" y="10.5" width="4.6" height="4.5" rx="1.2" fill="${C.bar}"/>
    <rect x="33" y="20" width="10" height="13" rx="1.8" fill="${C.white}"/>
    <rect x="33" y="19" width="10" height="2.4" rx="1.2" fill="${PALE}"/>
    <path d="M14 30 L6.5 22.5 H21 L26 30 Z" fill="${PALE}"/>
    <path d="M50 30 L57.5 22.5 H43 L38 30 Z" fill="${PALE}"/>
    <rect x="13" y="30" width="38" height="23" rx="2.5" fill="${C.white}"/>
    <rect x="19" y="39" width="26" height="5" rx="2.5" fill="${PALE}"/>
    <rect x="19" y="39" width="14.9" height="5" rx="2.5" fill="${C.accent}"/>`),
  // Two boxes stacked: a stockpile, built up over time.
  stabel: plate(`
    <rect x="19" y="12" width="26" height="5.5" rx="2" fill="${C.white}"/>
    <rect x="21" y="18.5" width="22" height="12.5" rx="2" fill="${C.white}"/>
    <rect x="28" y="22.5" width="8" height="2.6" rx="1.3" fill="${PALE}"/>
    <rect x="10" y="33" width="44" height="6.5" rx="2.2" fill="${C.white}"/>
    <rect x="12" y="40.5" width="40" height="12.5" rx="2.2" fill="${C.white}"/>
    <rect x="19" y="44.5" width="26" height="4.6" rx="2.3" fill="${PALE}"/>
    <rect x="19" y="44.5" width="14.9" height="4.6" rx="2.3" fill="${C.accent}"/>`),
  // The tapered box with a tick on its label: packed and checked.
  'kasse-sjekk': plate(crate(`
    <rect x="23" y="31" width="18" height="17.5" rx="2.5" fill="${C.accent}"/>
    ${tick(26.8, 40, 10.5, C.white)}`)),
  // A straight crate with corner ribs and the days bar as its label.
  ribber: plate(`
    <rect x="8.5" y="15.5" width="47" height="7.5" rx="2.5" fill="${C.white}"/>
    <rect x="11" y="24.5" width="42" height="28" rx="3" fill="${C.white}"/>
    <rect x="27" y="18" width="10" height="2.6" rx="1.3" fill="${C.navy}"/>
    <rect x="14.5" y="27.5" width="3" height="22" rx="1.5" fill="${PALE}"/>
    <rect x="46.5" y="27.5" width="3" height="22" rx="1.5" fill="${PALE}"/>
    <rect x="21.5" y="36" width="21" height="5" rx="2.5" fill="${PALE}"/>
    <rect x="21.5" y="36" width="12" height="5" rx="2.5" fill="${C.accent}"/>`),
  // Drawn in lines, with 7 in the bar colour: lighter, and works in one colour.
  linje: plate(`
    <rect x="10.5" y="17" width="43" height="7" rx="2.5" fill="none" stroke="${C.white}" stroke-width="3"/>
    <path d="M13.5 27.5 H50.5 L48.4 48 Q48.1 50.5 45.6 50.5 H18.4 Q15.9 50.5 15.6 48 Z" fill="none" stroke="${C.white}" stroke-width="3" stroke-linejoin="round"/>
    ${digit('7', 17, 32, 46, C.bar)}`),
  // The lid lifted, water and a tin inside.
  apen: plate(`
    <rect x="27" y="23" width="9" height="13" rx="2.2" fill="${C.bar}"/>
    <rect x="29.2" y="19.5" width="4.6" height="4.5" rx="1.2" fill="${C.bar}"/>
    <rect x="38.5" y="26" width="10" height="9" rx="1.8" fill="${C.white}"/>
    <!-- The lid hinged on the left edge, swung up out of the way. -->
    <g transform="rotate(-32 12 30)"><rect x="10" y="23.5" width="36" height="6.5" rx="2.5" fill="${C.white}"/></g>
    <path d="M11.5 30.5 H52.5 L50 49 Q49.7 52 46.7 52 H17.3 Q14.3 52 14 49 Z" fill="${C.white}"/>
    <rect x="20" y="38.5" width="24" height="5" rx="2.5" fill="${PALE}"/>
    <rect x="20" y="38.5" width="13.7" height="5" rx="2.5" fill="${C.accent}"/>`),
};

/**
 * The 3D box, refined (2026-10-11): seen from the front at an angle, so the 7 stands upright on a flat face; a lid
 * that overhangs, with a handle slot on its side, so it reads as a storage box rather than a parcel; three clearly
 * different face tones; and big enough to fill the square like the current mark.
 */
const markKasse = (s, { plate: plateFill = C.navy, label = C.navy } = {}) => {
  const front = C.white;
  const top = '#CFE0F2';
  const side = '#8DB2D8';
  const sideDark = '#6F9BC9';
  return plate(`
    <path d="M8 21.5 L18 13.5 H56 L46 21.5 Z" fill="${top}"/>
    <rect x="8" y="21.5" width="38" height="8" rx="1.6" fill="${front}"/>
    <path d="M46 21.5 L56 13.5 V21.5 L46 29.5 Z" fill="${sideDark}"/>
    <path d="M44 29.5 L54 21.5 V44.5 L44 52.5 Z" fill="${side}"/>
    <path d="M10 29.5 H44 V50.5 Q44 52.5 42 52.5 H12 Q10 52.5 10 50.5 Z" fill="${front}"/>
    <rect x="10" y="29.5" width="34" height="1.4" fill="${top}"/>
    <path d="M46.6 33.4 L51.4 29.6 V32.4 L46.6 36.2 Z" fill="${label}"/>
    <rect x="15" y="34" width="15" height="15" rx="2.2" fill="${label}"/>
    ${digit('7', 15.5, 22.5, 46.6, C.white)}
    <rect x="33.5" y="37.5" width="7" height="2.6" rx="1.3" fill="${PALE}"/>
    <rect x="33.5" y="42.5" width="5" height="2.6" rx="1.3" fill="${PALE}"/>`, plateFill)(s);
};

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
for (const [name, markFn] of Object.entries({
  ...moreMarks,
  ...referenceMarks,
  ...Object.fromEntries(Object.entries(boxMarks).map(([k, v]) => [`kasse-${k}`, v])),
})) {
  alternatives[`${name}-light.svg`] = lockup(markFn);
  alternatives[`${name}-icon.svg`] = svgDoc(64, 64, markFn(64));
}
for (const [name, svg] of Object.entries(alternatives)) {
  writeFileSync(join(altDir, name), svg);
  await sharp(Buffer.from(svg), { density: 72 * 4 }).png().toFile(join(altDir, name.replace('.svg', '.png')));
}

/** Marks on one sheet: large, at home-screen size, and with a label, for comparing. */
const sheet = async (marks, file) => {
  const cols = 5;
  const cellW = 260;
  const cellH = 250;
  const entries = Object.entries(marks);
  const cells = entries.map(([label, fn], i) => {
    const x = (i % cols) * cellW + 20;
    const y = Math.floor(i / cols) * cellH + 20;
    return `<g transform="translate(${x} ${y})">${fn(150)}</g><g transform="translate(${x + 165} ${y + 95})">${fn(55)}</g>` +
      `<text x="${x}" y="${y + 185}" font-family="Helvetica, Arial, sans-serif" font-size="20" font-weight="700" fill="${C.navy}">${label}</text>`;
  });
  const width = Math.min(entries.length, cols) * cellW + 20;
  const height = Math.ceil(entries.length / cols) * cellH + 10;
  // Inline clip paths repeat their ids at two sizes; the first of each wins, which is the same shape.
  await sharp(Buffer.from(svgDoc(width, height, cells.join(''), '#FFFFFF')), { density: 144 })
    .png()
    .toFile(join(altDir, file));
};
await sheet(
  {
    Dagens: mark, hus: markHus, ring: markRing, skjold: markSkjold, 'skjold-hus': markSkjoldHus,
    'skjold-halv': markSkjoldHalv, ...moreMarks, ...referenceMarks,
  },
  'alle-merker.png',
);
await sheet(referenceMarks, 'referanser.png');
// The 3D box with the wordmark, in the same layouts as the current logo, to compare (2026-10-11).
{
  const box = boxMarks['3d-7'];
  const boxDark = plate(isoBox(`
    <rect x="15.5" y="21" width="13" height="13" rx="1.8" fill="${C.navy}"/>
    ${digit('7', 11, 22, 31.6, C.white)}`), '#123A62');
  const stackedWith = (markFn, { text = C.navy, background, pad = 40 } = {}) => {
    const size = 200;
    const w = word('Egenberedskapsappen', 52);
    const width = Math.ceil(Math.max(size, w.width) + pad * 2);
    const baseline = pad + size + 36 + 52 * 0.72;
    return svgDoc(
      width,
      Math.ceil(baseline + pad),
      `<g transform="translate(${(width - size) / 2} ${pad})">${markFn(size)}</g>` +
        `<g fill="${text}" transform="translate(${(width - w.width) / 2} ${baseline})">${w.paths}</g>`,
      background,
    );
  };
  const versions = {
    'kasse-3d-7-dark.svg': lockup(boxDark, { text: C.white, background: C.navy }),
    'kasse-3d-7-stacked-light.svg': stackedWith(box),
    'kasse-3d-7-stacked-dark.svg': stackedWith(boxDark, { text: C.white, background: C.navy }),
    'kasse-ny-light.svg': lockup(markKasse),
    'kasse-ny-dark.svg': lockup((s) => markKasse(s, { plate: '#123A62' }), { text: C.white, background: C.navy }),
    'kasse-ny-stacked-light.svg': stackedWith(markKasse),
    'kasse-ny-stacked-dark.svg': stackedWith((s) => markKasse(s, { plate: '#123A62' }), { text: C.white, background: C.navy }),
    'kasse-ny-icon.svg': svgDoc(64, 64, markKasse(64)),
  };
  for (const [name, svg] of Object.entries(versions)) {
    writeFileSync(join(altDir, name), svg);
    await sharp(Buffer.from(svg), { density: 72 * 4 }).png().toFile(join(altDir, name.replace('.svg', '.png')));
  }
}
await sheet({ '3d-7 (forrige)': boxMarks['3d-7'], 'kasse (ny)': markKasse, Dagens: mark }, 'kasse-ny.png');
await sheet({ 'kasse-7 (forrige)': referenceMarks['kasse-7'], ...boxMarks }, 'kasser.png');

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

/** The footer logo. `posterMark` swaps in a draft mark for trial posters; null is the current logo. */
let posterMark = null;
const inlineLogo = (theme) =>
  (posterMark
    ? lockup(theme === 'dark' ? (s) => posterMark(s, { plate: '#123A62' }) : posterMark, {
        text: theme === 'dark' ? C.white : C.navy,
        pad: 0,
      })
    : horizontal(themes[theme], { pad: 0 })
  ).replace('<svg ', '<svg class="logo" ');
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
.hero-mark { align-items: center; }
.big-mark { height: min(100%, calc(var(--u) * 62)); width: auto; filter: drop-shadow(0 calc(var(--u) * 2) calc(var(--u) * 4) rgb(0 0 0 / 0.25)); }
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

const renderPoster = (name, poster, dir) => {
  mkdirSync(dir, { recursive: true });
  for (const [format, { w, h, pdf }] of Object.entries(formats)) {
    const html = join(work, `${name}-${format}.html`);
    writeFileSync(html, page(poster, w, h));
    const url = pathToFileURL(html).href;
    if (pdf) {
      run(['--no-pdf-header-footer', `--print-to-pdf=${join(dir, `${name}-a3.pdf`)}`, url]);
    }
    // Twice the pixels for the A3 preview; social formats are posted at their own size.
    const scale = pdf ? 2 : 1;
    run([`--window-size=${w},${h}`, `--force-device-scale-factor=${scale}`, '--virtual-time-budget=3000', `--screenshot=${join(dir, `${name}-${format}.png`)}`, url]);
  }
};
for (const [name, poster] of Object.entries(posters)) renderPoster(name, poster, posterDir);

// Trial: the posters with the box as the logo, in posters/med-kasse/ (2026-10-11).
posterMark = markKasse;
for (const [name, poster] of Object.entries(posters)) renderPoster(name, poster, join(posterDir, 'med-kasse'));
// A launch poster with the box as the picture. No figures in the words: they live in guidance.ts.
renderPoster(
  'lansering',
  {
    theme: 'dark',
    body: `
<main class="split">
  <div class="visual hero-mark">${svgDoc(64, 64, markKasse(64, { plate: '#123A62' })).replace('<svg ', '<svg class="big-mark" ')}</div>
  <div class="copy">
    <h1>Er husstanden klar hvis strømmen går?</h1>
    <p class="lead">Egenberedskapsappen regner ut hvor mange døgn dere klarer dere selv, viser hva som mangler, og sier fra før noe går ut på dato.</p>
    <p class="points">Gratis · Uten konto · Virker uten nett</p>
  </div>
</main>`,
  },
  join(posterDir, 'med-kasse'),
);
posterMark = null;
rmSync(work, { recursive: true, force: true });
console.log('Wrote', logoDir, 'and', posterDir);
