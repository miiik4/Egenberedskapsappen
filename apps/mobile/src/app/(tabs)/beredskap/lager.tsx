import {
  computeCoverage,
  isExpired,
  isExpiringSoon,
  TARGET_DAYS,
  WATER_LITRES_PER_PERSON_PER_DAY,
  type StockCategory,
  type StockItem,
} from '@egenberedskap/core';
import { router, Stack } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { AddRow, Row, Section } from '@/components/ui/list';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { Colors, Spacing } from '@/constants/theme';
import { useData } from '@/data/data-provider';
import { categoryName, formatDate, todayIso } from '@/lib/format';

const ESSENTIAL_HINTS: Record<Exclude<StockCategory, 'water' | 'food'>, string> = {
  radio: 'DAB-radio på batteri',
  heatAndLight: 'Lommelykt, lys, fyrstikker',
  firstAid: 'Inkl. faste medisiner',
  hygieneAndCash: 'Kontanter, våtservietter, toalettpapir',
};

const editItem = (item: StockItem) => router.push({ pathname: '/vare', params: { id: item.id } });
const addItem = (category?: StockCategory) =>
  router.push(category ? { pathname: '/vare', params: { category } } : '/vare');

export default function Lager() {
  const { household, stock } = useData();
  const today = todayIso();
  const coverage = computeCoverage(household, stock, today);
  const expiring = stock
    .filter((item) => isExpiringSoon(item, today))
    .sort((a, b) => a.expiresOn!.localeCompare(b.expiresOn!));

  const targetLitres = TARGET_DAYS * WATER_LITRES_PER_PERSON_PER_DAY * household.people;
  const litres = targetLitres - coverage.waterLitresShort;
  const check = <Icon name={{ ios: 'checkmark', android: 'check' }} size={15} color={Colors.success} />;

  return (
    <>
      <Stack.Screen options={{ title: 'Beredskapslager' }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="plus" accessibilityLabel="Legg til vare" onPress={() => addItem()} />
      </Stack.Toolbar>

      <Screen>
        <Text style={styles.subtitle}>
          Dekker {Math.min(coverage.days, TARGET_DAYS)} av {TARGET_DAYS} døgn · {household.people}{' '}
          {household.people === 1 ? 'person' : 'personer'}
        </Text>

        {expiring.length > 0 && (
          <Section header="Går ut snart">
            {expiring.map((item) => (
              <Row key={item.id} title={item.name} detail={formatDate(item.expiresOn!)} chevron onPress={() => editItem(item)} />
            ))}
          </Section>
        )}

        <Section header="Status" footer="Mengdene regnes ut fra antall personer i husstanden.">
          <Row
            title={categoryName.water}
            subtitle={`${WATER_LITRES_PER_PERSON_PER_DAY} liter per person per døgn`}
            trailing={<Pill label={`${litres} / ${targetLitres} l`} tone={coverage.waterLitresShort ? 'warning' : 'success'} />}
            onPress={coverage.waterLitresShort ? () => addItem('water') : undefined}
          />
          <Row
            title={categoryName.food}
            subtitle="Holdbar, uten kjøling"
            trailing={
              <Pill
                label={`${Math.min(coverage.foodDays, TARGET_DAYS)} / ${TARGET_DAYS} døgn`}
                tone={coverage.foodPersonDaysShort ? 'warning' : 'success'}
              />
            }
            onPress={coverage.foodPersonDaysShort ? () => addItem('food') : undefined}
          />
          {(Object.keys(ESSENTIAL_HINTS) as (keyof typeof ESSENTIAL_HINTS)[]).map((category) => {
            const missing = coverage.missing.includes(category);
            return (
              <Row
                key={category}
                title={categoryName[category]}
                subtitle={ESSENTIAL_HINTS[category]}
                trailing={missing ? <Pill label="Mangler" tone="warning" /> : check}
                onPress={missing ? () => addItem(category) : undefined}
              />
            );
          })}
        </Section>

        <Section header="Varer">
          {stock.map((item) => (
            <Row
              key={item.id}
              title={item.name}
              subtitle={describeItem(item, today)}
              chevron
              onPress={() => editItem(item)}
            />
          ))}
          <AddRow title="Legg til vare" onPress={() => addItem()} />
        </Section>
      </Screen>
    </>
  );
}

function describeItem(item: StockItem, today: string): string {
  const amount =
    item.category === 'water'
      ? `${item.litres} l`
      : item.category === 'food'
        ? `${item.personDays} persondøgn`
        : categoryName[item.category];
  if (!item.expiresOn) return amount;
  return `${amount} · ${isExpired(item, today) ? 'gikk ut' : 'går ut'} ${formatDate(item.expiresOn)}`;
}

const styles = StyleSheet.create({
  subtitle: { marginHorizontal: Spacing.screen + 4, marginTop: -16, fontSize: 17, color: Colors.secondaryLabel },
});
