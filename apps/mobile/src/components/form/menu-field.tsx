import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

/**
 * Pick one of a short list. The phones get a native menu (menu-field.ios.tsx and
 * menu-field.android.tsx); elsewhere, such as the web preview, a tap moves to the next option.
 */
export function MenuField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const index = options.findIndex((o) => o.value === value);
  return (
    <Pressable
      onPress={() => onChange(options[(index + 1) % options.length]!.value)}
      accessibilityRole="button"
      style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View>
        <Text style={styles.value}>{options[index]?.label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 50,
    paddingHorizontal: Spacing.rowInset,
  },
  label: { fontSize: 17, color: Colors.label },
  value: { fontSize: 17, color: Colors.accent },
});
