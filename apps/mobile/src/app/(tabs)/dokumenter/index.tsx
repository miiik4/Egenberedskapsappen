import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Row, Section } from '@/components/ui/list';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { formatKr, initials } from '@/lib/format';
import { contacts, documents, emergencyNumbers, meetingPlace, policies } from '@/lib/sample-data';

type Tab = 'nodinfo' | 'forsikring';

const call = (number: string) => Linking.openURL(`tel:${number}`);

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
        <Stack.Toolbar.Button icon="plus" onPress={() => Alert.alert('Legg til', 'Kommer snart.')} />
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
  return (
    <>
      {/* Emergency numbers always come first and never sit behind anything else. */}
      <View style={styles.numbers}>
        {emergencyNumbers.map((n) => (
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
            subtitle={c.relation}
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
        <Row
          title="Møtested"
          subtitle={`${meetingPlace.name}, ${meetingPlace.address}`}
          leading={
            <View style={[styles.avatar, { backgroundColor: Colors.accent }]}>
              <Icon name={{ ios: 'mappin', android: 'location_on' }} size={18} color="#FFFFFF" />
            </View>
          }
        />
      </Section>

      <Section header="Dokumenter">
        {documents.map((d) => (
          <Row key={d.id} title={d.name} detail={String(d.files)} chevron onPress={() => {}} />
        ))}
      </Section>
    </>
  );
}

function Forsikring() {
  return (
    <Section header="Forsikringer" footer="Fornyelser innen 60 dager blir gjøremål på Hjem.">
      {policies.map((p) => (
        <Row
          key={p.id}
          title={p.name}
          subtitle={[p.sum && `${formatKr(p.sum)} forsikringssum`, `Egenandel ${formatKr(p.deductible)}`]
            .filter(Boolean)
            .join(' · ')}
          detail={p.renews}
          chevron
          onPress={() => {}}
        />
      ))}
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
