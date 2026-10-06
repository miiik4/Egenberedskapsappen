import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

/** A plain white card with padding, for content that isn't a list: the days, the sum insured. */
export function Card({ children, gap = 12 }: { children: ReactNode; gap?: number }) {
  return <View style={[styles.card, { gap }]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.screen,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: Radius.card,
    borderCurve: 'continuous',
    backgroundColor: Colors.card,
  },
});
