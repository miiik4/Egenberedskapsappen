import { BELONGING_CATEGORIES, type BelongingCategory } from '@egenberedskap/core';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch } from 'react-native';

import { useAnalysis } from '@/analysis/analysis-provider';
import { cropFile } from '@/analysis/photos';
import { NumberField, parseNumber, TextField } from '@/components/form/fields';
import { MenuField } from '@/components/form/menu-field';
import { FormSheet } from '@/components/form/sheet';
import { Row, Section } from '@/components/ui/list';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useData } from '@/data/data-provider';

/** One suggestion, before it's added: name, category and value (1d). */
export default function Forslag() {
  const { id, index } = useLocalSearchParams<{ id: string; index: string }>();
  const { analyses } = useData();
  const { updateSuggestion } = useAnalysis();
  const i = Number(index);
  const suggestion = analyses.find((a) => a.id === id)?.suggestions?.[i];

  const [name, setName] = useState(suggestion?.name ?? '');
  const [category, setCategory] = useState<BelongingCategory>(suggestion?.category ?? 'Annet');
  const [value, setValue] = useState(suggestion?.valueKr !== undefined ? String(suggestion.valueKr) : '');
  const [selected, setSelected] = useState(suggestion?.selected ?? true);
  if (!suggestion || !id) return null;

  const valueKr = parseNumber(value);
  const valueEdited = suggestion.valueEdited || valueKr !== suggestion.valueKr;

  const save = async () => {
    await updateSuggestion(id, i, {
      name: name.trim(),
      category,
      valueKr: valueKr !== undefined ? Math.round(valueKr) : undefined,
      valueEdited,
      selected,
    });
    router.back();
  };

  return (
    <FormSheet title="Rediger" canSave={name.trim() !== ''} onSave={save}>
      {suggestion.cropFile && (
        <Image source={{ uri: cropFile(id, suggestion.cropFile).uri }} style={styles.photo} contentFit="contain" accessibilityLabel={name} />
      )}
      <Section
        footer={
          valueEdited
            ? 'Hva det vil koste å kjøpe det samme nytt.'
            : 'KI-anslag basert på lignende produkter. Endre hvis du vet hva den kostet.'
        }>
        <TextField label="Navn" value={name} onChange={setName} />
        <MenuField
          label="Kategori"
          value={category}
          options={BELONGING_CATEGORIES.map((c) => ({ value: c, label: c }))}
          onChange={setCategory}
        />
        <NumberField label="Verdi" value={value} onChange={setValue} unit="kr" />
      </Section>
      <Section>
        <Row
          title="Ta med"
          trailing={<Switch value={selected} onValueChange={setSelected} accessibilityLabel="Ta med" trackColor={{ true: Colors.accent }} />}
        />
      </Section>
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  photo: {
    marginHorizontal: Spacing.screen,
    aspectRatio: 1,
    borderRadius: Radius.card,
    borderCurve: 'continuous',
    backgroundColor: Colors.card,
  },
});
