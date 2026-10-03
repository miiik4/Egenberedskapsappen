import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AddRow, EmptyRow, Row, Section } from '@/components/ui/list';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { ToolbarIcons } from '@/components/toolbar-icons';
import { Colors, Spacing } from '@/constants/theme';
import { useActions, useData } from '@/data/data-provider';
import { formatKr } from '@/lib/format';

type Tab = 'innbo' | 'reise';

const openCamera = () => Alert.alert('Film et rom', 'Filming med KI kommer i en senere versjon.');

export default function Eiendeler() {
  const { properties, selectedPropertyId } = useData();
  const { selectProperty } = useActions();
  const [tab, setTab] = useState<Tab>('innbo');
  const property = properties.find((p) => p.id === selectedPropertyId);

  return (
    <>
      <Stack.Screen options={{ title: 'Eiendeler' }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Menu>
          <Stack.Toolbar.Label>{property?.shortName ?? 'Eiendom'}</Stack.Toolbar.Label>
          {properties.map((p) => (
            <Stack.Toolbar.MenuAction key={p.id} isOn={p.id === property?.id} onPress={() => selectProperty(p.id)}>
              {p.shortName}
            </Stack.Toolbar.MenuAction>
          ))}
          {property && (
            <Stack.Toolbar.MenuAction
              icon="pencil"
              onPress={() => router.push({ pathname: '/eiendom', params: { id: property.id } })}>
              Rediger {property.shortName.toLowerCase()}
            </Stack.Toolbar.MenuAction>
          )}
          <Stack.Toolbar.MenuAction icon="plus" onPress={() => router.push('/eiendom')}>
            Ny eiendom
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={ToolbarIcons.plus}
          variant="prominent"
          tintColor={Colors.accent}
          accessibilityLabel="Film et rom"
          onPress={openCamera}
        />
      </Stack.Toolbar>

      <Screen>
        <Segmented
          options={[
            { value: 'innbo', label: 'Innbo' },
            { value: 'reise', label: 'Reise' },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === 'innbo' ? <Innbo /> : <Reise />}
      </Screen>
    </>
  );
}

function Innbo() {
  const { rooms, selectedPropertyId } = useData();
  const propertyRooms = rooms.filter((room) => room.propertyId === selectedPropertyId);
  // Belongings come with filming; until then every room is unfilmed and worth nothing on record.
  const filmed = 0;

  return (
    <>
      <View style={styles.stats}>
        <Stat value={formatKr(0)} label="dokumentert" />
        <Stat value={`${filmed} av ${propertyRooms.length}`} label="rom filmet" />
      </View>
      <Section header="Rom" separatorInset={74}>
        {propertyRooms.map((room) => (
          <Row
            key={room.id}
            title={room.name}
            subtitle="Ikke filmet"
            leading={<View style={styles.thumb} />}
            trailing={<Pill label="Film" tone="accent" onPress={openCamera} />}
            onPress={() => router.push({ pathname: '/rom', params: { id: room.id } })}
          />
        ))}
        <AddRow title="Legg til rom" onPress={() => router.push('/rom')} />
      </Section>
    </>
  );
}

function Reise() {
  return (
    <Section footer="Ta med ting fra innboet på en reise, og film bagasjen før avreise.">
      <EmptyRow text="Reiser kommer i en senere versjon." />
    </Section>
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
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.tertiaryLabel,
  },
});
