import { SCALE_MAX_DAYS, TARGET_DAYS, type Coverage, type DayKind } from '@egenberedskap/core';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { formatDays } from '@/lib/format';

import { DAY_ROWS, limiterText } from './day-rows';

const hero = Colors.hero;
/** Where DSB's week sits on a scale that runs past it, so 7 reads as a marker and not a finish line. */
const MARKER = `${(TARGET_DAYS / SCALE_MAX_DAYS) * 100}%` as const;
const share = (days: number) => `${(Math.min(days, SCALE_MAX_DAYS) / SCALE_MAX_DAYS) * 100}%` as const;

/**
 * The navy preparedness card at the top of Oversikt: how many days the household manages, on a
 * scale with DSB's 7 marked, and what holds it down. «Vis alle» folds out water, food and heat.
 */
export function DaysHero({ coverage, onPressKind }: { coverage: Coverage; onPressKind: (kind: DayKind) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.card}>
      <View
        accessible
        accessibilityLabel={`Uten strøm og vann klarer dere dere i ${coverage.days} døgn. DSB anbefaler ${TARGET_DAYS}.`}
        style={styles.top}>
        <Text style={styles.lead}>Uten strøm og vann klarer dere dere i</Text>
        <View style={styles.numberRow}>
          <Text style={styles.number}>{coverage.days}</Text>
          <Text style={styles.unit}>døgn</Text>
        </View>
        <View style={styles.scale}>
          <Bar width={share(coverage.days)} height={8} />
          <View style={styles.captionRow}>
            <Text style={[styles.caption, { left: MARKER }]}>DSB anbefaler {TARGET_DAYS}</Text>
          </View>
        </View>
      </View>

      <Pressable
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={styles.footer}>
        <Text style={styles.limiter}>{limiterText(coverage)}</Text>
        <View style={styles.toggle}>
          <Text style={styles.toggleText}>{open ? 'Skjul' : 'Vis alle'}</Text>
          <Icon name={{ ios: open ? 'chevron.up' : 'chevron.down', android: open ? 'expand_less' : 'expand_more' }} size={12} color={hero.muted} />
        </View>
      </Pressable>

      {open && (
        <View style={styles.rows}>
          {DAY_ROWS.map(({ kind, name, days }) => {
            const d = days(coverage);
            return (
              <Pressable
                key={kind}
                onPress={() => onPressKind(kind)}
                accessibilityRole="button"
                accessibilityLabel={`${name}: ${formatDays(d)}`}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
                <View style={styles.rowHead}>
                  <Text style={styles.rowName}>{name}</Text>
                  <Text style={styles.rowValue}>{formatDays(d)}</Text>
                </View>
                <Bar width={share(d)} height={6} />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

/** A bar on the scale, with DSB's 7 marked by a line standing out above and below it. */
function Bar({ width, height }: { width: `${number}%`; height: number }) {
  const marker = height * 2 + 2;
  return (
    <View style={[styles.track, { height }]}>
      <View style={[styles.fill, { width }]} />
      <View style={[styles.marker, { left: MARKER, top: (height - marker) / 2, height: marker }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.screen,
    padding: 20,
    gap: 14,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: hero.background,
  },
  top: { gap: 14 },
  lead: { fontSize: 15, color: hero.muted },
  numberRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: -6 },
  number: { fontFamily: Fonts.display, fontSize: 56, lineHeight: 60, letterSpacing: -1, color: hero.text, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 20, fontWeight: '600', color: hero.soft },
  scale: { gap: 7 },
  track: { borderRadius: Radius.pill, backgroundColor: hero.track },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: Radius.pill, backgroundColor: hero.bar },
  marker: { position: 'absolute', width: 2, marginLeft: -1, borderRadius: 1, backgroundColor: hero.soft },
  captionRow: { height: 16 },
  caption: { position: 'absolute', fontSize: 13, color: hero.caption, transform: [{ translateX: '-50%' }] },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 30,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: hero.track,
  },
  limiter: { flex: 1, fontSize: 15, color: hero.soft },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toggleText: { fontSize: 15, fontWeight: '600', color: hero.muted },
  rows: { gap: 16, paddingTop: 2 },
  row: { gap: 7 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  rowName: { fontSize: 16, fontWeight: '600', color: hero.text },
  rowValue: { fontFamily: Fonts.displaySemibold, fontSize: 15, color: hero.soft },
});
