import { fromBase64, fromUtf8, utf8 } from '@egenberedskap/sync';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBackup } from '@/backup/backup-provider';
import { expoCrypto } from '@/backup/crypto';
import { useActions } from '@/data/data-provider';
import { deleteEverything } from '@/data/delete-everything';
import { seedDemoData } from '@/lib/demo-data';
import { Text } from '@/components/ui/text';

/**
 * Development only, reached by deep link (`…/--/utvikling` in Expo Go, `<scheme>://utvikling`
 * in a development build). Does nothing in a release build.
 *
 * - no action: wipe the database and fill it with the household from the design, then go Home
 * - `?handling=krypto`: check that the phone's AES reads what Node's WebCrypto wrote
 * - `?handling=backup&kode=<activation code>`: turn backup on and show the recovery code
 * - `?handling=gjenopprett&kode=<recovery code>`: wipe the phone, then restore from the backup
 */
export default function Utvikling() {
  const { handling, kode } = useLocalSearchParams<{ handling?: string; kode?: string }>();
  const actions = useActions();
  const backup = useBackup();
  // Each link's result is kept with the link it answers, so a new link shows «Arbeider …» until it's done.
  const run = `${handling}|${kode}`;
  const [result, setResult] = useState<{ run: string; text: string } | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!__DEV__) return;
    const report = (lines: string[]) => setResult({ run, text: lines.join('\n') });
    (async () => {
      try {
        switch (handling) {
          case 'krypto':
            report(await cryptoCheck());
            break;
          case 'backup': {
            const recoveryCode = backup.newRecoveryCode();
            await backup.enable(kode ?? '', recoveryCode);
            report(['BACKUP PÅ', recoveryCode]);
            break;
          }
          case 'gjenopprett':
            await deleteEverything(actions.reset);
            await backup.restore(kode ?? '');
            report(['GJENOPPRETTET']);
            break;
          default:
            await deleteEverything(actions.reset);
            await seedDemoData(actions);
            setDone(true);
        }
      } catch (error) {
        report(['FEIL', String((error as Error)?.message ?? error), String((error as { code?: string })?.code ?? '')]);
      }
    })();
    // Once per link: a new link to this same screen only changes the parameters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handling, kode]);

  if (done) return <Redirect href="/" />;
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView>
        <Text style={styles.text} selectable>
          {!__DEV__ ? 'Bare i utvikling.' : result?.run === run ? result.text : 'Arbeider …'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Known answers from Node's WebCrypto: the phone must read them, and read its own writing back. */
async function cryptoCheck(): Promise<string[]> {
  const key = new Uint8Array(32).map((_, i) => i + 1);
  const aad = utf8('egenberedskapsappen/v1/interop-test');
  const fromNode = fromBase64('yMnKy8zNzs/Q0dLT2rjkusL05vmkAxllCokyTYtzG01zGRKYPRKCsOhGbzGJCg==');
  const opened = fromUtf8(await expoCrypto.open(key, fromNode, aad));
  const roundTrip = fromUtf8(await expoCrypto.open(key, await expoCrypto.seal(key, utf8('Rundtur'), aad), aad));
  const sha = [...(await expoCrypto.sha256(utf8('abc')))].map((b) => b.toString(16).padStart(2, '0')).join('');
  let tamperRejected = false;
  try {
    await expoCrypto.open(key, fromNode, utf8('feil-sted'));
  } catch {
    tamperRejected = true;
  }
  const ok =
    opened === 'Beredskap fra Node' &&
    roundTrip === 'Rundtur' &&
    sha === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' &&
    tamperRejected;
  return [ok ? 'KRYPTO OK' : 'KRYPTO FEIL', `node: ${opened}`, `rundtur: ${roundTrip}`, `sha: ${sha.slice(0, 16)}…`, `avvist: ${tamperRejected}`];
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  text: { padding: 24, fontSize: 22, fontFamily: 'Menlo', color: '#000000' },
});
