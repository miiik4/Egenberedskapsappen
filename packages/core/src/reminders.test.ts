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
    const plan = planReminders({ items: [water('a', '2026-11-01')], lastCheck: '2026-10-02', checkIntervalMonths: 3, expiryReviewOn: null, today });
    expect(plan[0]).toEqual({ kind: 'expiring', on: '2026-10-25', expiresOn: '2026-11-01', items: [water('a', '2026-11-01')] });
  });

  it('groups everything expiring the same day into one reminder', () => {
    const plan = planReminders({
      items: [water('a', '2026-11-01'), water('b', '2026-11-01'), water('c', '2026-12-01')],
      lastCheck: '2026-10-02', checkIntervalMonths: 3,
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
      lastCheck: '2026-10-02', checkIntervalMonths: 3,
      expiryReviewOn: null,
      today,
    });
    expect(plan.filter((r) => r.kind === 'expiring')).toEqual([]);
  });

  it('still reminds on the warning day itself', () => {
    const plan = planReminders({ items: [water('a', '2026-10-09')], lastCheck: '2026-10-02', checkIntervalMonths: 3, expiryReviewOn: null, today });
    expect(plan[0]).toMatchObject({ kind: 'expiring', on: '2026-10-02' });
  });

  it('skips items the user turned the reminder off for', () => {
    const plan = planReminders({ items: [water('a', '2026-11-01', false)], lastCheck: '2026-10-02', checkIntervalMonths: 3, expiryReviewOn: null, today });
    expect(plan.filter((r) => r.kind === 'expiring')).toEqual([]);
  });

  it('reminds when the check falls due, but not once it is overdue', () => {
    expect(
      planReminders({ items: [], lastCheck: '2026-07-10', checkIntervalMonths: 3, expiryReviewOn: null, today }),
    ).toEqual([{ kind: 'check', on: '2026-10-10' }]);
    expect(planReminders({ items: [], lastCheck: '2026-06-01', checkIntervalMonths: 3, expiryReviewOn: null, today })).toEqual([]);
  });

  it('follows the interval the household picked', () => {
    expect(
      planReminders({ items: [], lastCheck: '2026-09-20', checkIntervalMonths: 1, expiryReviewOn: null, today }),
    ).toEqual([{ kind: 'check', on: '2026-10-20' }]);
    expect(
      planReminders({ items: [], lastCheck: '2026-09-20', checkIntervalMonths: 6, expiryReviewOn: null, today }),
    ).toEqual([{ kind: 'check', on: '2027-03-20' }]);
  });

  it('includes a requested expiry review, soonest first overall', () => {
    const plan = planReminders({
      items: [water('a', '2026-11-01')],
      lastCheck: '2026-07-10', checkIntervalMonths: 3,
      expiryReviewOn: '2026-10-05',
      today,
    });
    expect(plan.map((r) => `${r.kind} ${r.on}`)).toEqual([
      'expiryReview 2026-10-05',
      'check 2026-10-10',
      'expiring 2026-10-25',
    ]);
  });

  it('stays under the iOS limit on pending notifications', () => {
    const items = Array.from({ length: 100 }, (_, i) => water(`w${i}`, `2027-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`));
    expect(planReminders({ items, lastCheck: today, checkIntervalMonths: 3, expiryReviewOn: null, today })).toHaveLength(MAX_REMINDERS);
  });

  describe('smoke alarm tests', () => {
    const base = { items: [], lastCheck: '2026-09-20', checkIntervalMonths: 6 as const, expiryReviewOn: null, today };
    const smoke = (plan: ReturnType<typeof planReminders>) => plan.filter((r) => r.kind === 'smokeAlarm').map((r) => r.on);

    it('are off unless asked for', () => {
      expect(smoke(planReminders(base))).toEqual([]);
      expect(smoke(planReminders({ ...base, smokeAlarmTest: null }))).toEqual([]);
    });

    it('come round every interval from when they were turned on, about a year ahead', () => {
      expect(smoke(planReminders({ ...base, smokeAlarmTest: { everyMonths: 3, from: '2026-10-01' } }))).toEqual([
        '2027-01-01',
        '2027-04-01',
        '2027-07-01',
        '2027-10-01',
      ]);
      expect(smoke(planReminders({ ...base, smokeAlarmTest: { everyMonths: 12, from: '2026-10-01' } }))).toEqual(['2027-10-01']);
    });

    it('skip dates already past, and keep to the day of the month', () => {
      const monthly = smoke(planReminders({ ...base, smokeAlarmTest: { everyMonths: 1, from: '2026-01-31' } }));
      expect(monthly.slice(0, 3)).toEqual(['2026-10-31', '2026-11-30', '2026-12-31']);
      expect(monthly).toHaveLength(13);
    });
  });
});
