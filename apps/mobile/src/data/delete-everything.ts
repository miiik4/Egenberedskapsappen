import { deleteAllAnalysisFolders } from '@/analysis/photos';
import { deleteDataKey } from '@/backup/keychain';
import { deleteAllStoredFiles } from '@/documents/files';

/**
 * «Slett alle data»: the database, every stored file and analysis photo, and the backup key.
 * `reset` is the store's, from `useActions()`, so the screens reload empty.
 */
export async function deleteEverything(reset: () => Promise<void>) {
  await reset();
  deleteAllStoredFiles();
  deleteAllAnalysisFolders();
  await deleteDataKey();
}
