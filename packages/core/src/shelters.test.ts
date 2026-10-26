import { describe, expect, it } from 'vitest';

import { compassDirection, distanceMeters, nearestShelters, SHELTERS, SHELTERS_UPDATED, type Shelter } from './shelters';

const OSLO_S = { latitude: 59.9111, longitude: 10.7528 };
const BERGEN = { latitude: 60.3913, longitude: 5.3221 };

const shelter = (id: string, latitude: number, longitude: number): Shelter => ({
  id,
  latitude,
  longitude,
  places: 100,
  room: '1',
  address: id,
});

describe('shelters', () => {
  it('measures distance along the earth', () => {
    expect(distanceMeters(OSLO_S, OSLO_S)).toBe(0);
    // Oslo–Bergen is about 305 km as the crow flies.
    expect(distanceMeters(OSLO_S, BERGEN) / 1000).toBeCloseTo(305, -1);
  });

  it('gives the direction in Norwegian, to the nearest of eight', () => {
    expect(compassDirection(OSLO_S, { latitude: 60.5, longitude: 10.7528 })).toBe('nord');
    expect(compassDirection(OSLO_S, { latitude: 59.9111, longitude: 11.5 })).toBe('øst');
    expect(compassDirection(OSLO_S, BERGEN)).toBe('vest');
    expect(compassDirection(OSLO_S, { latitude: 59.5, longitude: 10.0 })).toBe('sørvest');
  });

  it('finds the nearest first', () => {
    const list = [shelter('far', 61, 10.75), shelter('near', 59.92, 10.75), shelter('middle', 60.2, 10.75)];
    const nearby = nearestShelters(OSLO_S, 2, list);
    expect(nearby.map((n) => n.shelter.id)).toEqual(['near', 'middle']);
    expect(nearby[0]!.meters).toBeLessThan(1500);
    expect(nearby[0]!.direction).toBe('nord');
  });

  it('carries DSB’s list, all inside Norway', () => {
    expect(SHELTERS.length).toBeGreaterThan(400);
    expect(SHELTERS_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const s of SHELTERS) {
      expect(s.latitude).toBeGreaterThan(57.9);
      expect(s.latitude).toBeLessThan(71.3);
      expect(s.longitude).toBeGreaterThan(4.4);
      expect(s.longitude).toBeLessThan(31.3);
    }
    expect(new Set(SHELTERS.map((s) => s.id)).size).toBe(SHELTERS.length);
  });
});
