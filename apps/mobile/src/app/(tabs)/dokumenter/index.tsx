import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { AddRow, Row, Section } from '@/components/ui/list';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { ToolbarIcons } from '@/components/toolbar-icons';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useData } from '@/data/data-provider';
import { formatDate, formatKr, initials } from '@/lib/format';

type Tab = 'nodinfo' | 'forsikring';

const EMERGENCY_NUMBERS = [
  { number: '110', label: 'Brann', urgent: true },
  { number: '112', label: 'Politi', urgent: true },
  { number: '113', label: 'Ambulanse', urgent: true },
  { number: '116117', display: '116 117', label: 'Legevakt', urgent: false },
];

const call = (number: string) => Linking.openURL(`tel:${number.replace(/\s/g, '')}`);

export default function Dokumenter() {
  const [tab, setTab] = useState<Tab>('nodinfo');

  return (
    <>
      <Stack.Screen options={{ title: 'Dokumenter' }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.View hidesSharedBackground>
          <View style={styles.offline}>
            <View style={styles.offlineDot} />
            <Text style={styles.offlineText}>Tilgjengelig uten nett</Text>
          </View>
        </Stack.Toolbar.View>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon={ToolbarIcons.plus}>
          <Stack.Toolbar.MenuAction icon="doc.badge.plus" onPress={() => router.push('/dokument')}>
            Dokument
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="person.crop.circle.badge.plus" onPress={() => router.push('/kontakt')}>
            Nødkontakt
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="mappin" onPress={() => router.push('/motested')}>
            Møtested
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="checkmark.shield" onPress={() => router.push('/forsikring')}>
            Forsikring
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>

      <Screen>
        <Segmented
          options={[
            { value: 'nodinfo', label: 'Nødinfo' },
            { value: 'forsikring', label: 'Forsikring' },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === 'nodinfo' ? <Nodinfo /> : <Forsikring />}
      </Screen>
    </>
  );
}

function Nodinfo() {
  const { contacts, meetingPlace, documents } = useData();
  return (
    <>
      {/* Emergency numbers always come first and never sit behind anything else. */}
      <View style={styles.numbers}>
        {EMERGENCY_NUMBERS.map((n) => (
          <Pressable
            key={n.number}
            onPress={() => call(n.number)}
            accessibilityRole="button"
            accessibilityLabel={`Ring ${n.label}, ${n.display ?? n.number}`}
            style={({ pressed }) => [styles.number, pressed && { opacity: 0.7 }]}>
            <Text
              adjustsFontSizeToFit
              numberOfLines={1}
              style={[styles.numberText, { color: n.urgent ? Colors.destructive : Colors.label }]}>
              {n.display ?? n.number}
            </Text>
            <Text style={styles.numberLabel}>{n.label}</Text>
          </Pressable>
        ))}
      </View>

      <Section header="Nødkontakter" separatorInset={74}>
        {contacts.map((c) => (
          <Row
            key={c.id}
            title={c.name}
            subtitle={c.relation || c.phone}
            onPress={() => router.push({ pathname: '/kontakt', params: { id: c.id } })}
            leading={
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(c.name)}</Text>
              </View>
            }
            trailing={
              <Pressable
                onPress={() => call(c.phone)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Ring ${c.name}`}
                style={styles.callButton}>
                <Icon name={{ ios: 'phone.fill', android: 'call' }} size={15} color={Colors.success} />
              </Pressable>
            }
          />
        ))}
        {meetingPlace ? (
          <Row
            title="Møtested"
            subtitle={[meetingPlace.name, meetingPlace.address].filter(Boolean).join(', ')}
            onPress={() => router.push('/motested')}
            leading={
              <View style={[styles.avatar, { backgroundColor: Colors.accent }]}>
                <Icon name={{ ios: 'mappin', android: 'location_on' }} size={18} color="#FFFFFF" />
              </View>
            }
          />
        ) : (
          <AddRow title="Legg til møtested" onPress={() => router.push('/motested')} />
        )}
        <AddRow title="Legg til nødkontakt" onPress={() => router.push('/kontakt')} />
      </Section>

      <Section header="Dokumenter" footer="Pass, resepter og skjøte lagres på telefonen og kan åpnes uten nett.">
        {documents.map((d) => (
          <Row
            key={d.id}
            title={d.name}
            detail={d.files.length > 0 ? String(d.files.length) : 'Tom'}
            chevron
            onPress={() => router.push({ pathname: '/dokumenter/[id]', params: { id: d.id } })}
          />
        ))}
        <AddRow title="Legg til dokument" onPress={() => router.push('/dokument')} />
      </Section>
    </>
  );
}

function Forsikring() {
  const { policies } = useData();
  return (
    <Section header="Forsikringer" footer="Fornyelsesdato, forsikringssum og egenandel samlet ett sted.">
      {policies.map((p) => (
        <Row
          key={p.id}
          title={p.name}
          subtitle={
            [
              p.sumKr !== undefined && `${formatKr(p.sumKr)} forsikringssum`,
              p.deductibleKr !== undefined && `Egenandel ${formatKr(p.deductibleKr)}`,
            ]
              .filter(Boolean)
              .join(' · ') || undefined
          }
          detail={p.renewsOn && formatDate(p.renewsOn)}
          chevron
          onPress={() => router.push({ pathname: '/forsikring', params: { id: p.id } })}
        />
      ))}
      <AddRow title="Legg til forsikring" onPress={() => router.push('/forsikring')} />
    </Section>
  );
}

const styles = StyleSheet.create({
  offline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: Radius.pill,
    backgroundColor: Colors.successSoft,
  },
  offlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.success },
  offlineText: { fontSize: 13, fontWeight: '600', color: Colors.success },
  numbers: { flexDirection: 'row', gap: 8, marginHorizontal: Spacing.screen, marginTop: -8 },
  number: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: Colors.card,
  },
  numberText: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  numberLabel: { fontSize: 12, color: Colors.secondaryLabel },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8E8E93',
  },
  avatarText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.successSoft,
  },
});
