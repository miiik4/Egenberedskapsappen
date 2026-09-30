// Reference figures the app measures a household against.
// TODO(before launch): verify every figure here against DSB's current published advice
// (dsb.no / sikkerhverdag) and cite the source. They are taken from the v2 design for now.

/** DSB asks households to manage on their own for one week. */
export const TARGET_DAYS = 7;

/** The scale on Home goes past the target, so 7 is a marker and not a finish line. */
export const SCALE_MAX_DAYS = 10;

/** Drinking and cooking water, per person per day. */
export const WATER_LITRES_PER_PERSON_PER_DAY = 3;

/** How long before expiry an item counts as "går ut snart" and gets a reminder. */
export const EXPIRY_WARNING_DAYS = 14;
