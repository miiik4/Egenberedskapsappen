import { Pressable, StyleSheet } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { Text } from '@/components/ui/text';

/** The one main action on a screen, full width, as «Legg til 3 gjenstander» in the design. */
export function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.button, disabled && styles.disabled, pressed && { opacity: 0.85 }]}>
      <Text style={[styles.label, disabled && { color: Colors.secondaryLabel }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    marginHorizontal: Spacing.screen,
    height: 52,
    borderRadius: Radius.pill,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
  },
  disabled: { backgroundColor: Colors.fill },
  label: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
});
