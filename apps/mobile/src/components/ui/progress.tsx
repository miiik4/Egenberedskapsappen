import { StyleSheet, View, type ColorValue } from 'react-native';

import { Colors } from '@/constants/theme';

/** A thin bar: how far along something is, in blue, or orange when it has gone too far. */
export function ProgressBar({ value, color = Colors.accent }: { value: number; color?: ColorValue }) {
  const width = `${Math.round(Math.min(Math.max(value, 0), 1) * 100)}%` as const;
  return (
    <View style={styles.track}>
      <View style={[styles.bar, { width, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: Colors.fill },
  bar: { height: '100%', borderRadius: 3 },
});
