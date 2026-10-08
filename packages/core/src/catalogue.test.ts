import { describe, expect, it } from 'vitest';

import { renewedDates, STOCK_TYPES, suggestType, typesFor } from './catalogue';
import { computeCoverage } from './coverage';
import { item } from './test-items';
import { addMonths } from './dates';
import { featuredGuide } from './guides';
import { insuranceAlert } from './insurance';

describe('catalogue', () => {
  it('has a category, a name and a task for every type', () => {
    for (const type of STOCK_TYPES) {
      expect(type.name).not.toBe('');
      expect(type.task).not.toBe('');
    }
  });

  it('guesses the type from the name, specific words first', () => {
    expect(suggestType('Makrell i tomat')).toBe('cannedMeals');
    expect(suggestType('Vannrensetabletter')).toBe('purificationTablets');
    expect(suggestType('Vann på kanner')).toBe('drinkingWater');
    expect(suggestType('Batterier AA')).toBe('batteries');
    expect(suggestType('Powerbank 20 000 mAh')).toBe('powerBank');
    expect(suggestType('Telys')).toBe('candles');
    expect(suggestType('Sokker')).toBeUndefined();
    expect(suggestType('Primus')).toBe('cookingStove');
    expect(suggestType('Rødsprit til stormkjøkken')).toBe('cookingStove');
    expect(suggestType('Bleier str. 4')).toBe('nappies');
    expect(suggestType('Tamponger')).toBe('menstrualProducts');
  });

  it('lists nappies only for households with infants', () => {
    const two = { adults: 2, seniors: 0, children: 0, infants: 0, dogs: 0, cats: 0 };
    const ids = (m: typeof two) => typesFor(m, 'hygiene').map((t) => t.id);
    expect(ids(two)).not.toContain('nappies');
    expect(ids({ ...two, infants: 1 })).toContain('nappies');
    expect(ids(two)).toContain('menstrualProducts');
  });

  it('does not count a cooking stove as heat for the home', () => {
    const one = { adults: 1, seniors: 0, children: 0, infants: 0, dogs: 0, cats: 0 };
    const stove = item('s', { type: 'cookingStove' });
    expect(computeCoverage(one, [stove], '2026-10-08').heatDays).toBe(0);
  });
});

describe('renewedDates', () => {
  it('keeps the interval the last one had', () => {
    const tin = item('t', { type: 'cannedMeals', boughtOn: '2025-01-10', expiresOn: '2026-01-10' });
    expect(renewedDates(tin, '2026-01-05')).toEqual({ boughtOn: '2026-01-05', expiresOn: '2027-01-05' });
  });

  it('falls back on the type: stored water keeps for 12 months', () => {
    const water = item('w', { type: 'drinkingWater', litres: 70, expiresOn: '2026-10-14' });
    expect(renewedDates(water, '2026-10-05')).toEqual({ boughtOn: '2026-10-05', expiresOn: '2027-10-05' });
  });

  it('has nothing to go by for a type without a shelf life', () => {
    expect(renewedDates(item('b', { type: 'batteries', expiresOn: '2026-10-14' }), '2026-10-05')).toBeUndefined();
  });
});

describe('addMonths', () => {
  it('moves to the same day, or the last day of a shorter month', () => {
    expect(addMonths('2026-10-14', 12)).toBe('2027-10-14');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-11-30', 3)).toBe('2027-02-28');
  });
});

describe('insuranceAlert', () => {
  const base = { sumKr: 600_000, alertNearSum: true, dismissedAtKr: undefined };

  it('warns once documented value passes the sum insured', () => {
    expect(insuranceAlert({ ...base, documentedKr: 642_000 })).toBe('over');
  });

  it('warns from 90 % when asked to, and not before', () => {
    expect(insuranceAlert({ ...base, documentedKr: 540_000 })).toBe('near');
    expect(insuranceAlert({ ...base, documentedKr: 539_999 })).toBeNull();
    expect(insuranceAlert({ ...base, alertNearSum: false, documentedKr: 590_000 })).toBeNull();
  });

  it('stays quiet after «Ikke nå» until the value goes up again', () => {
    expect(insuranceAlert({ ...base, documentedKr: 642_000, dismissedAtKr: 642_000 })).toBeNull();
    expect(insuranceAlert({ ...base, documentedKr: 650_000, dismissedAtKr: 642_000 })).toBe('over');
  });

  it('cannot warn without a sum insured', () => {
    expect(insuranceAlert({ ...base, sumKr: undefined, documentedKr: 1_000_000 })).toBeNull();
  });
});

describe('featuredGuide', () => {
  const two = { adults: 2, seniors: 0, children: 0, infants: 0, dogs: 0, cats: 0 };

  it('picks the power cut guide in winter, then one that fits the household', () => {
    expect(featuredGuide(two, 11)).toBe('winterPowerOutage');
    expect(featuredGuide(two, 3)).toBe('winterPowerOutage');
    expect(featuredGuide({ ...two, dogs: 1 }, 6)).toBe('childrenAndPets');
    expect(featuredGuide(two, 6)).toBe('planSevenDays');
  });
});
