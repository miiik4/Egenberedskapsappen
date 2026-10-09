import { fromBase64, fromUtf8, toBase64, utf8 } from './encoding';
import { KEY_BYTES, type CryptoPrimitives } from './primitives';
import { recoveryKey } from './recovery';

/**
 * End-to-end encryption for backup and sync. Everything leaves the phone sealed with the
 * household's data key, which the server never sees in the clear: the only copy in the
 * cloud is wrapped with a key derived from the recovery code the user keeps.
 *
 * Every ciphertext is bound to where it belongs (record type and id, or file name), so the
 * server can't swap one sealed record for another without decryption failing. A record is
 * also bound to the version the server lists it as (`updatedAt`) and whether it's deleted:
 * those travel in the clear, and phones act on them, so a server that changed them could
 * otherwise delete a household's documents from every phone, or bring back an old version.
 */
const VERSION = 'v1';
const context = (purpose: string) => utf8(`egenberedskapsappen/${VERSION}/${purpose}`);

/** Records since 1.3.0. `v1` records were bound to type and id only. */
const RECORD_VERSION = 'v2';

/** A record as the server lists it: what it is, and which version. */
export type RecordPlace = { type: string; id: string; updatedAt: string; deleted: boolean };

const recordContext = (where: RecordPlace) =>
  utf8(`egenberedskapsappen/${RECORD_VERSION}/record/${JSON.stringify([where.type, where.id, where.updatedAt, where.deleted])}`);

export class DecryptionError extends Error {
  constructor(message = 'Could not decrypt: wrong key, or the data was altered') {
    super(message);
    this.name = 'DecryptionError';
  }
}

export function createDataKey(crypto: CryptoPrimitives): Uint8Array {
  return crypto.randomBytes(KEY_BYTES);
}

/** The data key sealed under the recovery code, safe to store in the cloud. */
export async function wrapDataKey(crypto: CryptoPrimitives, dataKey: Uint8Array, code: string): Promise<string> {
  const sealed = await crypto.seal(await recoveryKey(crypto, code), dataKey, context('data-key'));
  return `${VERSION}.${toBase64(sealed)}`;
}

/** On a new phone: the recovery code turns the wrapped key back into the data key. */
export async function unwrapDataKey(crypto: CryptoPrimitives, wrapped: string, code: string): Promise<Uint8Array> {
  const key = await open(crypto, await recoveryKey(crypto, code), wrapped, context('data-key'));
  if (key.length !== KEY_BYTES) throw new DecryptionError('Unwrapped key has the wrong length');
  return key;
}

export async function encryptRecord(
  crypto: CryptoPrimitives,
  dataKey: Uint8Array,
  where: RecordPlace,
  value: unknown,
): Promise<string> {
  const sealed = await crypto.seal(dataKey, utf8(JSON.stringify(value)), recordContext(where));
  return `${RECORD_VERSION}.${toBase64(sealed)}`;
}

export async function decryptRecord<T>(
  crypto: CryptoPrimitives,
  dataKey: Uint8Array,
  where: RecordPlace,
  envelope: string,
): Promise<T> {
  // Records written before 1.3.0 (development and test vaults only: Egenberedskap+ was never
  // released before then) are still read. Stop accepting v1 once those vaults are gone.
  const plain = envelope.startsWith('v1.')
    ? await open(crypto, dataKey, envelope, context(`record/${where.type}/${where.id}`))
    : await open(crypto, dataKey, envelope, recordContext(where), RECORD_VERSION);
  return JSON.parse(fromUtf8(plain)) as T;
}

export const encryptFile = (crypto: CryptoPrimitives, dataKey: Uint8Array, fileName: string, bytes: Uint8Array) =>
  crypto.seal(dataKey, bytes, context(`file/${fileName}`));

export async function decryptFile(crypto: CryptoPrimitives, dataKey: Uint8Array, fileName: string, sealed: Uint8Array) {
  try {
    return await crypto.open(dataKey, sealed, context(`file/${fileName}`));
  } catch {
    throw new DecryptionError();
  }
}

async function open(crypto: CryptoPrimitives, key: Uint8Array, envelope: string, aad: Uint8Array, expected = VERSION) {
  const [version, body] = envelope.split('.');
  if (version !== expected || !body) throw new DecryptionError(`Unknown envelope version: ${version}`);
  try {
    return await crypto.open(key, fromBase64(body), aad);
  } catch {
    throw new DecryptionError();
  }
}
