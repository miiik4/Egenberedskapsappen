/**
 * Partners (companies that hand the app to their customers) and how an install finds its partner.
 *
 * On Android, the partner page links to Google Play with a referrer, and Play hands that string to
 * the app once after install: `utm_source=partner&utm_campaign=<slug>`. The utm names mean Play
 * Console also counts installs per partner, so nobody has to track anyone. The app then fetches the
 * partner's greeting from our own site (`/partnere/<slug>.json`) and shows it marked «Sponset».
 */

/** Same rule as the slug in the Studio: a–z, 0–9 and hyphens. */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG = 60;

/** The `referrer` value for a partner's Google Play link (before URL-encoding it into the link). */
export function partnerReferrer(slug: string): string {
  return `utm_source=partner&utm_campaign=${slug}`;
}

/**
 * The partner slug in a Play install referrer, or null. Play's own default for an install that
 * didn't come through a link is `utm_source=google-play&utm_medium=organic`, which gives null.
 */
export function partnerFromReferrer(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(referrer);
  } catch {
    return null;
  }
  if (params.get('utm_source') !== 'partner') return null;
  const slug = params.get('utm_campaign')?.trim().toLowerCase() ?? '';
  return slug.length <= MAX_SLUG && SLUG.test(slug) ? slug : null;
}

/** What the app shows for a partner. Logos are data: URLs, so nothing is fetched from a third party. */
export type PartnerGreeting = {
  slug: string;
  name: string;
  greeting: string;
  logo: string;
  /** For dark backgrounds; the light logo when the partner has none. */
  logoDark: string;
};

const MAX_LOGO = 300_000;
const isText = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.trim() !== '' && value.length <= max;
const isLogo = (value: unknown): value is string =>
  isText(value, MAX_LOGO) && /^data:image\/(svg\+xml|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value);

/** Checks what came from `/partnere/<slug>.json` before it's stored or shown. Anything off gives null. */
export function parsePartnerGreeting(slug: string, json: unknown): PartnerGreeting | null {
  if (typeof json !== 'object' || json === null) return null;
  const { name, greeting, logo, logoDark } = json as Record<string, unknown>;
  if (!isText(name, 60) || !isText(greeting, 200) || !isLogo(logo)) return null;
  return {
    slug,
    name: name.trim(),
    greeting: greeting.trim(),
    logo,
    logoDark: isLogo(logoDark) ? logoDark : logo,
  };
}
