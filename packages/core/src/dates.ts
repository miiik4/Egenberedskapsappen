import type { IsoDate } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtcMs(date: IsoDate): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error(`Not an ISO date: ${date}`);
  const [, y, m, d] = match;
  return Date.UTC(Number(y), Number(m) - 1, Number(d));
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return new Date(toUtcMs(date) + days * DAY_MS).toISOString().slice(0, 10);
}
