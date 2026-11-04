import { addDays, addMonths, daysBetween } from './dates';
import { nextCheck } from './check';
import {
  EXPIRY_REMINDER_DAYS,
  SMOKE_ALARM_REMINDER_HORIZON_MONTHS,
  SMOKE_ALARM_TEST_INTERVALS_MONTHS,
  type CheckIntervalMonths,
  type SmokeAlarmTestIntervalMonths,
} from './guidance';
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
  | { kind: 'expiryReview'; on: IsoDate }
  /** Time to press the test button on the smoke alarms. */
  | { kind: 'smokeAlarm'; on: IsoDate };

export function isSmokeAlarmTestInterval(months: number): months is SmokeAlarmTestIntervalMonths {
  return (SMOKE_ALARM_TEST_INTERVALS_MONTHS as readonly number[]).includes(months);
}

/** Remind to test the smoke alarms every `everyMonths`, counted from `from` (when it was turned on). */
export type SmokeAlarmTest = { everyMonths: SmokeAlarmTestIntervalMonths; from: IsoDate };

export type ReminderInput = {
  items: StockItem[];
  /** The last check, or when the household was set up if there hasn't been one. */
  lastCheck: IsoDate;
  checkIntervalMonths: CheckIntervalMonths;
  expiryReviewOn: IsoDate | null;
  /** Off when null. */
  smokeAlarmTest?: SmokeAlarmTest | null;
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
  smokeAlarmTest = null,
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

  if (smokeAlarmTest) {
    // Counted from the start each time (not from the previous date), so the 31st doesn't drift to the 28th.
    const until = addMonths(today, SMOKE_ALARM_REMINDER_HORIZON_MONTHS);
    for (let n = 1; ; n++) {
      const on = addMonths(smokeAlarmTest.from, n * smokeAlarmTest.everyMonths);
      if (daysBetween(until, on) > 0) break;
      if (ahead(on)) reminders.push({ kind: 'smokeAlarm', on });
    }
  }

  return reminders.sort((a, b) => a.on.localeCompare(b.on)).slice(0, MAX_REMINDERS);
}
