import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import sharp from 'sharp';

import type { VisionModel } from './model.js';
import { pickSharpest, runPipeline } from './pipeline.js';
import { CONFIDENCE_MIN, readItems } from './prompt.js';
import { admit, DAILY_LIMIT, release, STALE_AFTER_MS } from './usage.js';

describe('readItems', () => {
  it('keeps what makes sense and drops what does not', () => {
    const items = readItems(
      {
        items: [
          { name: ' Gitar ', category: 'Musikkinstrument', estimatedValueNOK: 4499.6, confidence: 0.9, frame: 2, box: [100, 200, 900, 600] },
          { name: 'Usikker ting', category: 'Annet', confidence: CONFIDENCE_MIN - 0.01, frame: 0, box: [0, 0, 10, 10] },
          { name: 'Sofa', category: 'Sofaer', frame: '1', box: { ymin: 0, xmin: 0, ymax: 500, xmax: 500 } },
          { name: 'Lampe', category: 'Møbler', frame: 7, box: [0, 0, 10, 10] },
          { name: 'TV', category: 'Elektronikk', estimatedValueNOK: -5, frame: 0, box: [500, 500, 100, 100] },
          { name: '', frame: 0, box: [0, 0, 1, 1] },
          'not an item',
        ],
      },
      3,
    );
    assert.deepEqual(items, [
      { name: 'Gitar', category: 'Musikkinstrument', valueKr: 4500, frame: 2, box: { ymin: 100, xmin: 200, ymax: 900, xmax: 600 }, confidence: 0.9 },
      // An unknown category becomes «Annet»; a frame given as text still counts.
      { name: 'Sofa', category: 'Annet', frame: 1, box: { ymin: 0, xmin: 0, ymax: 500, xmax: 500 } },
      // A frame that doesn't exist, or a box without area: listed, but without a picture.
      { name: 'Lampe', category: 'Møbler' },
      { name: 'TV', category: 'Elektronikk' },
    ]);
  });

  it('reads nothing from an answer of the wrong shape', () => {
    assert.deepEqual(readItems(null, 3), []);
    assert.deepEqual(readItems({ things: [] }, 3), []);
  });
});

describe('usage', () => {
  const now = Date.UTC(2026, 9, 6, 12);

  it('lets one analysis run at a time per household', () => {
    const first = admit(undefined, 'a', now);
    assert.equal(first.ok, true);
    assert.deepEqual(first.ok && admit(first.usage, 'b', now + 1000), { ok: false, reason: 'busy' });
    const released = first.ok ? release(first.usage, 'a') : undefined;
    assert.equal(admit(released, 'b', now + 2000).ok, true);
    // Releasing someone else's job changes nothing.
    assert.equal(first.ok && release(first.usage, 'x'), undefined);
  });

  it('stops being blocked by an analysis that died', () => {
    const first = admit(undefined, 'a', now);
    assert.equal(first.ok && admit(first.usage, 'b', now + STALE_AFTER_MS).ok, true);
  });

  it('allows a limited number a day, counted again from the next day', () => {
    const full = { day: '2026-10-06', count: DAILY_LIMIT };
    assert.deepEqual(admit(full, 'a', now), { ok: false, reason: 'daily-limit' });
    assert.equal(admit(full, 'a', now + 24 * 60 * 60 * 1000).ok, true);
  });
});

describe('pickSharpest', () => {
  it('keeps the sharpest frame of each stretch, covering the whole recording', () => {
    assert.deepEqual(pickSharpest([1, 5, 2, 9, 3, 3, 8, 1, 0], 3), [1, 3, 6]);
  });

  it('keeps every frame when there are few enough', () => {
    assert.deepEqual(pickSharpest([1, 2], 18), [0, 1]);
  });
});

describe('runPipeline', () => {
  const photo = (color: string) =>
    sharp({ create: { width: 800, height: 600, channels: 3, background: color } }).jpeg().toBuffer();

  it('maps finds back to the phone’s photos, and drops the picture of a crop that fails the check', async () => {
    const frames = await Promise.all(['#203040', '#405060', '#607080'].map(photo));
    const seen: { frames: number; crops: string[] } = { frames: 0, crops: [] };
    const model: VisionModel = {
      async findItems(sent) {
        seen.frames = sent.length;
        return {
          items: [
            { name: 'Gitar', category: 'Musikkinstrument', estimatedValueNOK: 4500, confidence: 0.9, frame: 2, box: [100, 100, 900, 500] },
            { name: 'Vegg', category: 'Annet', confidence: 0.8, frame: 0, box: [0, 0, 500, 500] },
            { name: 'Bok', category: 'Annet', confidence: 0.8 },
          ],
        };
      },
      async verifyCrops(crops) {
        seen.crops = crops.map((c) => c.name);
        for (const crop of crops) {
          const { width, height } = await sharp(crop.image).metadata();
          assert.deepEqual([width, height], [256, 256]);
        }
        return { results: [{ i: 0, ok: true }, { i: 1, ok: false }] };
      },
    };
    const lines: string[] = [];
    const items = await runPipeline(frames, 'photos', 'home', model, (line) => lines.push(line));

    assert.equal(seen.frames, 3);
    assert.deepEqual(seen.crops, ['Gitar', 'Vegg']);
    assert.deepEqual(items, [
      { name: 'Gitar', category: 'Musikkinstrument', valueKr: 4500, frame: 2, box: { ymin: 100, xmin: 100, ymax: 900, xmax: 500 } },
      { name: 'Vegg', category: 'Annet' },
      { name: 'Bok', category: 'Annet' },
    ]);
    // Counts only in the log, never what was found.
    assert.equal(lines.length, 1);
    assert.ok(!lines[0]!.includes('Gitar'));
  });

  it('uses the sharpest video frames and numbers finds as the phone sent them', async () => {
    const plain = await photo('#808080');
    // A frame with hard edges scores as sharp; plain grey as blur.
    const sharpFrame = await sharp({
      create: { width: 800, height: 600, channels: 3, background: '#000000' },
    })
      .composite([{ input: Buffer.from('<svg width="800" height="600"><rect x="100" y="100" width="300" height="300" fill="white"/></svg>'), top: 0, left: 0 }])
      .jpeg()
      .toBuffer();
    const frames = Array.from({ length: 36 }, (_, i) => (i === 25 ? sharpFrame : plain));
    let sent = 0;
    const model: VisionModel = {
      async findItems(f) {
        sent = f.length;
        // The model's frame numbers are its own; the sharp frame is the 13th it sees (36 frames, 18 stretches of 2).
        return { items: [{ name: 'Boks', category: 'Annet', confidence: 0.9, frame: 12, box: [100, 100, 600, 600] }] };
      },
      async verifyCrops() {
        return { results: [{ i: 0, ok: true }] };
      },
    };
    const items = await runPipeline(frames, 'video', 'home', model);
    assert.equal(sent, 18);
    assert.equal(items[0]!.frame, 25);
  });

  it('keeps the pictures when the check itself fails', async () => {
    const frames = [await photo('#123456')];
    const model: VisionModel = {
      findItems: async () => ({ items: [{ name: 'Stol', category: 'Møbler', frame: 0, box: [0, 0, 500, 500] }] }),
      verifyCrops: async () => {
        throw new Error('quota');
      },
    };
    assert.equal((await runPipeline(frames, 'photos', 'home', model))[0]!.frame, 0);
  });
});
