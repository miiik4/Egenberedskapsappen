import { addDays, addMonths, daysBetween } from './dates';
import { STORED_WATER_SHELF_LIFE_MONTHS, WATER_LITRES_PER_PERSON_PER_DAY } from './guidance';
import type { HouseholdMembers, IsoDate, StockCategory, StockItem, StockType } from './types';

/**
 * DSB's official checklist for household emergency preparedness (egenberedskap).
 * Verified against DSB (dsb.no / sikkerhverdag.no) guidelines (7 døgn / 1 uke).
 */
export type StockTypeInfo = {
  id: StockType;
  category: StockCategory;
  name: string;
  /** One line under the name in the checklist. */
  hint: string;
  /** In «Neste å gjøre» when it's missing, e.g. «Kjøp batterier». */
  task: string;
  /** What the amount is counted in, for the types that count towards the days. */
  measure?: 'litres' | 'meals';
  /** Only on the list for households this applies to. */
  appliesTo?: (members: HouseholdMembers) => boolean;
  /** How long a fresh one keeps, so «Merk som byttet» can set the next date. */
  shelfLifeMonths?: number;
};

export const CATEGORY_NAMES: Record<StockCategory, string> = {
  water: 'Vann',
  food: 'Mat',
  heat: 'Varme',
  light: 'Lys og strøm',
  communication: 'Kommunikasjon',
  firstAid: 'Førstehjelp',
  hygiene: 'Hygiene',
};

export const CATEGORIES = Object.keys(CATEGORY_NAMES) as StockCategory[];

const hasInfants = (m: HouseholdMembers) => m.infants > 0;
const hasPets = (m: HouseholdMembers) => m.dogs + m.cats > 0;

export const STOCK_TYPES: StockTypeInfo[] = [
  {
    id: 'drinkingWater',
    category: 'water',
    name: 'Drikkevann på kanner',
    hint: `${WATER_LITRES_PER_PERSON_PER_DAY} liter per person per døgn`,
    task: 'Kjøp vann',
    measure: 'litres',
    shelfLifeMonths: STORED_WATER_SHELF_LIFE_MONTHS,
  },
  {
    id: 'purificationTablets',
    category: 'water',
    name: 'Vannrensetabletter',
    hint: 'Hvis vannet blir forurenset',
    task: 'Kjøp vannrensetabletter',
  },
  { id: 'cannedMeals', category: 'food', name: 'Hermetikk og ferdigretter', hint: 'Kan spises kald', task: 'Kjøp hermetikk', measure: 'meals' },
  { id: 'crispbread', category: 'food', name: 'Knekkebrød og kjeks', hint: 'Lang holdbarhet', task: 'Kjøp knekkebrød', measure: 'meals' },
  { id: 'oats', category: 'food', name: 'Havregryn og müsli', hint: 'Kan lages med kaldt vann', task: 'Kjøp havregryn', measure: 'meals' },
  {
    id: 'driedFruitNuts',
    category: 'food',
    name: 'Tørket frukt og nøtter',
    hint: 'Mye energi, lite vekt',
    task: 'Kjøp tørket frukt og nøtter',
    measure: 'meals',
  },
  {
    id: 'babyFood',
    category: 'food',
    name: 'Barnemat',
    hint: 'Grøt, velling og morsmelkerstatning',
    task: 'Kjøp barnemat',
    measure: 'meals',
    appliesTo: hasInfants,
  },
  { id: 'petFood', category: 'food', name: 'Fôr til dyr', hint: 'Én uke per dyr', task: 'Kjøp fôr til dyrene', appliesTo: hasPets },
  { id: 'heatSource', category: 'heat', name: 'Ved eller annen varmekilde', hint: 'Som virker uten strøm', task: 'Skaff en varmekilde' },
  { id: 'woolBlankets', category: 'heat', name: 'Ullpledd og soveposer', hint: 'Én per person', task: 'Finn fram ullpledd og soveposer' },
  { id: 'matches', category: 'heat', name: 'Fyrstikker og lighter', hint: '', task: 'Kjøp fyrstikker' },
  { id: 'torch', category: 'light', name: 'Lommelykt eller hodelykt', hint: '', task: 'Kjøp lommelykt' },
  { id: 'batteries', category: 'light', name: 'Batterier', hint: 'Til lykt og radio', task: 'Kjøp batterier' },
  { id: 'candles', category: 'light', name: 'Stearinlys', hint: '', task: 'Kjøp stearinlys' },
  { id: 'powerBank', category: 'light', name: 'Ladet powerbank', hint: '', task: 'Lad en powerbank' },
  { id: 'radio', category: 'communication', name: 'DAB-radio på batteri', hint: 'NRK sender viktig informasjon', task: 'Skaff radio på batteri' },
  { id: 'cash', category: 'communication', name: 'Kontanter', hint: 'Når kortterminaler ikke virker', task: 'Ta ut kontanter' },
  { id: 'firstAidKit', category: 'firstAid', name: 'Førstehjelpsskrin', hint: '', task: 'Lag et førstehjelpsskrin' },
  { id: 'medicines', category: 'firstAid', name: 'Faste medisiner for en uke', hint: '', task: 'Hent faste medisiner for en uke' },
  { id: 'iodine', category: 'firstAid', name: 'Jodtabletter', hint: 'For barn, unge og gravide', task: 'Kjøp jodtabletter' },
  { id: 'wetWipes', category: 'hygiene', name: 'Våtservietter og håndsprit', hint: '', task: 'Kjøp våtservietter og håndsprit' },
  { id: 'toiletPaper', category: 'hygiene', name: 'Toalettpapir og søppelsekker', hint: '', task: 'Kjøp toalettpapir og søppelsekker' },
];

const BY_ID = new Map(STOCK_TYPES.map((t) => [t.id, t]));

export function stockType(id: StockType): StockTypeInfo {
  const info = BY_ID.get(id);
  if (!info) throw new Error(`Unknown stock type: ${id}`);
  return info;
}

export function isStockType(id: string): id is StockType {
  return BY_ID.has(id as StockType);
}

/** The types on this household's list, in list order. */
export function typesFor(members: HouseholdMembers, category?: StockCategory): StockTypeInfo[] {
  return STOCK_TYPES.filter(
    (t) => (!category || t.category === category) && (!t.appliesTo || t.appliesTo(members)),
  );
}

/**
 * Words that give an item's type away, checked in order so the more specific ones win
 * («vannrensetabletter» before «vann»).
 */
const KEYWORDS: [RegExp, StockType][] = [
  [/vannrens|rensetablett|klortablett/, 'purificationTablets'],
  [/barnemat|velling|morsmelk|barnegrøt/, 'babyFood'],
  [/fôr|hundemat|kattemat|tørrfôr/, 'petFood'],
  [/powerbank|batteripakke/, 'powerBank'],
  [/batteri/, 'batteries'],
  [/radio|dab/, 'radio'],
  [/hermetikk|boks|lapskaus|suppe|makrell|sardin|bønner|ferdigrett|tomatsaus/, 'cannedMeals'],
  [/knekkebrød|kjeks|flatbrød|skonrok/, 'crispbread'],
  [/havre|müsli|musli|gryn|granola/, 'oats'],
  [/nøtt|rosin|tørket|aprikos|dadler|mandler/, 'driedFruitNuts'],
  [/vann|kanne/, 'drinkingWater'],
  [/pledd|sovepose|ullteppe|dyne/, 'woolBlankets'],
  [/fyrstikk|lighter/, 'matches'],
  [/\bved\b|vedovn|gassovn|parafin|varmeovn|primus/, 'heatSource'],
  [/lommelykt|hodelykt|lykt/, 'torch'],
  [/stearin|telys|kubbelys|\blys\b/, 'candles'],
  [/kontant|sedler|mynter/, 'cash'],
  [/førstehjelp|plaster|bandasje|kompress/, 'firstAidKit'],
  [/jod/, 'iodine'],
  [/medisin|resept|tabletter/, 'medicines'],
  [/våtserviett|håndsprit|antibac/, 'wetWipes'],
  [/toalettpapir|dopapir|søppelsekk/, 'toiletPaper'],
];

/** A guess at the type from what the user typed, or undefined when nothing fits. */
export function suggestType(name: string): StockType | undefined {
  const text = name.toLowerCase();
  return KEYWORDS.find(([pattern]) => pattern.test(text))?.[1];
}

/**
 * «Merk som byttet»: bought today, and good for as long as the last one was, or for the
 * type's usual shelf life. Undefined when there's nothing to go by, so the user picks a date.
 */
export function renewedDates(item: StockItem, today: IsoDate): { boughtOn: IsoDate; expiresOn: IsoDate } | undefined {
  if (item.boughtOn && item.expiresOn) {
    const lasted = daysBetween(item.boughtOn, item.expiresOn);
    if (lasted > 0) return { boughtOn: today, expiresOn: addDays(today, lasted) };
  }
  const months = stockType(item.type).shelfLifeMonths;
  return months ? { boughtOn: today, expiresOn: addMonths(today, months) } : undefined;
}
