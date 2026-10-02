import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Switch } from 'react-native';

import { CountField, DestructiveButton, TextField } from '@/components/form/fields';
import { FormSheet } from '@/components/form/sheet';
import { Row, Section } from '@/components/ui/list';
import { useActions, useData } from '@/data/data-provider';
import { deleteAllStoredFiles } from '@/documents/files';
import { useDocumentLock } from '@/documents/lock';
import { useNotifications } from '@/notifications/notifications-provider';

/** Opened from the avatar on Home and from «Endre husstand». */
export default function Husstand() {
  const { profile, documentLock } = useData();
  const { updateProfile, reset, setDocumentLock } = useActions();
  const { method, unlock } = useDocumentLock();

  // Turning the lock off needs the same Face ID or code as opening a document, or anyone
  // holding the unlocked phone could just switch it off here.
  const toggleLock = async (on: boolean) => {
    if (on || (await unlock())) await setDocumentLock(on);
  };
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
          deleteAllStoredFiles();
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
      <Section
        footer={
          method
            ? `Dokumentene krever ${method} for å åpnes, og låses igjen når du forlater appen.`
            : 'Telefonen har ingen kode, så dokumentene kan ikke låses. Sett en kode i telefonens innstillinger.'
        }>
        <Row
          title="Lås dokumenter"
          trailing={
            <Switch
              value={documentLock && method !== null}
              disabled={method === null}
              onValueChange={toggleLock}
              accessibilityLabel="Lås dokumenter"
            />
          }
        />
      </Section>
      {__DEV__ && <DestructiveButton label="Slett alle data (utvikling)" onPress={wipe} />}
    </FormSheet>
  );
}
