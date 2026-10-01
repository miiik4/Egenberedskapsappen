import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ColorValue } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

import { Icon, type IconName } from './icon';

/** An iOS inset grouped section: uppercase header, rounded card, hairline separators, footnote. */
export function Section({
  header,
  footer,
  separatorInset = Spacing.rowInset,
  children,
}: {
  header?: string;
  footer?: string;
  /** Where separators start, so they line up with the row text rather than its icon. */
  separatorInset?: number;
  children: ReactNode;
}) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.section}>
      {header && <Text style={styles.header}>{header.toUpperCase()}</Text>}
      <View style={styles.card}>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 && <View style={[styles.separator, { marginLeft: separatorInset }]} />}
            {row}
          </Fragment>
        ))}
      </View>
      {footer && <Text style={styles.footer}>{footer}</Text>}
    </View>
  );
}

export function Row({
  title,
  subtitle,
  leading,
  trailing,
  detail,
  chevron,
  onPress,
  titleColor,
  bold,
}: {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Grey value text on the right, e.g. "5 døgn". */
  detail?: string;
  chevron?: boolean;
  onPress?: () => void;
  titleColor?: ColorValue;
  bold?: boolean;
}) {
  const content = (
    <View style={styles.row}>
      {leading}
      <View style={styles.rowText}>
        <Text
          numberOfLines={1}
          style={[styles.title, titleColor ? { color: titleColor } : null, bold && styles.bold]}>
          {title}
        </Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {detail && <Text style={styles.detail}>{detail}</Text>}
      {trailing}
      {chevron && <Icon name={{ ios: 'chevron.right', android: 'chevron_right' }} size={13} color={Colors.tertiaryLabel} />}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { backgroundColor: Colors.fill }}>
      {content}
    </Pressable>
  );
}

/** A single tappable card, like «Kvartalssjekk om 9 dager» on Home. */
export function CardButton(props: Parameters<typeof Row>[0]) {
  return (
    <View style={[styles.card, styles.cardButton]}>
      <Row chevron {...props} />
    </View>
  );
}

/** A coloured rounded square behind a white glyph, as in Settings. */
export function IconTile({ name, color, glyph }: { name?: IconName; color: ColorValue; glyph?: string }) {
  return (
    <View style={[styles.tile, { backgroundColor: color }]}>
      {glyph ? <Text style={styles.tileGlyph}>{glyph}</Text> : name && <Icon name={name} size={15} color="#FFFFFF" />}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginHorizontal: Spacing.screen, gap: 7 },
  header: { marginHorizontal: Spacing.rowInset, fontSize: 13, color: Colors.secondaryLabel, letterSpacing: 0.3 },
  footer: { marginHorizontal: Spacing.rowInset, fontSize: 13, color: Colors.secondaryLabel, lineHeight: 18 },
  card: { backgroundColor: Colors.card, borderRadius: Radius.card, borderCurve: 'continuous', overflow: 'hidden' },
  cardButton: { marginHorizontal: Spacing.screen },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.separator },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingVertical: 11,
    paddingHorizontal: Spacing.rowInset,
  },
  rowText: { flex: 1, gap: 1 },
  title: { fontSize: 17, color: Colors.label },
  bold: { fontWeight: '600' },
  subtitle: { fontSize: 15, color: Colors.secondaryLabel },
  detail: { fontSize: 17, color: Colors.secondaryLabel },
  tile: {
    width: 30,
    height: 30,
    borderRadius: Radius.tile,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileGlyph: { color: '#FFFFFF', fontWeight: '700', fontSize: 17 },
});
