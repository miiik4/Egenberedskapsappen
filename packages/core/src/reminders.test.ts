import { describe, expect, it } from 'vitest';

import { MAX_REMINDERS, planReminders } from './reminders';
import type { StockItem } from './types';

const today = '2026-10-02';
const water = (id: string, expiresOn?: string, remind = true): StockItem => ({
  id,
  name: `Vann ${id}`,
  type: 'drinkingWater',
  quantity: 1,
  litres: 6,
  remind,
  location: '',
  ...(expiresOn && { expiresOn }),
});

describe('planReminders', () => {
  it('warns a week before something expires', () => {
    const plan = planReminders({ items: [water('a', '2026-11-01')], lastQuarterlyCheck: '2026-10-02', expiryReviewOn: null, today });
    expect(plan[0]).toEqual({ kind: 'expiring', on: '2026-10-25', expiresOn: '2026-11-01', items: [water('a', '2026-11-01')] });
  });

  it('groups everything expiring the same day into one reminder', () => {
    const plan = planReminders({
      items: [water('a', '2026-11-01'), water('b', '2026-11-01'), water('c', '2026-12-01')],
      lastQuarterlyCheck: '2026-10-02',
      expiryReviewOn: null,
      today,
    });
    const expiring = plan.filter((r) => r.kind === 'expiring');
    expect(expiring.map((r) => [r.on, r.items.map((i) => i.id)])).toEqual([
      ['2026-10-25', ['a', 'b']],
      ['2026-11-24', ['c']],
    ]);
  });

  it('leaves out warnings already past, and items without a date', () => {
    const plan = planReminders({
      items: [water('soon', '2026-10-08'), water('never')],
      lastQuarterlyCheck: '2026-10-02',
      expiryReviewOn: null,
      today,
    });
    expect(plan.filter((r) => r.kind === 'expiring')).toEqual([]);
  });

  it('still reminds on the warning day itself', () => {
    const plan = planReminders({ items: [water('a', '2026-10-09')], lastQuarterlyCheck: '2026-10-02', expiryReviewOn: null, today });
    expect(plan[0]).toMatchObject({ kind: 'expiring', on: '2026-10-02' });
  });

  it('skips items the user turned the reminder off for', () => {
    const plan = planReminders({ items: [water('a', '2026-11-01', false)], lastQuarterlyCheck: '2026-10-02', expiryReviewOn: null, today });
    expect(plan.filter((r) => r.kind === 'expiring')).toEqual([]);
  });

  it('reminds when the quarterly check falls due, but not once it is overdue', () => {
    expect(
      planReminders({ items: [], lastQuarterlyCheck: '2026-07-10', expiryReviewOn: null, today }),
    ).toEqual([{ kind: 'quarterlyCheck', on: '2026-10-09' }]);
    expect(planReminders({ items: [], lastQuarterlyCheck: '2026-06-01', expiryReviewOn: null, today })).toEqual([]);
  });

  it('includes a requested expiry review, soonest first overall', () => {
    const plan = planReminders({
      items: [water('a', '2026-11-01')],
      lastQuarterlyCheck: '2026-07-10',
      expiryReviewOn: '2026-10-05',
      today,
    });
    expect(plan.map((r) => `${r.kind} ${r.on}`)).toEqual([
      'expiryReview 2026-10-05',
      'quarterlyCheck 2026-10-09',
      'expiring 2026-10-25',
    ]);
  });

  it('stays under the iOS limit on pending notifications', () => {
    const items = Array.from({ length: 100 }, (_, i) => water(`w${i}`, `2027-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`));
    expect(planReminders({ items, lastQuarterlyCheck: today, expiryReviewOn: null, today })).toHaveLength(MAX_REMINDERS);
  });
});
