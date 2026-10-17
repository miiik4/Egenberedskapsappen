import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { Text } from '@/components/ui/text';

/**
 * Pick one of a short list from a menu, as «Kategori: Mat ⌃⌄» in the design. The value is a
 * link on the row, and a tap opens a small card with the options, drawn in the app's own
 * colours. The Material dropdown that was here took its tint from the phone's wallpaper and
 * sat in the row as a filled, underlined text field, which didn't fit the cards around it.
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
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  const pick = (next: T) => {
    setOpen(false);
    onChange(next);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.label ?? ''}`}
        accessibilityHint="Åpner valgene"
        style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.value}>
          <Text style={styles.valueText} numberOfLines={1}>
            {current?.label}
          </Text>
          <Icon name={{ ios: 'chevron.up.chevron.down', android: 'unfold_more' }} size={16} color={Colors.accent} />
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Lukk" accessibilityRole="button">
          {/* The card takes its own taps, so a tap on it doesn't close the menu. */}
          <Pressable style={styles.card} accessibilityRole="menu">
            <Text style={styles.title}>{label}</Text>
            {options.map((o) => {
              const selected = o.value === value;
              return (
                <Pressable
                  key={o.value}
                  onPress={() => pick(o.value)}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}>
                  <Text style={[styles.optionText, selected && styles.optionSelected]}>{o.label}</Text>
                  {selected && <Icon name={{ ios: 'checkmark', android: 'check' }} size={18} color={Colors.accent} />}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
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
  value: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  valueText: { flexShrink: 1, fontSize: 17, color: Colors.accent },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.screen + 8,
    backgroundColor: 'rgba(11, 43, 74, 0.45)',
  },
  card: {
    paddingVertical: 8,
    borderRadius: Radius.card,
    borderCurve: 'continuous',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  title: {
    paddingHorizontal: Spacing.rowInset,
    paddingTop: 10,
    paddingBottom: 6,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.secondaryLabel,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 50,
    paddingHorizontal: Spacing.rowInset,
  },
  optionPressed: { backgroundColor: Colors.fill },
  optionText: { flexShrink: 1, fontSize: 17, color: Colors.label },
  optionSelected: { color: Colors.accent, fontWeight: '600' },
});
