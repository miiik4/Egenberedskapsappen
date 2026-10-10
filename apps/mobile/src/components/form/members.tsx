import type { HouseholdMembers } from '@egenberedskap/core';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Section } from '@/components/ui/list';
import { Colors, Spacing } from '@/constants/theme';
import { Text } from '@/components/ui/text';

const GROUPS: { key: keyof HouseholdMembers; label: string; sub?: string }[] = [
  { key: 'adults', label: 'Voksne', sub: '18–66 år' },
  { key: 'seniors', label: 'Eldre', sub: '67 år og eldre' },
  { key: 'children', label: 'Barn', sub: '3–17 år' },
  { key: 'infants', label: 'Småbarn', sub: '0–2 år' },
  { key: 'dogs', label: 'Hunder' },
  { key: 'cats', label: 'Katter' },
];

const MAX = 20;

/** «Hvem bor her»: a count per age group, with iOS steppers. Used in «Kom i gang» and Innstillinger. */
export function MembersSection({
  value,
  onChange,
  header,
  footer,
}: {
  value: HouseholdMembers;
  onChange: (value: HouseholdMembers) => void;
  header?: string;
  footer?: string;
}) {
  const people = value.adults + value.seniors + value.children + value.infants;
  return (
    <Section header={header} footer={footer}>
      {GROUPS.map(({ key, label, sub }) => {
        const n = value[key];
        // Someone has to live there: the last person can't be taken away.
        const human = key !== 'dogs' && key !== 'cats';
        const canDecrease = n > 0 && !(human && people === 1);
        return (
          <View key={key} style={styles.row}>
            <View style={styles.text}>
              <Text style={styles.label}>{label}</Text>
              {sub && <Text style={styles.sub}>{sub}</Text>}
            </View>
            <Text style={styles.count}>{n}</Text>
            <View
              style={styles.stepper}
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={label}
              accessibilityValue={{ now: n, min: 0, max: MAX }}
              accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
              onAccessibilityAction={(e) => {
                if (e.nativeEvent.actionName === 'increment' && n < MAX) onChange({ ...value, [key]: n + 1 });
                if (e.nativeEvent.actionName === 'decrement' && canDecrease) onChange({ ...value, [key]: n - 1 });
              }}>
              <StepButton icon={{ ios: 'minus', android: 'remove' }} disabled={!canDecrease} onPress={() => onChange({ ...value, [key]: n - 1 })} />
              <View style={styles.divider} />
              <StepButton icon={{ ios: 'plus', android: 'add' }} disabled={n >= MAX} onPress={() => onChange({ ...value, [key]: n + 1 })} />
            </View>
          </View>
        );
      })}
    </Section>
  );
}

function StepButton({
  icon,
  disabled,
  onPress,
}: {
  icon: { ios: 'minus' | 'plus'; android: 'remove' | 'add' };
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => [styles.step, pressed && { backgroundColor: Colors.fill }]}>
      <Icon name={icon} size={15} color={disabled ? Colors.tertiaryLabel : Colors.label} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingVertical: 6,
    paddingLeft: Spacing.rowInset,
    paddingRight: 16,
  },
  text: { flex: 1 },
  label: { fontSize: 17, color: Colors.label },
  sub: { fontSize: 13, color: Colors.secondaryLabel },
  count: { minWidth: 16, textAlign: 'right', fontSize: 17, color: Colors.label, fontVariant: ['tabular-nums'] },
  stepper: { flexDirection: 'row', alignItems: 'center', height: 32, borderRadius: 9, backgroundColor: Colors.fill },
  step: { width: 46, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  divider: { width: StyleSheet.hairlineWidth, height: 18, backgroundColor: Colors.separator },
});
