import { router } from 'expo-router';
import { useState } from 'react';

import { DestructiveButton, TextField } from '@/components/form/fields';
import { FormSheet } from '@/components/form/sheet';
import { Section } from '@/components/ui/list';
import { useActions, useData } from '@/data/data-provider';

/** Where the household meets if they're split up and can't reach each other. */
export default function Motested() {
  const { meetingPlace } = useData();
  const { setMeetingPlace } = useActions();
  const [name, setName] = useState(meetingPlace?.name ?? '');
  const [address, setAddress] = useState(meetingPlace?.address ?? '');

  const save = async () => {
    await setMeetingPlace({ name, address });
    router.back();
  };

  const remove = async () => {
    await setMeetingPlace(null);
    router.back();
  };

  return (
    <FormSheet title="Møtested" canSave={name.trim() !== ''} onSave={save}>
      <Section footer="Avtal et sted husstanden møtes hvis dere blir skilt og ikke får tak i hverandre.">
        <TextField label="Sted" value={name} onChange={setName} placeholder="Skolegården" autoFocus={!meetingPlace} />
        <TextField label="Adresse" value={address} onChange={setAddress} placeholder="Storgata 40" textContentType="fullStreetAddress" />
      </Section>
      {meetingPlace && <DestructiveButton label="Fjern møtested" onPress={remove} />}
    </FormSheet>
  );
}
