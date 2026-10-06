import { router, Stack } from 'expo-router';
import { Alert, Linking, StyleSheet, Switch, Text } from 'react-native';

import { DestructiveButton } from '@/components/form/fields';
import { MembersSection } from '@/components/form/members';
import { Row, Section } from '@/components/ui/list';
import { Screen } from '@/components/ui/screen';
import { Colors, Spacing } from '@/constants/theme';
import { useActions, useData } from '@/data/data-provider';
import { useBackup } from '@/backup/backup-provider';
import { deleteDataKey } from '@/backup/keychain';
import { deleteAllStoredFiles } from '@/documents/files';
import { useDocumentLock } from '@/documents/lock';
import { useNotifications } from '@/notifications/notifications-provider';
import { householdLabel } from '@/lib/format';

/**
 * Who lives here, as counts per age group with steppers, and the settings for the household.
 * Opened from the button at the top of Oversikt. Changes save as they're made.
 */
export default function Husstand() {
  const { household, documentLock, properties, selectedPropertyId } = useData();
  const { updateHousehold, reset, setDocumentLock } = useActions();
  const property = properties.find((p) => p.id === selectedPropertyId);
  const { method, unlock } = useDocumentLock();
  const { status: backupStatus } = useBackup();

  // Turning the lock off needs the same Face ID or code as opening a document, or anyone
  // holding the unlocked phone could just switch it off here.
  const toggleLock = async (on: boolean) => {
    if (on || (await unlock())) await setDocumentLock(on);
  };
  const { permission, requestPermission } = useNotifications();

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
          await deleteDataKey();
        },
      },
    ]);

  return (
    <>
      <Stack.Screen options={{ title: 'Husstand' }} />
      <Screen>
        <Text style={styles.subtitle}>
          {property ? `${property.name} · ` : ''}
          {householdLabel(household)}
        </Text>
        <MembersSection
          header="Hvem bor her"
          footer="Vi lagrer bare antall per aldersgruppe, ikke navn eller fødselsdato. Det brukes til å regne ut hvor mye dere trenger."
          value={household}
          onChange={updateHousehold}
        />
        <Section footer="Kryptert, så bare du kan åpne den. Inkludert hos utvalgte forsikringsselskaper.">
          <Row
            title="Sikkerhetskopi"
            detail={backupStatus === 'off' ? 'Av' : backupStatus === 'unavailable' ? undefined : 'På'}
            chevron
            onPress={() => router.push('/sikkerhetskopi')}
          />
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
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginHorizontal: Spacing.screen + 4, marginTop: -16, fontSize: 17, color: Colors.secondaryLabel },
});
