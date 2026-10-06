import { Host, Picker, Text as SwiftText } from '@expo/ui/swift-ui';
import { pickerStyle, tag, tint } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

/** Pick one of a short list from a menu, as «Kategori: Mat ⌃⌄» in the design: SwiftUI's menu picker. */
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
      <Host matchContents>
        <Picker
          selection={value}
          onSelectionChange={(selected) => onChange(selected as T)}
          modifiers={[pickerStyle('menu'), tint(Colors.accent)]}>
          {options.map((o) => (
            <SwiftText key={o.value} modifiers={[tag(o.value)]}>
              {o.label}
            </SwiftText>
          ))}
        </Picker>
      </Host>
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
});
