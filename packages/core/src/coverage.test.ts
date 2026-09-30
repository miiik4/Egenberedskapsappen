import { describe, expect, it } from 'vitest';

import { computeCoverage, dayImpactOfLosing, isExpired, isExpiringSoon } from './coverage';
import type { Household, StockItem } from './types';

const today = '2026-09-30';
const kari: Household = { id: 'h1', people: 2 };

// The stockpile from the design: 2 people, 30 of 42 litres, food for 5 of 7 days.
const designStock: StockItem[] = [
  { id: 'w1', name: 'Vann på flaske, 6 l', category: 'water', litres: 6, expiresOn: '2026-10-02' },
  { id: 'w2', name: 'Vanndunk', category: 'water', litres: 24 },
  { id: 'f1', name: 'Knekkebrød', category: 'food', personDays: 4, expiresOn: '2026-10-14' },
  { id: 'f2', name: 'Hermetikk', category: 'food', personDays: 8 },
  { id: 'r1', name: 'DAB-radio på batteri', category: 'radio' },
  { id: 'l1', name: 'Lommelykt', category: 'heatAndLight' },
  { id: 'a1', name: 'Førstehjelpsskrin', category: 'firstAid' },
  { id: 'c1', name: 'Kontanter', category: 'hygieneAndCash' },
];

describe('computeCoverage', () => {
  it('reproduces the design: about 5 days, held back by water', () => {
    const c = computeCoverage(kari, designStock, today);
    expect(c.days).toBe(5);
    expect(c.waterDays).toBe(5);
    expect(c.foodDays).toBe(6);
    expect(c.limitedBy).toBe('water');
    expect(c.waterLitresShort).toBe(12); // "Kjøp 12 liter vann"
    expect(c.missing).toEqual([]);
  });

  it('is zero with an empty stockpile, and lists every essential as missing', () => {
    const c = computeCoverage(kari, [], today);
    expect(c.days).toBe(0);
    expect(c.waterLitresShort).toBe(42);
    expect(c.foodPersonDaysShort).toBe(14);
    expect(c.missing).toEqual(['radio', 'heatAndLight', 'firstAid', 'hygieneAndCash']);
  });

  it('caps the headline at the end of the scale but keeps the real figures', () => {
    const plenty: StockItem[] = [
      { id: 'w', name: 'Vann', category: 'water', litres: 300 },
      { id: 'f', name: 'Mat', category: 'food', personDays: 100 },
    ];
    const c = computeCoverage(kari, plenty, today);
    expect(c.days).toBe(10);
    expect(c.waterDays).toBe(50);
    expect(c.waterLitresShort).toBe(0);
  });

  it('stops counting an item the day after it expires', () => {
    expect(computeCoverage(kari, designStock, '2026-10-02').waterDays).toBe(5);
    expect(computeCoverage(kari, designStock, '2026-10-03').waterDays).toBe(4);
  });

  it('scales with the household', () => {
    expect(computeCoverage({ id: 'h', people: 1 }, designStock, today).waterDays).toBe(10);
  });

  it('rejects a household with nobody in it', () => {
    expect(() => computeCoverage({ id: 'h', people: 0 }, designStock, today)).toThrow();
  });
});

describe('expiry', () => {
  const water = designStock[0]!;

  it('warns in the two weeks up to and including the expiry day', () => {
    expect(isExpiringSoon(water, '2026-09-17')).toBe(false);
    expect(isExpiringSoon(water, '2026-09-18')).toBe(true);
    expect(isExpiringSoon(water, '2026-10-02')).toBe(true);
    expect(isExpiringSoon(water, '2026-10-03')).toBe(false);
    expect(isExpired(water, '2026-10-03')).toBe(true);
  });

  it('never expires an item without a date', () => {
    expect(isExpired(designStock[1]!, '2099-01-01')).toBe(false);
  });
});

describe('dayImpactOfLosing', () => {
  it('shows what replacing the expiring water is worth: "−1 døgn"', () => {
    expect(dayImpactOfLosing(kari, designStock, 'w1', today)).toBe(-1);
  });

  it('is zero for an essential, which does not count in days', () => {
    expect(dayImpactOfLosing(kari, designStock, 'r1', today)).toBe(0);
  });
});
