/**
 * Things in the home, documented for the contents insurance. Values are what it would cost to
 * buy the same again, in whole kroner.
 */
export type Belonging = {
  id: string;
  roomId: string;
  name: string;
  category: BelongingCategory;
  /** Left out when nobody knows yet. */
  valueKr?: number;
  /** An estimate (from the AI, later) rather than what the user knows it cost. */
  valueEstimated: boolean;
};

/** The categories from Idimy, tested on real recordings. «Annet» is last on purpose. */
export const BELONGING_CATEGORIES = [
  'Elektronikk',
  'Møbler',
  'Hvitevarer',
  'Kjøkkenutstyr',
  'Klær',
  'Smykker',
  'Kunst',
  'Musikkinstrument',
  'Verktøy',
  'Sport og fritid',
  'Leker',
  'Annet',
] as const;

export type BelongingCategory = (typeof BELONGING_CATEGORIES)[number];

export function isBelongingCategory(value: string): value is BelongingCategory {
  return (BELONGING_CATEGORIES as readonly string[]).includes(value);
}

export type RoomSummary = { count: number; valueKr: number };

/** How many things each room holds and what they're worth. Rooms with nothing in them are left out. */
export function summarizeRooms(belongings: Belonging[]): Map<string, RoomSummary> {
  const rooms = new Map<string, RoomSummary>();
  for (const b of belongings) {
    const room = rooms.get(b.roomId) ?? { count: 0, valueKr: 0 };
    room.count += 1;
    room.valueKr += b.valueKr ?? 0;
    rooms.set(b.roomId, room);
  }
  return rooms;
}

/** What's documented across a set of rooms, e.g. one home's. */
export function documentedValue(belongings: Belonging[], roomIds: string[]): number {
  const ids = new Set(roomIds);
  return belongings.reduce((sum, b) => (ids.has(b.roomId) ? sum + (b.valueKr ?? 0) : sum), 0);
}

/**
 * A thing the AI analysis thinks it saw, waiting for the user to look it over. `frame` and
 * `box` say where it is in the photos; `cropFile` is the picture the phone cut from there.
 */
export type Suggestion = {
  name: string;
  category: BelongingCategory;
  valueKr?: number;
  frame?: number;
  box?: { ymin: number; xmin: number; ymax: number; xmax: number };
  cropFile?: string;
  /** Ticked to be added. All are, to begin with. */
  selected: boolean;
  /** The user typed their own value, so it's no longer an estimate. */
  valueEdited: boolean;
};
