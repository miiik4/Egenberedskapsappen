import { SCALE_MAX_DAYS, TARGET_DAYS, type Coverage } from '@egenberedskap/core';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Colors, Radius, Spacing } from '@/constants/theme';

const hero = Colors.hero;

/**
 * The headline: how many days the household manages, against DSB's 7 on a scale that runs
 * past it, so 7 reads as a marker and not as the end. Never says «ferdig» or 100 %.
 */
export function DaysCard({ coverage, onPress }: { coverage: Coverage; onPress: () => void }) {
  const fill = `${(Math.min(coverage.days, SCALE_MAX_DAYS) / SCALE_MAX_DAYS) * 100}%` as const;
  const marker = `${(TARGET_DAYS / SCALE_MAX_DAYS) * 100}%` as const;
  const short = coverage.days < TARGET_DAYS;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Uten strøm og vann klarer dere dere i ca. ${coverage.days} døgn. DSB anbefaler ${TARGET_DAYS}.`}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <Text style={styles.lead}>Uten strøm og vann klarer dere dere i ca.</Text>
      <View style={styles.numberRow}>
        <Text style={styles.number}>{coverage.days}</Text>
        <Text style={styles.unit}>døgn</Text>
      </View>
      <View style={styles.scale}>
        <View style={styles.track}>
          <View style={[styles.bar, { width: fill }]} />
          <View style={[styles.marker, { left: marker }]} />
        </View>
        <View style={styles.captionRow}>
          <Text style={[styles.caption, { left: marker }]}>DSB anbefaler {TARGET_DAYS}</Text>
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {short
            ? `${coverage.limitedBy === 'water' ? 'Vann' : 'Mat'} er det som begrenser dere`
            : 'Dere er over DSBs anbefaling'}
        </Text>
        <Icon name={{ ios: 'chevron.right', android: 'chevron_right' }} size={13} color={hero.muted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.screen,
    padding: 20,
    gap: 14,
    borderRadius: Radius.card,
    borderCurve: 'continuous',
    backgroundColor: hero.background,
  },
  lead: { fontSize: 15, color: hero.muted },
  numberRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  number: { fontSize: 60, lineHeight: 64, fontWeight: '700', color: hero.text, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 22, fontWeight: '600', color: hero.soft },
  scale: { gap: 7 },
  track: { height: 8, borderRadius: Radius.pill, backgroundColor: hero.track },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: Radius.pill, backgroundColor: hero.bar },
  marker: { position: 'absolute', top: -5, width: 2, height: 18, marginLeft: -1, borderRadius: 1, backgroundColor: hero.soft },
  captionRow: { height: 16 },
  caption: { position: 'absolute', fontSize: 13, color: hero.caption, transform: [{ translateX: '-50%' }] },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: hero.divider,
  },
  footerText: { fontSize: 15, color: hero.soft },
});
