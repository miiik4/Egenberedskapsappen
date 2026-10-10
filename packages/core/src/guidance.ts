// Reference figures the app measures a household against. Each one is compared with DSB's pages
// in docs/dsb-check.md (2026-10-08); a source is cited below where the figure matches.
// TODO(before launch): Mikkel signs off on docs/dsb-check.md.

/**
 * Norwegian authorities recommend that households can manage on their own for one week.
 * Source: https://www.dsb.no/sikkerhverdag/egenberedskap/slik-bidrar-du-til-norges-beredskap/
 */
export const TARGET_DAYS = 7;

/** Days are counted up to here. Past TARGET_DAYS the screens just say «7+ døgn». */
export const SCALE_MAX_DAYS = 10;

/**
 * Drinking and cooking water, per person per day. DSB gives no per-day figure: its current pages
 * say about 20 litres per person for a week, for drinking, cooking and hygiene, which is roughly
 * 3 litres a day. Source: https://www.dsb.no/sikkerhverdag/egenberedskap/vann-i-beredskap/
 * (also https://www.dsb.no/sikkerhverdag/egenberedskap/slik-lagrer-du-drikkevann/).
 */
export const WATER_LITRES_PER_PERSON_PER_DAY = 3;

/**
 * Drinking water for pets, per animal per day. Our figures: DSB says to store water for pets too
 * but gives no amount (https://www.dsb.no/sikkerhverdag/egenberedskap/egenberedskap-for-kjaledyr/).
 */
export const WATER_LITRES_PER_DOG_PER_DAY = 1;
export const WATER_LITRES_PER_CAT_PER_DAY = 0.25;

/** Food is counted in meals: a tin of stew and a pack of crispbread add up without counting calories. */
export const MEALS_PER_PERSON_PER_DAY = 3;

/**
 * DSB recommends changing stored water once a year, for the taste; it stays safe to drink longer.
 * Source: https://www.dsb.no/sikkerhverdag/egenberedskap/slik-lagrer-du-drikkevann/
 */
export const STORED_WATER_SHELF_LIFE_MONTHS = 12;

/** How long before expiry an item counts as «går ut snart». */
export const EXPIRY_WARNING_DAYS = 14;

/** How long before expiry the reminder arrives: «Varsle meg 1 uke før». */
export const EXPIRY_REMINDER_DAYS = 7;

/**
 * Preparedness drifts as things expire and households change, so the beredskapssjekk comes
 * round every few months. The household picks how often: many start keen and want it monthly.
 */
export const CHECK_INTERVALS_MONTHS = [1, 3, 6] as const;
export type CheckIntervalMonths = (typeof CHECK_INTERVALS_MONTHS)[number];

/** Every quarter unless the household picks something else. */
export const DEFAULT_CHECK_INTERVAL_MONTHS: CheckIntervalMonths = 3;

// The beredskapssjekk goes through what expires before the next one is due, so the interval
// is also how far ahead it looks (`expiresBeforeNextCheck`).

/**
 * Until this close to the beredskapssjekk, Oversikt mentions it in one quiet line; from here
 * it's a card, and yellow once it's due.
 */
export const CHECK_HEADS_UP_DAYS = 14;

/** «Påminn meg» on the expiry dates in the beredskapssjekk comes back this many days later. */
export const EXPIRY_REVIEW_AFTER_DAYS = 7;

/** «Varsle ved 90 %»: warn when documented belongings reach this share of the sum insured. */
export const INSURANCE_ALERT_SHARE = 0.9;

/**
 * A claim must reach the insurer within a year of learning what happened, or the right to
 * compensation is lost (forsikringsavtaleloven § 8-5 first paragraph,
 * https://lovdata.no/dokument/NL/lov/1989-06-16-69). The app warns as the date comes near.
 */
export const CLAIM_DEADLINE_MONTHS = 12;

/** How long before the claim deadline the app starts warning. */
export const CLAIM_DEADLINE_WARNING_DAYS = 30;
