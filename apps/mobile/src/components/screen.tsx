import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Screen({ title, children }: { title: string; children?: ReactNode }) {
  const theme = useTheme();
  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Placeholder({ children }: { children: string }) {
  const theme = useTheme();
  return <Text style={{ color: theme.textSecondary, fontSize: 16 }}>{children}</Text>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three },
  title: { fontSize: 34, fontWeight: '700' },
});
