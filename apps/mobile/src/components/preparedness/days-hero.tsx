import { SCALE_MAX_DAYS, TARGET_DAYS, type Coverage, type DayKind } from '@egenberedskap/core';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { daysFigure, formatDays } from '@/lib/format';

import { DAY_ROWS } from './day-rows';

const hero = Colors.hero;
/** Where DSB's week sits on a scale that runs past it, so 7 reads as a marker and not a finish line. */
const MARKER = `${(TARGET_DAYS / SCALE_MAX_DAYS) * 100}%` as const;
const share = (days: number) => `${(Math.min(days, SCALE_MAX_DAYS) / SCALE_MAX_DAYS) * 100}%` as const;

/** The line at the foot of the card: what to do next, e.g. «Kjøp mat for 5 døgn til». */
export type HeroAction = { title: string; subtitle?: string; onPress: () => void };

/**
 * The navy preparedness card at the top of Oversikt: how many days the household manages, then
 * water, food and heat on a scale with DSB's 7 marked. The number is the shortest of the three,
 * so the breakdown is always there to explain it, with the one holding it down in yellow. At the
 * foot, what to do about it.
 */
export function DaysHero({
  coverage,
  onPressKind,
  action,
}: {
  coverage: Coverage;
  onPressKind: (kind: DayKind) => void;
  action: HeroAction;
}) {
  const short = coverage.days < TARGET_DAYS;

  return (
    <View style={styles.card}>
      <View
        accessible
        accessibilityLabel={`Uten strøm og vann klarer husstanden seg i ${formatDays(coverage.days)}, ut fra det dere har lagt inn. DSB anbefaler ${TARGET_DAYS}.`}
        style={styles.top}>
        <Text style={styles.lead}>Uten strøm og vann klarer husstanden seg i</Text>
        <View style={styles.numberRow}>
          <Text style={styles.number}>{daysFigure(coverage.days)}</Text>
          <Text style={styles.unit}>døgn</Text>
        </View>
        <Text style={styles.basis}>Ut fra det dere har lagt inn</Text>
      </View>

      <View style={styles.rows}>
        {DAY_ROWS.map(({ kind, name, days }) => {
          const d = days(coverage);
          const limit = short && kind === coverage.limitedBy;
          return (
            <Pressable
              key={kind}
              onPress={() => onPressKind(kind)}
              accessibilityRole="button"
              accessibilityLabel={`${name}: ${formatDays(d)} av ${TARGET_DAYS}`}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
              <View style={styles.rowHead}>
                <Text style={styles.rowName}>{name}</Text>
                <View style={styles.rowRight}>
                  <Text style={[styles.rowValue, limit && styles.rowValueLimit]}>{formatDays(d)}</Text>
                  <Icon name={{ ios: 'chevron.right', android: 'chevron_right' }} size={11} color={hero.caption} />
                </View>
              </View>
              <Bar width={share(d)} limit={limit} />
            </Pressable>
          );
        })}
        <View style={styles.captionRow}>
          <Text style={[styles.caption, { left: MARKER }]}>DSB anbefaler {TARGET_DAYS}</Text>
        </View>
      </View>

      <Pressable
        onPress={action.onPress}
        accessibilityRole="button"
        style={({ pressed }) => [styles.footer, pressed && { opacity: 0.7 }]}>
        <View style={styles.actionText}>
          <Text style={[styles.actionTitle, !short && styles.actionTitleDone]}>{action.title}</Text>
          {action.subtitle && <Text style={styles.actionSubtitle}>{action.subtitle}</Text>}
        </View>
        <View style={styles.arrow}>
          <Icon name={{ ios: 'chevron.right', android: 'chevron_right' }} size={12} color={hero.text} />
        </View>
      </Pressable>
    </View>
  );
}

/** A bar on the scale, with DSB's 7 marked by a line standing out above and below it. */
function Bar({ width, limit }: { width: `${number}%`; limit: boolean }) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width }, limit && styles.fillLimit]} />
      <View style={[styles.marker, { left: MARKER }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.screen,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 16,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: hero.background,
  },
  top: { gap: 2 },
  lead: { fontSize: 15, color: hero.soft },
  numberRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 2 },
  number: { fontFamily: Fonts.display, fontSize: 56, lineHeight: 60, letterSpacing: -1, color: hero.text, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 20, fontWeight: '600', color: hero.soft },
  basis: { fontSize: 13, color: hero.caption },
  rows: { gap: 12 },
  row: { gap: 6 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowName: { fontSize: 15, fontWeight: '600', color: hero.text },
  rowValue: { fontFamily: Fonts.displaySemibold, fontSize: 14, color: hero.muted, fontVariant: ['tabular-nums'] },
  rowValueLimit: { color: hero.text },
  track: { height: 5, borderRadius: Radius.pill, backgroundColor: hero.track },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: Radius.pill, backgroundColor: hero.bar },
  fillLimit: { backgroundColor: hero.limit },
  marker: { position: 'absolute', top: -3, bottom: -3, width: 2, marginLeft: -1, borderRadius: 1, backgroundColor: hero.soft, opacity: 0.6 },
  captionRow: { height: 16, marginTop: -4 },
  caption: { position: 'absolute', fontSize: 12, color: hero.caption, transform: [{ translateX: '-50%' }] },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: hero.track,
  },
  actionText: { flex: 1, gap: 1 },
  actionTitle: { fontSize: 16, fontWeight: '700', color: hero.link },
  actionTitleDone: { color: hero.text },
  actionSubtitle: { fontSize: 13, color: hero.caption },
  arrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: hero.track,
  },
});
