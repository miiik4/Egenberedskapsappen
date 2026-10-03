import type { RemoteRecord, RemoteVault } from '@egenberedskap/sync';
import { getApp } from '@react-native-firebase/app';
import { getAuth, signInAnonymously } from '@react-native-firebase/auth';
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from '@react-native-firebase/firestore';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { deleteObject, getStorage, putFile, ref, writeToFile } from '@react-native-firebase/storage';
import { File, Paths } from 'expo-file-system';

/** Next to the database, in Finland. */
const REGION = 'europe-north1';
/** Firestore allows 500 writes per batch; leave room. */
const BATCH = 400;

/**
 * Whether this build has Firebase in it. Expo Go doesn't, so there backup is simply not
 * offered and the rest of the app works as before.
 */
export function firebaseAvailable(): boolean {
  try {
    getApp();
    return true;
  } catch {
    return false;
  }
}

/**
 * Backups have no accounts. Firebase still needs to know which phone is asking, so each
 * install gets an anonymous user; vaults decide which of those may read and write them.
 */
export async function ensureSignedIn() {
  const auth = getAuth();
  if (!auth.currentUser) await signInAnonymously(auth);
}

type VaultResult = { entitledUntil: string };

export async function callFunction<T>(name: 'createVault' | 'joinVault' | 'extendVault', data: object): Promise<T> {
  await ensureSignedIn();
  const result = await httpsCallable<object, T>(getFunctions(getApp(), REGION), name)(data);
  return result.data;
}

export const createVault = (data: { activationCode: string; vaultId: string; proof: string; wrappedKey: string }) =>
  callFunction<VaultResult>('createVault', data);
export const joinVault = (data: { vaultId: string; proof: string }) =>
  callFunction<VaultResult & { wrappedKey: string }>('joinVault', data);
export const extendVault = (data: { vaultId: string; activationCode: string }) =>
  callFunction<VaultResult>('extendVault', data);

/**
 * Server time as a sortable string that keeps Firestore's full precision, so resuming a
 * download from it never skips or repeats a record.
 */
const toCursor = (t: Timestamp) => `${String(t.seconds).padStart(12, '0')}.${String(t.nanoseconds).padStart(9, '0')}`;
const fromCursor = (cursor: string) => {
  const [seconds, nanos] = cursor.split('.').map(Number);
  return new Timestamp(seconds!, nanos!);
};

/** One temporary file per transfer, removed again whatever happens. */
async function viaTempFile<T>(work: (file: File) => Promise<T>): Promise<T> {
  const file = new File(Paths.cache, `transfer-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  try {
    return await work(file);
  } finally {
    if (file.exists) file.delete();
  }
}

export function firebaseVault(vaultId: string): RemoteVault {
  const db = getFirestore();
  const records = collection(db, 'vaults', vaultId, 'records');
  const fileRef = (name: string) => ref(getStorage(), `vaults/${vaultId}/files/${name}`);

  return {
    async push(list: RemoteRecord[]) {
      for (let i = 0; i < list.length; i += BATCH) {
        const batch = writeBatch(db);
        for (const r of list.slice(i, i + BATCH)) {
          batch.set(doc(records, `${r.type}_${r.id}`), {
            type: r.type,
            id: r.id,
            data: r.data,
            deleted: r.deleted,
            updatedAt: r.updatedAt,
            serverUpdatedAt: serverTimestamp(),
          });
        }
        await batch.commit();
      }
    },

    async pull(since: string | null) {
      const q = since
        ? query(records, where('serverUpdatedAt', '>', fromCursor(since)), orderBy('serverUpdatedAt'))
        : query(records, orderBy('serverUpdatedAt'));
      const snapshot = await getDocs(q);
      let cursor = since;
      const list: RemoteRecord[] = snapshot.docs.map((d) => {
        const r = d.data();
        cursor = toCursor(r.serverUpdatedAt as Timestamp);
        return { type: r.type, id: r.id, data: r.data, deleted: r.deleted, updatedAt: r.updatedAt };
      });
      return { records: list, cursor };
    },

    uploadFile: (name: string, sealed: Uint8Array) =>
      viaTempFile(async (file) => {
        file.write(sealed);
        await putFile(fileRef(name), file.uri, { contentType: 'application/octet-stream' });
      }),

    downloadFile: (name: string) =>
      viaTempFile(async (file) => {
        try {
          await writeToFile(fileRef(name), file.uri);
        } catch (error) {
          // Not uploaded yet by the phone that added it; the next round will find it.
          if (String((error as { code?: string }).code).includes('object-not-found')) return null;
          throw error;
        }
        return file.bytes();
      }),

    deleteFile: async (name: string) => {
      try {
        await deleteObject(fileRef(name));
      } catch (error) {
        if (!String((error as { code?: string }).code).includes('object-not-found')) throw error;
      }
    },
  };
}
