import {
  CATEGORY_NAMES,
  peopleIn,
  TARGET_DAYS,
  type ChecklistType,
  type HouseholdMembers,
  type IsoDate,
  type NextAction,
} from '@egenberedskap/core';

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

/** "kl. 08.40", the Norwegian way: a dot between hours and minutes. */
export function formatTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `kl. ${pad(date.getHours())}.${pad(date.getMinutes())}`;
}

/** "3. oktober 2027", for dates that may be a year or more away. */
export function formatDateWithYear(date: IsoDate): string {
  return `${formatDate(date)} ${date.slice(0, 4)}`;
}

/** "186 400 kr", grouped with a no-break space so the number never wraps. */
export function formatKr(amount: number): string {
  return `${Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} kr`;
}

/** «7 døgn», and «7+ døgn» past DSB's week, where the exact number stops mattering. */
export function formatDays(days: number): string {
  return days > TARGET_DAYS ? `${TARGET_DAYS}+ døgn` : `${days} døgn`;
}

/** «1 måltid», «8 måltider», with a decimal comma when needed. */
export function formatMeals(meals: number): string {
  return `${formatNumber(meals)} ${meals === 1 ? 'måltid' : 'måltider'}`;
}

export function formatNumber(n: number): string {
  return String(Math.round(n * 10) / 10).replace('.', ',');
}

/** «mai 2028», for expiry dates far enough off that the day doesn't matter. */
export function formatMonthYear(date: IsoDate): string {
  return `${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;
}

/** «14. okt. 2025», as in the native date picker. */
export function formatShortDate(date: IsoDate): string {
  const [year, month, day] = date.split('-').map(Number);
  const name = MONTHS[month! - 1]!;
  return `${day}. ${name.length > 4 ? `${name.slice(0, 3)}.` : name} ${year}`;
}

/** «i dag», «i morgen», «om 9 dager», «om 3 uker», «om 2 måneder». */
export function formatIn(days: number): string {
  if (days <= 0) return 'i dag';
  if (days === 1) return 'i morgen';
  if (days < 21) return `om ${days} dager`;
  if (days < 60) return `om ${Math.round(days / 7)} uker`;
  return `om ${Math.round(days / 30)} måneder`;
}

/** «1 gjenstand», «31 gjenstander». */
export function countLabel(count: number): string {
  return `${count} ${count === 1 ? 'gjenstand' : 'gjenstander'}`;
}

/** «1 uke», «2 uker», «10 dager». */
export function formatDuration(days: number): string {
  if (days % 7 === 0) return `${days / 7} ${days === 7 ? 'uke' : 'uker'}`;
  return `${days} ${days === 1 ? 'dag' : 'dager'}`;
}

/** «3 personer og 1 hund», «1 person, 2 hunder og 1 katt». */
export function householdLabel(members: HouseholdMembers): string {
  const people = peopleIn(members);
  const parts = [
    `${people} ${people === 1 ? 'person' : 'personer'}`,
    members.dogs > 0 && `${members.dogs} ${members.dogs === 1 ? 'hund' : 'hunder'}`,
    members.cats > 0 && `${members.cats} ${members.cats === 1 ? 'katt' : 'katter'}`,
  ].filter((part): part is string => Boolean(part));
  return listWords(parts);
}

/** «a», «a og b», «a, b og c». */
export function listWords(words: string[]): string {
  return words.length <= 1 ? (words[0] ?? '') : `${words.slice(0, -1).join(', ')} og ${words.at(-1)}`;
}

/** Title and the grey line under it for a row in «Neste å gjøre». */
export function describeAction(action: NextAction): { title: string; subtitle: string } {
  switch (action.kind) {
    case 'buyWater':
      return { title: `Kjøp ${formatNumber(action.litres)} liter vann`, subtitle: 'Drikkevann på kanner' };
    case 'buyFood':
      return {
        title: `Kjøp mat for ${action.days} døgn`,
        subtitle:
          action.suggestions.length > 0
            ? capitalize(listWords(action.suggestions.map((t) => t.name.toLowerCase())))
            : formatMeals(action.meals),
      };
    case 'replace':
      return { title: `Bytt ${action.item.name.toLowerCase()}`, subtitle: `Går ut ${formatDate(action.expiresOn)}` };
    case 'getType':
      return { title: action.type.task, subtitle: action.type.hint || CATEGORY_NAMES[action.type.category] };
  }
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** «4 varer · 8 måltider» */
export function describeType(type: Pick<ChecklistType, 'items' | 'measure'>): string {
  const count = `${type.items.length} ${type.items.length === 1 ? 'vare' : 'varer'}`;
  if (type.measure === 'meals') return `${count} · ${formatMeals(type.items.reduce((n, i) => n + (i.meals ?? 0), 0))}`;
  if (type.measure === 'litres') return `${count} · ${formatNumber(type.items.reduce((n, i) => n + (i.litres ?? 0), 0))} l`;
  return count;
}
