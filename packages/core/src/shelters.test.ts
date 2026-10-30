import { describe, expect, it } from 'vitest';

import {
  appleMapsZoom,
  cameraFor,
  compassDirection,
  distanceMeters,
  nearestShelters,
  placesToFit,
  SHELTERS,
  SHELTERS_UPDATED,
  sheltersNear,
  type Shelter,
} from './shelters';

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

  it('lists every shelter within walking distance, at least a few, at most a page', () => {
    // 0.5, 1, 2, 4 and 10 km north of Oslo S.
    const list = [0.5, 1, 2, 4, 10].map((km) => shelter(`${km}`, OSLO_S.latitude + km / 111.2, OSLO_S.longitude));
    expect(sheltersNear(OSLO_S, {}, list).map((n) => n.shelter.id)).toEqual(['0.5', '1', '2']);
    expect(sheltersNear(OSLO_S, { radiusMeters: 5000 }, list).map((n) => n.shelter.id)).toEqual(['0.5', '1', '2', '4']);
    // Nothing within reach from Bergen: still the nearest few (the northernmost), however far.
    expect(sheltersNear(BERGEN, { min: 2 }, list).map((n) => n.shelter.id)).toEqual(['10', '4']);
    expect(sheltersNear(OSLO_S, { radiusMeters: 50_000, max: 4 }, list)).toHaveLength(4);
  });

  it('gives a city many shelters and a small place a few, from DSB’s real list', () => {
    expect(sheltersNear(OSLO_S).length).toBeGreaterThanOrEqual(20);
    const hammerfest = sheltersNear({ latitude: 70.6634, longitude: 23.6821 });
    expect(hammerfest.length).toBeGreaterThanOrEqual(3);
    expect(hammerfest.every((n) => n.meters < 10_000)).toBe(true);
  });

  it('frames the phone and every shelter listed, not just the nearest', () => {
    // Porsgrunn on 2026-10-26: one shelter 2 km north-west, two almost 4 km north.
    const phone = { latitude: 59.1, longitude: 9.68 };
    const points = [phone, { latitude: 59.1156, longitude: 9.6533 }, { latitude: 59.135, longitude: 9.66 }];
    const camera = cameraFor(points, { width: 360, height: 280 })!;
    expect(camera.center.latitude).toBeCloseTo(59.1175, 3);
    // Every point is inside the visible map, margin included.
    const metersPerPoint = (156_543.03392 * Math.cos((camera.center.latitude * Math.PI) / 180)) / 2 ** camera.zoom;
    for (const p of points) {
      expect(Math.abs(p.latitude - camera.center.latitude) * 111_320).toBeLessThan((280 / 2) * metersPerPoint);
    }
    expect(camera.zoom).toBeGreaterThanOrEqual(11);
    expect(camera.zoom).toBeLessThanOrEqual(13);

    // The points fill the map: a tenth of a zoom level closer would push one past the margin.
    const closer = cameraFor(points, {
      width: 360,
      height: 280,
      margin: 0,
    })!.zoom;
    expect(closer - camera.zoom).toBeLessThan(0.5);

    // One point, or none, doesn't zoom to infinity or fail.
    expect(cameraFor([phone], { width: 360, height: 280 })?.zoom).toBe(15);
    expect(cameraFor([], { width: 360, height: 280 })).toBeNull();
  });

  it('tells Apple Maps a zoom that shows what was meant', () => {
    // 400 × 280 points at 59°: MapKit fits the square region's latitude side into the height, 144 points' worth.
    const camera = { center: { latitude: 59.2, longitude: 9.6 }, zoom: 12 };
    expect(appleMapsZoom(camera, { width: 400, height: 280 })).toBeCloseTo(12 + Math.log2(256 / 143.5), 1);
    // A map as wide and tall as a tile, at the equator, needs no correction.
    expect(appleMapsZoom({ center: { latitude: 0, longitude: 0 }, zoom: 10 }, { width: 256, height: 256 })).toBe(10);
  });

  it('fits the shelters and the information points among them, not one far away', () => {
    const phone = { latitude: 59.1, longitude: 9.68 };
    const near = { latitude: 59.1156, longitude: 9.6533 };
    const far = { latitude: 59.2, longitude: 9.6 }; // 12 km
    const amongShelters = { latitude: 59.11, longitude: 9.69 };
    expect(placesToFit(phone, [near], [far, amongShelters])).toEqual([phone, near, amongShelters]);
    // Shelters farther than walking distance widen the reach, and points within it come along.
    const farShelter = { latitude: 59.21, longitude: 9.6 }; // 12.3 km, past the point
    expect(placesToFit(phone, [farShelter], [far])).toEqual([phone, farShelter, far]);
    const tight = cameraFor(placesToFit(phone, [near], [far]), {
      width: 360,
      height: 280,
    })!.zoom;
    const loose = cameraFor([phone, near, far], {
      width: 360,
      height: 280,
    })!.zoom;
    expect(tight).toBeGreaterThan(loose + 2);
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
