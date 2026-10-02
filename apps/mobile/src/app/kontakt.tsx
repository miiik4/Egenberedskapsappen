import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { confirmDelete, DestructiveButton, TextField } from '@/components/form/fields';
import { FormSheet } from '@/components/form/sheet';
import { Section } from '@/components/ui/list';
import { useActions, useData } from '@/data/data-provider';

export default function Kontakt() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { contacts } = useData();
  const { saveContact, deleteContact } = useActions();
  const existing = contacts.find((c) => c.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [relation, setRelation] = useState(existing?.relation ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const canSave = name.trim() !== '' && phone.trim() !== '';

  const save = async () => {
    await saveContact({ id: existing?.id, name, relation, phone });
    router.back();
  };


  return (
    <FormSheet title={existing ? 'Rediger kontakt' : 'Ny nødkontakt'} canSave={canSave} onSave={save}>
      <Section footer="Nødkontakter lagres på telefonen og kan ringes uten mobildata.">
        <TextField label="Navn" value={name} onChange={setName} placeholder="Ola Nordmann" autoCapitalize="words" textContentType="name" autoFocus={!existing} />
        <TextField label="Relasjon" value={relation} onChange={setRelation} placeholder="Partner, nabo …" />
        <TextField label="Telefon" value={phone} onChange={setPhone} placeholder="900 00 000" keyboardType="phone-pad" textContentType="telephoneNumber" />
      </Section>
      {existing && <DestructiveButton
          label="Slett kontakt"
          onPress={() => confirmDelete('Slette kontakten?', existing.name, () => deleteContact(existing.id))}
        />}
    </FormSheet>
  );
}
