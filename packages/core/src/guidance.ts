// Reference figures the app measures a household against.
// TODO(before launch): verify every figure here against DSB's current published advice
// (dsb.no / sikkerhverdag) and cite the source. They are taken from the iOS design for now.

/** DSB asks households to manage on their own for one week. */
export const TARGET_DAYS = 7;

/** Days are counted up to here. Past TARGET_DAYS the screens just say «7+ døgn». */
export const SCALE_MAX_DAYS = 10;

/** Drinking and cooking water, per person per day. */
export const WATER_LITRES_PER_PERSON_PER_DAY = 3;

/** Drinking water for pets, per animal per day. */
export const WATER_LITRES_PER_DOG_PER_DAY = 1;
export const WATER_LITRES_PER_CAT_PER_DAY = 0.25;

/** Food is counted in meals: a tin of stew and a pack of crispbread add up without counting calories. */
export const MEALS_PER_PERSON_PER_DAY = 3;

/** DSB recommends replacing stored water every 12 months. */
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

/** «Påminn meg» on the expiry dates in the beredskapssjekk comes back this many days later. */
export const EXPIRY_REVIEW_AFTER_DAYS = 7;

/** «Varsle ved 90 %»: warn when documented belongings reach this share of the sum insured. */
export const INSURANCE_ALERT_SHARE = 0.9;

/**
 * A claim must reach the insurer within a year of learning what happened, or the right to
 * compensation is lost (forsikringsavtaleloven § 8-5). The app warns as the date comes near.
 */
export const CLAIM_DEADLINE_MONTHS = 12;

/** How long before the claim deadline the app starts warning. */
export const CLAIM_DEADLINE_WARNING_DAYS = 30;
