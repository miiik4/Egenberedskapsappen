import { addDays, daysBetween } from './dates';
import { QUARTERLY_CHECK_INTERVAL_DAYS } from './guidance';
import type { IsoDate } from './types';

export function nextQuarterlyCheck(lastChecked: IsoDate): IsoDate {
  return addDays(lastChecked, QUARTERLY_CHECK_INTERVAL_DAYS);
}

/**
 * Days until the next check; negative once it's overdue. An overdue check never resets
 * the number, it only means Home says the number may be out of date.
 */
export function daysUntilQuarterlyCheck(lastChecked: IsoDate, today: IsoDate): number {
  return daysBetween(today, nextQuarterlyCheck(lastChecked));
}
