import { createClient } from '@sanity/client';

/**
 * Partner pages (/for/<slug>) come from Sanity, project «Egenberedskapappen», edited in `apps/studio`.
 * Everything is fetched at build time: the site stays static, and the browser never talks to Sanity (the CSP is
 * `'self'` only), so logos are inlined as data: URLs.
 *
 * Read-only and without a token: the dataset is public, so this sees published documents only, never drafts.
 */
const client = createClient({
  projectId: '8ej8zl2c',
  dataset: 'production',
  apiVersion: '2026-10-26',
  // Straight from the API, not the CDN cache: a build right after publishing should see what was published.
  useCdn: false,
  perspective: 'published',
});

/** AGENTS.md: never name a partner without a signed agreement. Unsigned partners get no page. */
const PARTNERS_QUERY = /* groq */ `
  *[_type == "partner" && agreementSigned == true && defined(slug.current)] | order(slug.current asc) {
    name,
    "slug": slug.current,
    "logo": logo.asset->{url, mimeType, "width": metadata.dimensions.width, "height": metadata.dimensions.height},
    "logoDark": logoDark.asset->{url, mimeType},
    headline,
    lead,
    description,
    code,
    "showDiscount": showDiscount != false,
    discountText,
    privacyLine
  }
`;

interface Asset {
  url: string;
  mimeType: string;
  width?: number;
  height?: number;
}

interface PartnerDoc {
  name: string | null;
  slug: string;
  logo: Asset | null;
  logoDark: Asset | null;
  headline: string | null;
  lead: string | null;
  description: string | null;
  code: string | null;
  showDiscount: boolean;
  discountText: string | null;
  privacyLine: string | null;
}

export interface Logo {
  /** A data: URL, so the page loads nothing from Sanity. */
  src: string;
  width: number;
  height: number;
}

export interface Partner {
  name: string;
  slug: string;
  logo: Logo;
  /** For dark mode; the light logo when there is none. */
  logoDark: Logo;
  headline: string;
  lead: string;
  description: string;
  code?: string;
  /** Undefined when the Egenberedskap+ discount section is switched off. */
  discountText?: string;
  privacyLine: string;
}

const MAX_LOGO_BYTES = 200_000;
const ALLOWED_TYPES = new Set(['image/svg+xml', 'image/png', 'image/webp']);

async function inlineLogo(asset: Asset, partner: string): Promise<Logo> {
  if (!ALLOWED_TYPES.has(asset.mimeType)) {
    throw new Error(`Partner «${partner}»: logo is ${asset.mimeType}; use SVG, PNG or WebP`);
  }
  // Raster logos are shown 44 px high: ask Sanity's image pipeline for 3x that instead of the original.
  const url = asset.mimeType === 'image/svg+xml' ? asset.url : `${asset.url}?h=132&fit=max`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Partner «${partner}»: logo fetch failed with ${response.status} (${url})`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MAX_LOGO_BYTES) {
    throw new Error(`Partner «${partner}»: logo is ${bytes.length} bytes, more than ${MAX_LOGO_BYTES}`);
  }
  const width = asset.width ?? 0;
  const height = asset.height ?? 0;
  return { src: `data:${asset.mimeType};base64,${bytes.toString('base64')}`, width, height };
}

function required(value: string | null, field: string, slug: string): string {
  const text = value?.trim();
  if (!text) throw new Error(`Partner «${slug}» is missing ${field}; fix it in Sanity Studio and rebuild`);
  return text;
}

/**
 * Signed partners, ready for the page. Throws (and so fails the build) when Sanity can't be reached or a signed
 * partner is incomplete: deploying without a partner's page would break the links handed out to its customers.
 */
export async function getPartners(): Promise<Partner[]> {
  const docs = await client.fetch<PartnerDoc[]>(PARTNERS_QUERY);
  return Promise.all(
    docs.map(async (doc) => {
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(doc.slug)) throw new Error(`Partner slug «${doc.slug}» is not a-z, 0-9 and -`);
      const name = required(doc.name, 'Navn', doc.slug);
      if (!doc.logo) throw new Error(`Partner «${doc.slug}» is missing Logo`);
      const logo = await inlineLogo(doc.logo, doc.slug);
      const logoDark = doc.logoDark
        ? { ...(await inlineLogo(doc.logoDark, doc.slug)), width: logo.width, height: logo.height }
        : logo;
      return {
        name,
        slug: doc.slug,
        logo,
        logoDark,
        headline: required(doc.headline, 'Overskrift', doc.slug),
        lead: required(doc.lead, 'Ingress', doc.slug),
        description: required(doc.description, 'Beskrivelse ved deling', doc.slug),
        code: doc.code?.trim() || undefined,
        discountText: doc.showDiscount ? required(doc.discountText, 'Tekst om rabatten', doc.slug) : undefined,
        privacyLine: required(doc.privacyLine, 'Hva partneren får vite', doc.slug),
      };
    }),
  );
}
