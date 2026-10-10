import { router, Stack } from 'expo-router';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { AddRow, Row, Section } from '@/components/ui/list';
import { Screen } from '@/components/ui/screen';
import { ToolbarIcons } from '@/components/toolbar-icons';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useData } from '@/data/data-provider';
import { initials } from '@/lib/format';
import { Text } from '@/components/ui/text';

const EMERGENCY_NUMBERS = [
  { number: '110', label: 'Brann' },
  { number: '112', label: 'Politi' },
  { number: '113', label: 'Ambulanse' },
  { number: '116117', display: '116 117', label: 'Legevakt' },
];

const call = (number: string) => Linking.openURL(`tel:${number.replace(/\s/g, '')}`);

/** Opens the meeting place in the phone's maps app. */
const openMap = (address: string) => {
  const q = encodeURIComponent(address);
  Linking.openURL(Platform.OS === 'ios' ? `maps://?q=${q}` : `geo:0,0?q=${q}`);
};

/**
 * Its own tab, so it's always one tap away, also in a crisis. Stored on the phone and works
 * without a network. Numbers and contacts are never locked; documents open behind the lock.
 */
export default function Nodinfo() {
  const { contacts, meetingPlace, documents } = useData();

  return (
    <>
      <Stack.Screen options={{ title: 'Nødinfo' }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon={ToolbarIcons.plus}>
          <Stack.Toolbar.MenuAction icon="person.crop.circle.badge.plus" onPress={() => router.push('/kontakt')}>
            Nødkontakt
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="mappin" onPress={() => router.push('/motested')}>
            Møtested
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="doc.badge.plus" onPress={() => router.push('/dokument')}>
            Dokument
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>

      <Screen>
        <View style={styles.offline}>
          <Icon name={{ ios: 'iphone', android: 'smartphone' }} size={15} color={Colors.secondaryLabel} />
          <Text style={styles.offlineText}>Lagret på telefonen, kan åpnes uten nett</Text>
        </View>

        <View style={styles.numbers}>
          {EMERGENCY_NUMBERS.map((n) => (
            <Pressable
              key={n.number}
              onPress={() => call(n.number)}
              accessibilityRole="button"
              accessibilityLabel={`Ring ${n.label}, ${n.display ?? n.number}`}
              style={({ pressed }) => [styles.number, pressed && { opacity: 0.7 }]}>
              <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.numberText, n.display && styles.numberLong]}>
                {n.display ?? n.number}
              </Text>
              <Text style={styles.numberLabel}>{n.label}</Text>
            </Pressable>
          ))}
        </View>

        <Section header="Nødkontakter" separatorInset={68}>
          {contacts.map((c, i) => (
            <Row
              key={c.id}
              title={c.name}
              subtitle={c.relation || c.phone}
              onPress={() => router.push({ pathname: '/kontakt', params: { id: c.id } })}
              leading={
                <View style={[styles.avatar, i === 0 && styles.avatarFirst]}>
                  <Text style={[styles.avatarText, i === 0 && styles.avatarTextFirst]}>{initials(c.name)}</Text>
                </View>
              }
              trailing={
                <Pressable
                  onPress={() => call(c.phone)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Ring ${c.name}`}
                  style={styles.callButton}>
                  <Icon name={{ ios: 'phone.fill', android: 'call' }} size={15} color={Colors.accent} />
                </Pressable>
              }
            />
          ))}
          <AddRow title="Legg til nødkontakt" onPress={() => router.push('/kontakt')} />
        </Section>

        <Section header="Møtested" footer="Hvis dere ikke får kontakt, møtes dere her.">
          {meetingPlace ? (
            <Row
              title={meetingPlace.name}
              subtitle={meetingPlace.address || undefined}
              onPress={() => router.push('/motested')}
              trailing={
                meetingPlace.address ? (
                  <Pressable
                    onPress={() => openMap(meetingPlace.address)}
                    hitSlop={8}
                    accessibilityRole="link"
                    accessibilityLabel={`Vis ${meetingPlace.name} på kart`}>
                    <Text style={styles.map}>Kart</Text>
                  </Pressable>
                ) : undefined
              }
            />
          ) : (
            <AddRow title="Legg til møtested" onPress={() => router.push('/motested')} />
          )}
        </Section>

        <Section header="Dokumenter" footer="Pass, resepter og skjøte lagres på telefonen og kan åpnes uten nett.">
          {documents.map((d) => (
            <Row
              key={d.id}
              title={d.name}
              detail={d.files.length > 0 ? String(d.files.length) : 'Tom'}
              chevron
              onPress={() => router.push({ pathname: '/nodinfo/[id]', params: { id: d.id } })}
            />
          ))}
          <AddRow title="Legg til dokument" onPress={() => router.push('/dokument')} />
        </Section>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  offline: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: Spacing.screen + 4, marginTop: Spacing.underTitle },
  offlineText: { fontSize: 17, color: Colors.secondaryLabel },
  numbers: { flexDirection: 'row', gap: 8, marginHorizontal: Spacing.screen },
  number: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: Colors.card,
  },
  // Only the phone numbers are in large type.
  numberText: { fontFamily: Fonts.display, fontSize: 20, lineHeight: 24, color: Colors.label, fontVariant: ['tabular-nums'] },
  numberLong: { fontSize: 17 },
  numberLabel: { fontSize: 12, color: Colors.secondaryLabel },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.fill,
  },
  avatarFirst: { backgroundColor: Colors.indigoSoft },
  avatarText: { fontSize: 15, fontWeight: '600', color: Colors.secondaryLabel },
  avatarTextFirst: { color: Colors.indigo },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accentSoft,
  },
  map: { fontSize: 17, color: Colors.accent },
});
