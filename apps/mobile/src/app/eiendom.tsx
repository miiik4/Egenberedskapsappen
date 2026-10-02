import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { confirmDelete, DestructiveButton, TextField } from '@/components/form/fields';
import { FormSheet } from '@/components/form/sheet';
import { Section } from '@/components/ui/list';
import { useActions, useData } from '@/data/data-provider';

export default function Eiendom() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { properties } = useData();
  const { saveProperty, deleteProperty, selectProperty } = useActions();
  const existing = properties.find((p) => p.id === id);
  const [name, setName] = useState(existing?.name ?? '');
  const [shortName, setShortName] = useState(existing?.shortName ?? '');

  const save = async () => {
    const savedId = await saveProperty({ id: existing?.id, name, shortName: shortName.trim() || name });
    if (!existing) await selectProperty(savedId);
    router.back();
  };


  return (
    <FormSheet title={existing ? 'Rediger eiendom' : 'Ny eiendom'} canSave={name.trim() !== ''} onSave={save}>
      <Section footer="Kortnavnet vises i menyen øverst, f.eks. «Hytta».">
        <TextField label="Adresse" value={name} onChange={setName} placeholder="Hafjell" autoFocus={!existing} textContentType="fullStreetAddress" />
        <TextField label="Kortnavn" value={shortName} onChange={setShortName} placeholder="Hytta" />
      </Section>
      {existing && properties.length > 1 && <DestructiveButton
          label="Slett eiendom"
          onPress={() => confirmDelete('Slette eiendommen?', `${existing.name} og rommene der blir fjernet.`, () => deleteProperty(existing.id))}
        />}
    </FormSheet>
  );
}
