import { describe, expect, it } from 'vitest';

import {
  daysUntilCheck,
  expiresBeforeNextCheck,
  expiringBeforeNextCheck,
  isCheckInterval,
  isFollowUp,
  nextCheck,
  renewExpiring,
} from './check';
import { addMonths } from './dates';
import { STORED_WATER_SHELF_LIFE_MONTHS } from './guidance';
import { item } from './test-items';

describe('beredskapssjekk', () => {
  it('falls due the chosen number of months after the last one, and counts down to it', () => {
    expect(nextCheck('2026-07-02', 3)).toBe('2026-10-02');
    expect(nextCheck('2026-07-02', 1)).toBe('2026-08-02');
    expect(nextCheck('2026-07-02', 6)).toBe('2027-01-02');
    expect(daysUntilCheck('2026-07-02', 3, '2026-09-22')).toBe(10);
    expect(daysUntilCheck('2026-07-02', 3, '2026-10-05')).toBe(-3);
  });

  it('lands on the last day of a shorter month', () => {
    expect(nextCheck('2026-08-31', 1)).toBe('2026-09-30');
  });

  it('knows which intervals can be picked', () => {
    expect(isCheckInterval(3)).toBe(true);
    expect(isCheckInterval(2)).toBe(false);
  });

  it('looks for expiry dates as far ahead as the next check', () => {
    expect(expiresBeforeNextCheck('2026-11-01', '2026-10-08', 1)).toBe(true);
    expect(expiresBeforeNextCheck('2026-12-01', '2026-10-08', 1)).toBe(false);
    expect(expiresBeforeNextCheck('2026-12-01', '2026-10-08', 3)).toBe(true);
    expect(expiresBeforeNextCheck('2027-01-08', '2026-10-08', 3)).toBe(true);
    expect(expiresBeforeNextCheck('2027-01-09', '2026-10-08', 3)).toBe(false);
    expect(expiresBeforeNextCheck('2027-04-01', '2026-10-08', 6)).toBe(true);
  });

  it('leaves out what has already expired', () => {
    expect(expiresBeforeNextCheck('2026-10-07', '2026-10-08', 3)).toBe(false);
    expect(expiresBeforeNextCheck('2026-10-08', '2026-10-08', 3)).toBe(true);
  });

  it('brings up what expires before the next check, soonest first', () => {
    const today = '2026-10-08';
    const tin = item('tin', { type: 'cannedMeals', meals: 4, expiresOn: '2026-11-01' });
    const water = item('water', { type: 'drinkingWater', litres: 20, expiresOn: '2026-10-20' });
    const later = item('later', { type: 'drinkingWater', litres: 20, expiresOn: '2027-06-01' });
    const expired = item('expired', { type: 'drinkingWater', litres: 20, expiresOn: '2026-10-01' });
    const undated = item('undated', { type: 'batteries' });
    expect(expiringBeforeNextCheck([tin, water, later, expired, undated], today, 3)).toEqual([water, tin]);
  });

  it('renews what was ticked off as «Byttet», and lists what has nothing to go by', () => {
    const today = '2026-10-08';
    const tin = item('tin', { type: 'cannedMeals', meals: 4, boughtOn: '2025-11-01', expiresOn: '2026-11-01' });
    const water = item('water', { type: 'drinkingWater', litres: 20, expiresOn: '2026-10-20' });
    const batteries = item('batteries', { type: 'batteries', expiresOn: '2026-10-30' });

    const { renewed, needDate } = renewExpiring([tin, water, batteries], today);
    expect(renewed).toEqual([
      { ...tin, boughtOn: today, expiresOn: '2027-10-08' },
      { ...water, boughtOn: today, expiresOn: addMonths(today, STORED_WATER_SHELF_LIFE_MONTHS) },
    ]);
    expect(needDate).toEqual([batteries]);
  });
});

describe('isFollowUp', () => {
  it('knows the follow-ups, and nothing a newer version might add', () => {
    expect(isFollowUp('contacts')).toBe(true);
    expect(isFollowUp('equipment')).toBe(true);
    expect(isFollowUp('radio')).toBe(false);
  });
});
