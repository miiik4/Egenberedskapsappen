import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ColorValue } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

import { Icon, type IconName } from './icon';
import { Text } from '@/components/ui/text';

/** An iOS inset grouped section: uppercase header, rounded card, hairline separators, footnote. */
export function Section({
  header,
  headerDetail,
  onHeaderPress,
  footer,
  separatorInset = Spacing.rowInset,
  children,
}: {
  header?: string;
  /** Right-aligned next to the header, not uppercased: «1 av 2». */
  headerDetail?: string;
  /** Makes the detail a link with a chevron, e.g. «2 av 7 døgn ›» to the category page. */
  onHeaderPress?: () => void;
  footer?: string;
  /** Where separators start, so they line up with the row text rather than its icon. */
  separatorInset?: number;
  children: ReactNode;
}) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.section}>
      {header && onHeaderPress ? (
        <Pressable
          onPress={onHeaderPress}
          accessibilityRole="button"
          accessibilityLabel={headerDetail ? `${header}, ${headerDetail}` : header}
          hitSlop={6}
          style={({ pressed }) => [styles.headerRow, pressed && { opacity: 0.6 }]}>
          <Text style={styles.header}>{header.toUpperCase()}</Text>
          <View style={styles.headerLink}>
            {headerDetail && <Text style={[styles.header, styles.headerLinkText]}>{headerDetail}</Text>}
            <Icon name={{ ios: 'chevron.right', android: 'chevron_right' }} size={11} color={Colors.accent} />
          </View>
        </Pressable>
      ) : (
        header && (
          <View style={styles.headerRow}>
            <Text style={styles.header}>{header.toUpperCase()}</Text>
            {headerDetail && <Text style={styles.header}>{headerDetail}</Text>}
          </View>
        )
      )}
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

/** «+ Legg til …» as the last row of a section. */
export function AddRow({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Row
      title={title}
      titleColor={Colors.accent}
      leading={<Icon name={{ ios: 'plus', android: 'add' }} size={17} color={Colors.accent} />}
      onPress={onPress}
    />
  );
}

/** A quiet line of text inside a section that has nothing in it yet. */
export function EmptyRow({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>;
}

/** A coloured rounded square behind a white glyph, as in Settings. */
export function IconTile({ name, color }: { name: IconName; color: ColorValue }) {
  return (
    <View style={[styles.tile, { backgroundColor: color }]}>
      <Icon name={name} size={15} color="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginHorizontal: Spacing.screen, gap: 7 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: Spacing.rowInset },
  header: { fontSize: 13, fontWeight: '600', color: Colors.secondaryLabel, letterSpacing: 0.8 },
  headerLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerLinkText: { color: Colors.accent, letterSpacing: 0 },
  footer: { marginHorizontal: Spacing.rowInset, fontSize: 13, color: Colors.secondaryLabel, lineHeight: 18 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.card,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  separator: { height: 1, backgroundColor: Colors.separator },
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
  empty: { fontSize: 15, lineHeight: 20, color: Colors.secondaryLabel, paddingHorizontal: Spacing.rowInset, paddingVertical: 14 },
  tile: {
    width: 30,
    height: 30,
    borderRadius: Radius.tile,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
