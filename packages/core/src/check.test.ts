import { describe, expect, it } from 'vitest';

import { daysUntilCheck, expiresBeforeNextCheck, isCheckInterval, nextCheck } from './check';

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

  it('looks for expiry dates as far ahead as the next check', () => {
    expect(expiresBeforeNextCheck('2026-11-01', '2026-10-08', 1)).toBe(true);
    expect(expiresBeforeNextCheck('2026-12-01', '2026-10-08', 1)).toBe(false);
    expect(expiresBeforeNextCheck('2026-12-01', '2026-10-08', 3)).toBe(true);
    expect(expiresBeforeNextCheck('2027-01-08', '2026-10-08', 3)).toBe(true);
    expect(expiresBeforeNextCheck('2027-01-09', '2026-10-08', 3)).toBe(false);
    expect(expiresBeforeNextCheck('2027-04-01', '2026-10-08', 6)).toBe(true);
  });

  it('leaves out what has already expired', () => {
    expect(expiresBeforeNextCheck('2026-10-07', '2026-10-08', 3)).toBe(false);
    expect(expiresBeforeNextCheck('2026-10-08', '2026-10-08', 3)).toBe(true);
  });
});
