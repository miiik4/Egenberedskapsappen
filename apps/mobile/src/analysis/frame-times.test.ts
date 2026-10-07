import { describe, expect, it } from 'vitest';

import { frameTimes } from './frame-times';

describe('frameTimes', () => {
  it('takes about two frames a second, spread over the whole recording', () => {
    const times = frameTimes(20_000);
    expect(times).toHaveLength(40);
    expect(times[0]).toBe(500);
    expect(times.at(-1)).toBe(19_500);
    expect(times.every((t, i) => i === 0 || t > times[i - 1]!)).toBe(true);
  });

  it('takes at least 12 from a short clip, and at most the 60 the server accepts', () => {
    expect(frameTimes(2_000)).toHaveLength(12);
    expect(frameTimes(90_000)).toHaveLength(60);
    expect(Math.max(...frameTimes(2_000))).toBeLessThanOrEqual(2_000);
  });
});
