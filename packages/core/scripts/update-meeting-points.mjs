// Builds src/meeting-points-data.ts from the survey of the municipalities' own sites in
// docs/informasjonspunkter/.
//
//   node packages/core/scripts/update-meeting-points.mjs
//
// Nobody has checked the survey by hand, so a point only gets into the app if two things hold today:
// the municipality's page still names it, and Kartverket's address register finds its street address
// inside that municipality (which also gives the coordinates). Points without a street address, or on
// pages that only render in a browser, are left out. The app says where the points come from and
// never calls them verified.
import { readFileSync, writeFileSync } from 'node:fs';

const SURVEY = new URL('../../../docs/informasjonspunkter/informasjonspunkter-2026-10-27.json', import.meta.url);
const OUT = new URL('../src/meeting-points-data.ts', import.meta.url);
const ADDRESSES = 'https://ws.geonorge.no/adresser/v1/sok';

/** Municipalities whose list isn't a standing one yet, or came from something other than their own page. */
const LEFT_OUT = {
  '4601': 'Bergen: byrådet adopts the points on 29 October 2026',
  '3446': 'Gran: the two places are named only as venues for an exercise',
  '4205': 'Lindesnes: planned, not established',
  '5021': 'Oppdal: «vil etablere»',
  '5031': 'Malvik: «vil etablere»',
  '3305': 'Ringerike: from a 2024 presentation, not the website',
  '3414': 'Nord-Odal: staffing only from a search result',
  '5025': 'Røros: from a search result; the page was down',
  '3330': 'Hol: from a search result; the page is gone',
  '4643': 'Årdal: a place with mobile coverage, not an information point',
  '3451': 'Nord-Aurdal: the page warns it may be out of date',
  '3452': 'Vestre Slidre: page from 2022',
  '3230': 'Gjerdrum: meeting points for crises in general, not for loss of power and network',
};

const survey = JSON.parse(readFileSync(SURVEY, 'utf8'));
const normal = (text) =>
  text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[ \s]+/g, ' ')
    .trim();

/**
 * The page as plain text, or '' when it can't be read. Some sites (Kongsberg, Notodden, Alver) put the page's text
 * in a JSON blob inside a script tag, with «ø» written as `\u00f8` and tags as `\u003c`, so those escapes are
 * decoded before the tags are stripped, and script content is kept.
 */
async function pageText(url) {
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (egenberedskapsappen)' } });
    if (!response.ok) return '';
    const html = await response.text();
    return normal(
      html
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
        .replace(/\\[nrt]/g, ' ')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code))),
    );
  } catch {
    return '';
  }
}

/** «Lundedalen 35, 3940 Porsgrunn» → the one matching address in that municipality, or null. */
async function locate(address, municipality) {
  const [street, ...rest] = address.split(',');
  if (!/\d/.test(street)) return null;
  const postcode = rest.join(',').match(/\b(\d{4})\b/)?.[1];
  const query = new URLSearchParams({ sok: street.trim(), kommunenummer: municipality, utkoordsys: '4258', treffPerSide: '10' });
  const response = await fetch(`${ADDRESSES}?${query}`);
  if (!response.ok) return null;
  const { adresser } = await response.json();
  const matches = adresser.filter(
    (a) =>
      normal(a.adressetekst).replace(/ (\d+) ([a-z])$/, ' $1$2') === normal(street).replace(/ (\d+) ([a-z])$/, ' $1$2') &&
      (!postcode || a.postnummer === postcode),
  );
  if (matches.length !== 1) return null;
  const [match] = matches;
  const poststed = match.poststed.charAt(0) + match.poststed.slice(1).toLowerCase();
  return {
    lat: Math.round(match.representasjonspunkt.lat * 1e5) / 1e5,
    lon: Math.round(match.representasjonspunkt.lon * 1e5) / 1e5,
    address: `${match.adressetekst}, ${match.postnummer} ${poststed.replace(/(^|[\s-])\p{L}/gu, (s) => s.toUpperCase())}`,
  };
}

const rows = [];
const skipped = { leftOut: 0, page: 0, name: 0, address: 0 };
for (const entry of survey.kommuner) {
  if (entry.status !== 'found' || !entry.source_url) continue;
  if (LEFT_OUT[entry.kommunenummer]) {
    skipped.leftOut += entry.points.length;
    continue;
  }
  const page = await pageText(entry.source_url);
  if (!page) {
    skipped.page += entry.points.length;
    continue;
  }
  for (const [i, point] of entry.points.entries()) {
    const name = point.name.replace(/\s*\(.*\)\s*$/, '');
    if (!page.includes(normal(name))) {
      skipped.name++;
      continue;
    }
    const place = point.address && (await locate(point.address, entry.kommunenummer));
    if (!place) {
      skipped.address++;
      continue;
    }
    rows.push({
      id: `${entry.kommunenummer}-${i + 1}`,
      lat: place.lat,
      lon: place.lon,
      name,
      address: place.address,
      municipality: entry.kommune,
      source: entry.source_url,
    });
  }
}

// A broken run must never replace a good list.
if (rows.length < 150) throw new Error(`Only ${rows.length} points passed; keeping the old list`);

const body = rows
  .map(
    (r) =>
      `  [${JSON.stringify(r.id)}, ${r.lat}, ${r.lon}, ${JSON.stringify(r.name)}, ${JSON.stringify(r.address)}, ${JSON.stringify(r.municipality)}, ${JSON.stringify(r.source)}],`,
  )
  .join('\n');

writeFileSync(
  OUT,
  `// Generated by scripts/update-meeting-points.mjs. Don't edit by hand.
// Source: each municipality's own website, read ${survey.collected}; coordinates from Kartverket's address register.

/** The day the municipalities' pages were read, YYYY-MM-DD. */
export const MEETING_POINTS_UPDATED = '${survey.collected}';

/** id, latitude, longitude, name, address, municipality, the municipality's page. */
export const MEETING_POINT_ROWS: readonly (readonly [string, number, number, string, string, string, string])[] = [
${body}
];
`,
);
const municipalities = new Set(rows.map((r) => r.municipality)).size;
console.log(`${rows.length} points in ${municipalities} municipalities; left out:`, skipped);
