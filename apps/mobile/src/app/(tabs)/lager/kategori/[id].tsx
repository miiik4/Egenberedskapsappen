import {
  CATEGORIES,
  CATEGORY_NAMES,
  checklist,
  computeCoverage,
  MEALS_PER_PERSON_PER_DAY,
  peopleIn,
  TARGET_DAYS,
  type ChecklistType,
  type Coverage,
  type StockCategory,
} from '@egenberedskap/core';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { DAY_ROWS } from '@/components/preparedness/day-rows';
import { Card } from '@/components/ui/card';
import { Row, Section } from '@/components/ui/list';
import { ProgressBar } from '@/components/ui/progress';
import { Screen } from '@/components/ui/screen';
import { ToolbarIcons } from '@/components/toolbar-icons';
import { Colors, Fonts } from '@/constants/theme';
import { useData } from '@/data/data-provider';
import { describeType, formatDays, formatMeals, formatNumber, formatPeriod, todayIso } from '@/lib/format';
import { Text } from '@/components/ui/text';

/** One category from DSB's list, split into its types, each with the household's own items. */
export default function Kategori() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { household, stock } = useData();
  const category = CATEGORIES.find((c) => c === id);
  if (!category) return null;

  const today = todayIso();
  const coverage = computeCoverage(household, stock, today);
  const types = checklist(household, stock, today).find((c) => c.category === category)!.types;

  return (
    <>
      <Stack.Screen options={{ title: CATEGORY_NAMES[category] }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={ToolbarIcons.plus}
          accessibilityLabel="Ny vare"
          onPress={() => router.push({ pathname: '/vare', params: { type: types[0]!.id } })}
        />
      </Stack.Toolbar>

      <Screen>
        <DaysCard category={category} coverage={coverage} people={peopleIn(household)} />
        <Section
          header="Typer"
          footer={
            category === 'food'
              ? 'Typene bygger på DSBs liste. Barnemat vises når husstanden har småbarn, og fôr når dere har dyr.'
              : category === 'hygiene'
                ? 'Typene bygger på DSBs liste. Bleier vises når husstanden har småbarn.'
                : 'Typene bygger på DSBs liste.'
          }>
          {types.map((type) => (
            <TypeRow key={type.id} type={type} />
          ))}
        </Section>
      </Screen>
    </>
  );
}

function TypeRow({ type }: { type: ChecklistType }) {
  if (type.items.length === 0) {
    return (
      <Row
        title={type.name}
        subtitle="Ingen ennå"
        trailing={<Text style={styles.add}>Legg til</Text>}
        onPress={() => router.push({ pathname: '/vare', params: { type: type.id } })}
      />
    );
  }
  return (
    <Row
      title={type.name}
      subtitle={describeType(type)}
      chevron
      onPress={() => router.push({ pathname: '/lager/type/[id]', params: { id: type.id } })}
    />
  );
}

/** How far the category goes towards DSB's week, and the sum behind it. Only water, food and heat count in days. */
function DaysCard({ category, coverage, people }: { category: StockCategory; coverage: Coverage; people: number }) {
  const row = DAY_ROWS.find((r) => r.kind === category);
  if (!row) return null;
  const days = row.days(coverage);

  const persons = `${people} ${people === 1 ? 'person' : 'personer'}`;
  const week = formatPeriod(TARGET_DAYS);
  const explanation =
    category === 'food'
      ? `Dere har ${formatMeals(Math.floor(coverage.meals / people))} per person. ${persons} trenger ${formatMeals(
          TARGET_DAYS * MEALS_PER_PERSON_PER_DAY,
        )}${people === 1 ? '' : ' hver'} for ${week}.`
      : category === 'water'
        ? `Dere har ${formatNumber(coverage.litres)} liter og bruker ${formatNumber(coverage.litresPerDay)} liter per døgn. ${
            week.charAt(0).toUpperCase() + week.slice(1)
          } trenger ${formatNumber(TARGET_DAYS * coverage.litresPerDay)} liter.`
        : coverage.heatDays > 0
          ? 'Dere har en varmekilde som virker uten strøm.'
          : 'Uten en varmekilde som virker uten strøm blir det fort kaldt inne om vinteren.';

  return (
    <Card>
      <View style={styles.head}>
        <Text style={styles.days}>{formatDays(days)}</Text>
        <Text style={styles.of}>av {TARGET_DAYS}</Text>
      </View>
      <ProgressBar value={days / TARGET_DAYS} />
      <Text style={styles.explanation}>{explanation}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  add: { fontSize: 17, color: Colors.accent },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  days: { fontFamily: Fonts.display, fontSize: 32, letterSpacing: -0.6, color: Colors.label },
  of: { fontSize: 15, color: Colors.secondaryLabel },
  explanation: { fontSize: 15, lineHeight: 21, color: Colors.secondaryLabel },
});
