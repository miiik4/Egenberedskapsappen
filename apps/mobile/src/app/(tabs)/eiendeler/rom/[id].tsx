import { summarizeRooms } from '@egenberedskap/core';
import type { StoredBelonging } from '@egenberedskap/store';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AddRow, EmptyRow, Row, Section } from '@/components/ui/list';
import { Screen } from '@/components/ui/screen';
import { ToolbarIcons } from '@/components/toolbar-icons';
import { Colors, Spacing } from '@/constants/theme';
import { useData } from '@/data/data-provider';
import { storedFile } from '@/documents/files';
import { countLabel, formatKr } from '@/lib/format';
import { Text } from '@/components/ui/text';

/** One room and what's documented in it. */
export default function Rom() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { rooms, belongings } = useData();
  const room = rooms.find((r) => r.id === id);
  if (!room) return null;

  const things = belongings.filter((b) => b.roomId === room.id);
  const summary = summarizeRooms(things).get(room.id);
  const add = () => router.push({ pathname: '/gjenstand', params: { roomId: room.id } });

  return (
    <>
      <Stack.Screen options={{ title: room.name }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon={ToolbarIcons.more}>
          <Stack.Toolbar.MenuAction icon="sparkles" onPress={() => router.push({ pathname: '/film', params: { roomId: room.id } })}>
            Dokumenter med KI
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="pencil" onPress={() => router.push({ pathname: '/rom', params: { id: room.id } })}>
            Endre rommet
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
        <Stack.Toolbar.Button icon={ToolbarIcons.plus} accessibilityLabel="Legg til gjenstand" onPress={add} />
      </Stack.Toolbar>

      <Screen>
        <Text style={styles.subtitle}>
          {summary ? `${countLabel(summary.count)} · ${formatKr(summary.valueKr)}` : 'Ingenting registrert ennå'}
        </Text>
        <Section separatorInset={74} footer="Ta med det som ville kostet noe å erstatte. Bilde og kvittering gjør en skademelding enklere.">
          {things.length === 0 && <EmptyRow text="Legg til det som står i rommet, med bilde og verdi." />}
          {things.map((thing) => (
            <Row
              key={thing.id}
              title={thing.name}
              subtitle={`${thing.category} · ${thing.valueKr !== undefined ? formatKr(thing.valueKr) : 'Uten verdi'}`}
              leading={<Thumb thing={thing} />}
              chevron
              onPress={() => router.push({ pathname: '/gjenstand', params: { id: thing.id } })}
            />
          ))}
          <AddRow title="Legg til gjenstand" onPress={add} />
        </Section>
      </Screen>
    </>
  );
}

function Thumb({ thing }: { thing: StoredBelonging }) {
  return thing.photo ? (
    <Image source={{ uri: storedFile(thing.photo.fileName).uri }} style={styles.thumb} contentFit="cover" />
  ) : (
    <View style={styles.thumb} />
  );
}

const styles = StyleSheet.create({
  subtitle: { marginHorizontal: Spacing.screen + 4, marginTop: -16, fontSize: 17, color: Colors.secondaryLabel },
  thumb: { width: 44, height: 44, borderRadius: 10, borderCurve: 'continuous', backgroundColor: Colors.fill },
});
