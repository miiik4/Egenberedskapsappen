import {
  MEETING_POINTS_UPDATED,
  meetingPointsNear,
  SHELTER_WALK_METERS,
  sheltersNear,
  SHELTERS_UPDATED,
  type LatLon,
  type Shelter,
} from '@egenberedskap/core';
import * as Location from 'expo-location';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, StyleSheet, View } from 'react-native';

import { MarkerIcon } from '@/components/map-markers';
import { useActions, useData } from '@/data/data-provider';
import { ShelterMap, shelterMapAvailable } from '@/components/shelter-map';
import { PrimaryButton } from '@/components/ui/button';
import { EmptyRow, Row, Section } from '@/components/ui/list';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';
import { formatDate, formatDateWithYear, formatDistance, formatTime, todayIso } from '@/lib/format';

/** Rows before «Vis alle»; the map always shows every shelter in the list. */
const FIRST_ROWS = 10;
/** Farther than this, the list can't help: say so, and give DSB's advice. */
const FAR_M = 50_000;

/** `wait` is whether GPS was (or is being) waited for; without it, only a recent fix was looked for. */
type Position =
  | { status: 'loading'; wait: boolean }
  | { status: 'denied' }
  | { status: 'unknown'; wait: boolean }
  | { status: 'found'; at: LatLon };

/**
 * Asks for the position only while the screen is open, and only to sort the list on the phone. A fix the phone
 * already has is taken as is; GPS is turned on and waited for only with `wait`.
 */
async function findPosition({ ask, wait }: { ask: boolean; wait: boolean }): Promise<Position> {
  const permission = ask
    ? await Location.requestForegroundPermissionsAsync()
    : await Location.getForegroundPermissionsAsync();
  if (permission.status !== 'granted') return { status: 'denied' };
  try {
    // A recent fix is good enough to start with.
    const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000, requiredAccuracy: 500 });
    if (last) return { status: 'found', at: { latitude: last.coords.latitude, longitude: last.coords.longitude } };
    return wait ? await firstFix() : { status: 'unknown', wait: false };
  } catch {
    return { status: 'unknown', wait };
  }
}

/** GPS from cold, indoors and with no mobile network to help it, can need a minute or two. */
const FIX_TIMEOUT_MS = 120_000;

/**
 * The first position the phone finds. High accuracy turns GPS on: Android's balanced mode uses only Wi-Fi and cell
 * towers, which find nothing without a SIM or on a phone's hotspot, and that's how it may be when the network is
 * down. Whatever comes first wins, Wi-Fi in seconds or GPS later.
 */
function firstFix(): Promise<Position> {
  return new Promise((resolve) => {
    let subscription: Location.LocationSubscription | null = null;
    let done = false;
    const finish = (position: Position) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      subscription?.remove();
      resolve(position);
    };
    const timer = setTimeout(() => finish({ status: 'unknown', wait: true }), FIX_TIMEOUT_MS);
    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High },
      (fix) => finish({ status: 'found', at: { latitude: fix.coords.latitude, longitude: fix.coords.longitude } }),
      () => finish({ status: 'unknown', wait: true }),
    )
      .then((s) => (done ? s.remove() : (subscription = s)))
      .catch(() => finish({ status: 'unknown', wait: true }));
  });
}

const title = (shelter: Shelter) => shelter.address || `Tilfluktsrom ${shelter.room}`;

/** Opens the phone's maps app with walking directions. The app itself never sends the position anywhere. */
function directions({ latitude, longitude }: LatLon, name: string) {
  const label = encodeURIComponent(name);
  Linking.openURL(
    Platform.OS === 'ios'
      ? `maps://?daddr=${latitude},${longitude}&dirflg=w&q=${label}`
      : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`,
  );
}

/** «Lundedalen 35, 3940 Porsgrunn» → «Lundedalen 35»: the municipality is in the link below the list. */
const street = (address: string) => address.split(',')[0]!;

/** «28. oktober kl. 14.03», in the phone's time zone. */
function formatFoundAt(at: string) {
  const date = new Date(at);
  return `${formatDate(todayIso(date))} ${formatTime(date)}`;
}

/**
 * The public shelters nearest the phone, from DSB's list in the app, and the municipalities' information points
 * as a list of their own: both work with no network, and the position is never sent. The map needs a network for
 * its tiles; the lists don't.
 *
 * The position found is kept on the phone, so next time the screen shows at once and nobody waits for GPS: then
 * only a fix the phone already has replaces it on its own, and GPS runs again when the user asks. The map draws
 * every shelter and information point in the country, opened on the nearby ones; with no position at all, on
 * all of Norway.
 */
export default function Tilfluktsrom() {
  const { lastPosition } = useData();
  const { setLastPosition } = useActions();
  const [position, setPosition] = useState<Position>({ status: 'loading', wait: lastPosition === null });
  const [showAll, setShowAll] = useState(false);

  const settle = async (found: Position) => {
    setPosition(found);
    if (found.status === 'found') await setLastPosition(found.at);
  };

  useEffect(() => {
    // Once, when the screen opens; whether to wait for GPS depends on what was saved then, not on what gets saved.
    findPosition({ ask: false, wait: lastPosition === null }).then(settle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ask = async () => {
    setPosition({ status: 'loading', wait: true });
    await settle(await findPosition({ ask: true, wait: true }));
  };

  const live = position.status === 'found' ? position.at : null;
  // Until the phone finds itself, the last position it found: the lists are from there, and the status row says so.
  const at = live ?? (lastPosition && { latitude: lastPosition.latitude, longitude: lastPosition.longitude });
  const remembered = live === null && lastPosition !== null;
  // Every shelter within walking distance, so Oslo lists many and Porsgrunn a few; at least the nearest three.
  const nearby = at ? sheltersNear(at) : [];
  const rows = showAll ? nearby : nearby.slice(0, FIRST_ROWS);
  const allWithinWalk = nearby.length > 0 && nearby.every((n) => n.meters <= SHELTER_WALK_METERS);
  const points = at ? meetingPointsNear(at) : [];
  // One link per municipality listed, so the points near a border lead to both pages.
  const sources = [...new Map(points.map(({ point }) => [point.municipality, point.source])).entries()];

  return (
    <>
      {/* Too long for a large title, which would cut it off; a normal one fits the whole name. */}
      <Stack.Screen options={{ title: 'Tilfluktsrom og informasjonspunkter', headerLargeTitleEnabled: false }} />
      <Screen>
        {shelterMapAvailable && (
          <ShelterMap
            at={at}
            myLocation={live !== null}
            shelters={nearby.map((n) => n.shelter)}
            meetingPoints={points.map((n) => n.point)}
            title={title}
          />
        )}

        {position.status === 'loading' && position.wait && (
          <View style={styles.loading}>
            <ActivityIndicator color={Colors.secondaryLabel} />
            <Text style={[styles.muted, styles.shrink]}>Finner posisjonen din … Innendørs kan det ta et par minutter.</Text>
          </View>
        )}

        {remembered && lastPosition && position.status !== 'loading' && (
          <Section
            footer={
              position.status === 'denied'
                ? 'Appen bruker posisjonen bare på telefonen for å finne de nærmeste rommene. Den sendes ikke noe sted.'
                : position.status === 'unknown' && position.wait
                  ? 'Fant ikke posisjonen nå. Gå gjerne ut eller nær et vindu, og prøv igjen.'
                  : 'Har du flyttet deg, finn posisjonen på nytt.'
            }>
            <Row
              title={`Posisjon fra ${formatFoundAt(lastPosition.at)}`}
              subtitle="Stedene under er nær der du var da."
            />
            <Row
              title={position.status === 'denied' ? 'Bruk posisjonen min' : 'Finn posisjonen på nytt'}
              titleColor={Colors.accent}
              onPress={ask}
            />
          </Section>
        )}

        {!remembered && (position.status === 'denied' || position.status === 'unknown') && (
          <Section
            footer={
              position.status === 'denied'
                ? 'Appen bruker posisjonen bare på telefonen for å finne de nærmeste rommene. Den sendes ikke noe sted.'
                : 'Fant ikke posisjonen. Gå gjerne ut eller nær et vindu, og prøv igjen. Kartet viser alle rommene i landet.'
            }>
            <View style={styles.ask}>
              <PrimaryButton label={position.status === 'denied' ? 'Bruk posisjonen min' : 'Prøv igjen'} onPress={ask} />
            </View>
          </Section>
        )}

        {nearby.length > 0 && (
          <Section
            header="Tilfluktsrom nærmest deg"
            headerDetail={allWithinWalk ? `${nearby.length} innen ${SHELTER_WALK_METERS / 1000} km` : undefined}
            footer={
              nearby[0] && nearby[0].meters > FAR_M
                ? 'Det er langt til nærmeste offentlige tilfluktsrom. Søk beskyttelse der du er.'
                : 'Trykk på et rom for veibeskrivelse i Kart.'
            }>
            {rows.map(({ shelter, meters, direction }) => {
              const subtitle = [
                `${formatDistance(meters)} mot ${direction}`,
                shelter.places > 0 ? `${shelter.places} plasser` : null,
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <Row
                  key={shelter.id}
                  leading={<MarkerIcon kind="shelter" />}
                  title={title(shelter)}
                  titleLines={2}
                  subtitle={subtitle}
                  accessibilityLabel={`Tilfluktsrom, ${title(shelter)}, ${subtitle}. Veibeskrivelse i Kart.`}
                  chevron
                  onPress={() => directions(shelter, title(shelter))}
                />
              );
            })}
            {rows.length < nearby.length && (
              <Row title={`Vis alle ${nearby.length}`} titleColor={Colors.accent} onPress={() => setShowAll(true)} />
            )}
          </Section>
        )}

        {at && (
          <Section
            header="Informasjonspunkter nærmest deg"
            footer={
              points.length > 0
                ? `Hvis strøm, mobil og internett er borte lenge, gir kommunen informasjon og hjelp her. Noen har folk på plass, andre har oppslag, og de åpner bare når kommunen trenger dem. Fra kommunens nettside ${formatDateWithYear(MEETING_POINTS_UPDATED)}; sjekk gjerne der.`
                : 'Hvis strøm, mobil og internett er borte lenge, gir kommunen informasjon og hjelp på faste steder. Hvor de er, står på kommunens nettside. Sjekk det nå, mens nettet virker.'
            }>
            {points.length === 0 && <EmptyRow text="Appen har ingen informasjonspunkter nær deg ennå." />}
            {points.map(({ point, meters, direction }) => {
              // Near a border the list mixes municipalities; then each row says whose it is.
              const where = sources.length > 1 ? `${street(point.address)}, ${point.municipality}` : street(point.address);
              const subtitle = `${formatDistance(meters)} mot ${direction} · ${where}`;
              return (
                <Row
                  key={point.id}
                  leading={<MarkerIcon kind="meetingPoint" />}
                  title={point.name}
                  titleLines={2}
                  subtitle={subtitle}
                  accessibilityLabel={`Informasjonspunkt, ${point.name}, ${subtitle}. Veibeskrivelse i Kart.`}
                  chevron
                  onPress={() => directions(point, point.name)}
                />
              );
            })}
            {sources.map(([municipality, source]) => (
              <Row
                key={source}
                title={`Les mer hos ${municipality} kommune`}
                titleColor={Colors.accent}
                accessibilityLabel={`Åpne ${municipality} kommunes side om informasjonspunkter`}
                onPress={() => Linking.openURL(source)}
              />
            ))}
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
            <Text style={styles.noteText}>
              Et informasjonspunkt er noe annet enn et tilfluktsrom: der får du informasjon, ikke beskyttelse.
            </Text>
          </View>
        </Section>

        <Text style={styles.credit}>
          Tilfluktsrom fra DSB, oppdatert {formatDateWithYear(SHELTERS_UPDATED)}. Bare offentlige rom.
        </Text>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: Spacing.screen + 4 },
  muted: { fontSize: 15, color: Colors.secondaryLabel },
  shrink: { flexShrink: 1 },
  ask: { padding: 16 },
  note: { padding: 16, gap: 10 },
  noteText: { fontSize: 15, lineHeight: 21, color: Colors.label },
  credit: { marginHorizontal: Spacing.screen + Spacing.rowInset, fontSize: 13, lineHeight: 18, color: Colors.secondaryLabel },
});
