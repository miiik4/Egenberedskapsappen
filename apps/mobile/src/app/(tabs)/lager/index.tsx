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
  type StockCategory,
} from '@egenberedskap/core';
import { router, Stack, type Href } from 'expo-router';
import { useState } from 'react';
import { LayoutAnimation, StyleSheet } from 'react-native';

import { Task } from '@/components/preparedness/task-row';
import { CheckCircle, PartialCircle, WarningDot } from '@/components/ui/check-circle';
import { Icon } from '@/components/ui/icon';
import { Row, Section } from '@/components/ui/list';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { ToolbarIcons } from '@/components/toolbar-icons';
import { Colors, Spacing } from '@/constants/theme';
import { useData } from '@/data/data-provider';
import { capitalize, describeAction, formatExpiry, formatMeals, formatNumber, todayIso } from '@/lib/format';
import { Text } from '@/components/ui/text';

/** Tasks lifted to the top: the few that matter most, so the list below doesn't have to be read. */
const TASKS_SHOWN = 3;

/**
 * DSB's whole list as one checklist, split by category as in Reminders. A type is ticked off
 * once it has something in it, and water and food once there's enough for the week, so the
 * list says what Oversikt says. The things worth getting first are lifted to the top, and each
 * category folds, so the list is a row per category until one is opened.
 */
export default function Lager() {
  const { household, stock } = useData();
  const today = todayIso();
  const list = checklist(household, stock, today);
  const coverage = computeCoverage(household, stock, today);
  const actions = nextActions(household, stock, today);
  const missing = list.reduce((n, c) => n + c.types.filter((t) => !t.have).length, 0);
  // What to get or replace, in the order Oversikt ranks it; the plan for a crisis belongs on Nødinfo.
  const toGet = actions.filter((a) => a.kind !== 'addContact' && a.kind !== 'addMeetingPlace' && a.kind !== 'followUp');
  const [open, setOpen] = useState<StockCategory[]>([]);
  const toggle = (category: StockCategory) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(open.includes(category) ? open.filter((c) => c !== category) : [...open, category]);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Lager' }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon={ToolbarIcons.plus} accessibilityLabel="Ny vare" onPress={() => router.push('/vare')} />
      </Stack.Toolbar>

      <Screen>
        <Text style={styles.subtitle}>{missing === 0 ? 'Alt på listen er på plass' : `${missing} ting mangler`}</Text>

        {toGet.length > 0 && (
          <Section
            header="Viktigst å skaffe"
            headerDetail={toGet.length > TASKS_SHOWN ? `${TASKS_SHOWN} av ${toGet.length}` : undefined}
            footer="Det som gir flest døgn først. Resten står under kategoriene.">
            {toGet.slice(0, TASKS_SHOWN).map((action, i) => (
              <Task key={i} action={action} />
            ))}
          </Section>
        )}

        <Section header="Hele listen" separatorInset={56}>
          {list.flatMap((entry) =>
            categoryRows({
              entry,
              open: open.includes(entry.category),
              onToggle: () => toggle(entry.category),
              actions,
              coverage,
              today,
            }),
          )}
        </Section>
        <Text style={styles.footnote}>Basert på DSBs liste for egenberedskap. Mengdene tilpasses husstanden.</Text>
      </Screen>
    </>
  );
}

/**
 * One category's rows: folded, the one that says how it stands, «Vann · 7 av 7 døgn»; opened, its types follow,
 * with what water or food still lacks for the week first. Vann, mat and varme have a page of their own with the
 * sums. A function, not a component, so the section sees every row and puts its separator between them.
 */
function categoryRows({
  entry,
  open,
  onToggle,
  actions,
  coverage,
  today,
}: {
  entry: ChecklistCategory;
  open: boolean;
  onToggle: () => void;
  actions: NextAction[];
  coverage: Coverage;
  today: string;
}) {
  const { category, types, days } = entry;
  const have = types.filter((t) => t.have).length;
  const complete = days !== undefined ? days >= TARGET_DAYS : have === types.length;
  const share = days !== undefined ? Math.min(days, TARGET_DAYS) / TARGET_DAYS : have / types.length;
  const detail = days !== undefined ? `${Math.min(days, TARGET_DAYS)} av ${TARGET_DAYS} døgn` : `${have} av ${types.length}`;
  const name = CATEGORY_NAMES[category];
  return [
    <Row
      key={`${category}-header`}
      title={name}
      bold
      detail={detail}
      leading={complete ? <CheckCircle on /> : share > 0 ? <PartialCircle share={share} /> : <CheckCircle on={false} />}
      trailing={
        <Icon
          name={open ? { ios: 'chevron.up', android: 'expand_less' } : { ios: 'chevron.down', android: 'expand_more' }}
          size={13}
          color={Colors.tertiaryLabel}
        />
      }
      accessibilityLabel={`${name}, ${detail}, ${open ? 'åpen' : 'lukket'}`}
      onPress={onToggle}
    />,
    ...(open
      ? [
          shortfall(entry, actions, coverage),
          ...types.map((type) => <TypeRow key={type.id} type={type} today={today} share={(days ?? 0) / TARGET_DAYS} />),
          days !== undefined && (
            <Row
              key={`${category}-more`}
              title={`Mer om ${name.toLowerCase()}`}
              titleColor={Colors.accent}
              chevron
              onPress={() => router.push({ pathname: '/lager/kategori/[id]', params: { id: category } })}
            />
          ),
        ]
      : []),
  ];
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
