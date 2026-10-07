import { Picker } from '@expo/ui/community/picker';
import { StyleSheet, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { Text } from '@/components/ui/text';

/** Pick one of a short list from a menu, as «Kategori: Mat ⌃⌄» in the design: a Material dropdown. */
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
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Picker selectedValue={value} onValueChange={(selected) => onChange(selected as T)} style={styles.picker}>
        {options.map((o) => (
          <Picker.Item key={o.value} label={o.label} value={o.value} />
        ))}
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 50,
    paddingLeft: Spacing.rowInset,
    paddingRight: 8,
  },
  label: { fontSize: 17, color: Colors.label },
  picker: { flex: 1, maxWidth: 220 },
});
