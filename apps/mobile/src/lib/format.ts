import type { IsoDate, NextAction, ScenarioGap, ScenarioId, StockCategory } from '@egenberedskap/core';

const MONTHS = [
  'januar', 'februar', 'mars', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'desember',
];

/** Local calendar date, not UTC: "today" is the day on the user's wall. */
export function todayIso(now = new Date()): IsoDate {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** "2. oktober" */
export function formatDate(date: IsoDate): string {
  const [, month, day] = date.split('-').map(Number);
  return `${day}. ${MONTHS[month! - 1]}`;
}

/** "186 400 kr", grouped with a no-break space so the number never wraps. */
export function formatKr(amount: number): string {
  return `${Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} kr`;
}

/** "+2 døgn", "−1 døgn" (with a real minus sign); undefined when nothing changes. */
export function formatDayChange(change: number): string | undefined {
  if (change === 0) return undefined;
  return `${change > 0 ? '+' : '−'}${Math.abs(change)} døgn`;
}

export const categoryName: Record<StockCategory, string> = {
  water: 'Vann',
  food: 'Mat',
  radio: 'Radio og batterier',
  heatAndLight: 'Varme og lys',
  firstAid: 'Førstehjelp og medisiner',
  hygieneAndCash: 'Hygiene og kontanter',
};

const essentialTask: Record<StockCategory, string> = {
  water: 'Skaff vann',
  food: 'Skaff mat',
  radio: 'Skaff radio på batteri',
  heatAndLight: 'Skaff lommelykt og lys',
  firstAid: 'Lag et førstehjelpsskrin',
  hygieneAndCash: 'Legg av kontanter og hygieneartikler',
};

export function describeAction(action: NextAction): { title: string; subtitle: string } {
  switch (action.kind) {
    case 'buyWater':
      return { title: `Kjøp ${action.litres} liter vann`, subtitle: 'Beredskapslager' };
    case 'buyFood':
      return { title: `Kjøp mat for ${action.personDays} persondøgn`, subtitle: 'Beredskapslager' };
    case 'replace':
      return { title: `Bytt ${action.item.name.toLowerCase()}`, subtitle: `Går ut ${formatDate(action.expiresOn)}` };
    case 'getEssential':
      return { title: essentialTask[action.category], subtitle: 'Strømbrudd om vinteren' };
  }
}

export const scenarioName: Record<ScenarioId, string> = {
  winterPowerOutage: 'Strømbrudd om vinteren',
  noTapWater: 'Uten vann i springen',
  noNetwork: 'Uten mobilnett og internett',
  homeDamage: 'Skade på hjemmet',
};

export function describeGap(gap: ScenarioGap): string {
  switch (gap.kind) {
    case 'water':
      return `${gap.litres} liter vann`;
    case 'food':
      return `Mat for ${gap.personDays} persondøgn`;
    case 'essential':
      return categoryName[gap.category];
    case 'emergencyContacts':
      return 'Nødkontakter';
    case 'meetingPlace':
      return 'Møtested';
    case 'offlineDocuments':
      return 'Dokumenter uten nett';
    case 'roomNotFilmed':
      return `${gap.room} ikke filmet`;
  }
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 5) return 'God natt';
  if (hour < 10) return 'God morgen';
  if (hour < 18) return 'God dag';
  return 'God kveld';
}
