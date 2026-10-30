import { cameraFor, type LatLon, type MeetingPoint, type Shelter } from '@egenberedskap/core';
import { requireOptionalNativeModule } from 'expo';
import Constants from 'expo-constants';
import { useImage } from 'expo-image';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { MARKERS, MarkerIcon } from '@/components/map-markers';
import { Text } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';

/** Shown before there's a position: most of Norway. */
const NORWAY = { latitude: 63.5, longitude: 11 };

/**
 * expo-maps is native only: not in Expo Go or on the web, and on Android it needs a Google Maps
 * key (app.config.ts). Where it can't run, there's no map and the screen is the list alone.
 */
const maps: typeof import('expo-maps') | null =
  requireOptionalNativeModule('ExpoMaps') &&
  (Platform.OS === 'ios' || Constants.expoConfig?.extra?.androidMaps === true)
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('expo-maps')
    : null;

export const shelterMapAvailable = maps !== null;

const HEIGHT = 280;
const CENTER = { x: 0.5, y: 0.5 };

export function ShelterMap({
  at,
  myLocation = at !== null,
  shelters,
  meetingPoints,
  title,
}: {
  /** Where the map is centred; null shows all of Norway. */
  at: LatLon | null;
  /** Whether to draw the phone's own position: only when `at` is where the phone is now, not a remembered place. */
  myLocation?: boolean;
  shelters: readonly Shelter[];
  meetingPoints: readonly MeetingPoint[];
  title: (s: Shelter) => string;
}) {
  const [width, setWidth] = useState(0);
  // Google Maps on Android draws pictures; Apple Maps tints its own balloons.
  const shelterIcon = useImage(MARKERS.shelter.image);
  const meetingPointIcon = useImage(MARKERS.meetingPoint.image);
  if (!maps) return null;
  // The phone and every place listed, so none of them is off the edge; all of Norway before there's a position.
  const camera = at ? cameraFor([at, ...shelters, ...meetingPoints], { width, height: HEIGHT }) : null;
  const cameraPosition = camera ? { coordinates: camera.center, zoom: camera.zoom } : { coordinates: NORWAY, zoom: 4 };
  const coordinates = (p: LatLon) => ({ latitude: p.latitude, longitude: p.longitude });
  const shelterMarkers = shelters.map((shelter) => ({
    id: shelter.id,
    coordinates: coordinates(shelter),
    title: title(shelter),
  }));
  const meetingPointMarkers = meetingPoints.map((point) => ({
    id: point.id,
    coordinates: coordinates(point),
    title: point.name,
  }));

  return (
    <View style={styles.wrap}>
      <View style={styles.map} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {Platform.OS === 'ios' ? (
          <maps.AppleMaps.View
            style={StyleSheet.absoluteFill}
            cameraPosition={cameraPosition}
            markers={[
              ...shelterMarkers.map((m) => ({ ...m, systemImage: MARKERS.shelter.symbol, tintColor: MARKERS.shelter.color })),
              ...meetingPointMarkers.map((m) => ({
                ...m,
                systemImage: MARKERS.meetingPoint.symbol,
                tintColor: MARKERS.meetingPoint.color,
              })),
            ]}
            properties={{ isMyLocationEnabled: myLocation }}
          />
        ) : (
          <maps.GoogleMaps.View
            style={StyleSheet.absoluteFill}
            cameraPosition={cameraPosition}
            markers={[
              ...shelterMarkers.map((m) => ({ ...m, icon: shelterIcon ?? undefined, anchor: CENTER })),
              ...meetingPointMarkers.map((m) => ({
                ...m,
                snippet: 'Informasjonspunkt',
                icon: meetingPointIcon ?? undefined,
                anchor: CENTER,
                zIndex: 1,
              })),
            ]}
            properties={{ isMyLocationEnabled: myLocation }}
          />
        )}
      </View>
      {meetingPoints.length > 0 && (
        <View style={styles.legend} accessible accessibilityLabel="Tegnforklaring: trekant er tilfluktsrom, i er informasjonspunkt">
          <View style={styles.legendItem}>
            <MarkerIcon kind="shelter" />
            <Text style={styles.legendText}>Tilfluktsrom</Text>
          </View>
          <View style={styles.legendItem}>
            <MarkerIcon kind="meetingPoint" />
            <Text style={styles.legendText}>Informasjonspunkt</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: Spacing.screen, gap: 10 },
  map: {
    height: HEIGHT,
    borderRadius: Radius.card,
    overflow: 'hidden',
    backgroundColor: Colors.fill,
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 20, rowGap: 6, paddingHorizontal: Spacing.rowInset },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendText: { fontSize: 15, color: Colors.secondaryLabel },
});
