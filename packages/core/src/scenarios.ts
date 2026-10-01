import { computeCoverage } from './coverage';
import { SCALE_MAX_DAYS } from './guidance';
import type { Household, IsoDate, StockCategory, StockItem } from './types';

export type ScenarioId = 'winterPowerOutage' | 'noTapWater' | 'noNetwork' | 'homeDamage';

/** What a household has on record, as far as the scenarios care. */
export type PreparednessSnapshot = {
  household: Household;
  items: StockItem[];
  emergencyContacts: number;
  hasMeetingPlace: boolean;
  /** Documents saved on the phone, readable without a network. */
  offlineDocuments: number;
  rooms: { name: string; filmed: boolean }[];
};

export type ScenarioGap =
  | { kind: 'water'; litres: number }
  | { kind: 'food'; personDays: number }
  | { kind: 'essential'; category: StockCategory }
  | { kind: 'emergencyContacts' }
  | { kind: 'meetingPlace' }
  | { kind: 'offlineDocuments' }
  | { kind: 'roomNotFilmed'; room: string };

/** No overall score: each scenario reads in its own unit. "ready" is shown as «På plass». */
export type ScenarioStatus =
  | { kind: 'days'; days: number }
  | { kind: 'ready' }
  | { kind: 'partial' }
  | { kind: 'notStarted' };

export type Scenario = { id: ScenarioId; status: ScenarioStatus; gaps: ScenarioGap[] };

export function assessScenarios(snapshot: PreparednessSnapshot, today: IsoDate): Scenario[] {
  const coverage = computeCoverage(snapshot.household, snapshot.items, today);
  const water: ScenarioGap[] =
    coverage.waterLitresShort > 0 ? [{ kind: 'water', litres: coverage.waterLitresShort }] : [];
  const food: ScenarioGap[] =
    coverage.foodPersonDaysShort > 0 ? [{ kind: 'food', personDays: coverage.foodPersonDaysShort }] : [];
  const essentials = (categories: StockCategory[]): ScenarioGap[] =>
    coverage.missing
      .filter((category) => categories.includes(category))
      .map((category) => ({ kind: 'essential', category }));

  const offline: ScenarioGap[] = [
    ...(snapshot.emergencyContacts > 0 ? [] : [{ kind: 'emergencyContacts' } as const]),
    ...(snapshot.hasMeetingPlace ? [] : [{ kind: 'meetingPlace' } as const]),
    ...(snapshot.offlineDocuments > 0 ? [] : [{ kind: 'offlineDocuments' } as const]),
  ];

  const unfilmed = snapshot.rooms.filter((room) => !room.filmed);
  const filmedAny = unfilmed.length < snapshot.rooms.length;

  return [
    {
      id: 'winterPowerOutage',
      status: { kind: 'days', days: coverage.days },
      gaps: [...essentials(['radio', 'heatAndLight']), ...water, ...food],
    },
    {
      id: 'noTapWater',
      status: { kind: 'days', days: Math.min(coverage.waterDays, SCALE_MAX_DAYS) },
      gaps: water,
    },
    {
      id: 'noNetwork',
      status: offline.length === 0 ? { kind: 'ready' } : { kind: 'partial' },
      gaps: offline,
    },
    {
      id: 'homeDamage',
      status:
        snapshot.rooms.length > 0 && unfilmed.length === 0
          ? { kind: 'ready' }
          : filmedAny
            ? { kind: 'partial' }
            : { kind: 'notStarted' },
      gaps: unfilmed.map((room) => ({ kind: 'roomNotFilmed', room: room.name })),
    },
  ];
}
