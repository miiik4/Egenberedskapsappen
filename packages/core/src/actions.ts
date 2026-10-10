import type { StockTypeInfo } from './catalogue';
import { checklist, computeCoverage, dayImpactOfLosing, isExpiringSoon } from './coverage';
import { TARGET_DAYS } from './guidance';
import type { FollowUp, HouseholdMembers, IsoDate, StockItem, StockType } from './types';

/** One entry in «Neste å gjøre». The ones that count in days say what they do to the number. */
export type NextAction =
  | { kind: 'buyWater'; litres: number; dayChange: number }
  /** `days` short of the target; `suggestions` are the food types the household has none of. */
  | { kind: 'buyFood'; meals: number; days: number; suggestions: StockTypeInfo[]; dayChange: number }
  | { kind: 'replace'; item: StockItem; expiresOn: IsoDate; dayChange: number }
  | { kind: 'getType'; type: StockTypeInfo; dayChange: number }
  /** Nødinfo: the plan for a crisis, not only the stockpile. */
  | { kind: 'addContact'; dayChange: 0 }
  | { kind: 'addMeetingPlace'; dayChange: 0 }
  /** Left over from the beredskapssjekk («Endre», «Må fikses»), until done. */
  | { kind: 'followUp'; followUp: FollowUp; dayChange: 0 };

/** What else «Neste å gjøre» goes by, beside the stockpile. Leave out for the stockpile alone. */
export type PlanState = { contacts: number; meetingPlace: boolean; followUps: FollowUp[] };

/**
 * What the household should do next, most valuable first: close the gaps that hold the
 * number down, replace expiring items that would lower it (soonest first), get what's
 * missing from the list, and only then replace expiring items that don't change it.
 * With `plan`, an emergency contact and a meeting place come right after the biggest gap,
 * so the plan for a crisis is never pushed out of sight by the shopping, and what the
 * beredskapssjekk left to fix follows the gaps.
 */
export function nextActions(
  members: HouseholdMembers,
  items: StockItem[],
  today: IsoDate,
  plan?: PlanState,
): NextAction[] {
  const coverage = computeCoverage(members, items, today);
  const daysWith = (extra: Partial<StockItem> & { type: StockType }) =>
    computeCoverage(members, [...items, { id: '_', name: '', quantity: 1, remind: false, location: '', ...extra }], today)
      .days - coverage.days;
  // Types with nothing in them. Water and food that is only short is counted in the amounts below.
  const missing = checklist(members, items, today).flatMap((c) => c.types.filter((t) => !t.have && !t.partial));
  const gaps: NextAction[] = [];

  if (coverage.waterLitresShort > 0) {
    const litres = coverage.waterLitresShort;
    gaps.push({ kind: 'buyWater', litres, dayChange: daysWith({ type: 'drinkingWater', litres }) });
  }
  if (coverage.mealsShort > 0) {
    const meals = coverage.mealsShort;
    gaps.push({
      kind: 'buyFood',
      meals,
      days: TARGET_DAYS - coverage.foodDays,
      suggestions: missing.filter((t) => t.measure === 'meals'),
      dayChange: daysWith({ type: 'cannedMeals', meals }),
    });
  }
  const heat = missing.find((t) => t.id === 'heatSource');
  if (heat) gaps.push({ kind: 'getType', type: heat, dayChange: daysWith({ type: 'heatSource' }) });

  const nodinfo: NextAction[] = [];
  if (plan && plan.contacts === 0) nodinfo.push({ kind: 'addContact', dayChange: 0 });
  if (plan && !plan.meetingPlace) nodinfo.push({ kind: 'addMeetingPlace', dayChange: 0 });
  const followUps = (plan?.followUps ?? [])
    // With no contacts at all, «Legg til en nødkontakt» already says it.
    .filter((f) => !(f === 'contacts' && plan?.contacts === 0))
    .map((followUp): NextAction => ({ kind: 'followUp', followUp, dayChange: 0 }));
  const actions: NextAction[] = [...gaps.slice(0, 1), ...nodinfo, ...gaps.slice(1), ...followUps];

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
