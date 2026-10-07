import { Alert } from 'react-native';

const SENT = {
  photos: { title: 'Bildene sendes til analyse', what: 'bildene' },
  video: { title: 'Bilder fra filmen sendes til analyse', what: 'stillbilder fra filmen, uten lyd,' },
};

/**
 * Runs `analyse`, the first time only after the user has been told what leaves the phone and
 * said yes. `consented` and `giveConsent` are the stored answer, from `useData()` and `useActions()`.
 */
export function analyseWithConsent(
  { consented, giveConsent, source }: { consented: boolean; giveConsent: () => Promise<void>; source: keyof typeof SENT },
  analyse: () => Promise<void>,
) {
  if (consented) return void analyse();
  const { title, what } = SENT[source];
  Alert.alert(
    title,
    `For å finne gjenstandene sendes ${what} til en KI-tjeneste i EU. De slettes så snart analysen er gjort. ` +
      'Svaret er kryptert, så bare denne telefonen kan lese det.',
    [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Fortsett',
        onPress: async () => {
          await giveConsent();
          await analyse();
        },
      },
    ],
  );
}
