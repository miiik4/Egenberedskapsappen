/**
 * Where to cut a found thing out of a photo. The analysis says which photo a thing is clearest
 * in and draws a box around it; the phone cuts the thing's picture from its own copy of that
 * photo, so no picture ever comes back from the server.
 *
 * From Idimy's crop.js, which took several rounds on real footage to get right: crop tight to
 * the box with a margin, at the thing's own shape, and letterbox it into a square later, so a
 * wide keyboard isn't a thin strip lost in a square of desk. functions/src/analysis/crop.ts is
 * a copy for the server's own check of the crops; a test keeps the two the same.
 */

/** [ymin, xmin, ymax, xmax], each 0–1000 of the photo's height or width, as the model gives it. */
export type Box = { ymin: number; xmin: number; ymax: number; xmax: number };

export function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

/** Accepts the model's box as an array or an object; null unless it's a real box with area. */
export function normBox(raw: unknown): Box | null {
  let values: unknown[];
  if (Array.isArray(raw) && raw.length === 4) values = raw;
  else if (raw && typeof raw === 'object') {
    const b = raw as Record<string, unknown>;
    values = [b.ymin, b.xmin, b.ymax, b.xmax];
  } else return null;
  const [ymin, xmin, ymax, xmax] = values.map(Number) as [number, number, number, number];
  if (![ymin, xmin, ymax, xmax].every(Number.isFinite) || xmax <= xmin || ymax <= ymin) return null;
  return { ymin, xmin, ymax, xmax };
}

export type CropWindow = { left: number; top: number; width: number; height: number; outSide: number };

/**
 * The pixel window to cut from a `width`×`height` photo: the box with `pad` of its longer side
 * added all round, kept inside the photo. `outSide` is the square the result fits into, never
 * bigger than `outMax` and never scaled up.
 */
export function cropWindow(box: Box, width: number, height: number, pad = 0.14, outMax = 1000): CropWindow {
  const x0 = (box.xmin / 1000) * width;
  const x1 = (box.xmax / 1000) * width;
  const y0 = (box.ymin / 1000) * height;
  const y1 = (box.ymax / 1000) * height;
  const margin = Math.max(x1 - x0, y1 - y0) * pad;
  const left = Math.floor(clamp(x0 - margin, 0, width));
  const top = Math.floor(clamp(y0 - margin, 0, height));
  const w = Math.max(1, Math.ceil(clamp(x1 + margin, 0, width)) - left);
  const h = Math.max(1, Math.ceil(clamp(y1 + margin, 0, height)) - top);
  return { left, top, width: w, height: h, outSide: Math.min(outMax, Math.max(w, h)) };
}
