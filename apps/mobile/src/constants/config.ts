/**
 * Egenberedskap+: backup and AI analysis of rooms, the parts that need our servers.
 * Off in 1.0 (LAUNCH.md, «Decided 2026-10-08»). Turning it on is a JS-only change that can go
 * out with `eas update`: the native Firebase code is already in the build.
 *
 * While it's off, the screens and every way into them are hidden, and Firebase isn't loaded,
 * so the app makes no calls and signs no one in. A phone that already has a backup linked
 * (development and test) keeps syncing.
 */
export const EGENBEREDSKAP_PLUS_ENABLED = false;

/** Where «Gi tilbakemelding» sends its email. Must match `email` in apps/web/src/company.ts. */
export const CONTACT_EMAIL = 'kontakt@holmtall.no';
