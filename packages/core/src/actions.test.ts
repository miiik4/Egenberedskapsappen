import { describe, expect, it } from 'vitest';

import { nextActions } from './actions';
import { daysUntilQuarterlyCheck, nextQuarterlyCheck } from './quarterly';
import { assessScenarios, type PreparednessSnapshot } from './scenarios';
import type { Household, StockItem } from './types';

const today = '2026-09-30';
const household: Household = { id: 'h1', people: 2 };

// 30 of 42 litres (5 days), food for 6 days, a radio but no light.
const items: StockItem[] = [
  { id: 'w1', name: 'Vann på flaske, 6 l', category: 'water', litres: 6, expiresOn: '2026-10-02' },
  { id: 'w2', name: 'Vanndunk', category: 'water', litres: 24 },
  { id: 'f1', name: 'Knekkebrød', category: 'food', personDays: 4, expiresOn: '2026-10-14' },
  { id: 'f2', name: 'Hermetikk', category: 'food', personDays: 8 },
  { id: 'r1', name: 'DAB-radio', category: 'radio' },
];

describe('nextActions', () => {
  it('puts closing the gap first, then replacements soonest first, then missing essentials', () => {
    expect(nextActions(household, items, today).map((a) => a.kind)).toEqual([
      'buyWater',
      'buyFood',
      'replace',
      'replace',
      'getEssential',
      'getEssential',
      'getEssential',
    ]);
  });

  it('reports what each action does to the number, honestly', () => {
    const [water, food, firstReplace] = nextActions(household, items, today);
    // 12 more litres lifts water to 7 days, but food then holds the household at 6.
    expect(water).toEqual({ kind: 'buyWater', litres: 12, dayChange: 1 });
    // Food alone changes nothing while water is the limit.
    expect(food).toEqual({ kind: 'buyFood', personDays: 2, dayChange: 0 });
    expect(firstReplace).toMatchObject({ kind: 'replace', expiresOn: '2026-10-02', dayChange: -1 });
  });

  it('puts a missing essential before replacing something that does not move the number', () => {
    const withSpareFood: StockItem[] = [...items, { id: 'f3', name: 'Tørrmat', category: 'food', personDays: 10 }];
    const kinds = nextActions(household, withSpareFood, today).map((a) =>
      a.kind === 'replace' ? `replace ${a.item.id} ${a.dayChange}` : a.kind,
    );
    expect(kinds).toEqual([
      'buyWater',
      'replace w1 -1',
      'getEssential',
      'getEssential',
      'getEssential',
      'replace f1 0',
    ]);
  });

  it('has nothing to suggest for a fully stocked household', () => {
    const full: StockItem[] = [
      { id: 'w', name: 'Vann', category: 'water', litres: 42 },
      { id: 'f', name: 'Mat', category: 'food', personDays: 14 },
      { id: 'r', name: 'Radio', category: 'radio' },
      { id: 'l', name: 'Lommelykt', category: 'heatAndLight' },
      { id: 'a', name: 'Førstehjelp', category: 'firstAid' },
      { id: 'c', name: 'Kontanter', category: 'hygieneAndCash' },
    ];
    expect(nextActions(household, full, today)).toEqual([]);
  });
});

describe('assessScenarios', () => {
  const snapshot: PreparednessSnapshot = {
    household,
    items,
    emergencyContacts: 2,
    hasMeetingPlace: true,
    offlineDocuments: 3,
    rooms: [
      { name: 'Stue', filmed: true },
      { name: 'Soverom', filmed: false },
    ],
  };

  it('reads each scenario in its own terms, with no overall score', () => {
    const [power, water, network, damage] = assessScenarios(snapshot, today);
    expect(power).toMatchObject({ id: 'winterPowerOutage', status: { kind: 'days', days: 5 } });
    expect(power!.gaps).toContainEqual({ kind: 'essential', category: 'heatAndLight' });
    expect(water).toEqual({
      id: 'noTapWater',
      status: { kind: 'days', days: 5 },
      gaps: [{ kind: 'water', litres: 12 }],
    });
    expect(network).toEqual({ id: 'noNetwork', status: { kind: 'ready' }, gaps: [] });
    expect(damage).toEqual({
      id: 'homeDamage',
      status: { kind: 'partial' },
      gaps: [{ kind: 'roomNotFilmed', room: 'Soverom' }],
    });
  });

  it('says what is missing for the offline scenario', () => {
    const [, , network] = assessScenarios({ ...snapshot, hasMeetingPlace: false }, today);
    expect(network).toEqual({ id: 'noNetwork', status: { kind: 'partial' }, gaps: [{ kind: 'meetingPlace' }] });
  });

  it('has not started on home damage before any room is filmed', () => {
    const [, , , damage] = assessScenarios({ ...snapshot, rooms: [] }, today);
    expect(damage!.status).toEqual({ kind: 'notStarted' });
  });
});

describe('quarterly check', () => {
  it('falls due a quarter after the last one, and counts down to it', () => {
    expect(nextQuarterlyCheck('2026-07-02')).toBe('2026-10-01');
    expect(daysUntilQuarterlyCheck('2026-07-02', '2026-09-22')).toBe(9);
    expect(daysUntilQuarterlyCheck('2026-07-02', '2026-10-05')).toBe(-4);
  });
});
