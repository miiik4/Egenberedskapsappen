import { Image } from 'expo-image';

import { Colors } from '@/constants/theme';

/**
 * The two kinds of place differ in shape as well as colour (a square with the civil-defence triangle, a round «i»),
 * so they can be told apart without seeing colour. The list rows and the legend use the same pictures as the map.
 */
export const MARKERS = {
  shelter: { image: require('@/assets/images/map/shelter.png'), color: Colors.shelter, symbol: 'triangle.fill' },
  meetingPoint: { image: require('@/assets/images/map/info-point.png'), color: Colors.meetingPoint, symbol: 'info' },
} as const;

/** The marker picture at list size, for the row it belongs to. */
export function MarkerIcon({ kind, size = 24 }: { kind: keyof typeof MARKERS; size?: number }) {
  return <Image source={MARKERS[kind].image} style={{ width: size, height: size }} accessible={false} />;
}
