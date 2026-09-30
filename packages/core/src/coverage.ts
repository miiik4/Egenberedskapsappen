import { daysBetween } from './dates';
import {
  EXPIRY_WARNING_DAYS,
  SCALE_MAX_DAYS,
  TARGET_DAYS,
  WATER_LITRES_PER_PERSON_PER_DAY,
} from './guidance';
import type { Household, IsoDate, StockCategory, StockItem } from './types';

export type Coverage = {
  /** Days the household manages without power and running water, capped at the scale's end. */
  days: number;
  waterDays: number;
  foodDays: number;
  /** What holds the number down. Water wins a tie, since it runs out faster in practice. */
  limitedBy: 'water' | 'food';
  /** What it takes to reach TARGET_DAYS. Zero once there. */
  waterLitresShort: number;
  foodPersonDaysShort: number;
  /** Categories with nothing usable in them. Water and food are covered by the numbers above. */
  missing: StockCategory[];
};

const ESSENTIALS: StockCategory[] = ['radio', 'heatAndLight', 'firstAid', 'hygieneAndCash'];

/** An item still counts on the day it expires and stops counting the day after. */
export function isExpired(item: StockItem, today: IsoDate): boolean {
  return item.expiresOn !== undefined && daysBetween(today, item.expiresOn) < 0;
}

export function isExpiringSoon(item: StockItem, today: IsoDate): boolean {
  if (item.expiresOn === undefined) return false;
  const left = daysBetween(today, item.expiresOn);
  return left >= 0 && left <= EXPIRY_WARNING_DAYS;
}

export function computeCoverage(household: Household, items: StockItem[], today: IsoDate): Coverage {
  if (!Number.isInteger(household.people) || household.people < 1) {
    throw new Error(`A household needs at least one person, got ${household.people}`);
  }
  const usable = items.filter((item) => !isExpired(item, today));

  let litres = 0;
  let personDays = 0;
  const present = new Set<StockCategory>();
  for (const item of usable) {
    if (item.category === 'water') litres += item.litres;
    else if (item.category === 'food') personDays += item.personDays;
    present.add(item.category);
  }

  const litresPerDay = WATER_LITRES_PER_PERSON_PER_DAY * household.people;
  const waterDays = Math.floor(litres / litresPerDay);
  const foodDays = Math.floor(personDays / household.people);

  return {
    days: Math.min(waterDays, foodDays, SCALE_MAX_DAYS),
    waterDays,
    foodDays,
    limitedBy: waterDays <= foodDays ? 'water' : 'food',
    waterLitresShort: Math.max(0, TARGET_DAYS * litresPerDay - litres),
    foodPersonDaysShort: Math.max(0, TARGET_DAYS * household.people - personDays),
    missing: ESSENTIALS.filter((category) => !present.has(category)),
  };
}

/**
 * How many days the number drops when this item goes, e.g. "Bytt 6 liter vann · −1 døgn".
 * Returns 0 or a negative number.
 */
export function dayImpactOfLosing(
  household: Household,
  items: StockItem[],
  itemId: string,
  today: IsoDate,
): number {
  const without = items.filter((item) => item.id !== itemId);
  return computeCoverage(household, without, today).days - computeCoverage(household, items, today).days;
}
