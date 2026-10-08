import { normalizeRecoveryCode } from '@egenberedskap/sync';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { useBackup } from '@/backup/backup-provider';
import { backupErrorMessage } from '@/backup/messages';
import { TextField } from '@/components/form/fields';
import { FormSheet } from '@/components/form/sheet';
import { PrimaryButton } from '@/components/ui/button';
import { Section } from '@/components/ui/list';
import { Colors, Spacing } from '@/constants/theme';
import { Text } from '@/components/ui/text';

/** On a new phone: the recovery code brings the whole household back, documents included. */
export default function Gjenopprett() {
  const { status, restore } = useBackup();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      await restore(code);
      // Restoring marks the phone as set up, which opens the app behind this sheet.
      router.back();
    } catch (e) {
      setError(backupErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (status === 'unavailable') {
    return (
      <FormSheet title="Gjenopprett">
        <Text style={styles.lead}>Gjenoppretting krever appen fra App Store eller Google Play.</Text>
      </FormSheet>
    );
  }

  return (
    <FormSheet title="Gjenopprett">
      <Text style={styles.lead}>
        Skriv inn gjenopprettingskoden du fikk da du slo på sikkerhetskopi. Alt hentes tilbake og dekrypteres på denne
        telefonen.
      </Text>
      <Section footer="24 tegn. Store eller små bokstaver, med eller uten bindestreker.">
        <TextField
          label="Kode"
          value={code}
          onChange={setCode}
          placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
          autoCapitalize="none"
          autoFocus
          secret
        />
      </Section>
      {error && <Text style={styles.error}>{error}</Text>}
      {busy ? (
        <>
          <ActivityIndicator />
          <Text style={styles.lead}>Henter og dekrypterer …</Text>
        </>
      ) : (
        <PrimaryButton label="Gjenopprett" disabled={!normalizeRecoveryCode(code)} onPress={start} />
      )}
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  lead: { marginHorizontal: Spacing.screen + 4, fontSize: 17, lineHeight: 23, color: Colors.secondaryLabel },
  error: { marginHorizontal: Spacing.screen + 4, fontSize: 15, color: Colors.destructive },
});
