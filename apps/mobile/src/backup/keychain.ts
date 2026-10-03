import { fromBase64, toBase64 } from '@egenberedskap/sync';
import * as SecureStore from 'expo-secure-store';

const DATA_KEY = 'backupDataKey';

/**
 * The household's data key, in the Keychain (Keystore on Android): readable only while the
 * phone is unlocked and never copied to backups or other devices. A new phone gets it from
 * the recovery code instead.
 */
const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export async function loadDataKey(): Promise<Uint8Array | null> {
  const stored = await SecureStore.getItemAsync(DATA_KEY, options);
  return stored ? fromBase64(stored) : null;
}

export const saveDataKey = (key: Uint8Array) => SecureStore.setItemAsync(DATA_KEY, toBase64(key), options);

export const deleteDataKey = () => SecureStore.deleteItemAsync(DATA_KEY, options);
