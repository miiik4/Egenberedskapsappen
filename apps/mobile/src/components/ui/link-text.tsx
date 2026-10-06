import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

/** A small blue link under a section, like «Se hele listen». */
export function LinkText({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" hitSlop={8} style={styles.link}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { alignSelf: 'flex-start', marginHorizontal: Spacing.screen + Spacing.rowInset, marginTop: -16 },
  text: { fontSize: 13, color: Colors.accent },
});
