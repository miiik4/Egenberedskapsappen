import { SHELTER_ROWS, SHELTERS_UPDATED } from './shelters-data';

export { SHELTERS_UPDATED };

export type LatLon = { latitude: number; longitude: number };

/** A public shelter from DSB. `places` is 0 and `address` empty where DSB's data has none. */
export type Shelter = LatLon & {
  id: string;
  places: number;
  room: string;
  address: string;
};

export type NearbyShelter = { shelter: Shelter; meters: number; direction: CompassDirection };

/** All of Norway's public shelters, from the snapshot in the app. Private shelters aren't public data. */
export const SHELTERS: readonly Shelter[] = SHELTER_ROWS.map(([id, latitude, longitude, places, room, address]) => ({
  id,
  latitude,
  longitude,
  places,
  room,
  address,
}));

const EARTH_RADIUS_M = 6_371_000;
const rad = (degrees: number) => (degrees * Math.PI) / 180;

/** Straight-line distance in metres (haversine). */
export function distanceMeters(a: LatLon, b: LatLon): number {
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type CompassDirection = 'nord' | 'nordøst' | 'øst' | 'sørøst' | 'sør' | 'sørvest' | 'vest' | 'nordvest';

const DIRECTIONS: CompassDirection[] = ['nord', 'nordøst', 'øst', 'sørøst', 'sør', 'sørvest', 'vest', 'nordvest'];

/** Which way `to` lies from `from`, to the nearest of eight directions. Works with no map and no network. */
export function compassDirection(from: LatLon, to: LatLon): CompassDirection {
  const y = Math.sin(rad(to.longitude - from.longitude)) * Math.cos(rad(to.latitude));
  const x =
    Math.cos(rad(from.latitude)) * Math.sin(rad(to.latitude)) -
    Math.sin(rad(from.latitude)) * Math.cos(rad(to.latitude)) * Math.cos(rad(to.longitude - from.longitude));
  const bearing = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return DIRECTIONS[Math.round(bearing / 45) % 8]!;
}

/** About 40 minutes on foot. */
export const SHELTER_WALK_METERS = 3000;

/**
 * The shelters worth showing from `from`, nearest first: every one within walking distance, so a city lists many
 * and a small town a few, but never fewer than `min` (the nearest, however far) and never more than `max`.
 */
export function sheltersNear(
  from: LatLon,
  { radiusMeters = SHELTER_WALK_METERS, min = 3, max = 30 }: { radiusMeters?: number; min?: number; max?: number } = {},
  shelters: readonly Shelter[] = SHELTERS,
): NearbyShelter[] {
  const sorted = nearestShelters(from, max, shelters);
  const within = sorted.filter((n) => n.meters <= radiusMeters).length;
  return sorted.slice(0, Math.max(min, within));
}

/** Metres per point at zoom 0 on the equator in Web Mercator, the zoom scale both map views use. */
const METERS_PER_POINT_AT_ZOOM_0 = 156_543.03392;

/**
 * The map camera that shows every point (the phone and the shelters listed), with a margin round the edge so
 * markers aren't cut off: the middle of the points, and the closest zoom at which they all fit in a map of
 * `width` × `height` points. One point alone, or points very close together, stop at `maxZoom`.
 */
export function cameraFor(
  points: readonly LatLon[],
  { width, height, margin = 0.2, maxZoom = 15 }: { width: number; height: number; margin?: number; maxZoom?: number },
): { center: LatLon; zoom: number } | null {
  if (points.length === 0 || width <= 0 || height <= 0) return null;
  const lats = points.map((p) => p.latitude);
  const lons = points.map((p) => p.longitude);
  const center = {
    latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
    longitude: (Math.min(...lons) + Math.max(...lons)) / 2,
  };
  const cos = Math.cos(rad(center.latitude));
  const metersNorth = (Math.max(...lats) - Math.min(...lats)) * 111_320;
  const metersEast = (Math.max(...lons) - Math.min(...lons)) * 111_320 * cos;
  const metersPerPoint = Math.max(metersEast / width, metersNorth / height) * (1 + 2 * margin);
  if (metersPerPoint === 0) return { center, zoom: maxZoom };
  const zoom = Math.log2((METERS_PER_POINT_AT_ZOOM_0 * cos) / metersPerPoint);
  return { center, zoom: Math.min(maxZoom, Math.max(2, Math.floor(zoom * 2) / 2)) };
}

/** The `count` shelters closest to `from`, nearest first. All on the phone: the position goes nowhere. */
export function nearestShelters(from: LatLon, count = 5, shelters: readonly Shelter[] = SHELTERS): NearbyShelter[] {
  return shelters
    .map((shelter) => ({ shelter, meters: distanceMeters(from, shelter) }))
    .sort((a, b) => a.meters - b.meters)
    .slice(0, count)
    .map(({ shelter, meters }) => ({ shelter, meters, direction: compassDirection(from, shelter) }));
}
