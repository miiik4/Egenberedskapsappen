import { createCipheriv, createPublicKey, diffieHellman, generateKeyPairSync, hkdfSync, randomBytes, type KeyObject } from 'node:crypto';

/**
 * Encrypts an analysis result to the phone that asked for it, so what waits in Firestore for
 * the phone to fetch is ciphertext. The phone's half is packages/sync/src/analysis.ts, and its
 * test opens what this seals.
 *
 * X25519 between a one-off server key and the phone's key for this job, HKDF-SHA256 to an
 * AES-256-GCM key, the job id as additional data. Envelope: { v: 1, epk, sealed }, base64.
 */
export const ANALYSIS_INFO = 'egenberedskapsappen/analysis-result/v1';

export type AnalysisEnvelope = { v: 1; epk: string; sealed: string };

const base64url = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64url');

function x25519PublicKey(raw: Uint8Array): KeyObject {
  if (raw.length !== 32) throw new Error('An X25519 public key is 32 bytes');
  return createPublicKey({ key: { kty: 'OKP', crv: 'X25519', x: base64url(raw) }, format: 'jwk' });
}

function rawPublic(key: KeyObject): Buffer {
  const jwk = key.export({ format: 'jwk' });
  if (!jwk.x) throw new Error('Not an X25519 key');
  return Buffer.from(jwk.x, 'base64url');
}

export function sealForPhone(phonePublicBase64: string, jobId: string, value: unknown): AnalysisEnvelope {
  const phonePublic = Buffer.from(phonePublicBase64, 'base64');
  const { privateKey, publicKey } = generateKeyPairSync('x25519');
  const serverPublic = rawPublic(publicKey);
  const shared = diffieHellman({ privateKey, publicKey: x25519PublicKey(phonePublic) });
  const key = Buffer.from(hkdfSync('sha256', shared, Buffer.concat([serverPublic, phonePublic]), ANALYSIS_INFO, 32));

  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(Buffer.from(`analysis/${jobId}`, 'utf8'));
  const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  const sealed = Buffer.concat([nonce, body, cipher.getAuthTag()]);
  return { v: 1, epk: serverPublic.toString('base64'), sealed: sealed.toString('base64') };
}

/** A phone public key as the app sends it: 32 bytes, base64. */
export const PHONE_KEY = /^[A-Za-z0-9+/]{43}=$/;
