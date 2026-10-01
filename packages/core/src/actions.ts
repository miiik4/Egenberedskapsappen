import { computeCoverage, dayImpactOfLosing, isExpiringSoon } from './coverage';
import type { Household, IsoDate, StockCategory, StockItem } from './types';

/** One entry in «Neste å gjøre». Each says what it does to the headline number. */
export type NextAction =
  | { kind: 'buyWater'; litres: number; dayChange: number }
  | { kind: 'buyFood'; personDays: number; dayChange: number }
  | { kind: 'replace'; item: StockItem; expiresOn: IsoDate; dayChange: number }
  | { kind: 'getEssential'; category: StockCategory };

/**
 * What the household should do next, most valuable first: close the gap to the target,
 * replace expiring items that would lower the number (soonest first), fill missing
 * essentials, and only then replace expiring items that don't change the number.
 */
export function nextActions(household: Household, items: StockItem[], today: IsoDate): NextAction[] {
  const coverage = computeCoverage(household, items, today);
  const daysWith = (extra: StockItem) => computeCoverage(household, [...items, extra], today).days;
  const actions: NextAction[] = [];

  if (coverage.waterLitresShort > 0) {
    const litres = coverage.waterLitresShort;
    const dayChange = daysWith({ id: '_', name: '', category: 'water', litres }) - coverage.days;
    actions.push({ kind: 'buyWater', litres, dayChange });
  }
  if (coverage.foodPersonDaysShort > 0) {
    const personDays = coverage.foodPersonDaysShort;
    const dayChange = daysWith({ id: '_', name: '', category: 'food', personDays }) - coverage.days;
    actions.push({ kind: 'buyFood', personDays, dayChange });
  }

  const replacements = items
    .filter((item) => isExpiringSoon(item, today))
    .sort((a, b) => a.expiresOn!.localeCompare(b.expiresOn!))
    .map((item): NextAction => ({
      kind: 'replace',
      item,
      expiresOn: item.expiresOn!,
      dayChange: dayImpactOfLosing(household, items, item.id, today),
    }));
  const costsDays = (action: NextAction) => action.kind === 'replace' && action.dayChange < 0;

  actions.push(...replacements.filter(costsDays));
  coverage.missing.forEach((category) => actions.push({ kind: 'getEssential', category }));
  // Expiring items that don't move the number still need replacing, just not before a gap.
  actions.push(...replacements.filter((action) => !costsDays(action)));
  return actions;
}
