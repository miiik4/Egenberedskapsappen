import {
  createDataKey,
  generateRecoveryCode,
  normalizeRecoveryCode,
  syncOnce,
  unwrapDataKey,
  vaultIdentity,
  wrapDataKey,
  type LocalFiles,
} from '@egenberedskap/sync';
import { SYNC_ORDER } from '@egenberedskap/store';
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useActions, useData, useSyncSource } from '@/data/data-provider';
import { ensureFolder, storedFile } from '@/documents/files';

import { expoCrypto } from './crypto';
import { loadFirebase, requireFirebase } from './load-firebase';
import { deleteDataKey, loadDataKey, saveDataKey } from './keychain';

export type BackupStatus =
  /** This build has no Firebase (Expo Go). */
  | 'unavailable'
  | 'off'
  | 'syncing'
  | 'synced'
  /** The insurer's entitlement has run out: the backup can be read, not written. */
  | 'readOnly'
  | 'offline'
  | 'error';

type BackupContextValue = {
  status: BackupStatus;
  /** A fresh code to show the user before backup is turned on. */
  newRecoveryCode: () => string;
  /** Turns backup on, once the user has kept the recovery code. */
  enable: (activationCode: string, recoveryCode: string) => Promise<void>;
  /** On a new phone: brings everything back with the recovery code. */
  restore: (recoveryCode: string) => Promise<void>;
  /** A new activation code from the insurer. */
  extend: (activationCode: string) => Promise<void>;
  syncNow: () => Promise<void>;
  /** Unlinks this phone. The backup itself stays, reachable with the recovery code. */
  disconnect: () => Promise<void>;
  /** Deletes the backup for good, for every phone. What's on this phone stays. */
  deleteBackup: () => Promise<void>;
};

const BackupContext = createContext<BackupContextValue | null>(null);

/** Wait this long after a change before syncing, so a burst of edits goes up as one. */
const DEBOUNCE_MS = 4000;

const localFiles: LocalFiles = {
  exists: (name) => storedFile(name).exists,
  read: (name) => storedFile(name).bytes(),
  write: async (name, bytes) => {
    ensureFolder();
    storedFile(name).write(bytes);
  },
  delete: (name) => {
    const file = storedFile(name);
    if (file.exists) file.delete();
  },
};

/** Firebase error codes arrive as «firestore/permission-denied», «functions/not-found» and so on. */
const errorCode = (error: unknown) => String((error as { code?: string })?.code ?? '');
const isOffline = (error: unknown) => /unavailable|network|retry-limit|deadline/.test(errorCode(error));

export function BackupProvider({ children }: { children: ReactNode }) {
  const data = useData();
  const actions = useActions();
  const { source, reload } = useSyncSource();
  const available = useMemo(() => loadFirebase() !== null, []);
  const [status, setStatus] = useState<BackupStatus>(available ? 'off' : 'unavailable');

  const vaultId = data.backup?.vaultId ?? null;
  const entitled = data.backup ? new Date(data.backup.entitledUntil) > new Date() : false;

  // One sync at a time; a request during a run starts one more run afterwards.
  const running = useRef(false);
  const again = useRef(false);

  /** This phone stops using the backup: the key goes, and the data on the phone stays. */
  const forget = useCallback(async () => {
    await deleteDataKey();
    await actions.setBackup(null);
  }, [actions]);

  const syncNow = useCallback(async () => {
    if (!available || !vaultId) return;
    if (running.current) {
      again.current = true;
      return;
    }
    running.current = true;
    setStatus('syncing');
    try {
      do {
        again.current = false;
        const { ensureSignedIn, firebaseVault } = requireFirebase();
        await ensureSignedIn();
        const dataKey = await loadDataKey();
        if (!dataKey) throw new Error('No data key on this phone');
        await syncOnce({
          crypto: expoCrypto,
          dataKey,
          source,
          remote: firebaseVault(vaultId),
          files: localFiles,
          order: SYNC_ORDER,
        });
        await actions.setLastSynced(new Date().toISOString());
      } while (again.current);
      setStatus(entitled ? 'synced' : 'readOnly');
    } catch (error) {
      if (errorCode(error).includes('permission-denied')) {
        // Refused: either the entitlement ran out, or another phone deleted the backup.
        if (await requireFirebase().vaultExists(vaultId).catch(() => true)) setStatus('readOnly');
        else await forget();
      }
      else if (isOffline(error)) setStatus('offline');
      else {
        console.error('Backup failed', error);
        setStatus('error');
      }
    } finally {
      running.current = false;
    }
  }, [available, vaultId, entitled, source, actions, forget]);

  // Sync when the app starts and whenever it comes back, to pick up other phones' changes.
  useEffect(() => {
    if (!vaultId) return;
    // Next tick, so the first sync doesn't start in the middle of this render's effects.
    const first = setTimeout(syncNow, 0);
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && syncNow());
    return () => {
      clearTimeout(first);
      subscription.remove();
    };
  }, [vaultId, syncNow]);

  // After local changes, sync once things settle. Only if there's something to send: sync
  // itself updates the data too, and must not set off another round.
  useEffect(() => {
    if (!vaultId || !entitled) return;
    const timer = setTimeout(async () => {
      if ((await source.pending()).length > 0) syncNow();
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [data, vaultId, entitled, source, syncNow]);

  const value = useMemo<BackupContextValue>(
    () => ({
      status: available && !vaultId ? 'off' : status,
      newRecoveryCode: () => generateRecoveryCode(expoCrypto),

      async enable(activationCode, recoveryCode) {
        const code = normalizeRecoveryCode(recoveryCode);
        if (!code) throw new Error('Invalid recovery code');
        const dataKey = createDataKey(expoCrypto);
        const { vaultId: id, proof } = await vaultIdentity(expoCrypto, code);
        const wrappedKey = await wrapDataKey(expoCrypto, dataKey, code);
        const { entitledUntil } = await requireFirebase().createVault({ activationCode, vaultId: id, proof, wrappedKey });
        await saveDataKey(dataKey);
        await actions.setBackup({ vaultId: id, entitledUntil });
      },

      async restore(recoveryCode) {
        const code = normalizeRecoveryCode(recoveryCode);
        if (!code) throw new Error('Invalid recovery code');
        const { vaultId: id, proof } = await vaultIdentity(expoCrypto, code);
        const { wrappedKey, entitledUntil } = await requireFirebase().joinVault({ vaultId: id, proof });
        const dataKey = await unwrapDataKey(expoCrypto, wrappedKey, code);
        await saveDataKey(dataKey);
        // Bring everything down before showing the app, so it opens complete.
        await syncOnce({ crypto: expoCrypto, dataKey, source, remote: requireFirebase().firebaseVault(id), files: localFiles, order: SYNC_ORDER });
        await actions.setBackup({ vaultId: id, entitledUntil });
        await actions.setLastSynced(new Date().toISOString());
        await actions.markOnboarded();
        await reload();
      },

      async extend(activationCode) {
        if (!vaultId) throw new Error('Backup is not on');
        const { entitledUntil } = await requireFirebase().extendVault({ vaultId, activationCode });
        await actions.setBackup({ vaultId, entitledUntil });
      },

      syncNow,

      disconnect: forget,

      async deleteBackup() {
        if (!vaultId) return;
        await requireFirebase().deleteVault(vaultId);
        await forget();
      },
    }),
    [available, vaultId, status, syncNow, source, actions, reload, forget],
  );

  return <BackupContext value={value}>{children}</BackupContext>;
}

export function useBackup(): BackupContextValue {
  const value = use(BackupContext);
  if (!value) throw new Error('useBackup must be used inside <BackupProvider>');
  return value;
}
