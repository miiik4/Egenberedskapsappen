import { CATEGORIES, stockType, typesFor, type StockTypeInfo } from './catalogue';
import { daysBetween } from './dates';
import {
  EXPIRY_WARNING_DAYS,
  MEALS_PER_PERSON_PER_DAY,
  SCALE_MAX_DAYS,
  TARGET_DAYS,
  WATER_LITRES_PER_CAT_PER_DAY,
  WATER_LITRES_PER_DOG_PER_DAY,
  WATER_LITRES_PER_PERSON_PER_DAY,
} from './guidance';
import type { HouseholdMembers, IsoDate, StockCategory, StockItem } from './types';

/** The three things that run out, each counted in days. */
export type DayKind = 'water' | 'food' | 'heat';

export type Coverage = {
  /** Days the household manages without power and running water, capped at SCALE_MAX_DAYS. */
  days: number;
  waterDays: number;
  foodDays: number;
  /** Heat isn't counted up: a source that works without power covers the week, none covers nothing. */
  heatDays: number;
  /** What holds the number down. Water wins a tie, then food, since they run out faster in practice. */
  limitedBy: DayKind;
  litres: number;
  litresPerDay: number;
  meals: number;
  mealsPerDay: number;
  /** What it takes to reach TARGET_DAYS. Zero once there. */
  waterLitresShort: number;
  mealsShort: number;
};

export function peopleIn(members: HouseholdMembers): number {
  return members.adults + members.seniors + members.children + members.infants;
}

/** An item still counts on the day it expires and stops counting the day after. */
export function isExpired(item: StockItem, today: IsoDate): boolean {
  return item.expiresOn !== undefined && daysBetween(today, item.expiresOn) < 0;
}

export function isExpiringSoon(item: StockItem, today: IsoDate): boolean {
  if (item.expiresOn === undefined) return false;
  const left = daysBetween(today, item.expiresOn);
  return left >= 0 && left <= EXPIRY_WARNING_DAYS;
}

/** What has expired or is about to, soonest first: what wants replacing. */
export function itemsToReplace<T extends StockItem>(items: T[], today: IsoDate): T[] {
  return items
    .filter((item) => isExpired(item, today) || isExpiringSoon(item, today))
    .sort((a, b) => (a.expiresOn ?? '').localeCompare(b.expiresOn ?? ''));
}

export function computeCoverage(members: HouseholdMembers, items: StockItem[], today: IsoDate): Coverage {
  const people = peopleIn(members);
  if (!Number.isInteger(people) || people < 1) {
    throw new Error(`A household needs at least one person, got ${people}`);
  }
  const usable = items.filter((item) => !isExpired(item, today));

  let litres = 0;
  let meals = 0;
  let heat = false;
  for (const item of usable) {
    const { measure } = stockType(item.type);
    if (measure === 'litres') litres += item.litres ?? 0;
    else if (measure === 'meals') meals += item.meals ?? 0;
    if (item.type === 'heatSource') heat = true;
  }

  const litresPerDay =
    WATER_LITRES_PER_PERSON_PER_DAY * people +
    WATER_LITRES_PER_DOG_PER_DAY * members.dogs +
    WATER_LITRES_PER_CAT_PER_DAY * members.cats;
  const mealsPerDay = MEALS_PER_PERSON_PER_DAY * people;
  const waterDays = Math.floor(litres / litresPerDay);
  const foodDays = Math.floor(meals / mealsPerDay);
  const heatDays = heat ? SCALE_MAX_DAYS : 0;
  const days = Math.min(waterDays, foodDays, heatDays, SCALE_MAX_DAYS);

  return {
    days,
    waterDays,
    foodDays,
    heatDays,
    limitedBy: waterDays <= foodDays && waterDays <= heatDays ? 'water' : foodDays <= heatDays ? 'food' : 'heat',
    litres,
    litresPerDay,
    meals,
    mealsPerDay,
    waterLitresShort: Math.max(0, Math.ceil(TARGET_DAYS * litresPerDay - litres)),
    mealsShort: Math.max(0, TARGET_DAYS * mealsPerDay - meals),
  };
}

/**
 * How many days the number drops when this item goes, e.g. «Bytt vannet · −1 døgn».
 * Returns 0 or a negative number.
 */
export function dayImpactOfLosing(
  members: HouseholdMembers,
  items: StockItem[],
  itemId: string,
  today: IsoDate,
): number {
  const without = items.filter((item) => item.id !== itemId);
  return computeCoverage(members, without, today).days - computeCoverage(members, items, today).days;
}

export type ChecklistType = StockTypeInfo & {
  /** This type's items, expired ones included so they can be replaced. */
  items: StockItem[];
  /**
   * Ticked off. Something of this type that hasn't expired; for water and food, also enough of
   * the category for TARGET_DAYS, so the list never says «på plass» while Oversikt asks for more.
   */
  have: boolean;
  /** Water or food the household has some of, but not enough for TARGET_DAYS. */
  partial: boolean;
};

export type ChecklistCategory = {
  category: StockCategory;
  types: ChecklistType[];
  /** Water, food and heat count in days: how far this category goes. */
  days?: number;
};

/** DSB's list for this household, each type ticked off once it has an item, or enough of one. */
export function checklist(members: HouseholdMembers, items: StockItem[], today: IsoDate): ChecklistCategory[] {
  const coverage = computeCoverage(members, items, today);
  const daysOf: Partial<Record<StockCategory, number>> = {
    water: coverage.waterDays,
    food: coverage.foodDays,
    heat: coverage.heatDays,
  };
  return CATEGORIES.map((category) => {
    const days = daysOf[category];
    return {
      category,
      ...(days !== undefined && { days }),
      types: typesFor(members, category).map((type) => {
        const own = items.filter((item) => item.type === type.id);
        const some = own.some((item) => !isExpired(item, today));
        const short = type.measure !== undefined && (days ?? 0) < TARGET_DAYS;
        return { ...type, items: own, have: some && !short, partial: some && short };
      }),
    };
  });
}

export function missingTypes(members: HouseholdMembers, items: StockItem[], today: IsoDate): StockTypeInfo[] {
  return checklist(members, items, today).flatMap((c) => c.types.filter((t) => !t.have));
}
