import { describe, expect, it } from 'vitest';

// The server's copy, which must give the same answers.
import * as server from '../../../functions/src/analysis/crop';
import { cropWindow, type Box } from './crop';

describe('crop geometry', () => {
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
    const cases: [Box, number, number][] = [
      [{ ymin: 300, xmin: 400, ymax: 700, xmax: 600 }, 2000, 1000],
      [{ ymin: 0, xmin: 0, ymax: 1000, xmax: 1000 }, 1080, 1920],
      [{ ymin: 450, xmin: 0, ymax: 550, xmax: 1000 }, 4032, 3024],
      [{ ymin: 10, xmin: 990, ymax: 20, xmax: 999 }, 640, 480],
    ];
    for (const [box, width, height] of cases) {
      expect(server.cropWindow(box, width, height)).toEqual(cropWindow(box, width, height));
    }
  });
});
