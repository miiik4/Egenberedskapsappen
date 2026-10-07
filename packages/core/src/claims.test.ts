import { describe, expect, it } from 'vitest';

import type { Belonging } from './belongings';
import { claimDeadline, claimItemFromBelonging, claimProblems, claimTotals, isClaimKind, isDamage } from './claims';

const tv: Belonging = { id: 'tv', roomId: 'stue', name: 'TV', category: 'Elektronikk', valueKr: 12_000, valueEstimated: false };

describe('claimItemFromBelonging', () => {
  it('copies the belonging as it is now, with the damage', () => {
    expect(claimItemFromBelonging(tv, 'destroyed')).toEqual({
      belongingId: 'tv',
      roomId: 'stue',
      name: 'TV',
      category: 'Elektronikk',
      valueKr: 12_000,
      valueEstimated: false,
      damage: 'destroyed',
    });
  });

  it('leaves out a value nobody knows', () => {
    const { valueKr: _valueKr, ...unvalued } = tv;
    expect(claimItemFromBelonging(unvalued, 'stolen')).not.toHaveProperty('valueKr');
  });
});

describe('claimTotals', () => {
  const items = [
    { valueKr: 12_000, valueEstimated: false },
    { valueKr: 8_000, valueEstimated: true },
    { valueEstimated: false },
  ];

  it('adds up the values, counting estimates and things without a value', () => {
    expect(claimTotals(items, { includeEstimates: true, deductibleKr: 4_000 })).toEqual({
      totalKr: 20_000,
      estimatedKr: 8_000,
      unknownCount: 1,
      afterDeductibleKr: 16_000,
    });
  });

  it('can leave estimates out, as unknown', () => {
    expect(claimTotals(items, { includeEstimates: false })).toEqual({
      totalKr: 12_000,
      estimatedKr: 0,
      unknownCount: 2,
      afterDeductibleKr: 12_000,
    });
  });

  it('never goes below 0 after the deductible', () => {
    expect(claimTotals([{ valueKr: 1_000, valueEstimated: false }], { includeEstimates: true, deductibleKr: 4_000 }).afterDeductibleKr).toBe(0);
  });
});

describe('claimDeadline', () => {
  it('is a year after it happened', () => {
    expect(claimDeadline('2026-10-03')).toBe('2027-10-03');
    expect(claimDeadline('2028-02-29')).toBe('2029-02-28');
  });
});

describe('claimProblems', () => {
  const claim = { kind: 'water' as const, happenedOn: '2026-10-03' };
  const today = '2026-10-07';

  it('has nothing to say about a claim with photos and valued things', () => {
    expect(claimProblems(claim, [{ valueKr: 12_000 }], 3, today)).toEqual([]);
  });

  it('asks for things, photos and values', () => {
    expect(claimProblems(claim, [], 0, today)).toEqual(['noItems', 'noPhotos']);
    expect(claimProblems(claim, [{ valueKr: 1 }, {}], 1, today)).toEqual(['unknownValues']);
  });

  it('asks for the police report number after theft only', () => {
    const theft = { ...claim, kind: 'theft' as const };
    expect(claimProblems(theft, [{ valueKr: 1 }], 1, today)).toEqual(['noPoliceReport']);
    expect(claimProblems({ ...theft, policeReport: ' ' }, [{ valueKr: 1 }], 1, today)).toEqual(['noPoliceReport']);
    expect(claimProblems({ ...theft, policeReport: '12345678' }, [{ valueKr: 1 }], 1, today)).toEqual([]);
  });

  it('warns as the deadline comes near and once it has passed, unless already reported', () => {
    const ok = [{ valueKr: 1 }];
    expect(claimProblems(claim, ok, 1, '2027-09-02')).toEqual([]);
    expect(claimProblems(claim, ok, 1, '2027-09-03')).toEqual(['deadlineSoon']);
    expect(claimProblems(claim, ok, 1, '2027-10-04')).toEqual(['deadlinePassed']);
    expect(claimProblems({ ...claim, reportedOn: '2026-10-05' }, ok, 1, '2027-10-04')).toEqual([]);
  });
});

describe('guards', () => {
  it('know the kinds and damages', () => {
    expect(isClaimKind('fire')).toBe(true);
    expect(isClaimKind('flood')).toBe(false);
    expect(isDamage('stolen')).toBe(true);
    expect(isDamage('lost')).toBe(false);
  });
});
