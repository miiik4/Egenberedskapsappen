import { describe, expect, it } from 'vitest';

import { nextActions, type NextAction } from './actions';
import { item } from './test-items';
import type { HouseholdMembers, StockItem } from './types';

const today = '2026-09-30';
const two: HouseholdMembers = { adults: 2, seniors: 0, children: 0, infants: 0, dogs: 0, cats: 0 };

// 30 of 42 litres (5 days), 36 meals (6 days), a stove, a radio and cash; no light, first aid or hygiene.
const items: StockItem[] = [
  item('w1', { type: 'drinkingWater', litres: 6, expiresOn: '2026-10-02' }),
  item('w2', { type: 'drinkingWater', litres: 24 }),
  item('f1', { type: 'crispbread', meals: 6, expiresOn: '2026-10-14' }),
  item('f2', { type: 'cannedMeals', meals: 30 }),
  item('h1', { type: 'heatSource' }),
  item('h2', { type: 'woolBlankets' }),
  item('h3', { type: 'matches' }),
  item('r1', { type: 'radio' }),
  item('r2', { type: 'cash' }),
  item('t1', { type: 'purificationTablets' }),
];

const label = (a: NextAction) =>
  a.kind === 'replace' ? `replace ${a.item.id} ${a.dayChange}` : a.kind === 'getType' ? `get ${a.type.id}` : a.kind;

describe('nextActions', () => {
  it('closes the gaps first, then replacements that cost days, then what is missing from the list', () => {
    expect(nextActions(two, items, today).map(label)).toEqual([
      'buyWater',
      'buyFood',
      'replace w1 -1',
      'get cookingStove',
      'get torch',
      'get batteries',
      'get candles',
      'get powerBank',
      'get firstAidKit',
      'get medicines',
      'get iodine',
      'get wetWipes',
      'get toiletPaper',
      'get menstrualProducts',
      'replace f1 0',
    ]);
  });

  it('reports what each amount does to the number, honestly', () => {
    const [water, food] = nextActions(two, items, today);
    // 12 more litres lifts water to 7 days, but food then holds the household at 6.
    expect(water).toEqual({ kind: 'buyWater', litres: 12, dayChange: 1 });
    // Food alone changes nothing while water is the limit. It suggests the food types they have none of.
    expect(food).toMatchObject({ kind: 'buyFood', meals: 6, days: 1, dayChange: 0 });
    expect(food?.kind === 'buyFood' && food.suggestions.map((t) => t.id)).toEqual(['oats', 'driedFruitNuts']);
  });

  it('puts a missing heat source right after the amounts, since it holds the number at zero', () => {
    const cold = items.filter((i) => i.type !== 'heatSource');
    expect(nextActions(two, cold, today).slice(0, 3).map(label)).toEqual(['buyWater', 'buyFood', 'get heatSource']);
  });

  it('asks for baby food and pet food when the household needs them', () => {
    const labels = nextActions({ ...two, infants: 1, dogs: 1 }, items, today).map(label);
    expect(labels).toContain('get petFood');
    expect(labels).not.toContain('get babyFood'); // covered by «Kjøp mat» while meals are short
    const fed = [...items, item('f3', { type: 'cannedMeals', meals: 100 }), item('w3', { type: 'drinkingWater', litres: 100 })];
    expect(nextActions({ ...two, infants: 1 }, fed, today).map(label)).toContain('get babyFood');
  });

  it('has nothing to suggest for a fully stocked household', () => {
    const full = [
      item('w', { type: 'drinkingWater', litres: 42 }),
      item('f', { type: 'cannedMeals', meals: 42 }),
      ...['purificationTablets', 'crispbread', 'oats', 'driedFruitNuts', 'heatSource', 'woolBlankets', 'matches', 'torch',
        'batteries', 'candles', 'powerBank', 'radio', 'cash', 'firstAidKit', 'medicines', 'iodine', 'wetWipes', 'toiletPaper',
        'cookingStove', 'menstrualProducts',
      ].map((type) => item(type, { type: type as StockItem['type'], meals: 0 })),
    ];
    expect(nextActions(two, full, today)).toEqual([]);
  });
});
