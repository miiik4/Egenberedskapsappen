import { requireOptionalNativeModule } from 'expo';

const native = requireOptionalNativeModule<{ exclude(uri: string): void }>('BackupExclusion');

/**
 * Keeps a folder out of the phone's iCloud backup (iOS). Android is handled at build time by
 * this module's config plugin. Returns false where the native module isn't there, as in Expo Go.
 */
export function excludeFromBackup(uri: string): boolean {
  if (!native) return false;
  native.exclude(uri);
  return true;
}
