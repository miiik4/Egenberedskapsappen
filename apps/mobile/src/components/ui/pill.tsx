import { Pressable, StyleSheet, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { Text } from '@/components/ui/text';

const tones = {
  accent: { background: Colors.accentSoft, text: Colors.accent },
  warning: { background: Colors.warningSoft, text: Colors.warningText },
  success: { background: Colors.successSoft, text: Colors.success },
  neutral: { background: Colors.fill, text: Colors.secondaryLabel },
} as const;

export type PillTone = keyof typeof tones;

/** Small capsule for a status or a day change, e.g. «+2 døgn» or «12 liter vann». */
export function Pill({ label, tone = 'neutral', onPress }: { label: string; tone?: PillTone; onPress?: () => void }) {
  const { background, text } = tones[tone];
  const body = (
    <View style={[styles.pill, { backgroundColor: background }]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{body}</Pressable> : body;
}

const styles = StyleSheet.create({
  pill: { borderRadius: Radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  label: { fontSize: 13, fontWeight: '600' },
});
