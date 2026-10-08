import { addMonths, daysBetween } from './dates';
import { CHECK_INTERVALS_MONTHS, type CheckIntervalMonths } from './guidance';
import type { IsoDate } from './types';

export function isCheckInterval(months: number): months is CheckIntervalMonths {
  return (CHECK_INTERVALS_MONTHS as readonly number[]).includes(months);
}

export function nextCheck(lastChecked: IsoDate, intervalMonths: CheckIntervalMonths): IsoDate {
  return addMonths(lastChecked, intervalMonths);
}

/**
 * Days until the next check; negative once it's overdue. An overdue check never resets
 * the number, it only means Home says the number may be out of date.
 */
export function daysUntilCheck(lastChecked: IsoDate, intervalMonths: CheckIntervalMonths, today: IsoDate): number {
  return daysBetween(today, nextCheck(lastChecked, intervalMonths));
}

/**
 * Whether the beredskapssjekk should bring an item up: it expires between today and the next
 * check, so this check is the last chance to replace it in time.
 */
export function expiresBeforeNextCheck(expiresOn: IsoDate, today: IsoDate, intervalMonths: CheckIntervalMonths): boolean {
  const left = daysBetween(today, expiresOn);
  return left >= 0 && left <= daysBetween(today, nextCheck(today, intervalMonths));
}
