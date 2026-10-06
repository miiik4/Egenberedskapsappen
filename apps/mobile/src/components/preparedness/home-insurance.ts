import { insuranceAlert } from '@egenberedskap/core';

import { useData } from '@/data/data-provider';

/**
 * The selected home's contents insurance and how it compares with what's been documented.
 * Belongings come with filming, which isn't built yet, so nothing is documented so far and
 * the underinsurance warning stays quiet until then.
 */
export function useHomeInsurance() {
  const { properties, selectedPropertyId, policies } = useData();
  const property = properties.find((p) => p.id === selectedPropertyId);
  const policy = property && policies.find((p) => p.propertyId === property.id);
  const documentedKr = 0;
  const alert = policy
    ? insuranceAlert({
        documentedKr,
        sumKr: policy.sumKr,
        alertNearSum: policy.alertNearSum,
        dismissedAtKr: policy.alertDismissedKr,
      })
    : null;
  return { property, policy, documentedKr, alert };
}
