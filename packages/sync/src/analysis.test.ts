import { webcrypto } from 'node:crypto';

import { describe, expect, it } from 'vitest';

// The server's real sealing code, so both halves of the format are tested against each other.
import { ANALYSIS_INFO as SERVER_INFO, PHONE_KEY, sealForPhone } from '../../../functions/src/analysis/seal';
import { ANALYSIS_INFO, createAnalysisKeys, openAnalysisResult } from './analysis';
import { fromBase64, toBase64 } from './encoding';
import type { CryptoPrimitives } from './primitives';

const subtle = webcrypto.subtle;
const crypto: Pick<CryptoPrimitives, 'randomBytes' | 'open'> = {
  randomBytes: (n) => webcrypto.getRandomValues(new Uint8Array(n)),
  async open(key, sealed, aad) {
    const k = await subtle.importKey('raw', key, 'AES-GCM', false, ['decrypt']);
    return new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: sealed.slice(0, 12), additionalData: aad }, k, sealed.slice(12)));
  },
};

const result = { items: [{ name: 'Gitar', category: 'Musikkinstrument', valueKr: 4500, frame: 3, box: [100, 200, 900, 600] }] };

describe('analysis results', () => {
  it('opens on the phone what the server sealed to it', async () => {
    const keys = createAnalysisKeys(crypto);
    expect(keys.publicKey).toMatch(PHONE_KEY);
    const envelope = sealForPhone(keys.publicKey, 'job-1', result);
    expect(await openAnalysisResult(crypto, keys, 'job-1', envelope)).toEqual(result);
  });

  it('keeps nothing readable in the envelope', () => {
    const keys = createAnalysisKeys(crypto);
    const envelope = JSON.stringify(sealForPhone(keys.publicKey, 'job-1', result));
    expect(envelope).not.toContain('Gitar');
    expect(envelope).not.toContain('4500');
  });

  it('refuses another job, another phone, and tampering', async () => {
    const keys = createAnalysisKeys(crypto);
    const envelope = sealForPhone(keys.publicKey, 'job-1', result);
    await expect(openAnalysisResult(crypto, keys, 'job-2', envelope)).rejects.toThrow();
    await expect(openAnalysisResult(crypto, createAnalysisKeys(crypto), 'job-1', envelope)).rejects.toThrow();
    const bytes = fromBase64(envelope.sealed);
    bytes[20] = bytes[20]! ^ 1;
    await expect(openAnalysisResult(crypto, keys, 'job-1', { ...envelope, sealed: toBase64(bytes) })).rejects.toThrow();
  });

  it('uses the same label on both sides', () => {
    expect(SERVER_INFO).toBe(ANALYSIS_INFO);
  });
});
