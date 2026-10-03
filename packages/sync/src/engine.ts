import type { CryptoPrimitives } from './primitives';
import { decryptFile, decryptRecord, encryptFile, encryptRecord } from './vault';

type Value = string | number | null;

/** A row as the store hands it over. Mirrors `Change` in @egenberedskap/store. */
export type LocalChange = {
  type: string;
  id: string;
  updatedAt: string;
  deleted: boolean;
  fields: Record<string, Value>;
};

/** What the server holds per record: who and when in the clear, the content sealed. */
export type RemoteRecord = { type: string; id: string; updatedAt: string; deleted: boolean; data: string };

export interface SyncSource {
  pending(): Promise<LocalChange[]>;
  markPushed(change: LocalChange): Promise<void>;
  apply(change: LocalChange): Promise<boolean>;
  files(): Promise<{ id: string; fileName: string; deleted: boolean; uploaded: boolean }[]>;
  setUploaded(id: string, uploadedAt: string | null): Promise<void>;
  cursor(): Promise<string | null>;
  setCursor(cursor: string): Promise<void>;
}

/** The vault in the cloud. Records are listed by server time, so `pull` can resume. */
export interface RemoteVault {
  push(records: RemoteRecord[]): Promise<void>;
  pull(since: string | null): Promise<{ records: RemoteRecord[]; cursor: string | null }>;
  uploadFile(fileName: string, sealed: Uint8Array): Promise<void>;
  downloadFile(fileName: string): Promise<Uint8Array | null>;
  deleteFile(fileName: string): Promise<void>;
}

export interface LocalFiles {
  exists(fileName: string): boolean;
  read(fileName: string): Promise<Uint8Array>;
  write(fileName: string, bytes: Uint8Array): Promise<void>;
  delete(fileName: string): void;
}

export type SyncReport = { pushed: number; pulled: number; uploaded: number; downloaded: number };

/**
 * One round of sync: send what changed here, take in what changed elsewhere, then bring the
 * document files in line. Safe to run at any time and as often as wanted; an interrupted run
 * picks up where it stopped, because each step is only marked done after it succeeded.
 */
export async function syncOnce({
  crypto,
  dataKey,
  source,
  remote,
  files,
  order,
  now = () => new Date().toISOString(),
}: {
  crypto: CryptoPrimitives;
  dataKey: Uint8Array;
  source: SyncSource;
  remote: RemoteVault;
  files: LocalFiles;
  /** Types in the order they must be applied, parents first. */
  order: string[];
  now?: () => string;
}): Promise<SyncReport> {
  const report: SyncReport = { pushed: 0, pulled: 0, uploaded: 0, downloaded: 0 };

  // 1. Send. Marked as sent only once the server has it.
  const pending = await source.pending();
  if (pending.length > 0) {
    const sealed = await Promise.all(
      pending.map(async (change) => ({
        type: change.type,
        id: change.id,
        updatedAt: change.updatedAt,
        deleted: change.deleted,
        data: await encryptRecord(crypto, dataKey, change, change.fields),
      })),
    );
    await remote.push(sealed);
    for (const change of pending) await source.markPushed(change);
    report.pushed = pending.length;
  }

  // 2. Receive, parents first, then remember how far we got.
  const { records, cursor } = await remote.pull(await source.cursor());
  const rank = (type: string) => (order.includes(type) ? order.indexOf(type) : order.length);
  const sorted = [...records].sort((a, b) => rank(a.type) - rank(b.type));
  for (const record of sorted) {
    if (!order.includes(record.type)) continue; // From a newer app version; leave it for that one.
    const fields = await decryptRecord<Record<string, Value>>(crypto, dataKey, record, record.data);
    if (await source.apply({ ...record, fields })) report.pulled++;
  }
  if (cursor) await source.setCursor(cursor);

  // 3. Files: upload what's new here, fetch what's missing, and remove what was deleted.
  for (const file of await source.files()) {
    if (file.deleted) {
      if (files.exists(file.fileName)) files.delete(file.fileName);
      if (file.uploaded) {
        await remote.deleteFile(file.fileName);
        await source.setUploaded(file.id, null);
      }
    } else if (!file.uploaded && files.exists(file.fileName)) {
      await remote.uploadFile(file.fileName, await encryptFile(crypto, dataKey, file.fileName, await files.read(file.fileName)));
      await source.setUploaded(file.id, now());
      report.uploaded++;
    } else if (!files.exists(file.fileName)) {
      const sealed = await remote.downloadFile(file.fileName);
      if (sealed) {
        await files.write(file.fileName, await decryptFile(crypto, dataKey, file.fileName, sealed));
        // It came from the cloud, so it's there already.
        await source.setUploaded(file.id, now());
        report.downloaded++;
      }
    }
  }

  return report;
}
