import { describe, expect, it } from 'vitest';

import { formatDate, formatDateWithYear, formatDayChange, formatKr, formatTime, greeting, initials, todayIso } from './format';

describe('format', () => {
  it('writes dates the Norwegian way', () => {
    expect(formatDate('2026-10-02')).toBe('2. oktober');
    expect(formatDate('2027-01-01')).toBe('1. januar');
  });

  it('writes times and far-off dates the Norwegian way', () => {
    expect(formatTime(new Date(2026, 9, 3, 8, 5))).toBe('kl. 08.05');
    expect(formatDateWithYear('2027-10-03')).toBe('3. oktober 2027');
  });

  it('groups kroner with no-break spaces', () => {
    expect(formatKr(186_400)).toBe('186 400 kr');
    expect(formatKr(4000)).toBe('4 000 kr');
    expect(formatKr(0)).toBe('0 kr');
  });

  it('signs day changes with a real minus, and says nothing for zero', () => {
    expect(formatDayChange(2)).toBe('+2 døgn');
    expect(formatDayChange(-1)).toBe('−1 døgn');
    expect(formatDayChange(0)).toBeUndefined();
  });

  it('uses the local calendar date, not UTC', () => {
    expect(todayIso(new Date(2026, 9, 2, 23, 30))).toBe('2026-10-02');
  });

  it('greets by time of day and makes initials', () => {
    expect(greeting(new Date(2026, 9, 2, 8))).toBe('God morgen');
    expect(greeting(new Date(2026, 9, 2, 20))).toBe('God kveld');
    expect(initials('Ola Nordmann')).toBe('ON');
    expect(initials('kari')).toBe('K');
  });
});
