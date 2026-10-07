import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { confirmDelete, DestructiveButton, TextField } from '@/components/form/fields';
import { FormSheet } from '@/components/form/sheet';
import { Section } from '@/components/ui/list';
import { useBelongings } from '@/belongings/use-belongings';
import { useActions, useData } from '@/data/data-provider';

export default function Rom() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { rooms, properties, selectedPropertyId } = useData();
  const { saveRoom } = useActions();
  const { removeRoom } = useBelongings();
  const existing = rooms.find((r) => r.id === id);
  const propertyId = existing?.propertyId ?? selectedPropertyId!;
  const property = properties.find((p) => p.id === propertyId);
  const [name, setName] = useState(existing?.name ?? '');

  const save = async () => {
    await saveRoom({ id: existing?.id, propertyId, name });
    router.back();
  };


  return (
    <FormSheet title={existing ? 'Rediger rom' : 'Nytt rom'} canSave={name.trim() !== ''} onSave={save}>
      <Section footer={property ? `Rommet hører til ${property.name}.` : undefined}>
        <TextField label="Navn" value={name} onChange={setName} placeholder="Kontor" autoFocus={!existing} />
      </Section>
      {existing && <DestructiveButton
          label="Slett rom"
          onPress={() => confirmDelete('Slette rommet?', `${existing.name} og det som er registrert der blir fjernet.`, () => removeRoom(existing.id))}
        />}
    </FormSheet>
  );
}
