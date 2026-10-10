import {
  checklist,
  computeCoverage,
  itemsToReplace,
  CATEGORY_NAMES,
  daysBetween,
  isExpired,
  nextActions,
  TARGET_DAYS,
  type ChecklistCategory,
  type ChecklistType,
  type Coverage,
  type NextAction,
} from '@egenberedskap/core';
import { router, Stack, useLocalSearchParams, type Href } from 'expo-router';
import { StyleSheet } from 'react-native';

import { CheckCircle, PartialCircle, WarningDot } from '@/components/ui/check-circle';
import { Row, Section } from '@/components/ui/list';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { ToolbarIcons } from '@/components/toolbar-icons';
import { Colors, Spacing } from '@/constants/theme';
import { useData } from '@/data/data-provider';
import { capitalize, describeAction, formatExpiry, formatMeals, formatNumber, todayIso } from '@/lib/format';
import { Text } from '@/components/ui/text';

type Filter = 'alle' | 'mangler';

/**
 * DSB's whole list as one checklist, split by category as in Reminders. A type is ticked off
 * once it has something in it, and water and food once there's enough for the week, so the
 * list says what Oversikt says. «Mangler» leaves a shopping list, with the amounts.
 */
export default function Lager() {
  // In the URL, so «Se hele listen» on Oversikt can switch it even when Lager is already open.
  const params = useLocalSearchParams<{ filter?: Filter }>();
  const filter: Filter = params.filter === 'mangler' ? 'mangler' : 'alle';
  const setFilter = (next: Filter) => router.setParams({ filter: next });
  const { household, stock } = useData();
  const today = todayIso();
  const list = checklist(household, stock, today);
  const coverage = computeCoverage(household, stock, today);
  const actions = nextActions(household, stock, today);
  const missing = list.reduce((n, c) => n + c.types.filter((t) => !t.have).length, 0);

  return (
    <>
      <Stack.Screen options={{ title: 'Lager' }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon={ToolbarIcons.plus} accessibilityLabel="Ny vare" onPress={() => router.push('/vare')} />
      </Stack.Toolbar>

      <Screen>
        <Text style={styles.subtitle}>{missing === 0 ? 'Alt på listen er på plass' : `${missing} ting mangler`}</Text>
        <Segmented
          options={[
            { value: 'alle', label: 'Alle' },
            { value: 'mangler', label: 'Mangler' },
          ]}
          value={filter}
          onChange={setFilter}
        />

        {list.map((entry) => {
          const { category, types, days } = entry;
          const shown = filter === 'mangler' ? types.filter((t) => !t.have) : types;
          const short = shortfall(entry, actions, coverage);
          if (shown.length === 0 && !short) return null;
          return (
            <Section
              key={category}
              header={CATEGORY_NAMES[category]}
              headerDetail={
                days !== undefined
                  ? `${Math.min(days, TARGET_DAYS)} av ${TARGET_DAYS} døgn`
                  : `${types.filter((t) => t.have).length} av ${types.length}`
              }
              onHeaderPress={() => router.push({ pathname: '/lager/kategori/[id]', params: { id: category } })}
              separatorInset={56}>
              {short}
              {shown.map((type) => (
                <TypeRow key={type.id} type={type} today={today} share={(days ?? 0) / TARGET_DAYS} />
              ))}
            </Section>
          );
        })}
        <Text style={styles.footnote}>Basert på DSBs liste for egenberedskap. Mengdene tilpasses husstanden.</Text>
      </Screen>
    </>
  );
}

/**
 * What water or food lacks for the week, as the task on Oversikt says it: «Kjøp 30 liter vann».
 * Opens «Ny vare» filled in with the amount.
 */
function shortfall({ category }: ChecklistCategory, actions: NextAction[], coverage: Coverage) {
  const action = actions.find((a) => (category === 'water' ? a.kind === 'buyWater' : category === 'food' && a.kind === 'buyFood'));
  if (!action || (action.kind !== 'buyWater' && action.kind !== 'buyFood')) return null;
  const { title } = describeAction(action);
  const subtitle =
    action.kind === 'buyWater'
      ? `Dere har ${formatNumber(coverage.litres)} av ${formatNumber(TARGET_DAYS * coverage.litresPerDay)} liter`
      : `Dere har ${formatNumber(coverage.meals)} av ${formatMeals(TARGET_DAYS * coverage.mealsPerDay)}`;
  const href: Href =
    action.kind === 'buyWater'
      ? { pathname: '/vare', params: { type: 'drinkingWater', litres: String(action.litres) } }
      : { pathname: '/vare', params: { type: action.suggestions[0]?.id ?? 'cannedMeals', meals: String(action.meals) } };
  return (
    <Row
      key="shortfall"
      title={title}
      subtitle={subtitle}
      bold
      leading={<CheckCircle on={false} />}
      trailing={action.dayChange > 0 ? <Pill label={`+${action.dayChange} døgn`} tone="accent" /> : undefined}
      onPress={() => router.push(href)}
    />
  );
}

function TypeRow({ type, today, share }: { type: ChecklistType; today: string; share: number }) {
  const expiring = itemsToReplace(type.items, today)[0];
  // What still counts: expired items are in the list only so they can be replaced.
  const own = type.items.filter((item) => !isExpired(item, today)).reduce(
    (sum, item) => sum + (type.measure === 'litres' ? (item.litres ?? 0) : (item.meals ?? 0)),
    0,
  );
  const subtitle = expiring?.expiresOn
    ? capitalize(formatExpiry(daysBetween(today, expiring.expiresOn)))
    : type.partial
      ? type.measure === 'litres'
        ? `${formatNumber(own)} liter`
        : formatMeals(own)
      : type.hint || undefined;

  return (
    <Row
      title={type.name}
      subtitle={subtitle}
      leading={type.partial ? <PartialCircle share={share} /> : <CheckCircle on={type.have} />}
      trailing={expiring ? <WarningDot /> : undefined}
      onPress={() =>
        type.items.length > 0
          ? router.push({ pathname: '/lager/type/[id]', params: { id: type.id } })
          : router.push({ pathname: '/vare', params: { type: type.id } })
      }
    />
  );
}

const styles = StyleSheet.create({
  subtitle: { marginHorizontal: Spacing.screen + 4, marginTop: Spacing.underTitle, fontSize: 17, color: Colors.secondaryLabel },
  footnote: { marginHorizontal: Spacing.screen + Spacing.rowInset, marginTop: -14, fontSize: 13, lineHeight: 18, color: Colors.secondaryLabel },
});
