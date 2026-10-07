import { TARGET_DAYS, type Coverage, type HouseholdMembers, type StockItem } from '@egenberedskap/core';

/** What the calculator asks: the first two steps of «Kom i gang» in the app. */
export type CalcState = {
  members: HouseholdMembers;
  litres: number;
  meals: number;
  heat: boolean;
};

export const START: CalcState = {
  members: { adults: 2, seniors: 0, children: 1, infants: 0, dogs: 0, cats: 0 },
  litres: 30,
  meals: 45,
  heat: true,
};

export function toItems({ litres, meals, heat }: CalcState): StockItem[] {
  const base = { quantity: 1, remind: false, location: '' };
  return [
    { ...base, id: 'water', name: 'Vann', type: 'drinkingWater', litres },
    { ...base, id: 'food', name: 'Mat', type: 'cannedMeals', meals },
    ...(heat ? [{ ...base, id: 'heat', name: 'Varme', type: 'heatSource' as const }] : []),
  ];
}

/** «7+ døgn» past the target, as in the app. */
const formatDays = (days: number) => (days > TARGET_DAYS ? `${TARGET_DAYS}+ døgn` : `${days} døgn`);

export function describe(coverage: Coverage) {
  const limiter =
    coverage.days >= TARGET_DAYS
      ? 'Dere følger DSBs anbefaling.'
      : {
          water: 'Det er vannet som mangler mest.',
          food: 'Det er maten som mangler mest.',
          heat: 'Det er varmen som mangler mest.',
        }[coverage.limitedBy];

  const missing = [
    coverage.waterLitresShort > 0 && `${coverage.waterLitresShort} liter vann`,
    coverage.mealsShort > 0 && `${coverage.mealsShort} ${coverage.mealsShort === 1 ? 'måltid' : 'måltider'}`,
    coverage.heatDays === 0 && 'en varmekilde som virker uten strøm',
  ].filter((part): part is string => Boolean(part));
  const short = missing.length
    ? `For å klare en uke mangler dere ${missing.length === 1 ? missing[0] : `${missing.slice(0, -1).join(', ')} og ${missing.at(-1)}`}. I appen ligger det klart som en handleliste.`
    : 'Alt på plass for en uke. Appen minner dere på det som går ut på dato.';

  return {
    days: Math.min(coverage.days, TARGET_DAYS),
    limiter,
    short,
    rows: [
      { kind: 'water', name: 'Vann', days: coverage.waterDays },
      { kind: 'food', name: 'Mat', days: coverage.foodDays },
      { kind: 'heat', name: 'Varme', days: coverage.heatDays },
    ].map((row) => ({ ...row, value: formatDays(row.days), share: Math.min(row.days / TARGET_DAYS, 1) })),
  };
}
