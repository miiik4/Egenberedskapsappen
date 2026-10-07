import { Pressable, StyleSheet, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { Text } from '@/components/ui/text';

/** Two or three mutually exclusive views of the same screen, e.g. Innbo / Reise. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && styles.selected]}>
            <Text style={[styles.label, selected && styles.selectedLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    marginHorizontal: Spacing.screen,
    padding: 2,
    borderRadius: 18,
    backgroundColor: Colors.fill,
  },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 16 },
  selected: {
    backgroundColor: Colors.card,
    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
  },
  label: { fontSize: 15, color: Colors.label },
  selectedLabel: { fontWeight: '600' },
});
