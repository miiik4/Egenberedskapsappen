import { SHELTER_WALK_METERS, sheltersNear, SHELTERS_UPDATED, type LatLon, type Shelter } from '@egenberedskap/core';
import * as Location from 'expo-location';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, StyleSheet, View } from 'react-native';

import { ShelterMap, shelterMapAvailable } from '@/components/shelter-map';
import { PrimaryButton } from '@/components/ui/button';
import { Row, Section } from '@/components/ui/list';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';
import { formatDate, formatDistance } from '@/lib/format';

/** Rows before «Vis alle»; the map always shows every shelter in the list. */
const FIRST_ROWS = 10;
/** Farther than this, the list can't help: say so, and give DSB's advice. */
const FAR_M = 50_000;

type Position = { status: 'loading' } | { status: 'denied' } | { status: 'unknown' } | { status: 'found'; at: LatLon };

/** Asks for the position only while the screen is open, and only to sort the list on the phone. */
async function findPosition(ask: boolean): Promise<Position> {
  const permission = ask
    ? await Location.requestForegroundPermissionsAsync()
    : await Location.getForegroundPermissionsAsync();
  if (permission.status !== 'granted') return { status: 'denied' };
  try {
    // GPS works without a network. A recent fix is good enough to start with.
    const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000, requiredAccuracy: 500 });
    const fix = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return { status: 'found', at: { latitude: fix.coords.latitude, longitude: fix.coords.longitude } };
  } catch {
    return { status: 'unknown' };
  }
}

const title = (shelter: Shelter) => shelter.address || `Tilfluktsrom ${shelter.room}`;

/** Opens the phone's maps app with walking directions. The app itself never sends the position anywhere. */
function directions(shelter: Shelter) {
  const { latitude, longitude } = shelter;
  const label = encodeURIComponent(title(shelter));
  Linking.openURL(
    Platform.OS === 'ios'
      ? `maps://?daddr=${latitude},${longitude}&dirflg=w&q=${label}`
      : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`,
  );
}

/**
 * The public shelters nearest the phone, from DSB's list in the app: it works with no network,
 * and the position is never sent. The map needs a network for its tiles; the list doesn't.
 */
export default function Tilfluktsrom() {
  const [position, setPosition] = useState<Position>({ status: 'loading' });
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    findPosition(false).then(setPosition);
  }, []);

  const ask = async () => {
    setPosition({ status: 'loading' });
    setPosition(await findPosition(true));
  };

  const at = position.status === 'found' ? position.at : null;
  // Every shelter within walking distance, so Oslo lists many and Porsgrunn a few; at least the nearest three.
  const nearby = at ? sheltersNear(at) : [];
  const rows = showAll ? nearby : nearby.slice(0, FIRST_ROWS);
  const allWithinWalk = nearby.length > 0 && nearby.every((n) => n.meters <= SHELTER_WALK_METERS);

  return (
    <>
      <Stack.Screen options={{ title: 'Tilfluktsrom' }} />
      <Screen>
        {shelterMapAvailable && (
          <ShelterMap at={at} shelters={nearby.map((n) => n.shelter)} reachMeters={nearby.at(-1)?.meters ?? 0} title={title} />
        )}

        {position.status === 'loading' && (
          <View style={styles.loading}>
            <ActivityIndicator color={Colors.secondaryLabel} />
            <Text style={styles.muted}>Finner posisjonen din …</Text>
          </View>
        )}

        {(position.status === 'denied' || position.status === 'unknown') && (
          <Section
            footer={
              position.status === 'denied'
                ? 'Appen bruker posisjonen bare på telefonen for å finne de nærmeste rommene. Den sendes ikke noe sted.'
                : 'Fant ikke posisjonen. Gå gjerne ut eller nær et vindu, og prøv igjen.'
            }>
            <View style={styles.ask}>
              <PrimaryButton label={position.status === 'denied' ? 'Bruk posisjonen min' : 'Prøv igjen'} onPress={ask} />
            </View>
          </Section>
        )}

        {nearby.length > 0 && (
          <Section
            header="Nærmest deg"
            headerDetail={allWithinWalk ? `${nearby.length} innen ${SHELTER_WALK_METERS / 1000} km` : undefined}
            footer={
              nearby[0] && nearby[0].meters > FAR_M
                ? 'Det er langt til nærmeste offentlige tilfluktsrom. Søk beskyttelse der du er.'
                : 'Trykk på et rom for veibeskrivelse i Kart.'
            }>
            {rows.map(({ shelter, meters, direction }) => (
              <Row
                key={shelter.id}
                title={title(shelter)}
                subtitle={[
                  `${formatDistance(meters)} mot ${direction}`,
                  shelter.places > 0 ? `${shelter.places} plasser` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                chevron
                onPress={() => directions(shelter)}
              />
            ))}
            {rows.length < nearby.length && (
              <Row title={`Vis alle ${nearby.length}`} titleColor={Colors.accent} onPress={() => setShowAll(true)} />
            )}
          </Section>
        )}

        <Section header="Verdt å vite">
          <View style={styles.note}>
            <Text style={styles.noteText}>
              Offentlige tilfluktsrom kan brukes til andre ting i fredstid. Kommunen skal kunne rydde og gjøre dem klare
              i løpet av 72 timer hvis situasjonen krever det.
            </Text>
            <Text style={styles.noteText}>
              Bor du i en blokk, kan bygget ha et eget tilfluktsrom. De er ikke med her. Er det langt til et rom, søk
              beskyttelse der du er.
            </Text>
          </View>
        </Section>

        <Section
          header="Informasjonspunkt"
          footer={`Tilfluktsrom fra DSB, oppdatert ${formatDate(SHELTERS_UPDATED)} ${SHELTERS_UPDATED.slice(0, 4)}. Bare offentlige rom.`}>
          <View style={styles.note}>
            <Text style={styles.noteText}>
              Et informasjonspunkt er noe annet enn et tilfluktsrom. Hvis strøm, mobil og internett er borte, gir
              kommunen informasjon og hjelp der. Hvor de er, finner du på kommunens nettside. Sjekk det nå, mens nettet
              virker.
            </Text>
          </View>
        </Section>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: Spacing.screen + 4 },
  muted: { fontSize: 15, color: Colors.secondaryLabel },
  ask: { padding: 16 },
  note: { padding: 16, gap: 10 },
  noteText: { fontSize: 15, lineHeight: 21, color: Colors.label },
});
