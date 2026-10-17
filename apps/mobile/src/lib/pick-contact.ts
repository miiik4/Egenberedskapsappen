import * as Contacts from 'expo-contacts/legacy';
import { Alert, Linking, Platform } from 'react-native';

export type PickedContact = { name: string; phone: string };

/**
 * Opens the phone's own contact picker and gives back the name and number chosen, or
 * undefined if the user backed out. Nothing but that one contact is read, and it stays on
 * the phone.
 *
 * The legacy API is used on purpose. On iOS it hands over what the system picker returns,
 * so the app never asks for access to the contacts. The newer `Contact.presentPicker()`
 * returns only an id and reads the rest from the contact store, which needs the full
 * contacts permission. Android reads the picked contact through the content resolver either
 * way, so it needs READ_CONTACTS; the user is asked the first time.
 */
export async function pickContact(): Promise<PickedContact | undefined> {
  if (Platform.OS === 'android') {
    const { granted, canAskAgain } = await Contacts.requestPermissionsAsync();
    if (!granted) {
      explainDenied(canAskAgain);
      return undefined;
    }
  }
  const contact = await Contacts.presentContactPickerAsync();
  if (!contact) return undefined;

  const name = contact.name?.trim() || [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim();
  const numbers = [
    ...new Set((contact.phoneNumbers ?? []).map((p) => p.number?.trim()).filter((n): n is string => !!n)),
  ];
  return { name, phone: await chooseNumber(name, numbers) };
}

function explainDenied(canAskAgain: boolean) {
  Alert.alert(
    'Ingen tilgang til kontaktene',
    'Du kan skrive inn navn og nummer selv, eller gi appen tilgang i innstillingene. Appen leser bare den kontakten du velger.',
    canAskAgain
      ? [{ text: 'OK' }]
      : [{ text: 'Avbryt', style: 'cancel' }, { text: 'Åpne Innstillinger', onPress: () => Linking.openSettings() }],
  );
}

/** One number is used as it is; with several the user picks. An alert fits three buttons on Android. */
function chooseNumber(name: string, numbers: string[]): Promise<string> {
  if (numbers.length <= 1) return Promise.resolve(numbers[0] ?? '');
  const options = numbers.slice(0, Platform.OS === 'android' ? 3 : 6);
  return new Promise((resolve) =>
    Alert.alert(
      `Hvilket nummer skal ${name || 'kontakten'} ha?`,
      undefined,
      options.map((n) => ({ text: n, onPress: () => resolve(n) })),
      { cancelable: true, onDismiss: () => resolve(numbers[0]) },
    ),
  );
}
