import { MEETING_POINT_ROWS, MEETING_POINTS_UPDATED } from './meeting-points-data';
import { compassDirection, distanceMeters, type CompassDirection, type LatLon } from './shelters';

export { MEETING_POINTS_UPDATED };

/**
 * A municipal information point: where the municipality gives information and help when power, mobile and
 * internet are down. Read from the municipality's own page (`source`); nobody has checked them by hand.
 */
export type MeetingPoint = LatLon & {
  id: string;
  name: string;
  address: string;
  municipality: string;
  source: string;
};

export type NearbyMeetingPoint = { point: MeetingPoint; meters: number; direction: CompassDirection };

/** The points in the app, from the municipalities whose page names them with a street address. */
export const MEETING_POINTS: readonly MeetingPoint[] = MEETING_POINT_ROWS.map(
  ([id, latitude, longitude, name, address, municipality, source]) => ({
    id,
    latitude,
    longitude,
    name,
    address,
    municipality,
    source,
  }),
);

/**
 * Farther than this, a point is most likely in another municipality or across a fjord, so it isn't listed:
 * better none than a wrong one. Rural municipalities put one in each village, so it's wider than for shelters.
 */
export const MEETING_POINT_RADIUS_METERS = 20_000;

/** The points near `from`, nearest first: at most `max`, none farther than `radiusMeters`. All on the phone. */
export function meetingPointsNear(
  from: LatLon,
  { radiusMeters = MEETING_POINT_RADIUS_METERS, max = 5 }: { radiusMeters?: number; max?: number } = {},
  points: readonly MeetingPoint[] = MEETING_POINTS,
): NearbyMeetingPoint[] {
  return points
    .map((point) => ({ point, meters: distanceMeters(from, point) }))
    .filter((n) => n.meters <= radiusMeters)
    .sort((a, b) => a.meters - b.meters)
    .slice(0, max)
    .map(({ point, meters }) => ({ point, meters, direction: compassDirection(from, point) }));
}
