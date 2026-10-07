import {
  CATEGORY_NAMES,
  computeCoverage,
  daysBetween,
  EXPIRY_REMINDER_DAYS,
  isExpired,
  isExpiringSoon,
  renewedDates,
  stockType,
  STORED_WATER_SHELF_LIFE_MONTHS,
  type StockItem,
} from '@egenberedskap/core';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { DateField } from '@/components/form/fields';
import { WarningDot } from '@/components/ui/check-circle';
import { Card } from '@/components/ui/card';
import { EmptyRow, Row, Section } from '@/components/ui/list';
import { Screen } from '@/components/ui/screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useActions, useData } from '@/data/data-provider';
import { capitalize, formatDate, formatDays, formatDuration, formatExpiry, formatMeals, formatNumber, todayIso } from '@/lib/format';
import { Text } from '@/components/ui/text';

/** One item: how much, how long it keeps, and where it is. Dates and the reminder change in place. */
export default function Vare() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { stock, household } = useData();
  const { saveStockItem } = useActions();
  const item = stock.find((i) => i.id === id);
  // Deleted from the edit sheet on top of this page.
  if (!item) {
    return (
      <Screen>
        <EmptyRow text="Varen er slettet." />
      </Screen>
    );
  }

  const type = stockType(item.type);
  const today = todayIso();
  const update = async (changes: Partial<StockItem>) => {
    const next = { ...item, ...changes };
    // Clearing a date means leaving it out, not saving it as undefined.
    if (!next.expiresOn) delete next.expiresOn;
    if (!next.boughtOn) delete next.boughtOn;
    await saveStockItem(next);
  };
  const replaced = () => {
    const dates = renewedDates(item, today);
    if (dates) update(dates);
    else router.push({ pathname: '/vare', params: { id: item.id } });
  };

  const litresPerDay = computeCoverage(household, [], today).litresPerDay;

  return (
    <>
      <Stack.Screen options={{ title: item.name }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button onPress={() => router.push({ pathname: '/vare', params: { id: item.id } })}>Rediger</Stack.Toolbar.Button>
      </Stack.Toolbar>

      <Screen>
        <Text style={styles.subtitle}>
          {CATEGORY_NAMES[type.category]} · {type.name.toLowerCase()}
        </Text>

        <ExpiryCard item={item} today={today} />

        <Section header="Mengde">
          {type.measure === 'litres' ? (
            <>
              <Row title="Antall liter" detail={`${formatNumber(item.litres ?? 0)} l`} />
              <Row title="Dekker" detail={formatDays(Math.floor((item.litres ?? 0) / litresPerDay))} />
            </>
          ) : (
            <>
              <Row title="Antall" detail={`${item.quantity} stk`} />
              {type.measure === 'meals' && <Row title="Rekker til" detail={formatMeals(item.meals ?? 0)} />}
            </>
          )}
        </Section>

        <Section
          header="Holdbarhet"
          footer={
            type.id === 'drinkingWater'
              ? `DSB anbefaler å bytte lagret vann hver ${STORED_WATER_SHELF_LIFE_MONTHS}. måned.`
              : undefined
          }>
          <DateField label="Kjøpt" value={item.boughtOn} onChange={(boughtOn) => update({ boughtOn })} suggest={0} />
          <DateField label="Går ut" value={item.expiresOn} onChange={(expiresOn) => update({ expiresOn })} />
          <Row
            title="Påminnelse"
            trailing={
              <Switch
                value={item.remind}
                onValueChange={(remind) => update({ remind })}
                accessibilityLabel="Påminnelse"
                trackColor={{ true: Colors.accent }}
              />
            }
          />
          {item.remind && item.expiresOn && (
            <Row title="Varsle meg" detail={`${formatDuration(EXPIRY_REMINDER_DAYS)} før`} />
          )}
        </Section>

        <Section header="Plassering">
          <Row
            title="Hvor"
            detail={item.location || 'Legg til'}
            onPress={() => router.push({ pathname: '/vare', params: { id: item.id } })}
          />
        </Section>

        {item.expiresOn && (
          <Pressable
            onPress={replaced}
            accessibilityRole="button"
            style={({ pressed }) => [styles.replaced, pressed && { opacity: 0.7 }]}>
            <Text style={styles.replacedText}>Merk som byttet</Text>
          </Pressable>
        )}
      </Screen>
    </>
  );
}

/** «Går ut om 9 dager · Bytt vannet innen 14. oktober», with the one orange dot. */
function ExpiryCard({ item, today }: { item: StockItem; today: string }) {
  if (!item.expiresOn || !(isExpiringSoon(item, today) || isExpired(item, today))) return null;
  const left = daysBetween(today, item.expiresOn);
  return (
    <Card>
      <View style={styles.expiry}>
        <WarningDot />
        <View style={styles.expiryText}>
          <Text style={styles.expiryTitle}>{capitalize(formatExpiry(left))}</Text>
          <Text style={styles.expirySub}>
            {left < 0
              ? 'Teller ikke lenger med i døgnene'
              : `Bytt ${item.name.toLowerCase()} innen ${formatDate(item.expiresOn)}`}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginHorizontal: Spacing.screen + 4, marginTop: -16, fontSize: 17, color: Colors.secondaryLabel },
  expiry: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  expiryText: { flex: 1 },
  expiryTitle: { fontSize: 17, fontWeight: '600', color: Colors.label },
  expirySub: { fontSize: 15, color: Colors.secondaryLabel },
  replaced: {
    marginHorizontal: Spacing.screen,
    height: 52,
    borderRadius: Radius.pill,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accentSoft,
  },
  replacedText: { fontSize: 17, fontWeight: '600', color: Colors.accent },
});
