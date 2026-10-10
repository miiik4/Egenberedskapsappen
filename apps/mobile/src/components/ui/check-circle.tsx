import { StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';

import { Icon } from './icon';

/** The round tick from Reminders: filled blue when done, an empty ring when not. */
export function CheckCircle({ on }: { on: boolean }) {
  return on ? (
    <View style={[styles.circle, styles.on]}>
      <Icon name={{ ios: 'checkmark', android: 'check' }} size={12} color="#FFFFFF" />
    </View>
  ) : (
    <View style={[styles.circle, styles.off]} />
  );
}

/**
 * Some, but not enough: water or food short of the week. Fills from the bottom like a level,
 * `share` from 0 to 1.
 */
export function PartialCircle({ share }: { share: number }) {
  const level = `${Math.round(Math.min(Math.max(share, 0.12), 0.88) * 100)}%` as const;
  return (
    <View style={[styles.circle, styles.partial]}>
      <View style={[styles.level, { height: level }]} />
    </View>
  );
}

/** A small dot before a line that needs attention, as «går ut om 9 dager». */
export function WarningDot() {
  return <View style={styles.dot} />;
}

const styles = StyleSheet.create({
  circle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  on: { backgroundColor: Colors.accent },
  off: { borderWidth: 1.5, borderColor: Colors.tertiaryLabel },
  partial: { borderWidth: 1.5, borderColor: Colors.accent, overflow: 'hidden', justifyContent: 'flex-end' },
  level: { width: '100%', backgroundColor: Colors.accent },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.warning },
});
