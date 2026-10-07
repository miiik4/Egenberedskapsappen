import { Pressable, StyleSheet } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { Text } from '@/components/ui/text';

/** A small blue link under a section, like «Se hele listen». */
/** `strong` for the main way on, as «Se hele listen» under «Neste å gjøre». */
export function LinkText({ label, onPress, strong }: { label: string; onPress: () => void; strong?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" hitSlop={8} style={styles.link}>
      <Text style={[styles.text, strong && styles.strong]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { alignSelf: 'flex-start', marginHorizontal: Spacing.screen + Spacing.rowInset, marginTop: -16 },
  text: { fontSize: 13, color: Colors.accent },
  strong: { fontSize: 14, fontWeight: '600' },
});
