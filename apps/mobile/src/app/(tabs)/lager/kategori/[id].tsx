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
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Row, Section } from '@/components/ui/list';
import { ProgressBar } from '@/components/ui/progress';
import { Screen } from '@/components/ui/screen';
import { ToolbarIcons } from '@/components/toolbar-icons';
import { Colors } from '@/constants/theme';
import { useData } from '@/data/data-provider';
import { describeType, formatDays, formatMeals, formatNumber, todayIso } from '@/lib/format';

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
              ? 'Typene følger DSBs liste. Barnemat vises når husstanden har småbarn, og fôr når dere har dyr.'
              : 'Typene følger DSBs liste.'
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
  const days =
    category === 'water' ? coverage.waterDays : category === 'food' ? coverage.foodDays : category === 'heat' ? coverage.heatDays : null;
  if (days === null) return null;

  const persons = `${people} ${people === 1 ? 'person' : 'personer'}`;
  const explanation =
    category === 'food'
      ? `Dere har ${formatMeals(Math.floor(coverage.meals / people))} per person. ${persons} trenger ${
          TARGET_DAYS * MEALS_PER_PERSON_PER_DAY
        } hver for en uke.`
      : category === 'water'
        ? `Dere har ${formatNumber(coverage.litres)} liter og bruker ${formatNumber(coverage.litresPerDay)} liter per døgn. En uke trenger ${formatNumber(
            TARGET_DAYS * coverage.litresPerDay,
          )} liter.`
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
  days: { fontSize: 34, fontWeight: '700', letterSpacing: -0.7, color: Colors.label },
  of: { fontSize: 15, color: Colors.secondaryLabel },
  explanation: { fontSize: 15, lineHeight: 21, color: Colors.secondaryLabel },
});
