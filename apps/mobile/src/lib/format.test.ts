import { describe, expect, it } from 'vitest';

import {
  daysFigure,
  formatDate,
  formatDateWithYear,
  formatDays,
  formatExpiry,
  formatIn,
  formatKr,
  formatMeals,
  formatMonths,
  formatMonthYear,
  formatPeriod,
  formatTime,
  householdLabel,
  initials,
  todayIso,
} from './format';

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

  it('uses the local calendar date, not UTC', () => {
    expect(todayIso(new Date(2026, 9, 2, 23, 30))).toBe('2026-10-02');
  });

  it('writes days, meals and expiry the way the screens say them', () => {
    expect(formatDays(4)).toBe('4 døgn');
    expect(formatDays(7)).toBe('7 døgn');
    expect(formatDays(10)).toBe('7+ døgn');
    expect(daysFigure(7)).toBe('7');
    expect(daysFigure(10)).toBe('7+');
    expect(formatMeals(1)).toBe('1 måltid');
    expect(formatMeals(2.5)).toBe('2,5 måltider');
    expect(formatMonthYear('2028-05-01')).toBe('mai 2028');
    expect(formatIn(9)).toBe('om 9 dager');
    expect(formatIn(21)).toBe('om 3 uker');
    expect(formatIn(1)).toBe('i morgen');
    expect(formatExpiry(9)).toBe('går ut om 9 dager');
    expect(formatExpiry(0)).toBe('går ut i dag');
    expect(formatExpiry(-1)).toBe('har gått ut');
  });

  it('writes spans of time in words', () => {
    expect(formatPeriod(7)).toBe('en uke');
    expect(formatPeriod(14)).toBe('to uker');
    expect(formatPeriod(10)).toBe('10 døgn');
    expect(formatMonths(1)).toBe('en måned');
    expect(formatMonths(6)).toBe('seks måneder');
  });

  it('describes the household in counts only', () => {
    const none = { adults: 0, seniors: 0, children: 0, infants: 0, dogs: 0, cats: 0 };
    expect(householdLabel({ ...none, adults: 2, children: 1, dogs: 1 })).toBe('3 personer og 1 hund');
    expect(householdLabel({ ...none, adults: 1, dogs: 2, cats: 1 })).toBe('1 person, 2 hunder og 1 katt');
  });

  it('makes initials', () => {
    expect(initials('Ola Nordmann')).toBe('ON');
    expect(initials('kari')).toBe('K');
  });
});
