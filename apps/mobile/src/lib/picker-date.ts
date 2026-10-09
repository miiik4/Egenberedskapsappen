import type { IsoDate } from '@egenberedskap/core';

import { todayIso } from './format';

/**
 * A calendar day in and out of a native date picker, so the day the user sees is the day that's
 * saved, whatever the time zone.
 *
 * iOS's picker works in local time: the day is local midnight, and the picked Date is read
 * with the local calendar. Android's Material picker works in UTC: it shows the UTC day of the
 * value it gets and hands back UTC midnight of the chosen day. Local midnight in Norway is the
 * evening before in UTC, so passing it there opened the dialog on the previous day and saved
 * that day on OK.
 */
export function toPickerDate(date: IsoDate, utc: boolean): Date {
  const [y, m, d] = date.split('-').map(Number);
  return utc ? new Date(Date.UTC(y!, m! - 1, d!)) : new Date(y!, m! - 1, d!);
}

export function fromPickerDate(picked: Date, utc: boolean): IsoDate {
  if (!utc) return todayIso(picked);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${picked.getUTCFullYear()}-${pad(picked.getUTCMonth() + 1)}-${pad(picked.getUTCDate())}`;
}
