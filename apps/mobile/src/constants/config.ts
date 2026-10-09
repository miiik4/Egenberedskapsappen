/**
 * Egenberedskap+: backup and AI analysis of rooms, the parts that need our servers.
 * Off in 1.0 (LAUNCH.md, «Decided 2026-10-08»). Turn it on only in a new build that goes through
 * App Review, never with `eas update`: Apple doesn't allow features unlocked by downloaded code
 * (guidelines 2.3.1, 2.5.2), and on iPhone the in-app purchase has to ship with it (3.1.1).
 *
 * While it's off, the screens and every way into them are hidden, and Firebase isn't loaded,
 * so the app makes no calls and signs no one in. A phone that already has a backup linked
 * (development and test) keeps syncing.
 */
export const EGENBEREDSKAP_PLUS_ENABLED = false;

/** Where «Gi tilbakemelding» sends its email. Must match `email` in apps/web/src/company.ts. */
export const CONTACT_EMAIL = 'kontakt@holmtall.no';
