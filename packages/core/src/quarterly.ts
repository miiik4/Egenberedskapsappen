import { addDays, daysBetween } from './dates';
import type { IsoDate } from './types';

/** Preparedness drifts as things expire and households change, so it's checked every quarter. */
export const QUARTERLY_CHECK_INTERVAL_DAYS = 91;

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
