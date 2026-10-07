import { describe, expect, it } from 'vitest';

// The server's copy of the categories, which the model is asked to choose from.
import { CATEGORIES as SERVER_CATEGORIES } from '../../../functions/src/analysis/prompt';
import { BELONGING_CATEGORIES, documentedValue, isBelongingCategory, summarizeRooms, type Belonging } from './belongings';

const thing = (id: string, roomId: string, valueKr?: number): Belonging => ({
  id,
  roomId,
  name: id,
  category: 'Elektronikk',
  valueEstimated: false,
  ...(valueKr !== undefined && { valueKr }),
});

const things = [thing('tv', 'stue', 12_000), thing('sofa', 'stue', 18_500), thing('ukjent', 'stue'), thing('ovn', 'kjokken', 7_000)];

describe('belongings', () => {
  it('counts and sums each room, counting things without a value but adding nothing for them', () => {
    const rooms = summarizeRooms(things);
    expect(rooms.get('stue')).toEqual({ count: 3, valueKr: 30_500 });
    expect(rooms.get('kjokken')).toEqual({ count: 1, valueKr: 7_000 });
    expect(rooms.has('bad')).toBe(false);
  });

  it('sums only the rooms asked for, so another home does not count', () => {
    expect(documentedValue(things, ['stue'])).toBe(30_500);
    expect(documentedValue(things, ['stue', 'kjokken'])).toBe(37_500);
    expect(documentedValue(things, [])).toBe(0);
  });

  it('knows its categories', () => {
    expect(isBelongingCategory('Smykker')).toBe(true);
    expect(isBelongingCategory('Bil')).toBe(false);
  });

  it('asks the model for the same categories as the app knows', () => {
    expect(SERVER_CATEGORIES).toEqual(BELONGING_CATEGORIES);
  });
});
