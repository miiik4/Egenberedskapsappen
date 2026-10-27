import { describe, expect, it } from 'vitest';

import { MEETING_POINTS, MEETING_POINTS_UPDATED, meetingPointsNear, type MeetingPoint } from './meeting-points';

const PORSGRUNN = { latitude: 59.1405, longitude: 9.6561 };

const point = (id: string, latitude: number, longitude: number): MeetingPoint => ({
  id,
  latitude,
  longitude,
  name: id,
  address: id,
  municipality: 'Test',
  source: 'https://test.kommune.no/',
});

describe('meeting points', () => {
  it('lists the nearest first, within the radius and up to the maximum', () => {
    const points = [
      point('far', 59.5, 9.6561),
      point('two', 59.15, 9.6561),
      point('one', 59.141, 9.6561),
      point('three', 59.16, 9.6561),
    ];
    expect(meetingPointsNear(PORSGRUNN, {}, points).map((n) => n.point.id)).toEqual(['one', 'two', 'three']);
    expect(meetingPointsNear(PORSGRUNN, { max: 2 }, points).map((n) => n.point.id)).toEqual(['one', 'two']);
    expect(meetingPointsNear(PORSGRUNN, { radiusMeters: 1000 }, points).map((n) => n.point.id)).toEqual(['one']);
    expect(meetingPointsNear(PORSGRUNN, {}, points)[0]!.direction).toBe('nord');
  });

  it('lists nothing where there is no point nearby', () => {
    expect(meetingPointsNear({ latitude: 78.22, longitude: 15.65 })).toEqual([]);
  });

  it('has the snapshot, with every point in Norway and pointing to its municipality', () => {
    expect(MEETING_POINTS_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(MEETING_POINTS.length).toBeGreaterThan(150);
    expect(new Set(MEETING_POINTS.map((p) => p.id)).size).toBe(MEETING_POINTS.length);
    for (const p of MEETING_POINTS) {
      expect(p.latitude).toBeGreaterThan(57.9);
      expect(p.latitude).toBeLessThan(71.2);
      expect(p.longitude).toBeGreaterThan(4.5);
      expect(p.longitude).toBeLessThan(31.2);
      expect(p.name).not.toBe('');
      expect(p.address).toMatch(/\d{4} /);
      expect(p.source).toMatch(/^https:\/\//);
    }
  });

  it('finds Porsgrunn’s points near the town', () => {
    const near = meetingPointsNear(PORSGRUNN);
    expect(near.length).toBeGreaterThan(0);
    expect(near[0]!.point.municipality).toBe('Porsgrunn');
  });
});
