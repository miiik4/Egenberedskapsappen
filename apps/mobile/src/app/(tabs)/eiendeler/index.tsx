import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Row, Section } from '@/components/ui/list';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Colors, Spacing } from '@/constants/theme';
import { formatKr } from '@/lib/format';
import { properties, rooms, trips } from '@/lib/sample-data';

type Tab = 'innbo' | 'reise';

const openCamera = () => Alert.alert('Film et rom', 'Kameraet kommer i neste steg.');

export default function Eiendeler() {
  const [view, setView] = useState<Tab>('innbo');
  const [property, setProperty] = useState(properties[0]!.id);

  return (
    <>
      <Stack.Screen options={{ title: 'Eiendeler' }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Menu>
          <Stack.Toolbar.Label>{properties.find((p) => p.id === property)!.short}</Stack.Toolbar.Label>
          {properties.map((p) => (
            <Stack.Toolbar.MenuAction key={p.id} isOn={p.id === property} onPress={() => setProperty(p.id)}>
              {p.short}
            </Stack.Toolbar.MenuAction>
          ))}
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="plus" variant="prominent" tintColor={Colors.accent} onPress={openCamera} />
      </Stack.Toolbar>

      <Screen>
        <Segmented
          options={[
            { value: 'innbo', label: 'Innbo' },
            { value: 'reise', label: 'Reise' },
          ]}
          value={view}
          onChange={setView}
        />
        {view === 'innbo' ? <Innbo /> : <Reise />}
      </Screen>
    </>
  );
}

function Innbo() {
  const total = rooms.reduce((sum, room) => sum + room.value, 0);
  const filmed = rooms.filter((room) => room.filmed).length;

  return (
    <>
      <View style={styles.stats}>
        <Stat value={formatKr(total)} label="dokumentert" />
        <Stat value={`${filmed} av ${rooms.length}`} label="rom filmet" />
      </View>
      <Section header="Rom" separatorInset={74}>
        {rooms.map((room) => (
          <Row
            key={room.id}
            title={room.name}
            subtitle={room.filmed ? `${room.items} gjenstander · ${formatKr(room.value)}` : 'Ikke filmet'}
            leading={<View style={[styles.thumb, !room.filmed && styles.thumbEmpty]} />}
            chevron={room.filmed}
            trailing={!room.filmed && <Pill label="Film" tone="accent" onPress={openCamera} />}
            onPress={room.filmed ? () => Alert.alert(room.name, 'Romvisningen kommer snart.') : undefined}
          />
        ))}
      </Section>
    </>
  );
}

function Reise() {
  const upcoming = trips.filter((trip) => trip.upcoming);
  const past = trips.filter((trip) => !trip.upcoming);
  return (
    <>
      {upcoming.length > 0 && (
        <Section header="Kommende" footer="Punktene blir gjøremål på Hjem uken før avreise.">
          {upcoming.map((trip) => (
            <Row key={trip.id} title={trip.name} subtitle={trip.when} chevron onPress={() => {}} />
          ))}
        </Section>
      )}
      <Section header="Tidligere">
        {past.map((trip) => (
          <Row
            key={trip.id}
            title={trip.name}
            subtitle={`${trip.when} · ${trip.items} gjenstander`}
            detail={formatKr(trip.value)}
            chevron
            onPress={() => {}}
          />
        ))}
      </Section>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 12, marginHorizontal: Spacing.screen, marginTop: -8 },
  stat: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: Colors.card,
  },
  statValue: { fontSize: 22, fontWeight: '700', color: Colors.label, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 15, color: Colors.secondaryLabel },
  thumb: { width: 44, height: 44, borderRadius: 10, backgroundColor: Colors.fill },
  thumbEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.tertiaryLabel,
  },
});
