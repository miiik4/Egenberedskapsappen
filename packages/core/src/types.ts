/** A calendar date as `YYYY-MM-DD`. Expiry is a day, not an instant, so no time zones. */
export type IsoDate = string;

export type Household = {
  id: string;
  /** Everyone the stockpile has to feed, children included. */
  people: number;
};

/**
 * Categories from the stockpile screen. Water and food are measured in days;
 * the rest are things you either have or don't.
 */
export type StockCategory =
  | 'water'
  | 'food'
  | 'radio'
  | 'heatAndLight'
  | 'firstAid'
  | 'hygieneAndCash';

type BaseItem = {
  id: string;
  name: string;
  /** Leave out for things that don't expire. */
  expiresOn?: IsoDate;
};

export type WaterItem = BaseItem & { category: 'water'; litres: number };

/**
 * Food is counted in person-days, i.e. how many days it would feed one person.
 * That lets a pack of crispbread and a tin of stew add up without counting calories.
 */
export type FoodItem = BaseItem & { category: 'food'; personDays: number };

export type EssentialItem = BaseItem & {
  category: Exclude<StockCategory, 'water' | 'food'>;
};

export type StockItem = WaterItem | FoodItem | EssentialItem;
