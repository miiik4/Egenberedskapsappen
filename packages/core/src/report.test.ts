import { describe, expect, it } from 'vitest';

import type { Belonging } from './belongings';
import { buildReport } from './report';

const rooms = [
  { id: 'stue', name: 'Stue' },
  { id: 'kjokken', name: 'Kjøkken' },
  { id: 'bad', name: 'Bad' },
];
const thing = (id: string, roomId: string, valueKr: number | undefined, valueEstimated = false): Belonging => ({
  id,
  roomId,
  name: id,
  category: 'Annet',
  valueEstimated,
  ...(valueKr !== undefined && { valueKr }),
});
const things = [thing('tv', 'stue', 12_000), thing('sofa', 'stue', 8_000, true), thing('gitar', 'stue', undefined), thing('ovn', 'kjokken', 7_000)];

describe('buildReport', () => {
  it('goes room by room, leaving out empty rooms, with totals', () => {
    const report = buildReport(rooms, things, { includeEstimates: true });
    expect(report.rooms.map((r) => [r.name, r.lines.length, r.totalKr])).toEqual([
      ['Stue', 3, 20_000],
      ['Kjøkken', 1, 7_000],
    ]);
    expect(report).toMatchObject({ count: 4, totalKr: 27_000 });
  });

  it('can leave estimates out of the figures, while still listing the thing', () => {
    const report = buildReport(rooms, things, { includeEstimates: false });
    const sofa = report.rooms[0]!.lines.find((l) => l.belonging.id === 'sofa')!;
    expect(sofa.estimate).toBe(true);
    expect(sofa.valueKr).toBeUndefined();
    expect(report.totalKr).toBe(19_000);
  });

  it('takes only the rooms asked for, in that order', () => {
    const report = buildReport(rooms, things, { roomIds: ['kjokken', 'stue', 'gone'], includeEstimates: true });
    expect(report.rooms.map((r) => r.name)).toEqual(['Kjøkken', 'Stue']);
  });
});
