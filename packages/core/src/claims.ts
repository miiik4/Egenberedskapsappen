import type { Belonging, BelongingCategory } from './belongings';
import { addMonths, daysBetween } from './dates';
import { CLAIM_DEADLINE_MONTHS, CLAIM_DEADLINE_WARNING_DAYS } from './guidance';
import type { IsoDate } from './types';

/**
 * «Meld en skade»: what happened, photos of the damage and what was lost, put together on the
 * phone and shared with the insurer as a PDF. Nothing is sent from the app.
 */
export const CLAIM_KINDS = ['water', 'fire', 'theft', 'weather', 'other'] as const;
export type ClaimKind = (typeof CLAIM_KINDS)[number];

export function isClaimKind(value: string): value is ClaimKind {
  return (CLAIM_KINDS as readonly string[]).includes(value);
}

export const DAMAGES = ['destroyed', 'damaged', 'stolen'] as const;
export type Damage = (typeof DAMAGES)[number];

export function isDamage(value: string): value is Damage {
  return (DAMAGES as readonly string[]).includes(value);
}

export type Claim = {
  id: string;
  /** The home it happened at. One claim, one home, as insurers handle them. */
  propertyId?: string;
  kind: ClaimKind;
  happenedOn: IsoDate;
  description: string;
  /** «Anmeldelsesnummer» from the police. Insurers ask for it after theft. */
  policeReport?: string;
  /** Shared with the insurer on this day. A draft until then. */
  reportedOn?: IsoDate;
};

/**
 * One thing on the claim. A copy of the belonging as it was, not just a link: after a fire the
 * belongings may be edited or deleted, but the claim must still say what was lost and what it
 * was worth. Things that were never documented have no belonging.
 */
export type ClaimItem = {
  id: string;
  claimId: string;
  belongingId?: string;
  roomId?: string;
  name: string;
  category: BelongingCategory;
  valueKr?: number;
  valueEstimated: boolean;
  damage: Damage;
};

export function claimItemFromBelonging(
  belonging: Belonging,
  damage: Damage,
): Omit<ClaimItem, 'id' | 'claimId'> {
  return {
    belongingId: belonging.id,
    roomId: belonging.roomId,
    name: belonging.name,
    category: belonging.category,
    ...(belonging.valueKr !== undefined && { valueKr: belonging.valueKr }),
    valueEstimated: belonging.valueEstimated,
    damage,
  };
}

export type ClaimTotals = {
  totalKr: number;
  /** The part of the total that is AI estimates; 0 when estimates are left out. */
  estimatedKr: number;
  /** Things with no value counted: none known, or an estimate left out. */
  unknownCount: number;
  /** What's left after the deductible, never below 0. The total when there's no deductible. */
  afterDeductibleKr: number;
};

/** What the claim adds up to, counting estimates the same way the report does. */
export function claimTotals(
  items: Pick<ClaimItem, 'valueKr' | 'valueEstimated'>[],
  options: { includeEstimates: boolean; deductibleKr?: number },
): ClaimTotals {
  let totalKr = 0;
  let estimatedKr = 0;
  let unknownCount = 0;
  for (const item of items) {
    const value = options.includeEstimates || !item.valueEstimated ? item.valueKr : undefined;
    if (value === undefined) {
      unknownCount += 1;
      continue;
    }
    totalKr += value;
    if (item.valueEstimated) estimatedKr += value;
  }
  return { totalKr, estimatedKr, unknownCount, afterDeductibleKr: Math.max(0, totalKr - (options.deductibleKr ?? 0)) };
}

/** The last day the claim can reach the insurer. */
export function claimDeadline(happenedOn: IsoDate): IsoDate {
  return addMonths(happenedOn, CLAIM_DEADLINE_MONTHS);
}

export type ClaimProblem = 'noItems' | 'noPhotos' | 'noPoliceReport' | 'unknownValues' | 'deadlineSoon' | 'deadlinePassed';

/**
 * What's missing before the claim is worth sending, most important first. Shown as advice, not
 * as a block: the user can always share what they have.
 */
export function claimProblems(
  claim: Pick<Claim, 'kind' | 'happenedOn' | 'policeReport' | 'reportedOn'>,
  items: Pick<ClaimItem, 'valueKr'>[],
  photoCount: number,
  today: IsoDate,
): ClaimProblem[] {
  const problems: ClaimProblem[] = [];
  if (!claim.reportedOn) {
    const left = daysBetween(today, claimDeadline(claim.happenedOn));
    if (left < 0) problems.push('deadlinePassed');
    else if (left <= CLAIM_DEADLINE_WARNING_DAYS) problems.push('deadlineSoon');
  }
  if (claim.kind === 'theft' && !claim.policeReport?.trim()) problems.push('noPoliceReport');
  if (items.length === 0) problems.push('noItems');
  if (photoCount === 0) problems.push('noPhotos');
  if (items.some((i) => i.valueKr === undefined)) problems.push('unknownValues');
  return problems;
}
