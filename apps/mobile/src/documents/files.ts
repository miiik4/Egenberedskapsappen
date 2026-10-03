import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

import { excludeFromBackup } from '../../modules/backup-exclusion';

/**
 * Documents live in the app's own documents folder, which survives restarts and updates
 * and is included in the phone's backup. Only file names are stored in the database: on
 * iOS the folder's full path changes between installs, so it's resolved here every time.
 */
const folder = () => new Directory(Paths.document, 'dokumenter');

export const storedFile = (fileName: string) => new File(folder(), fileName);

/**
 * Creates the folder if needed, always kept out of iCloud backups: passports and
 * prescriptions don't belong where Apple holds the keys unless the user has Advanced Data
 * Protection. Android is handled by build-time rules. Used for imports and for files that
 * arrive from the encrypted backup alike.
 */
export function ensureFolder() {
  const dir = folder();
  dir.create({ intermediates: true, idempotent: true });
  excludeFromBackup(dir.uri);
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'application/pdf': 'pdf',
};

export const isPdf = (mimeType: string) => mimeType === 'application/pdf';

/** Copies a picked or photographed file into the app, under a fresh name. */
export async function importFile(sourceUri: string, mimeType: string) {
  ensureFolder();
  const dir = folder();
  const extension = EXTENSIONS[mimeType] ?? /\.(\w{2,5})$/.exec(sourceUri)?.[1]?.toLowerCase() ?? 'bin';
  const destination = new File(dir, `${randomUUID()}.${extension}`);
  await new File(sourceUri).copy(destination);
  return { fileName: `${destination.uri.split('/').pop()}`, size: destination.size ?? 0 };
}

/** Deletes every stored document file, for «Slett alle data». */
export function deleteAllStoredFiles() {
  const dir = folder();
  if (dir.exists) dir.delete();
}

/** Deletes files from the phone. A file that is already gone is not an error. */
export function deleteStoredFiles(fileNames: string[]) {
  for (const name of fileNames) {
    const file = storedFile(name);
    if (file.exists) file.delete();
  }
}
