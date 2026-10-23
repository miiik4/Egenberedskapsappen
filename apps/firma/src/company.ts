/**
 * Company details, shown in the contact section, the privacy page and the footer.
 * Same values as apps/web/src/company.ts, which the app's website shows; change both together.
 */
export const COMPANY = {
  name: 'Holm & Tall AS',
  orgNumber: '938 302 790',
  street: 'Storgata 88',
  postcode: '3921 Porsgrunn',
  email: 'kontakt@holmtall.no',
  phone: '+47 404 04 506',
};

export const phoneHref = `tel:${COMPANY.phone.replace(/\s/g, '')}`;

/** The app the company makes. */
export const APP = {
  name: 'Egenberedskapsappen',
  site: 'https://egenberedskapappen.no',
  privacy: 'https://egenberedskapappen.no/personvern',
  /** Google Play. The App Store link comes when Apple has approved the company's account (LAUNCH.md). */
  play: 'https://play.google.com/store/apps/details?id=no.htas.egenberedskap',
};
