import type { Household, StockItem } from '@egenberedskap/core';

// Stand-in until the local store exists. Mirrors the household in the v2 design.
export const sampleHousehold: Household = { id: 'sample', people: 2 };

export const sampleStock: StockItem[] = [
  { id: 'w1', name: 'Vann på flaske, 6 l', category: 'water', litres: 6, expiresOn: '2026-10-02' },
  { id: 'w2', name: 'Vanndunk', category: 'water', litres: 24 },
  { id: 'f1', name: 'Knekkebrød', category: 'food', personDays: 4, expiresOn: '2026-10-14' },
  { id: 'f2', name: 'Hermetikk', category: 'food', personDays: 8 },
  { id: 'l1', name: 'Lommelykt', category: 'heatAndLight' },
  { id: 'a1', name: 'Førstehjelpsskrin', category: 'firstAid' },
  { id: 'c1', name: 'Kontanter', category: 'hygieneAndCash' },
];
