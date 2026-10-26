import { cameraFor, type LatLon, type Shelter } from '@egenberedskap/core';
import { requireOptionalNativeModule } from 'expo';
import Constants from 'expo-constants';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

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

export function ShelterMap({ at, shelters, title }: { at: LatLon | null; shelters: Shelter[]; title: (s: Shelter) => string }) {
  const [width, setWidth] = useState(0);
  if (!maps) return null;
  // The phone and every shelter listed, so none of them is off the edge; all of Norway before there's a position.
  const camera = at ? cameraFor([at, ...shelters], { width, height: HEIGHT }) : null;
  const cameraPosition = camera ? { coordinates: camera.center, zoom: camera.zoom } : { coordinates: NORWAY, zoom: 4 };
  const markers = shelters.map((shelter) => ({
    id: shelter.id,
    coordinates: { latitude: shelter.latitude, longitude: shelter.longitude },
    title: title(shelter),
  }));

  return (
    <View style={styles.map} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {Platform.OS === 'ios' ? (
        <maps.AppleMaps.View
          style={StyleSheet.absoluteFill}
          cameraPosition={cameraPosition}
          markers={markers.map((m) => ({ ...m, systemImage: 'shield.fill', tintColor: '#0E5FC0' }))}
          properties={{ isMyLocationEnabled: at !== null }}
        />
      ) : (
        <maps.GoogleMaps.View
          style={StyleSheet.absoluteFill}
          cameraPosition={cameraPosition}
          markers={markers}
          properties={{ isMyLocationEnabled: at !== null }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    height: HEIGHT,
    marginHorizontal: Spacing.screen,
    borderRadius: Radius.card,
    overflow: 'hidden',
    backgroundColor: Colors.fill,
  },
});
