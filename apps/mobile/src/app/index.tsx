import { computeCoverage, TARGET_DAYS } from '@egenberedskap/core';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sampleHousehold, sampleStock } from '@/lib/sample-data';

function todayIso() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export default function Home() {
  const theme = useTheme();
  const coverage = computeCoverage(sampleHousehold, sampleStock, todayIso());

  return (
    <Screen title="Hjem">
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <Text style={[styles.lead, { color: theme.textSecondary }]}>
          Uten strøm og vann klarer dere dere i ca.
        </Text>
        <Text style={[styles.days, { color: theme.text }]}>{coverage.days} døgn</Text>
        <Text style={{ color: theme.textSecondary }}>DSB anbefaler {TARGET_DAYS}</Text>
        {coverage.days < TARGET_DAYS && (
          <Text style={{ color: theme.warning }}>
            {coverage.limitedBy === 'water' ? 'Vann' : 'Mat'} er det som begrenser dere
          </Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: Spacing.four, gap: Spacing.one },
  lead: { fontSize: 16 },
  days: { fontSize: 48, fontWeight: '700' },
});
