import { INSURANCE_ALERT_SHARE } from './guidance';

export type InsuranceInput = {
  /** What the filmed belongings add up to. */
  documentedKr: number;
  sumKr: number | undefined;
  /** «Varsle ved 90 %». */
  alertNearSum: boolean;
  /** «Ikke nå» was tapped at this documented value. */
  dismissedAtKr: number | undefined;
};

/**
 * Whether to warn that the home may be underinsured: `over` once documented value passes the
 * sum insured, `near` from INSURANCE_ALERT_SHARE of it when asked for. «Ikke nå» hides the
 * warning until the documented value goes up again.
 */
export function insuranceAlert({ documentedKr, sumKr, alertNearSum, dismissedAtKr }: InsuranceInput): 'over' | 'near' | null {
  if (!sumKr || sumKr <= 0) return null;
  if (dismissedAtKr !== undefined && documentedKr <= dismissedAtKr) return null;
  if (documentedKr > sumKr) return 'over';
  if (alertNearSum && documentedKr >= sumKr * INSURANCE_ALERT_SHARE) return 'near';
  return null;
}
