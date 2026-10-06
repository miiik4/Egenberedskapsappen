import type { StockTypeInfo } from './catalogue';
import { computeCoverage, dayImpactOfLosing, isExpiringSoon, missingTypes } from './coverage';
import { TARGET_DAYS } from './guidance';
import type { HouseholdMembers, IsoDate, StockItem, StockType } from './types';

/** One entry in «Neste å gjøre». The ones that count in days say what they do to the number. */
export type NextAction =
  | { kind: 'buyWater'; litres: number; dayChange: number }
  /** `days` short of the target; `suggestions` are the food types the household has none of. */
  | { kind: 'buyFood'; meals: number; days: number; suggestions: StockTypeInfo[]; dayChange: number }
  | { kind: 'replace'; item: StockItem; expiresOn: IsoDate; dayChange: number }
  | { kind: 'getType'; type: StockTypeInfo; dayChange: number };

/**
 * What the household should do next, most valuable first: close the gaps that hold the
 * number down, replace expiring items that would lower it (soonest first), get what's
 * missing from the list, and only then replace expiring items that don't change it.
 */
export function nextActions(members: HouseholdMembers, items: StockItem[], today: IsoDate): NextAction[] {
  const coverage = computeCoverage(members, items, today);
  const daysWith = (extra: Partial<StockItem> & { type: StockType }) =>
    computeCoverage(members, [...items, { id: '_', name: '', quantity: 1, remind: false, location: '', ...extra }], today)
      .days - coverage.days;
  const missing = missingTypes(members, items, today);
  const actions: NextAction[] = [];

  if (coverage.waterLitresShort > 0) {
    const litres = coverage.waterLitresShort;
    actions.push({ kind: 'buyWater', litres, dayChange: daysWith({ type: 'drinkingWater', litres }) });
  }
  if (coverage.mealsShort > 0) {
    const meals = coverage.mealsShort;
    actions.push({
      kind: 'buyFood',
      meals,
      days: TARGET_DAYS - coverage.foodDays,
      suggestions: missing.filter((t) => t.measure === 'meals'),
      dayChange: daysWith({ type: 'cannedMeals', meals }),
    });
  }
  const heat = missing.find((t) => t.id === 'heatSource');
  if (heat) actions.push({ kind: 'getType', type: heat, dayChange: daysWith({ type: 'heatSource' }) });

  const replacements = items
    .filter((item) => isExpiringSoon(item, today))
    .sort((a, b) => a.expiresOn!.localeCompare(b.expiresOn!))
    .map((item): NextAction => ({
      kind: 'replace',
      item,
      expiresOn: item.expiresOn!,
      dayChange: dayImpactOfLosing(members, items, item.id, today),
    }));
  const costsDays = (action: NextAction) => action.kind === 'replace' && action.dayChange < 0;
  actions.push(...replacements.filter(costsDays));

  // Water and food for people are covered by the two amounts above; heat by its own entry.
  for (const type of missing) {
    if (type.measure || type.id === 'heatSource') continue;
    actions.push({ kind: 'getType', type, dayChange: 0 });
  }
  // A missing baby food is worth its own line even when the meals add up.
  const baby = missing.find((t) => t.id === 'babyFood');
  if (baby && coverage.mealsShort === 0) actions.push({ kind: 'getType', type: baby, dayChange: 0 });

  actions.push(...replacements.filter((action) => !costsDays(action)));
  return actions;
}
