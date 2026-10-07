import { TARGET_DAYS, type Coverage, type DayKind } from '@egenberedskap/core';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/ui/progress';
import { Colors, Fonts } from '@/constants/theme';
import { formatDays } from '@/lib/format';
import { Text } from '@/components/ui/text';

export const DAY_ROWS: { kind: DayKind; name: string; days: (c: Coverage) => number }[] = [
  { kind: 'water', name: 'Vann', days: (c) => c.waterDays },
  { kind: 'food', name: 'Mat', days: (c) => c.foodDays },
  { kind: 'heat', name: 'Varme', days: (c) => c.heatDays },
];

/** Vann, mat and varme, each a bar towards DSB's week. Only the length says what's missing. */
export function DayRows({ coverage, onPress }: { coverage: Coverage; onPress?: (kind: DayKind) => void }) {
  return (
    <View style={styles.rows}>
      {DAY_ROWS.map(({ kind, name, days }) => {
        const d = days(coverage);
        const row = (
          <View style={styles.row}>
            <View style={styles.head}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.value}>{formatDays(d)}</Text>
            </View>
            <ProgressBar value={d / TARGET_DAYS} />
          </View>
        );
        return onPress ? (
          <Pressable
            key={kind}
            onPress={() => onPress(kind)}
            accessibilityRole="button"
            accessibilityLabel={`${name}: ${formatDays(d)} av ${TARGET_DAYS}`}
            style={({ pressed }) => pressed && { opacity: 0.6 }}>
            {row}
          </Pressable>
        ) : (
          <View key={kind} accessible accessibilityLabel={`${name}: ${formatDays(d)} av ${TARGET_DAYS}`}>
            {row}
          </View>
        );
      })}
    </View>
  );
}

/** «Det er vannet som mangler mest.» */
export function limiterText(coverage: Coverage): string {
  if (coverage.days >= TARGET_DAYS) return 'Dere følger DSBs anbefaling.';
  return {
    water: 'Det er vannet som mangler mest.',
    food: 'Det er maten som mangler mest.',
    heat: 'Det er varmen som mangler mest.',
  }[coverage.limitedBy];
}

/** The big «4 av 7 døgn». */
export function DaysHeadline({ days, size = 48 }: { days: number; size?: number }) {
  return (
    <View style={styles.headline}>
      <Text style={[styles.number, { fontSize: size, lineHeight: size * 1.05 }]}>{Math.min(days, TARGET_DAYS)}</Text>
      <Text style={[styles.of, { fontSize: size > 50 ? 22 : 20 }]}>av {TARGET_DAYS} døgn</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rows: { gap: 14 },
  row: { gap: 6 },
  head: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontSize: 17, color: Colors.label },
  value: { fontSize: 17, color: Colors.secondaryLabel, fontVariant: ['tabular-nums'] },
  headline: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  number: { fontFamily: Fonts.display, letterSpacing: -1.2, color: Colors.label, fontVariant: ['tabular-nums'] },
  of: { fontWeight: '600', color: Colors.label },
});
