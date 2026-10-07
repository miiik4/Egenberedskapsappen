import type { Belonging } from './belongings';

/**
 * «Innbooversikt» for the insurer, as Idimy's PDF report: room by room, each thing with its
 * category and value, with totals. What goes in is the user's choice: some rooms or all, and
 * whether estimated values count.
 */
export type ReportOptions = {
  /** Rooms to include, in this order; all of them when left out. */
  roomIds?: string[];
  /** With estimated values (from the AI) counted, or shown as unknown. */
  includeEstimates: boolean;
};

export type ReportLine<T extends Belonging = Belonging> = {
  belonging: T;
  /** What the report says it's worth: undefined when unknown, or an estimate left out. */
  valueKr?: number;
  estimate: boolean;
};

export type ReportRoom<T extends Belonging = Belonging> = { id: string; name: string; lines: ReportLine<T>[]; totalKr: number };

export type Report<T extends Belonging = Belonging> = { rooms: ReportRoom<T>[]; count: number; totalKr: number };

export function buildReport<T extends Belonging>(
  rooms: { id: string; name: string }[],
  belongings: T[],
  options: ReportOptions,
): Report<T> {
  const chosen = options.roomIds ? options.roomIds.map((id) => rooms.find((r) => r.id === id)).filter((r) => r !== undefined) : rooms;
  const reportRooms = chosen
    .map((room) => {
      const lines = belongings
        .filter((b) => b.roomId === room.id)
        .map((belonging): ReportLine<T> => {
          const counted = belonging.valueKr !== undefined && (options.includeEstimates || !belonging.valueEstimated);
          return { belonging, estimate: belonging.valueEstimated, ...(counted && { valueKr: belonging.valueKr }) };
        });
      return { id: room.id, name: room.name, lines, totalKr: lines.reduce((sum, l) => sum + (l.valueKr ?? 0), 0) };
    })
    // A room with nothing in it has nothing to report.
    .filter((room) => room.lines.length > 0);
  return {
    rooms: reportRooms,
    count: reportRooms.reduce((n, r) => n + r.lines.length, 0),
    totalKr: reportRooms.reduce((sum, r) => sum + r.totalKr, 0),
  };
}
