import type { HouseholdMembers } from './types';

export type GuideId = 'winterPowerOutage' | 'planSevenDays' | 'storeWater' | 'childrenAndPets';

/** October to March, when a power cut is at its most dangerous. */
const WINTER_MONTHS = [10, 11, 12, 1, 2, 3];

/**
 * The one guide «Aktuelt nå» puts first: the winter guide in winter, otherwise the one for
 * children and pets in a household that has them, and otherwise the seven-day plan.
 * `month` is 1–12.
 */
export function featuredGuide(members: HouseholdMembers, month: number): GuideId {
  if (WINTER_MONTHS.includes(month)) return 'winterPowerOutage';
  if (members.children + members.infants + members.dogs + members.cats > 0) return 'childrenAndPets';
  return 'planSevenDays';
}
