import { WATER_LITRES_PER_PERSON_PER_DAY, type StockCategory } from '@egenberedskap/core';
import type { StockDraft } from '@egenberedskap/store';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { ChoiceRow, DateField, confirmDelete, DestructiveButton, NumberField, parseNumber, TextField } from '@/components/form/fields';
import { FormSheet } from '@/components/form/sheet';
import { Section } from '@/components/ui/list';
import { useActions, useData } from '@/data/data-provider';
import { categoryName } from '@/lib/format';

const CATEGORIES: StockCategory[] = ['water', 'food', 'radio', 'heatAndLight', 'firstAid', 'hygieneAndCash'];

/**
 * Add or edit a stockpile item. Tasks on Home open this prefilled, e.g. `?category=water&litres=12`,
 * so doing the task is the same as recording it.
 */
export default function Vare() {
  const params = useLocalSearchParams<{ id?: string; category?: StockCategory; litres?: string; personDays?: string }>();
  const { stock } = useData();
  const { saveStockItem, deleteStockItem } = useActions();
  const existing = stock.find((item) => item.id === params.id);

  const initialCategory = existing?.category ?? params.category ?? 'water';
  const [category, setCategory] = useState<StockCategory>(initialCategory);
  const [name, setName] = useState(existing?.name ?? (params.category ? categoryName[params.category] : ''));
  const [litres, setLitres] = useState(
    existing?.category === 'water' ? String(existing.litres) : (params.litres ?? ''),
  );
  const [personDays, setPersonDays] = useState(
    existing?.category === 'food' ? String(existing.personDays) : (params.personDays ?? ''),
  );
  const [expiresOn, setExpiresOn] = useState(existing?.expiresOn);

  const quantityOk =
    category === 'water'
      ? (parseNumber(litres) ?? 0) > 0
      : category === 'food'
        ? (parseNumber(personDays) ?? 0) > 0
        : true;
  const canSave = name.trim() !== '' && quantityOk;

  const save = async () => {
    const base = { id: existing?.id, name, ...(expiresOn && { expiresOn }) };
    const draft: StockDraft =
      category === 'water'
        ? { ...base, category, litres: parseNumber(litres)! }
        : category === 'food'
          ? { ...base, category, personDays: parseNumber(personDays)! }
          : { ...base, category };
    await saveStockItem(draft);
    router.back();
  };


  return (
    <FormSheet title={existing ? 'Rediger vare' : 'Ny vare'} canSave={canSave} onSave={save}>
      <Section>
        <TextField label="Navn" value={name} onChange={setName} placeholder="F.eks. vann på flaske" autoFocus={!existing && !params.category} />
      </Section>

      <Section header="Kategori">
        {CATEGORIES.map((c) => (
          <ChoiceRow key={c} label={categoryName[c]} selected={c === category} onPress={() => setCategory(c)} />
        ))}
      </Section>

      {category === 'water' && (
        <Section footer={`Regnestykket bruker ${WATER_LITRES_PER_PERSON_PER_DAY} liter per person per døgn, til drikke og matlaging.`}>
          <NumberField label="Mengde" value={litres} onChange={setLitres} unit="l" decimals />
        </Section>
      )}
      {category === 'food' && (
        <Section footer="Omtrent hvor mange dager dette kan mette én voksen. To personer i tre dager er 6.">
          <NumberField label="Persondøgn" value={personDays} onChange={setPersonDays} decimals />
        </Section>
      )}

      <Section footer="Varen slutter å telle dagen etter at den har gått ut.">
        <DateField label="Utløpsdato" value={expiresOn} onChange={setExpiresOn} />
      </Section>

      {existing && <DestructiveButton
          label="Slett vare"
          onPress={() => confirmDelete('Slette varen?', existing.name, () => deleteStockItem(existing.id))}
        />}
    </FormSheet>
  );
}
