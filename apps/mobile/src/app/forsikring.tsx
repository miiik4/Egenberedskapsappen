import { INSURANCE_ALERT_SHARE } from '@egenberedskap/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch } from 'react-native';

import { confirmDelete, DestructiveButton, NumberField, parseNumber, TextField } from '@/components/form/fields';
import { MenuField } from '@/components/form/menu-field';
import { FormSheet } from '@/components/form/sheet';
import { useHomeInsurance } from '@/components/preparedness/home-insurance';
import { Row, Section } from '@/components/ui/list';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useActions } from '@/data/data-provider';
import { Text } from '@/components/ui/text';

/**
 * Home insurers in Norway, most chosen first. Bank brands are listed alongside the insurers
 * behind them, since that's what people call their insurance: «SpareBank 1» and «DNB» are
 * underwritten by Fremtind. Same list as Idimy's.
 */
const COMPANIES = [
  'Gjensidige',
  'If',
  'Tryg',
  'Fremtind',
  'SpareBank 1',
  'DNB',
  'Storebrand',
  'Frende',
  'KLP',
  'Eika',
  'Nordea',
  'Landkreditt',
];
/** Opens a text field, so what's stored is the real name rather than «Annet». */
const OTHER = 'Annet';

/**
 * «Innboforsikring» for the selected home. The sum insured comes from here; without it the
 * app can't warn about underinsurance.
 */
export default function Forsikring() {
  const { property, policy } = useHomeInsurance();
  const { savePolicy, deletePolicy } = useActions();

  const saved = policy?.company ?? '';
  const [choice, setChoice] = useState(saved === '' || COMPANIES.includes(saved) ? saved : OTHER);
  const [otherName, setOtherName] = useState(COMPANIES.includes(saved) ? '' : saved);
  const company = choice === OTHER ? otherName.trim() : choice;
  const [sum, setSum] = useState(policy?.sumKr !== undefined ? String(policy.sumKr) : '');
  const [deductible, setDeductible] = useState(policy?.deductibleKr !== undefined ? String(policy.deductibleKr) : '');
  const [alertNearSum, setAlertNearSum] = useState(policy?.alertNearSum ?? true);

  const save = async () => {
    const sumKr = parseNumber(sum);
    const deductibleKr = parseNumber(deductible);
    await savePolicy({
      ...policy,
      id: policy?.id,
      name: policy?.name ?? 'Innboforsikring',
      propertyId: property?.id,
      company: company || undefined,
      sumKr,
      deductibleKr,
      alertNearSum,
    });
    router.back();
  };

  return (
    <FormSheet title="Innboforsikring" canSave={property !== undefined} onSave={save}>
      {property && <Text style={styles.subtitle}>{property.name}</Text>}

      <Section header="Forsikringen" footer="Står på forsikringsbeviset. Du kan legge beviset i Dokumenter under Nødinfo.">
        <MenuField
          label="Selskap"
          value={choice}
          options={[{ value: '', label: 'Velg' }, ...[...COMPANIES, OTHER].map((c) => ({ value: c, label: c }))]}
          onChange={setChoice}
        />
        {choice === OTHER && (
          <TextField label="Navn" value={otherName} onChange={setOtherName} placeholder="Selskapets navn" autoCapitalize="words" />
        )}
        <NumberField label="Forsikringssum" value={sum} onChange={setSum} unit="kr" />
        <NumberField label="Egenandel" value={deductible} onChange={setDeductible} unit="kr" />
      </Section>

      <Section header="Varsler" footer="Du får beskjed når dokumentert verdi nærmer seg eller passerer forsikringssummen.">
        <Row
          title={`Varsle ved ${Math.round(INSURANCE_ALERT_SHARE * 100)} %`}
          trailing={
            <Switch
              value={alertNearSum}
              onValueChange={setAlertNearSum}
              accessibilityLabel="Varsle når innboet nærmer seg forsikringssummen"
              trackColor={{ true: Colors.accent }}
            />
          }
        />
      </Section>

      <Pressable
        onPress={() => router.push('/rapport')}
        accessibilityRole="button"
        style={({ pressed }) => [styles.report, pressed && { opacity: 0.7 }]}>
        <Text style={styles.reportText}>Del rapport med selskapet</Text>
      </Pressable>

      {policy && (
        <DestructiveButton
          label="Slett forsikring"
          onPress={() => confirmDelete('Slette forsikringen?', policy.company ?? policy.name, () => deletePolicy(policy.id))}
        />
      )}
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginHorizontal: Spacing.screen + 4, marginTop: -16, textAlign: 'center', fontSize: 15, color: Colors.secondaryLabel },
  report: {
    marginHorizontal: Spacing.screen,
    height: 52,
    borderRadius: Radius.pill,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accentSoft,
  },
  reportText: { fontSize: 17, fontWeight: '600', color: Colors.accent },
});
