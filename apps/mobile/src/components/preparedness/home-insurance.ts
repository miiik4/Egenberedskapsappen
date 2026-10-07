import { documentedValue, insuranceAlert } from '@egenberedskap/core';

import { useData } from '@/data/data-provider';

export const INSURANCE_ALERT_TITLE = {
  over: 'Innboet kan være underforsikret',
  near: 'Innboet nærmer seg forsikringssummen',
};

/** The selected home's contents insurance and how it compares with what's been documented there. */
export function useHomeInsurance() {
  const { properties, selectedPropertyId, policies, rooms, belongings } = useData();
  const property = properties.find((p) => p.id === selectedPropertyId);
  const policy = property && policies.find((p) => p.propertyId === property.id);
  const documentedKr = documentedValue(
    belongings,
    rooms.filter((r) => r.propertyId === property?.id).map((r) => r.id),
  );
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
