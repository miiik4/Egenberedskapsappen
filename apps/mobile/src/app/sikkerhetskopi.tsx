import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Share, StyleSheet, Switch, Text, View } from 'react-native';

import { useBackup } from '@/backup/backup-provider';
import { backupErrorMessage, cleanActivationCode } from '@/backup/messages';
import { DestructiveButton, TextField } from '@/components/form/fields';
import { FormSheet } from '@/components/form/sheet';
import { PrimaryButton } from '@/components/ui/button';
import { Row, Section } from '@/components/ui/list';
import { Colors, Spacing } from '@/constants/theme';
import { useData } from '@/data/data-provider';
import { formatDateWithYear, formatTime } from '@/lib/format';

/** Long enough to be a real code; the server decides whether it is one. */
const MIN_ACTIVATION_LENGTH = 8;

export default function Sikkerhetskopi() {
  const { backup } = useData();
  const { status } = useBackup();

  return (
    <FormSheet title="Sikkerhetskopi">
      {status === 'unavailable' ? (
        <Section>
          <Text style={styles.note}>Sikkerhetskopi krever appen fra App Store eller Google Play.</Text>
        </Section>
      ) : backup ? (
        <Status />
      ) : (
        <TurnOn />
      )}
    </FormSheet>
  );
}

/** Activation code from the insurer, then the recovery code, then on. */
function TurnOn() {
  const { newRecoveryCode, enable } = useBackup();
  const [step, setStep] = useState<'activation' | 'recovery'>('activation');
  const [activationCode, setActivationCode] = useState('');
  const [recoveryCode] = useState(newRecoveryCode);
  const [kept, setKept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const turnOn = async () => {
    setBusy(true);
    setError(null);
    try {
      await enable(cleanActivationCode(activationCode), recoveryCode);
    } catch (e) {
      setError(backupErrorMessage(e));
      // A problem with the insurer's code is fixed on the first step.
      if (String((e as Error)?.message).includes('activation-code')) setStep('activation');
    } finally {
      setBusy(false);
    }
  };

  if (step === 'activation') {
    return (
      <>
        <Text style={styles.lead}>
          Alt i appen, også dokumentene, krypteres på telefonen før det lagres. Bare du kan åpne sikkerhetskopien: ikke
          vi, og ikke forsikringsselskapet.
        </Text>
        <Section
          header="Aktiveringskode"
          footer="Sikkerhetskopi er inkludert hos utvalgte forsikringsselskaper. Koden får du fra forsikringsselskapet ditt.">
          <TextField
            label="Kode"
            value={activationCode}
            onChange={setActivationCode}
            placeholder="XXXX-XXXX-XXXX"
            autoCapitalize="none"
            autoFocus
          />
        </Section>
        {error && <Text style={styles.error}>{error}</Text>}
        <PrimaryButton
          label="Fortsett"
          disabled={cleanActivationCode(activationCode).length < MIN_ACTIVATION_LENGTH}
          onPress={() => {
            setError(null);
            setStep('recovery');
          }}
        />
      </>
    );
  }

  return (
    <>
      <Text style={styles.lead}>
        Dette er gjenopprettingskoden din. Du trenger den for å hente tilbake alt på en ny telefon.
      </Text>
      <View style={styles.codeBox} accessible accessibilityLabel={`Gjenopprettingskode: ${recoveryCode.split('').join(' ')}`}>
        {recoveryCode.split('-').map((group, i) => (
          <Text key={i} style={styles.codeGroup}>
            {group}
          </Text>
        ))}
      </View>
      <Section footer="Ingen kan åpne sikkerhetskopien uten koden, heller ikke vi. Mister du både telefonen og koden, er dataene borte.">
        <Row
          title="Lagre eller skriv ut koden"
          titleColor={Colors.accent}
          onPress={() =>
            Share.share({ message: `Gjenopprettingskode for Egenberedskapsappen: ${recoveryCode}` })
          }
        />
        <Row
          title="Jeg har tatt vare på koden"
          trailing={<Switch value={kept} onValueChange={setKept} accessibilityLabel="Jeg har tatt vare på koden" />}
        />
      </Section>
      {error && <Text style={styles.error}>{error}</Text>}
      {busy ? <ActivityIndicator /> : <PrimaryButton label="Slå på sikkerhetskopi" disabled={!kept} onPress={turnOn} />}
    </>
  );
}

function Status() {
  const { backup } = useData();
  const { status, syncNow, extend, disconnect } = useBackup();
  const [activationCode, setActivationCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Read the clock once per opening, not on every render.
  const [now] = useState(Date.now);
  if (!backup) return null;

  const until = backup.entitledUntil.slice(0, 10);
  const daysLeft = Math.floor((new Date(backup.entitledUntil).getTime() - now) / 86_400_000);
  const statusText = {
    syncing: 'Sikkerhetskopierer …',
    synced: backup.lastSyncedAt ? `Oppdatert ${formatTime(new Date(backup.lastSyncedAt))}` : 'På',
    readOnly: 'Utløpt – kan gjenopprettes, men ikke oppdateres',
    offline: 'Venter på nett',
    error: 'Noe gikk galt – prøver igjen senere',
    off: 'Av',
    unavailable: 'Ikke tilgjengelig',
  }[status];

  const renew = async () => {
    setBusy(true);
    setError(null);
    try {
      await extend(cleanActivationCode(activationCode));
      setActivationCode('');
      syncNow();
    } catch (e) {
      setError(backupErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const confirmDisconnect = () =>
    Alert.alert(
      'Koble fra denne telefonen?',
      'Sikkerhetskopien blir liggende, og du kan koble til igjen med gjenopprettingskoden.',
      [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Koble fra', style: 'destructive', onPress: () => disconnect().then(() => router.back()) },
      ],
    );

  return (
    <>
      <Section footer="Alt krypteres på telefonen før det lagres. Bare gjenopprettingskoden kan åpne det.">
        <Row title="Status" detail={statusText} />
        <Row title="Inkludert til" detail={formatDateWithYear(until)} />
        <Row
          title="Sikkerhetskopier nå"
          titleColor={status === 'syncing' ? Colors.secondaryLabel : Colors.accent}
          onPress={status === 'syncing' ? undefined : syncNow}
        />
      </Section>

      {(status === 'readOnly' || daysLeft < 30) && (
        <>
          <Section header="Forny" footer="Fikk du en ny aktiveringskode fra forsikringsselskapet? Den forlenger fra dagens dato eller fra utløpet, det som er senest.">
            <TextField label="Kode" value={activationCode} onChange={setActivationCode} placeholder="XXXX-XXXX-XXXX" autoCapitalize="none" />
          </Section>
          {error && <Text style={styles.error}>{error}</Text>}
          {busy ? (
            <ActivityIndicator />
          ) : (
            <PrimaryButton
              label="Forny"
              disabled={cleanActivationCode(activationCode).length < MIN_ACTIVATION_LENGTH}
              onPress={renew}
            />
          )}
        </>
      )}

      <DestructiveButton label="Koble fra denne telefonen" onPress={confirmDisconnect} />
    </>
  );
}

const styles = StyleSheet.create({
  lead: { marginHorizontal: Spacing.screen + 4, fontSize: 17, lineHeight: 23, color: Colors.secondaryLabel },
  note: { padding: Spacing.rowInset, fontSize: 17, color: Colors.secondaryLabel },
  error: { marginHorizontal: Spacing.screen + 4, fontSize: 15, color: Colors.destructive },
  codeBox: {
    marginHorizontal: Spacing.screen,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: Colors.card,
  },
  codeGroup: { fontSize: 24, fontWeight: '600', fontFamily: 'Menlo', letterSpacing: 2, color: Colors.label },
});
