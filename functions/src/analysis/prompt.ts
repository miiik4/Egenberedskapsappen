import { normBox, type Box } from './crop.js';

/**
 * What the model is asked and how its answer is read. The wording, the categories and the
 * confidence floor are Idimy's, tuned on real recordings of homes and luggage.
 */

/** Same list as BELONGING_CATEGORIES in packages/core/src/belongings.ts; a test there keeps them the same. */
export const CATEGORIES = [
  'Elektronikk',
  'Møbler',
  'Hvitevarer',
  'Kjøkkenutstyr',
  'Klær',
  'Smykker',
  'Kunst',
  'Musikkinstrument',
  'Verktøy',
  'Sport og fritid',
  'Leker',
  'Annet',
] as const;

/** Things the model is less sure of than this are left out, so review only shows likely finds. */
export const CONFIDENCE_MIN = 0.6;
/** More than this in one room is a model gone wrong, not a room. */
export const MAX_ITEMS = 60;

export type Scene = 'home' | 'travel';

/** Deliberate photos, all used; or frames the phone took from a recording, the sharpest used. */
export type Source = 'photos' | 'video';

export const MAX_FRAMES: Record<Source, number> = { photos: 30, video: 60 };

/**
 * A suitcase is not a living room: the things are smaller and packed close, and a jacket is
 * worth listing on a trip where it wouldn't be at home. Told it's looking at a home, the model
 * hunts for furniture that isn't there and skips the clothes that are.
 */
const SCENES: Record<Scene, { intro: (n: number) => string; what: string }> = {
  home: {
    intro: (n) => `Du får ${n} stillbilder fra et hjem (bilde 0 først). Bygg en innbooversikt for forsikring.`,
    what:
      'List hver distinkte gjenstand av forsikringsmessig verdi (elektronikk, møbler, hvitevarer, instrumenter, kunst, smykker, verdifulle klær, verktøy osv.). Hopp over forbruksvarer og bagateller.',
  },
  travel: {
    intro: (n) =>
      `Du får ${n} stillbilder av bagasje som pakkes: en åpen koffert, en sekk, eller ting lagt utover (bilde 0 først). Bygg en liste over det som er med på reisen, for reiseforsikring.`,
    what:
      'List hver distinkte gjenstand som er verdt å ha dokumentert hvis bagasjen forsvinner: elektronikk, kamera, klær og sko av verdi, smykker, briller, sportsutstyr, vesker. Ta med plagg og sko selv om de er rimeligere enn du ville tatt med hjemme. Hopp over toalettsaker, undertøy, mat og emballasje.',
  },
};

export function analysisPrompt(scene: Scene, frames: number): string {
  const { intro, what } = SCENES[scene];
  return (
    `${intro(frames)} ${what} ` +
    'Slå sammen duplikater: samme fysiske objekt sett i flere bilder = én oppføring. Bruk norske navn; vær spesifikk (merke/modell) der du kan se det.\n' +
    `For hver gjenstand oppgi: name; category (nøyaktig en av: ${CATEGORIES.join(', ')}); estimatedValueNOK (grovt gjenanskaffelsesverdi, heltall); confidence (0–1); ` +
    `frame (heltall 0-${frames - 1}: bildet der HELE gjenstanden er størst, skarpest og tydeligst synlig); ` +
    'box ([ymin, xmin, ymax, xmax] normalisert 0–1000 i det valgte bildet, tett rundt nøyaktig hele gjenstanden og bare den).\n' +
    'Svar kun med JSON: {"items":[{"name","category","estimatedValueNOK","confidence","frame","box"}]}'
  );
}

export function verifyPrompt(count: number): string {
  return (
    `For hvert av de ${count} bildene: er den forventede gjenstanden synlig i bildet (helt eller delvis, alene eller sammen med andre ting)? ` +
    'Svar kun med JSON {"results":[{"i":<bildenr>,"ok":<bool>}]} for alle bildene. ' +
    'Sett ok=false BARE når bildet nesten bare viser tomt bord, vegg eller gulv, eller en helt annen type gjenstand.'
  );
}

/**
 * Without a fixed schema the model varied its format between runs (box as an object, frame as
 * a string), and strict reading then dropped every item without a word.
 */
export const ANALYSIS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          category: { type: 'STRING' },
          estimatedValueNOK: { type: 'NUMBER' },
          confidence: { type: 'NUMBER' },
          frame: { type: 'INTEGER' },
          box: { type: 'ARRAY', items: { type: 'NUMBER' } },
        },
        required: ['name', 'frame', 'box'],
      },
    },
  },
  required: ['items'],
};

export const VERIFY_SCHEMA = {
  type: 'OBJECT',
  properties: {
    results: {
      type: 'ARRAY',
      items: { type: 'OBJECT', properties: { i: { type: 'INTEGER' }, ok: { type: 'BOOLEAN' } }, required: ['i', 'ok'] },
    },
  },
  required: ['results'],
};

/** One thing found, as it goes back to the phone. `frame` is the photo's number as the phone sent it. */
export type FoundItem = {
  name: string;
  category: (typeof CATEGORIES)[number];
  valueKr?: number;
  frame?: number;
  box?: Box;
};

/**
 * Reads the model's raw list: trims names, keeps known categories (others become «Annet»),
 * rounds values, drops low-confidence finds, and keeps a frame and box only when both make
 * sense. A thing without a usable box is still listed, just without a picture.
 */
export function readItems(raw: unknown, frames: number): (FoundItem & { confidence?: number })[] {
  const list = raw && typeof raw === 'object' && Array.isArray((raw as { items?: unknown }).items) ? (raw as { items: unknown[] }).items : [];
  const items: (FoundItem & { confidence?: number })[] = [];
  for (const entry of list.slice(0, MAX_ITEMS)) {
    if (!entry || typeof entry !== 'object') continue;
    const it = entry as Record<string, unknown>;
    const name = String(it.name ?? '').trim().slice(0, 120);
    if (!name) continue;
    const confidence = Number(it.confidence);
    if (Number.isFinite(confidence) && confidence < CONFIDENCE_MIN) continue;
    const category = CATEGORIES.find((c) => c === it.category) ?? 'Annet';
    const value = Number(it.estimatedValueNOK);
    const frame = Math.round(Number(it.frame));
    const box = normBox(it.box);
    const located = box !== null && Number.isInteger(frame) && frame >= 0 && frame < frames;
    items.push({
      name,
      category,
      ...(Number.isFinite(value) && value >= 0 && { valueKr: Math.round(value) }),
      ...(located && { frame, box }),
      ...(Number.isFinite(confidence) && { confidence }),
    });
  }
  return items;
}
