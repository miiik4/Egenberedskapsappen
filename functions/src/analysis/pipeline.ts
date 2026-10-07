import sharp from 'sharp';

import { cropWindow } from './crop.js';
import type { VisionModel } from './model.js';
import { readItems, type FoundItem, type Scene, type Source } from './prompt.js';

/**
 * From photos to a list of things, Idimy's pipeline with one difference: no pictures leave
 * here. The model gets the photos once and says what's in them, which photo each thing is
 * clearest in and where. Each crop is then cut here only to be checked, and thrown away; the
 * phone cuts its own pictures from its own copies.
 *
 * - photos: up to 30 deliberate shots, all used
 * - video: up to 60 frames the phone took from a recording; the sharpest of each stretch are
 *   used, since a walk round a room is mostly motion blur
 */
/** How many video frames go to the model: enough to see the room, few enough to stay quick. */
export const VIDEO_FRAMES_USED = 18;
/** The model sees each photo at this width: plenty to recognise things, and quick to send. */
const MODEL_WIDTH = 768;
/** Crops are checked small, ten to a call. */
const CHECK_SIDE = 256;
const CHECK_BATCH = 10;
/** The same colour the app letterboxes with, so a checked crop looks like the one shown. */
const LETTERBOX = { r: 238, g: 243, b: 248 };

export type PipelineLog = (message: string) => void;

export async function runPipeline(
  frames: Buffer[],
  source: Source,
  scene: Scene,
  model: VisionModel,
  log: PipelineLog = () => {},
): Promise<FoundItem[]> {
  if (frames.length === 0) return [];
  const used = source === 'video' && frames.length > VIDEO_FRAMES_USED ? await sharpestPerStretch(frames, VIDEO_FRAMES_USED) : frames.map((_, i) => i);
  const forModel = await Promise.all(used.map((i) => sharp(frames[i]).rotate().resize({ width: MODEL_WIDTH, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer()));

  const found = readItems(await model.findItems(forModel, scene), used.length);
  // Back to the phone's own numbering of its photos.
  const items: FoundItem[] = found.map(({ confidence: _confidence, ...item }) =>
    item.frame === undefined ? item : { ...item, frame: used[item.frame]! },
  );

  const located = items.filter((item) => item.frame !== undefined && item.box !== undefined);
  const verdicts = await checkCrops(located, frames, model);
  const result = items.map((item) => {
    const i = located.indexOf(item);
    if (i === -1 || verdicts[i]) return item;
    // The crop shows something else, or nothing: list the thing, but without a picture.
    const { frame: _frame, box: _box, ...rest } = item;
    return rest;
  });

  // Counts only: names of what's in someone's home don't belong in the logs.
  log(
    `analysis: source=${source} frames=${frames.length} used=${used.length} found=${found.length} ` +
      `located=${located.length} cropsRejected=${verdicts.filter((ok) => !ok).length}`,
  );
  return result;
}

/** Variance of the Laplacian, roughly: higher is sharper, lower is motion blur. */
async function sharpness(frame: Buffer): Promise<number> {
  const stats = await sharp(frame)
    .rotate()
    .greyscale()
    .resize(512, null, { fit: 'inside' })
    .convolve({ width: 3, height: 3, kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0] })
    .stats();
  return stats.channels[0]?.stdev ?? 0;
}

async function sharpestPerStretch(frames: Buffer[], count: number): Promise<number[]> {
  const scores = await Promise.all(frames.map(sharpness));
  return pickSharpest(scores, count);
}

/**
 * Splits evenly spaced frames into `count` stretches and keeps the sharpest of each, so the
 * picks cover the whole recording. Returns frame numbers, in order.
 */
export function pickSharpest(scores: number[], count: number): number[] {
  if (scores.length <= count) return scores.map((_, i) => i);
  const picks: number[] = [];
  for (let s = 0; s < count; s++) {
    const lo = Math.floor((s / count) * scores.length);
    const hi = Math.floor(((s + 1) / count) * scores.length);
    let best = lo;
    for (let i = lo + 1; i < hi; i++) if (scores[i]! > scores[best]!) best = i;
    picks.push(best);
  }
  return picks;
}

async function cropForCheck(frame: Buffer, item: FoundItem): Promise<Buffer> {
  const image = sharp(frame).rotate();
  // Orientation is applied first, so measure the upright image the model saw.
  const upright = await image.clone().toBuffer({ resolveWithObject: true });
  const { left, top, width, height } = cropWindow(item.box!, upright.info.width, upright.info.height);
  return sharp(upright.data)
    .extract({ left, top, width, height })
    .resize(CHECK_SIDE, CHECK_SIDE, { fit: 'contain', background: LETTERBOX })
    .jpeg({ quality: 78 })
    .toBuffer();
}

/**
 * Does each crop show the thing it's named after? Lenient: only crops of empty table, wall or
 * the wrong kind of thing fail. A batch the model can't answer passes, since a missing check
 * is better than losing every picture.
 */
async function checkCrops(items: FoundItem[], frames: Buffer[], model: VisionModel): Promise<boolean[]> {
  const verdicts = items.map(() => true);
  const crops = await Promise.all(items.map((item) => cropForCheck(frames[item.frame!]!, item).catch(() => null)));
  crops.forEach((crop, i) => {
    if (!crop) verdicts[i] = false;
  });

  const batches: number[][] = [];
  const checkable = items.map((_, i) => i).filter((i) => crops[i]);
  for (let b = 0; b < checkable.length; b += CHECK_BATCH) batches.push(checkable.slice(b, b + CHECK_BATCH));
  await Promise.all(
    batches.map(async (batch) => {
      try {
        const raw = await model.verifyCrops(batch.map((i) => ({ name: items[i]!.name, image: crops[i]! })));
        const results = raw && typeof raw === 'object' ? (raw as { results?: unknown }).results : undefined;
        if (!Array.isArray(results)) return;
        for (const r of results) {
          const { i, ok } = (r ?? {}) as { i?: unknown; ok?: unknown };
          if (typeof i === 'number' && Number.isInteger(i) && i >= 0 && i < batch.length && ok === false) verdicts[batch[i]!] = false;
        }
      } catch {
        // Fail open for this batch.
      }
    }),
  );
  return verdicts;
}
