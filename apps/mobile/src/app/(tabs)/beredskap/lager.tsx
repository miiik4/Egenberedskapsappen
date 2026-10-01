import {
  computeCoverage,
  isExpiringSoon,
  TARGET_DAYS,
  WATER_LITRES_PER_PERSON_PER_DAY,
  type StockCategory,
} from '@egenberedskap/core';
import { Stack } from 'expo-router';
import { Alert, StyleSheet, Text } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Row, Section } from '@/components/ui/list';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { Colors, Spacing } from '@/constants/theme';
import { categoryName, formatDate, todayIso } from '@/lib/format';
import { household, stock } from '@/lib/sample-data';

const ESSENTIAL_HINTS: Record<Exclude<StockCategory, 'water' | 'food'>, string> = {
  radio: 'DAB-radio på batteri',
  heatAndLight: 'Lommelykt, lys, fyrstikker',
  firstAid: 'Inkl. faste medisiner',
  hygieneAndCash: 'Kontanter, våtservietter, toalettpapir',
};

export default function Lager() {
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
        <Stack.Toolbar.Button icon="plus" onPress={() => Alert.alert('Legg til vare', 'Kommer snart.')} />
      </Stack.Toolbar>

      <Screen>
        <Text style={styles.subtitle}>
          Dekker {Math.min(coverage.days, TARGET_DAYS)} av {TARGET_DAYS} døgn · {household.people} personer
        </Text>

        {expiring.length > 0 && (
          <Section header="Går ut snart" footer="Du får en påminnelse to uker før en vare går ut.">
            {expiring.map((item) => (
              <Row key={item.id} title={item.name} detail={formatDate(item.expiresOn!)} />
            ))}
          </Section>
        )}

        <Section header="Lageret" footer="Mengdene regnes ut fra antall personer i husstanden.">
          <Row
            title={categoryName.water}
            subtitle={`${WATER_LITRES_PER_PERSON_PER_DAY} liter per person per døgn`}
            trailing={<Pill label={`${litres} / ${targetLitres} l`} tone={coverage.waterLitresShort ? 'warning' : 'success'} />}
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
          />
          {(Object.keys(ESSENTIAL_HINTS) as (keyof typeof ESSENTIAL_HINTS)[]).map((category) => (
            <Row
              key={category}
              title={categoryName[category]}
              subtitle={ESSENTIAL_HINTS[category]}
              trailing={coverage.missing.includes(category) ? <Pill label="Mangler" tone="warning" /> : check}
            />
          ))}
        </Section>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginHorizontal: Spacing.screen + 4, marginTop: -16, fontSize: 17, color: Colors.secondaryLabel },
});
