/** A calendar date as `YYYY-MM-DD`. Expiry is a day, not an instant, so no time zones. */
export type IsoDate = string;

/**
 * Who lives at home, counted per age group. Only counts: no names or birth dates, which
 * is all the arithmetic needs and all the app promises to keep.
 */
export type HouseholdMembers = {
  /** 18–66 */
  adults: number;
  /** 67 and older */
  seniors: number;
  /** 3–17 */
  children: number;
  /** 0–2 */
  infants: number;
  dogs: number;
  cats: number;
};

export type Household = HouseholdMembers & { id: string };

/** The categories of DSB's list, in the order the stockpile shows them. */
export type StockCategory = 'water' | 'food' | 'heat' | 'light' | 'communication' | 'firstAid' | 'hygiene';

/** One line of DSB's list. Every item belongs to exactly one type; the type gives its category. */
export type StockType =
  | 'drinkingWater'
  | 'purificationTablets'
  | 'cannedMeals'
  | 'crispbread'
  | 'oats'
  | 'driedFruitNuts'
  | 'babyFood'
  | 'petFood'
  | 'heatSource'
  | 'woolBlankets'
  | 'matches'
  | 'torch'
  | 'batteries'
  | 'candles'
  | 'powerBank'
  | 'radio'
  | 'cash'
  | 'firstAidKit'
  | 'medicines'
  | 'iodine'
  | 'wetWipes'
  | 'toiletPaper';

export type StockItem = {
  id: string;
  name: string;
  type: StockType;
  /** How many: «4 stk». */
  quantity: number;
  /** Drinking water only: the litres in all of them together. */
  litres?: number;
  /** Food for people only: meals in all of them together. Three meals feed one person a day. */
  meals?: number;
  /** Leave out for things that don't expire. */
  expiresOn?: IsoDate;
  boughtOn?: IsoDate;
  /** Send a reminder before it expires. */
  remind: boolean;
  /** Where it's kept, e.g. «Bod». Empty when not given. */
  location: string;
};
