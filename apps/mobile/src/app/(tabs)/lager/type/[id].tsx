import {
  CATEGORY_NAMES,
  daysBetween,
  isExpired,
  isExpiringSoon,
  isStockType,
  stockType,
  type StockItem,
} from '@egenberedskap/core';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { WarningDot } from '@/components/ui/check-circle';
import { EmptyRow, Row, Section } from '@/components/ui/list';
import { Screen } from '@/components/ui/screen';
import { SwipeToDelete } from '@/components/ui/swipe-delete';
import { ToolbarIcons } from '@/components/toolbar-icons';
import { Colors, Spacing } from '@/constants/theme';
import { useActions, useData } from '@/data/data-provider';
import { describeType, formatIn, formatMeals, formatMonthYear, formatNumber, todayIso } from '@/lib/format';

/** One type with the household's items: what's about to expire on top, then the rest. */
export default function Type() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { stock } = useData();
  const { deleteStockItem } = useActions();
  if (!id || !isStockType(id)) return null;

  const type = stockType(id);
  const today = todayIso();
  const items = stock.filter((item) => item.type === id);
  const soon = items
    .filter((item) => isExpiringSoon(item, today) || isExpired(item, today))
    .sort((a, b) => a.expiresOn!.localeCompare(b.expiresOn!));
  const rest = items.filter((item) => !soon.includes(item));

  const row = (item: StockItem) => (
    <SwipeToDelete key={item.id} label={item.name} onDelete={() => deleteStockItem(item.id)}>
      <Row
        title={item.name}
        subtitle={describeItem(item, today)}
        leading={soon.includes(item) ? <WarningDot /> : undefined}
        detail={`${item.quantity} stk`}
        chevron
        onPress={() => router.push({ pathname: '/lager/vare/[id]', params: { id: item.id } })}
      />
    </SwipeToDelete>
  );

  return (
    <>
      <Stack.Screen options={{ title: type.name }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={ToolbarIcons.plus}
          accessibilityLabel="Ny vare"
          onPress={() => router.push({ pathname: '/vare', params: { type: id } })}
        />
      </Stack.Toolbar>

      <Screen>
        <Text style={styles.subtitle}>
          {CATEGORY_NAMES[type.category]} · {describeType({ items, measure: type.measure })}
        </Text>
        {soon.length > 0 && <Section header="Går ut snart">{soon.map(row)}</Section>}
        <Section header="Varer" footer={items.length > 0 ? 'Sveip til venstre for å slette. Trykk for å endre antall og dato.' : undefined}>
          {rest.length > 0 ? rest.map(row) : <EmptyRow text={soon.length > 0 ? 'Ingen andre.' : 'Ingen ennå.'} />}
        </Section>
      </Screen>
    </>
  );
}

/** «3 måltider · går ut om 3 uker», «2 måltider · mars 2028» */
function describeItem(item: StockItem, today: string): string | undefined {
  const amount =
    item.meals !== undefined ? formatMeals(item.meals) : item.litres !== undefined ? `${formatNumber(item.litres)} l` : undefined;
  let expiry: string | undefined;
  if (item.expiresOn) {
    const left = daysBetween(today, item.expiresOn);
    expiry = left < 0 ? 'har gått ut' : isExpiringSoon(item, today) ? `går ut ${formatIn(left)}` : formatMonthYear(item.expiresOn);
  }
  return [amount, expiry].filter(Boolean).join(' · ') || undefined;
}

const styles = StyleSheet.create({
  subtitle: { marginHorizontal: Spacing.screen + 4, marginTop: -16, fontSize: 17, color: Colors.secondaryLabel },
});

