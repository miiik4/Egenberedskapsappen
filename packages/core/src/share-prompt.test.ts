import { describe, expect, it } from 'vitest';

import { shouldAskToShare } from './share-prompt';

const fresh = { hidden: false, askedOn: null };

describe('shouldAskToShare', () => {
  it('waits until the app has been used for two weeks', () => {
    expect(shouldAskToShare(fresh, '2026-11-01', true, '2026-11-14')).toBe(false);
    expect(shouldAskToShare(fresh, '2026-11-01', true, '2026-11-15')).toBe(true);
  });

  it('does not ask before the household is set up or while the stockpile is empty', () => {
    expect(shouldAskToShare(fresh, null, true, '2026-11-15')).toBe(false);
    expect(shouldAskToShare(fresh, '2026-11-01', false, '2026-12-15')).toBe(false);
  });

  it('asks again 90 days after «Senere»', () => {
    const asked = { hidden: false, askedOn: '2026-11-15' };
    expect(shouldAskToShare(asked, '2026-11-01', true, '2027-02-12')).toBe(false);
    expect(shouldAskToShare(asked, '2026-11-01', true, '2027-02-13')).toBe(true);
  });

  it('never asks once hidden', () => {
    expect(shouldAskToShare({ hidden: true, askedOn: '2026-01-01' }, '2025-01-01', true, '2027-01-01')).toBe(false);
    expect(shouldAskToShare({ hidden: true, askedOn: null }, '2025-01-01', true, '2027-01-01')).toBe(false);
  });
});
