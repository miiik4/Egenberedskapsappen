import { Image } from 'expo-image';
import * as Notifications from 'expo-notifications';

import { deleteAllAnalysisFolders } from '@/analysis/photos';
import { deleteDataKey } from '@/backup/keychain';
import { deleteAllStoredFiles } from '@/documents/files';

/**
 * «Slett alle data»: the database, every stored file and analysis photo, the backup key, the
 * reminders already scheduled (they name things in the stockpile), and the image cache, which
 * may hold copies of pictures shown before. `reset` is the store's, from `useActions()`, so
 * the screens reload empty.
 */
export async function deleteEverything(reset: () => Promise<void>) {
  await reset();
  deleteAllStoredFiles();
  deleteAllAnalysisFolders();
  await deleteDataKey();
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Image.clearDiskCache();
  await Image.clearMemoryCache();
}
