import { describe, expect, it } from 'vitest';

// The server's copy, which must give the same answers.
import * as server from '../../../functions/src/analysis/crop';
import { cropWindow, normBox } from './crop';

describe('crop geometry', () => {
  it('reads the model’s box as an array or an object, and refuses a box without area', () => {
    expect(normBox([100, 200, 300, 400])).toEqual({ ymin: 100, xmin: 200, ymax: 300, xmax: 400 });
    expect(normBox({ ymin: '100', xmin: 200, ymax: 300, xmax: 400 })).toEqual({ ymin: 100, xmin: 200, ymax: 300, xmax: 400 });
    expect(normBox([100, 400, 300, 200])).toBeNull();
    expect(normBox([1, 2, 3])).toBeNull();
    expect(normBox('box')).toBeNull();
  });

  it('crops tight with a margin of the longer side, inside the photo', () => {
    // A 1000×1000 box region in a 2000×1000 photo: 400 px wide, 400 px tall, 56 px margin.
    const box = { ymin: 300, xmin: 400, ymax: 700, xmax: 600 };
    expect(cropWindow(box, 2000, 1000)).toEqual({ left: 744, top: 244, width: 512, height: 512, outSide: 512 });
  });

  it('keeps a wide thing wide, and never goes outside the photo', () => {
    const keyboard = { ymin: 450, xmin: 0, ymax: 550, xmax: 1000 };
    const w = cropWindow(keyboard, 1000, 1000);
    expect(w.left).toBe(0);
    expect(w.width).toBe(1000);
    expect(w.height).toBeLessThan(w.width / 2);
    expect(w.outSide).toBe(1000);
  });

  it('matches the server’s copy', () => {
    const cases: [number[], number, number][] = [
      [[300, 400, 700, 600], 2000, 1000],
      [[0, 0, 1000, 1000], 1080, 1920],
      [[450, 0, 550, 1000], 4032, 3024],
      [[10, 990, 20, 999], 640, 480],
    ];
    for (const [raw, width, height] of cases) {
      const box = normBox(raw)!;
      expect(server.normBox(raw)).toEqual(box);
      expect(server.cropWindow(box, width, height)).toEqual(cropWindow(box, width, height));
    }
  });
});
