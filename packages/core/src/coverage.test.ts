import { describe, expect, it } from 'vitest';

import { checklist, computeCoverage, dayImpactOfLosing, isExpired, isExpiringSoon, itemsToReplace, missingTypes, peopleIn } from './coverage';
import { item } from './test-items';
import type { HouseholdMembers, StockItem } from './types';

const today = '2026-09-30';
const none: HouseholdMembers = { adults: 0, seniors: 0, children: 0, infants: 0, dogs: 0, cats: 0 };
const two: HouseholdMembers = { ...none, adults: 2 };

// Two adults: 30 of 42 litres (5 days), 36 meals (6 days) and a stove.
const stock: StockItem[] = [
  item('w1', { type: 'drinkingWater', litres: 6, expiresOn: '2026-10-02' }),
  item('w2', { type: 'drinkingWater', litres: 24 }),
  item('f1', { type: 'crispbread', meals: 12, expiresOn: '2026-10-14' }),
  item('f2', { type: 'cannedMeals', meals: 24 }),
  item('h1', { type: 'heatSource' }),
  item('r1', { type: 'radio' }),
];

describe('computeCoverage', () => {
  it('counts water, food and heat, and the lowest sets the number', () => {
    const c = computeCoverage(two, stock, today);
    expect(c).toMatchObject({ days: 5, waterDays: 5, foodDays: 6, heatDays: 10, limitedBy: 'water' });
    expect(c.waterLitresShort).toBe(12);
    expect(c.mealsShort).toBe(6);
  });

  it('counts three meals per person a day', () => {
    expect(computeCoverage({ ...none, adults: 3 }, stock, today).foodDays).toBe(4);
  });

  it('has no heat without a source that works without power, and that holds the number at zero', () => {
    const c = computeCoverage(two, stock.filter((i) => i.type !== 'heatSource'), today);
    expect(c).toMatchObject({ heatDays: 0, days: 0, limitedBy: 'heat' });
  });

  it('gives pets water too', () => {
    // 6 + 1 for the dog + 0.25 for the cat = 7.25 litres a day.
    const c = computeCoverage({ ...two, dogs: 1, cats: 1 }, stock, today);
    expect(c.litresPerDay).toBe(7.25);
    expect(c.waterDays).toBe(4);
    expect(c.waterLitresShort).toBe(21);
  });

  it('counts everyone, of every age, as a person', () => {
    const family = { adults: 1, seniors: 1, children: 1, infants: 1, dogs: 2, cats: 0 };
    expect(peopleIn(family)).toBe(4);
    expect(computeCoverage(family, stock, today).mealsPerDay).toBe(12);
  });

  it('is zero with an empty stockpile', () => {
    const c = computeCoverage(two, [], today);
    expect(c.days).toBe(0);
    expect(c.waterLitresShort).toBe(42);
    expect(c.mealsShort).toBe(42);
  });

  it('caps the number at the end of the scale but keeps the real figures', () => {
    const plenty = [
      item('w', { type: 'drinkingWater', litres: 300 }),
      item('f', { type: 'cannedMeals', meals: 300 }),
      item('h', { type: 'heatSource' }),
    ];
    const c = computeCoverage(two, plenty, today);
    expect(c.days).toBe(10);
    expect(c.waterDays).toBe(50);
    expect(c.waterLitresShort).toBe(0);
  });

  it('stops counting an item the day after it expires', () => {
    expect(computeCoverage(two, stock, '2026-10-02').waterDays).toBe(5);
    expect(computeCoverage(two, stock, '2026-10-03').waterDays).toBe(4);
  });

  it('rejects a household with nobody in it, pets or not', () => {
    expect(() => computeCoverage({ ...none, dogs: 1 }, stock, today)).toThrow();
  });
});

describe('checklist', () => {
  it('ticks a type off once it has an item that has not expired', () => {
    const light = checklist(two, [item('t', { type: 'torch' })], today).find((c) => c.category === 'light')!;
    expect(light.types.map((t) => [t.id, t.have, t.partial])).toEqual([
      ['torch', true, false],
      ['batteries', false, false],
      ['candles', false, false],
      ['powerBank', false, false],
    ]);
    const expired = [item('w', { type: 'purificationTablets', expiresOn: '2026-09-01' })];
    expect(checklist(two, expired, today)[0]!.types[1]).toMatchObject({ have: false, partial: false, items: expired });
  });

  it('ticks water and food off only once they reach the week, as Oversikt counts them', () => {
    const list = checklist(two, stock, today);
    const water = list.find((c) => c.category === 'water')!;
    expect(water.days).toBe(5);
    expect(water.types[0]).toMatchObject({ id: 'drinkingWater', have: false, partial: true });
    expect(list.find((c) => c.category === 'food')!.types[0]).toMatchObject({ id: 'cannedMeals', partial: true });

    const enough = [...stock, item('w3', { type: 'drinkingWater', litres: 12 })];
    expect(checklist(two, enough, today)[0]!.types[0]).toMatchObject({ have: true, partial: false });
    // Nothing of a type is neither ticked nor partial, even when the category is short.
    expect(list.find((c) => c.category === 'food')!.types.find((t) => t.id === 'oats')).toMatchObject({
      have: false,
      partial: false,
    });
  });

  it('gives the days only for the categories counted in days', () => {
    expect(checklist(two, stock, today).map((c) => [c.category, c.days])).toEqual([
      ['water', 5],
      ['food', 6],
      ['heat', 10],
      ['light', undefined],
      ['communication', undefined],
      ['firstAid', undefined],
      ['hygiene', undefined],
    ]);
  });

  it('lists baby food only with small children, and pet food only with pets', () => {
    const food = (m: HouseholdMembers) => checklist(m, [], today).find((c) => c.category === 'food')!.types.map((t) => t.id);
    expect(food(two)).toEqual(['cannedMeals', 'crispbread', 'oats', 'driedFruitNuts', 'cookingStove']);
    expect(food({ ...two, infants: 1, cats: 1 })).toEqual([
      'cannedMeals',
      'crispbread',
      'oats',
      'driedFruitNuts',
      'babyFood',
      'petFood',
      'cookingStove',
    ]);
  });

  it('lists what is missing in list order, water and food that are short included', () => {
    expect(missingTypes(two, stock, today).map((t) => t.id).slice(0, 6)).toEqual([
      'drinkingWater',
      'purificationTablets',
      'cannedMeals',
      'crispbread',
      'oats',
      'driedFruitNuts',
    ]);
  });
});

describe('expiry', () => {
  const water = stock[0]!;

  it('warns in the two weeks up to and including the expiry day', () => {
    expect(isExpiringSoon(water, '2026-09-17')).toBe(false);
    expect(isExpiringSoon(water, '2026-09-18')).toBe(true);
    expect(isExpiringSoon(water, '2026-10-02')).toBe(true);
    expect(isExpiringSoon(water, '2026-10-03')).toBe(false);
    expect(isExpired(water, '2026-10-03')).toBe(true);
  });

  it('never expires an item without a date', () => {
    expect(isExpired(stock[1]!, '2099-01-01')).toBe(false);
  });

  it('lists what wants replacing, expired first, then the soonest', () => {
    const at = (id: string, expiresOn?: string) => ({ ...water, id, expiresOn });
    const items = [at('later', '2026-10-10'), at('none'), at('past', '2026-09-30'), at('soon', '2026-10-05'), at('far', '2027-01-01')];
    expect(itemsToReplace(items, '2026-10-01').map((i) => i.id)).toEqual(['past', 'soon', 'later']);
  });
});

describe('dayImpactOfLosing', () => {
  it('shows what replacing the expiring water is worth: «−1 døgn»', () => {
    expect(dayImpactOfLosing(two, stock, 'w1', today)).toBe(-1);
  });

  it('is zero for something that is not counted in days', () => {
    expect(dayImpactOfLosing(two, stock, 'r1', today)).toBe(0);
  });
});
