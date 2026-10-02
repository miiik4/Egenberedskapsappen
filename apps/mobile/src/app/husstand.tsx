import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { CountField, DestructiveButton, TextField } from '@/components/form/fields';
import { FormSheet } from '@/components/form/sheet';
import { Section } from '@/components/ui/list';
import { useActions, useData } from '@/data/data-provider';

/** Opened from the avatar on Home and from «Endre husstand». */
export default function Husstand() {
  const { profile } = useData();
  const { updateProfile, reset } = useActions();
  const [name, setName] = useState(profile.name);
  const [people, setPeople] = useState(profile.people);

  const save = async () => {
    await updateProfile({ name, people });
    router.back();
  };

  const wipe = () =>
    Alert.alert('Slette alle data?', 'Appen går tilbake til første oppstart. Dette kan ikke angres.', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Slett alt',
        style: 'destructive',
        onPress: async () => {
          router.back();
          await reset();
        },
      },
    ]);

  return (
    <FormSheet title="Husstand" canSave={name.trim() !== ''} onSave={save}>
      <Section footer="Mengden vann og mat regnes ut fra antall personer.">
        <TextField label="Fornavn" value={name} onChange={setName} autoCapitalize="words" textContentType="name" />
        <CountField label="Personer" value={people} onChange={setPeople} />
      </Section>
      {__DEV__ && <DestructiveButton label="Slett alle data (utvikling)" onPress={wipe} />}
    </FormSheet>
  );
}
