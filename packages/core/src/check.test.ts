import { describe, expect, it } from 'vitest';

import { daysUntilCheck, isCheckInterval, nextCheck } from './check';

describe('beredskapssjekk', () => {
  it('falls due the chosen number of months after the last one, and counts down to it', () => {
    expect(nextCheck('2026-07-02', 3)).toBe('2026-10-02');
    expect(nextCheck('2026-07-02', 1)).toBe('2026-08-02');
    expect(nextCheck('2026-07-02', 6)).toBe('2027-01-02');
    expect(daysUntilCheck('2026-07-02', 3, '2026-09-22')).toBe(10);
    expect(daysUntilCheck('2026-07-02', 3, '2026-10-05')).toBe(-3);
  });

  it('lands on the last day of a shorter month', () => {
    expect(nextCheck('2026-08-31', 1)).toBe('2026-09-30');
  });

  it('knows which intervals can be picked', () => {
    expect(isCheckInterval(3)).toBe(true);
    expect(isCheckInterval(2)).toBe(false);
  });
});
