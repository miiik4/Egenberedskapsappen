import { renewedDates } from './catalogue';
import { addMonths, daysBetween } from './dates';
import { CHECK_INTERVALS_MONTHS, type CheckIntervalMonths } from './guidance';
import type { FollowUp, IsoDate, StockItem } from './types';

export function isFollowUp(value: string): value is FollowUp {
  return value === 'contacts' || value === 'equipment';
}

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

/** What the beredskapssjekk brings up to replace, soonest first. */
export function expiringBeforeNextCheck(
  stock: StockItem[],
  today: IsoDate,
  intervalMonths: CheckIntervalMonths,
): StockItem[] {
  return stock
    .filter((item) => item.expiresOn && expiresBeforeNextCheck(item.expiresOn, today, intervalMonths))
    .sort((a, b) => a.expiresOn!.localeCompare(b.expiresOn!));
}

/**
 * «Byttet» in the beredskapssjekk: the items the user ticked off count as bought today.
 * `renewed` has the new dates, from the last one's shelf life or the type's (as «Merk som
 * byttet»); `needDate` has nothing to go by, so the user has to set the date.
 */
export function renewExpiring(
  replaced: StockItem[],
  today: IsoDate,
): { renewed: StockItem[]; needDate: StockItem[] } {
  const renewed: StockItem[] = [];
  const needDate: StockItem[] = [];
  for (const item of replaced) {
    const dates = renewedDates(item, today);
    if (dates) renewed.push({ ...item, ...dates });
    else needDate.push(item);
  }
  return { renewed, needDate };
}
