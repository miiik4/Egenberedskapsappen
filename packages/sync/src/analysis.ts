import { x25519 } from '@noble/curves/ed25519.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';

import { concat, fromBase64, fromUtf8, toBase64, utf8 } from './encoding';
import type { CryptoPrimitives } from './primitives';

/**
 * The AI analysis of a room has to see the photos, so they are the one thing that leaves the
 * phone unencrypted. Its answer doesn't have to: the server encrypts the list of things it
 * found to a key pair made for that one analysis, whose private half never leaves the phone.
 * What waits in the cloud for the phone to fetch it is ciphertext.
 *
 * The format, mirrored by the server in functions/src/analysis/seal.ts:
 * - the phone makes an X25519 key pair and sends the public key when it starts the analysis
 * - the server makes its own one-off X25519 key pair, and derives
 *   key = HKDF-SHA256(shared secret, salt = server public ‖ phone public, info = INFO)
 * - the result is AES-256-GCM sealed under that key (nonce ‖ ciphertext ‖ tag), with
 *   «analysis/<jobId>» as additional data, so it can't be passed off as another job's
 * - the envelope is { v: 1, epk: base64 server public key, sealed: base64 }
 */
export const ANALYSIS_INFO = 'egenberedskapsappen/analysis-result/v1';

export type AnalysisEnvelope = { v: 1; epk: string; sealed: string };
export type AnalysisKeys = { secretKey: Uint8Array; publicKey: string };

/** A fresh key pair for one analysis. Randomness comes from the platform, as for the vault. */
export function createAnalysisKeys(crypto: Pick<CryptoPrimitives, 'randomBytes'>): AnalysisKeys {
  const secretKey = crypto.randomBytes(32);
  return { secretKey, publicKey: toBase64(x25519.getPublicKey(secretKey)) };
}

export function analysisKey(sharedSecret: Uint8Array, serverPublic: Uint8Array, phonePublic: Uint8Array): Uint8Array {
  return hkdf(sha256, sharedSecret, concat(serverPublic, phonePublic), utf8(ANALYSIS_INFO), 32);
}

/** Opens the server's answer. Throws if it was tampered with, or belongs to another job. */
export async function openAnalysisResult<T>(
  crypto: Pick<CryptoPrimitives, 'open'>,
  keys: AnalysisKeys,
  jobId: string,
  envelope: AnalysisEnvelope,
): Promise<T> {
  if (envelope.v !== 1) throw new Error(`Unknown analysis envelope version: ${String(envelope.v)}`);
  const serverPublic = fromBase64(envelope.epk);
  const shared = x25519.getSharedSecret(keys.secretKey, serverPublic);
  const key = analysisKey(shared, serverPublic, fromBase64(keys.publicKey));
  const plain = await crypto.open(key, fromBase64(envelope.sealed), utf8(`analysis/${jobId}`));
  return JSON.parse(fromUtf8(plain)) as T;
}
