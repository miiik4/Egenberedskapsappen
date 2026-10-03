import { webcrypto } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { fromBase64, toBase64, utf8 } from './encoding';
import type { CryptoPrimitives } from './primitives';
import { generateRecoveryCode, normalizeRecoveryCode, vaultIdentity } from './recovery';
import {
  createDataKey,
  decryptFile,
  decryptRecord,
  DecryptionError,
  encryptFile,
  encryptRecord,
  unwrapDataKey,
  wrapDataKey,
} from './vault';

const subtle = webcrypto.subtle;
const importKey = (key: Uint8Array) => subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt', 'decrypt']);

/** Real AES-256-GCM, laid out as expo-crypto lays it out: nonce ‖ ciphertext ‖ tag. */
const node: CryptoPrimitives = {
  randomBytes: (n) => webcrypto.getRandomValues(new Uint8Array(n)),
  sha256: async (data) => new Uint8Array(await subtle.digest('SHA-256', data)),
  async seal(key, plaintext, aad) {
    const iv = webcrypto.getRandomValues(new Uint8Array(12));
    const body = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, await importKey(key), plaintext));
    const out = new Uint8Array(12 + body.length);
    out.set(iv);
    out.set(body, 12);
    return out;
  },
  async open(key, sealed, aad) {
    const iv = sealed.slice(0, 12);
    return new Uint8Array(
      await subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad }, await importKey(key), sealed.slice(12)),
    );
  },
};

const contact = { type: 'contacts', id: 'c1' };
const value = { name: 'Ola Nordmann', phone: '+47 900 00 000', relation: 'Partner' };

describe('records', () => {
  it('round-trips, and the ciphertext reveals nothing of the content', async () => {
    const key = createDataKey(node);
    const envelope = await encryptRecord(node, key, contact, value);
    expect(envelope.startsWith('v1.')).toBe(true);
    expect(envelope).not.toContain('Ola');
    expect(await decryptRecord(node, key, contact, envelope)).toEqual(value);
  });

  it('never encrypts the same thing the same way twice', async () => {
    const key = createDataKey(node);
    expect(await encryptRecord(node, key, contact, value)).not.toBe(await encryptRecord(node, key, contact, value));
  });

  it('fails with the wrong key', async () => {
    const envelope = await encryptRecord(node, createDataKey(node), contact, value);
    await expect(decryptRecord(node, createDataKey(node), contact, envelope)).rejects.toThrow(DecryptionError);
  });

  it('fails if the server moves a record to another id or type', async () => {
    const key = createDataKey(node);
    const envelope = await encryptRecord(node, key, contact, value);
    await expect(decryptRecord(node, key, { type: 'contacts', id: 'c2' }, envelope)).rejects.toThrow(DecryptionError);
    await expect(decryptRecord(node, key, { type: 'policies', id: 'c1' }, envelope)).rejects.toThrow(DecryptionError);
  });

  it('fails if a single byte was altered', async () => {
    const key = createDataKey(node);
    const [version, body] = (await encryptRecord(node, key, contact, value)).split('.');
    const bytes = fromBase64(body!);
    bytes[20]! ^= 1;
    await expect(decryptRecord(node, key, contact, `${version}.${toBase64(bytes)}`)).rejects.toThrow(DecryptionError);
  });
});

describe('files', () => {
  it('round-trips binary data, bound to its file name', async () => {
    const key = createDataKey(node);
    const photo = node.randomBytes(50_000);
    const sealed = await encryptFile(node, key, 'a.jpg', photo);
    expect(sealed.length).toBe(photo.length + 28);
    expect(await decryptFile(node, key, 'a.jpg', sealed)).toEqual(photo);
    await expect(decryptFile(node, key, 'b.jpg', sealed)).rejects.toThrow(DecryptionError);
  });
});

describe('recovery code', () => {
  it('is six groups of four unambiguous characters', () => {
    const code = generateRecoveryCode(node);
    expect(code).toMatch(/^([0-9A-HJKMNP-TV-Z]{4}-){5}[0-9A-HJKMNP-TV-Z]{4}$/);
    expect(generateRecoveryCode(node)).not.toBe(code);
  });

  it('is read back forgivingly', () => {
    expect(normalizeRecoveryCode('7kq2 m9xa 0000 1111 abcd efgh')).toBe('7KQ2-M9XA-0000-1111-ABCD-EFGH');
    expect(normalizeRecoveryCode('7KQ2-M9XA-OOOO-IlIl-ABCD-EFGH')).toBe('7KQ2-M9XA-0000-1111-ABCD-EFGH');
    expect(normalizeRecoveryCode('7KQ2-M9XA')).toBeNull();
    expect(normalizeRecoveryCode('7KQ2-M9XA-0000-1111-ABCD-EFGU')).toBeNull();
  });

  it('unwraps the data key on a new phone, however the code is typed', async () => {
    const key = createDataKey(node);
    const code = generateRecoveryCode(node);
    const wrapped = await wrapDataKey(node, key, code);
    expect(wrapped).not.toContain(toBase64(key));
    expect(await unwrapDataKey(node, wrapped, code.toLowerCase().replace(/-/g, ' '))).toEqual(key);
  });

  it('finds the vault from the code alone, in the form the server expects', async () => {
    const code = generateRecoveryCode(node);
    const { vaultId, proof } = await vaultIdentity(node, code);
    expect(vaultId).toMatch(/^[0-9a-f]{64}$/);
    expect(proof).toMatch(/^[0-9a-f]{64}$/);
    expect(proof).not.toBe(vaultId);
    // However the code is typed, it's the same vault.
    expect(await vaultIdentity(node, code.toLowerCase().replace(/-/g, ' '))).toEqual({ vaultId, proof });
    expect((await vaultIdentity(node, generateRecoveryCode(node))).vaultId).not.toBe(vaultId);
  });

  it('does not unwrap with another code', async () => {
    const wrapped = await wrapDataKey(node, createDataKey(node), generateRecoveryCode(node));
    await expect(unwrapDataKey(node, wrapped, generateRecoveryCode(node))).rejects.toThrow(DecryptionError);
  });
});

describe('base64', () => {
  it('matches the platform encoder for every length', () => {
    for (let n = 0; n < 40; n++) {
      const bytes = node.randomBytes(n);
      expect(toBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
      expect(fromBase64(toBase64(bytes))).toEqual(bytes);
    }
    expect(toBase64(utf8('æøå'))).toBe(Buffer.from('æøå').toString('base64'));
  });
});
