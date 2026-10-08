import { addDays, daysBetween } from './dates';
import { nextCheck } from './check';
import { EXPIRY_REMINDER_DAYS, type CheckIntervalMonths } from './guidance';
import type { IsoDate, StockItem } from './types';

/**
 * iOS keeps at most 64 pending local notifications per app. Staying under it leaves room,
 * and the plan is rebuilt whenever data changes, so later reminders are picked up in time.
 */
export const MAX_REMINDERS = 60;

export type Reminder =
  /** Everything whose warning falls on the same day, in one notification. */
  | { kind: 'expiring'; on: IsoDate; expiresOn: IsoDate; items: StockItem[] }
  | { kind: 'check'; on: IsoDate }
  /** «Påminn meg» from the beredskapssjekk. */
  | { kind: 'expiryReview'; on: IsoDate };

export type ReminderInput = {
  items: StockItem[];
  /** The last check, or when the household was set up if there hasn't been one. */
  lastCheck: IsoDate;
  checkIntervalMonths: CheckIntervalMonths;
  expiryReviewOn: IsoDate | null;
  today: IsoDate;
};

/**
 * Every reminder still ahead, soonest first. Days already past are left out: Home shows
 * what's expiring or overdue, so a late notification would add nothing.
 */
export function planReminders({
  items,
  lastCheck,
  checkIntervalMonths,
  expiryReviewOn,
  today,
}: ReminderInput): Reminder[] {
  const ahead = (on: IsoDate) => daysBetween(today, on) >= 0;
  const reminders: Reminder[] = [];

  const byWarningDay = new Map<IsoDate, StockItem[]>();
  for (const item of items) {
    if (!item.expiresOn || !item.remind) continue;
    const on = addDays(item.expiresOn, -EXPIRY_REMINDER_DAYS);
    if (!ahead(on)) continue;
    byWarningDay.set(on, [...(byWarningDay.get(on) ?? []), item]);
  }
  for (const [on, dayItems] of byWarningDay) {
    reminders.push({ kind: 'expiring', on, expiresOn: addDays(on, EXPIRY_REMINDER_DAYS), items: dayItems });
  }

  const checkDue = nextCheck(lastCheck, checkIntervalMonths);
  if (ahead(checkDue)) reminders.push({ kind: 'check', on: checkDue });

  if (expiryReviewOn && ahead(expiryReviewOn)) reminders.push({ kind: 'expiryReview', on: expiryReviewOn });

  return reminders.sort((a, b) => a.on.localeCompare(b.on)).slice(0, MAX_REMINDERS);
}
