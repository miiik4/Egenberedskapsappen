import { fromBase64, fromUtf8, toBase64, utf8 } from './encoding';
import { KEY_BYTES, type CryptoPrimitives } from './primitives';
import { recoveryKey } from './recovery';

/**
 * End-to-end encryption for backup and sync. Everything leaves the phone sealed with the
 * household's data key, which the server never sees in the clear: the only copy in the
 * cloud is wrapped with a key derived from the recovery code the user keeps.
 *
 * Every ciphertext is bound to where it belongs (record type and id, or file name), so the
 * server can't swap one sealed record for another without decryption failing.
 */
const VERSION = 'v1';
const context = (purpose: string) => utf8(`egenberedskapsappen/${VERSION}/${purpose}`);

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
  where: { type: string; id: string },
  value: unknown,
): Promise<string> {
  const sealed = await crypto.seal(dataKey, utf8(JSON.stringify(value)), context(`record/${where.type}/${where.id}`));
  return `${VERSION}.${toBase64(sealed)}`;
}

export async function decryptRecord<T>(
  crypto: CryptoPrimitives,
  dataKey: Uint8Array,
  where: { type: string; id: string },
  envelope: string,
): Promise<T> {
  return JSON.parse(fromUtf8(await open(crypto, dataKey, envelope, context(`record/${where.type}/${where.id}`)))) as T;
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

async function open(crypto: CryptoPrimitives, key: Uint8Array, envelope: string, aad: Uint8Array) {
  const [version, body] = envelope.split('.');
  if (version !== VERSION || !body) throw new DecryptionError(`Unknown envelope version: ${version}`);
  try {
    return await crypto.open(key, fromBase64(body), aad);
  } catch {
    throw new DecryptionError();
  }
}
