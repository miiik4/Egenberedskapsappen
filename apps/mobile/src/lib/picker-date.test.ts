import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { fromPickerDate, toPickerDate } from './picker-date';

// In UTC every one of these would pass by luck; Norway is where local midnight is the day before.
const zone = process.env.TZ;
beforeAll(() => {
  process.env.TZ = 'Europe/Oslo';
});
afterAll(() => {
  if (zone === undefined) delete process.env.TZ;
  else process.env.TZ = zone;
});

describe('picker dates', () => {
  it('runs in Norwegian time', () => {
    expect(new Date(2026, 9, 2).toISOString()).toBe('2026-10-01T22:00:00.000Z');
  });

  it('passes local midnight to a local-time picker (iOS)', () => {
    const date = toPickerDate('2026-10-02', false);
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 9, 2, 0]);
    expect(fromPickerDate(date, false)).toBe('2026-10-02');
  });

  it('passes UTC midnight to a UTC picker (Android)', () => {
    expect(toPickerDate('2026-10-02', true).toISOString()).toBe('2026-10-02T00:00:00.000Z');
    expect(toPickerDate('2027-01-01', true).toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });

  it('reads the picked UTC day back as the same calendar day', () => {
    // What Material's picker hands back: UTC midnight of the chosen day.
    expect(fromPickerDate(new Date(Date.UTC(2026, 9, 2)), true)).toBe('2026-10-02');
    expect(fromPickerDate(new Date(Date.UTC(2026, 11, 31)), true)).toBe('2026-12-31');
  });

  it('round-trips every day of a year without moving it', () => {
    for (let day = 0; day < 366; day++) {
      const iso = new Date(Date.UTC(2028, 0, 1 + day)).toISOString().slice(0, 10);
      expect(fromPickerDate(toPickerDate(iso, true), true)).toBe(iso);
      expect(fromPickerDate(toPickerDate(iso, false), false)).toBe(iso);
    }
  });
});
