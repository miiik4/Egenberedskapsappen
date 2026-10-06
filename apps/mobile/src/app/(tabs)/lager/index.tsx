import { checklist, isExpired, isExpiringSoon, CATEGORY_NAMES, daysBetween, type ChecklistType } from '@egenberedskap/core';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { CheckCircle, WarningDot } from '@/components/ui/check-circle';
import { Row, Section } from '@/components/ui/list';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { ToolbarIcons } from '@/components/toolbar-icons';
import { Colors, Spacing } from '@/constants/theme';
import { useData } from '@/data/data-provider';
import { formatIn, todayIso } from '@/lib/format';

type Filter = 'alle' | 'mangler';

/**
 * DSB's whole list as one checklist, split by category as in Reminders. A type is ticked off
 * by itself once it has something in it; «Mangler» leaves a shopping list.
 */
export default function Lager() {
  // In the URL, so «Se hele listen» on Oversikt can switch it even when Lager is already open.
  const params = useLocalSearchParams<{ filter?: Filter }>();
  const filter: Filter = params.filter === 'mangler' ? 'mangler' : 'alle';
  const setFilter = (next: Filter) => router.setParams({ filter: next });
  const { household, stock } = useData();
  const today = todayIso();
  const list = checklist(household, stock, today);
  const missing = list.reduce((n, c) => n + c.types.filter((t) => !t.have).length, 0);

  return (
    <>
      <Stack.Screen options={{ title: 'Lager' }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon={ToolbarIcons.plus} accessibilityLabel="Ny vare" onPress={() => router.push('/vare')} />
      </Stack.Toolbar>

      <Screen>
        <Text style={styles.subtitle}>
          {missing === 0 ? 'Alt fra DSBs liste er på plass' : `${missing} ting mangler fra DSBs liste`}
        </Text>
        <Segmented
          options={[
            { value: 'alle', label: 'Alle' },
            { value: 'mangler', label: 'Mangler' },
          ]}
          value={filter}
          onChange={setFilter}
        />

        {list.map(({ category, types }) => {
          const shown = filter === 'mangler' ? types.filter((t) => !t.have) : types;
          if (shown.length === 0) return null;
          return (
            <Section
              key={category}
              header={CATEGORY_NAMES[category]}
              headerDetail={`${types.filter((t) => t.have).length} av ${types.length}`}
              separatorInset={56}>
              {shown.map((type) => (
                <TypeRow key={type.id} type={type} today={today} />
              ))}
            </Section>
          );
        })}
        <Text style={styles.footnote}>Basert på DSBs liste for egenberedskap. Mengdene tilpasses husstanden.</Text>
      </Screen>
    </>
  );
}

function TypeRow({ type, today }: { type: ChecklistType; today: string }) {
  const expiring = type.items
    .filter((item) => isExpiringSoon(item, today) || isExpired(item, today))
    .sort((a, b) => a.expiresOn!.localeCompare(b.expiresOn!))[0];
  const left = expiring && daysBetween(today, expiring.expiresOn!);
  const subtitle =
    left === undefined ? type.hint || undefined : left < 0 ? 'Har gått ut' : `Går ut ${formatIn(left)}`;

  return (
    <Row
      title={type.name}
      subtitle={subtitle}
      leading={<CheckCircle on={type.have} />}
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
  subtitle: { marginHorizontal: Spacing.screen + 4, marginTop: -16, fontSize: 17, color: Colors.secondaryLabel },
  footnote: { marginHorizontal: Spacing.screen + Spacing.rowInset, marginTop: -14, fontSize: 13, lineHeight: 18, color: Colors.secondaryLabel },
});
