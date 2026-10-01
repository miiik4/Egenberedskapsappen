import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Colors } from '@/constants/theme';

/**
 * Scrolling body for a tab screen. `automatic` insets let the native large title collapse
 * and keep content clear of the floating tab bar.
 */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      style={styles.root}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { paddingTop: 8, paddingBottom: 32, gap: 24 },
});
