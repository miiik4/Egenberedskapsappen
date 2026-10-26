import { describe, expect, it } from 'vitest';

import { parsePartnerGreeting, partnerFromReferrer, partnerReferrer } from './partners';

const LOGO = 'data:image/svg+xml;base64,PHN2Zy8+';

describe('partners', () => {
  it('reads the partner from a Play install referrer', () => {
    expect(partnerFromReferrer(partnerReferrer('ctc-bilpartner'))).toBe('ctc-bilpartner');
    expect(partnerFromReferrer('utm_campaign=ctc-bilpartner&utm_source=partner&utm_medium=web')).toBe('ctc-bilpartner');
    expect(partnerFromReferrer('utm_source=partner&utm_campaign=CTC-Bilpartner')).toBe('ctc-bilpartner');
  });

  it('ignores installs that didn’t come through a partner link', () => {
    expect(partnerFromReferrer('utm_source=google-play&utm_medium=organic')).toBeNull();
    expect(partnerFromReferrer('')).toBeNull();
    expect(partnerFromReferrer(null)).toBeNull();
    expect(partnerFromReferrer('utm_source=partner')).toBeNull();
    expect(partnerFromReferrer('utm_source=partner&utm_campaign=../../etc')).toBeNull();
    expect(partnerFromReferrer('utm_source=partner&utm_campaign=a b')).toBeNull();
    expect(partnerFromReferrer(`utm_source=partner&utm_campaign=${'a'.repeat(61)}`)).toBeNull();
  });

  it('takes a partner greeting only when it looks right', () => {
    const json = { name: ' CTC Bilpartner ', greeting: 'Hilsen fra oss.', logo: LOGO };
    expect(parsePartnerGreeting('ctc-bilpartner', json)).toEqual({
      slug: 'ctc-bilpartner',
      name: 'CTC Bilpartner',
      greeting: 'Hilsen fra oss.',
      logo: LOGO,
      logoDark: LOGO,
    });
    expect(parsePartnerGreeting('x', { ...json, logo: 'https://cdn.example.com/logo.svg' })).toBeNull();
    expect(parsePartnerGreeting('x', { ...json, greeting: '' })).toBeNull();
    expect(parsePartnerGreeting('x', { ...json, name: 'x'.repeat(61) })).toBeNull();
    expect(parsePartnerGreeting('x', null)).toBeNull();
    expect(parsePartnerGreeting('x', 'CTC')).toBeNull();
    // A bad dark logo falls back to the light one rather than failing the partner.
    expect(parsePartnerGreeting('x', { ...json, logoDark: 'javascript:alert(1)' })?.logoDark).toBe(LOGO);
  });
});
