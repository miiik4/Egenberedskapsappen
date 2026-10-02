import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { DateField, confirmDelete, DestructiveButton, NumberField, parseNumber, TextField } from '@/components/form/fields';
import { FormSheet } from '@/components/form/sheet';
import { Section } from '@/components/ui/list';
import { useActions, useData } from '@/data/data-provider';

export default function Forsikring() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { policies } = useData();
  const { savePolicy, deletePolicy } = useActions();
  const existing = policies.find((p) => p.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [renewsOn, setRenewsOn] = useState(existing?.renewsOn);
  const [sum, setSum] = useState(existing?.sumKr !== undefined ? String(existing.sumKr) : '');
  const [deductible, setDeductible] = useState(existing?.deductibleKr !== undefined ? String(existing.deductibleKr) : '');

  const save = async () => {
    const sumKr = parseNumber(sum);
    const deductibleKr = parseNumber(deductible);
    await savePolicy({
      id: existing?.id,
      name,
      ...(renewsOn && { renewsOn }),
      ...(sumKr !== undefined && { sumKr }),
      ...(deductibleKr !== undefined && { deductibleKr }),
    });
    router.back();
  };


  return (
    <FormSheet title={existing ? 'Rediger forsikring' : 'Ny forsikring'} canSave={name.trim() !== ''} onSave={save}>
      <Section>
        <TextField label="Navn" value={name} onChange={setName} placeholder="Innbo, Storgata 12" autoFocus={!existing} />
        <DateField label="Fornyes" value={renewsOn} onChange={setRenewsOn} />
      </Section>
      <Section footer="Står i forsikringsbeviset. Brukes i skademeldingen.">
        <NumberField label="Forsikringssum" value={sum} onChange={setSum} unit="kr" />
        <NumberField label="Egenandel" value={deductible} onChange={setDeductible} unit="kr" />
      </Section>
      {existing && <DestructiveButton
          label="Slett forsikring"
          onPress={() => confirmDelete('Slette forsikringen?', existing.name, () => deletePolicy(existing.id))}
        />}
    </FormSheet>
  );
}
