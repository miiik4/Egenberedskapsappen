import Constants from 'expo-constants';
import { router, Stack } from 'expo-router';
import { Alert, Linking, Platform, StyleSheet, Switch } from 'react-native';

import { CHECK_INTERVALS_MONTHS, type CheckIntervalMonths } from '@egenberedskap/core';

import { DestructiveButton } from '@/components/form/fields';
import { MenuField } from '@/components/form/menu-field';
import { MembersSection } from '@/components/form/members';
import { Row, Section } from '@/components/ui/list';
import { Screen } from '@/components/ui/screen';
import { CONTACT_EMAIL, EGENBEREDSKAP_PLUS_ENABLED } from '@/constants/config';
import { Colors, Spacing } from '@/constants/theme';
import { useActions, useData } from '@/data/data-provider';
import { deleteEverything } from '@/data/delete-everything';
import { useBackup } from '@/backup/backup-provider';
import { useDocumentLock } from '@/documents/lock';
import { useNotifications } from '@/notifications/notifications-provider';
import { CHECK_INTERVAL_NAMES, householdLabel } from '@/lib/format';
import { Text } from '@/components/ui/text';

/**
 * «Innstillinger»: who lives here first, as counts per age group with steppers, then the
 * settings. Opened from the gear at the top of Oversikt. Changes save as they're made.
 */
export default function Husstand() {
  const { household, documentLock, properties, selectedPropertyId, checkIntervalMonths, backup } = useData();
  const { updateHousehold, reset, setDocumentLock, setCheckInterval } = useActions();
  const property = properties.find((p) => p.id === selectedPropertyId);
  const { method, unlock } = useDocumentLock();
  const { status: backupStatus } = useBackup();

  // Turning the lock off needs the same Face ID or code as opening a document, or anyone
  // holding the unlocked phone could just switch it off here.
  const toggleLock = async (on: boolean) => {
    if (on || (await unlock())) await setDocumentLock(on);
  };
  const { permission, requestPermission } = useNotifications();

  // Everything on this phone, and the key to the backup with it. The backup itself stays:
  // only Sikkerhetskopi deletes that, and the recovery code still opens it.
  const wipe = () =>
    Alert.alert(
      'Slette alle data?',
      [
        'Alt på denne telefonen slettes: lageret, kontaktene, dokumentene og eiendelene. Appen starter på nytt som første gang.',
        EGENBEREDSKAP_PLUS_ENABLED &&
          backup &&
          'Sikkerhetskopien slettes ikke. Vil du slette den også, gjør du det under Sikkerhetskopi først.',
        'Dette kan ikke angres.',
      ]
        .filter(Boolean)
        .join('\n\n'),
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett alt',
          style: 'destructive',
          onPress: async () => {
            // It deletes the documents too, so it needs what opening them needs.
            if (documentLock && method !== null && !(await unlock())) return;
            router.back();
            // Clearing the data ends onboarding, so the guard in the root layout opens velkommen.
            await deleteEverything(reset);
          },
        },
      ],
    );

  return (
    <>
      <Stack.Screen options={{ title: 'Innstillinger' }} />
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
        {EGENBEREDSKAP_PLUS_ENABLED && (
          <Section footer="Kryptert, så bare du kan åpne den. Inkludert hos utvalgte forsikringsselskaper.">
            <Row
              title="Sikkerhetskopi"
              detail={backupStatus === 'off' ? 'Av' : backupStatus === 'unavailable' ? undefined : 'På'}
              chevron
              onPress={() => router.push('/sikkerhetskopi')}
            />
          </Section>
        )}
        <Section footer="Før noe i lageret går ut, og når det er tid for beredskapssjekk.">
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
          <MenuField
            label="Beredskapssjekk"
            value={String(checkIntervalMonths)}
            options={CHECK_INTERVALS_MONTHS.map((months) => ({ value: String(months), label: CHECK_INTERVAL_NAMES[months] }))}
            onChange={(value) => setCheckInterval(Number(value) as CheckIntervalMonths)}
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
        <Section footer="Savner du noe, eller er noe feil? Skriv til oss på e-post.">
          <Row title="Gi tilbakemelding" chevron onPress={giveFeedback} />
        </Section>
        <DestructiveButton label="Slett alle data" onPress={wipe} />
      </Screen>
    </>
  );
}

/** An email to us, with the app version filled in so we know which one it's about. */
async function giveFeedback() {
  const system = Platform.OS === 'ios' ? `iOS ${Platform.Version}` : `Android (API ${Platform.Version})`;
  const subject = 'Tilbakemelding på Egenberedskapsappen';
  const body = `\n\n\nAppversjon ${Constants.expoConfig?.version ?? 'ukjent'} · ${system}`;
  try {
    await Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  } catch {
    // No mail app on the phone: give the address so it can be used some other way.
    Alert.alert('Fant ingen e-postapp', `Send tilbakemeldingen til ${CONTACT_EMAIL}.`);
  }
}


const styles = StyleSheet.create({
  subtitle: { marginHorizontal: Spacing.screen + 4, marginTop: Spacing.underTitle, fontSize: 17, color: Colors.secondaryLabel },
});
