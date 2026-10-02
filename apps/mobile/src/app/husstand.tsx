import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking } from 'react-native';

import { CountField, DestructiveButton, TextField } from '@/components/form/fields';
import { FormSheet } from '@/components/form/sheet';
import { Row, Section } from '@/components/ui/list';
import { useActions, useData } from '@/data/data-provider';
import { useNotifications } from '@/notifications/notifications-provider';

/** Opened from the avatar on Home and from «Endre husstand». */
export default function Husstand() {
  const { profile } = useData();
  const { updateProfile, reset } = useActions();
  const { permission, requestPermission } = useNotifications();
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
      <Section footer="Før noe i lageret går ut, og når det er tid for kvartalssjekk.">
        <Row
          title="Påminnelser"
          detail={permission === 'granted' ? 'På' : permission === 'denied' ? 'Av' : 'Slå på'}
          chevron={permission !== 'granted'}
          // Once declined, iOS won't ask again; only Settings can turn them back on.
          onPress={
            permission === 'undetermined'
              ? requestPermission
              : permission === 'denied'
                ? () => Linking.openSettings()
                : undefined
          }
        />
      </Section>
      {__DEV__ && <DestructiveButton label="Slett alle data (utvikling)" onPress={wipe} />}
    </FormSheet>
  );
}
