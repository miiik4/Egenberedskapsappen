import type { CryptoPrimitives } from '@egenberedskap/sync';
import {
  AESEncryptionKey,
  AESSealedData,
  aesDecryptAsync,
  aesEncryptAsync,
  CryptoDigestAlgorithm,
  digest,
  getRandomBytes,
} from 'expo-crypto';

const NONCE_BYTES = 12;
const TAG_BYTES = 16;

/**
 * The vault's cryptography on the phone: expo-crypto's native AES-256-GCM, laid out as
 * nonce ‖ ciphertext ‖ tag, byte for byte what the tests produce with WebCrypto.
 */
export const expoCrypto: CryptoPrimitives = {
  randomBytes: (length) => getRandomBytes(length),
  // Copy into a plain ArrayBuffer-backed view, which is what digest() accepts.
  sha256: async (data) => new Uint8Array(await digest(CryptoDigestAlgorithm.SHA256, new Uint8Array(data))),
  async seal(key, plaintext, aad) {
    const sealed = await aesEncryptAsync(plaintext, await AESEncryptionKey.import(key), {
      nonce: { length: NONCE_BYTES },
      tagLength: TAG_BYTES,
      additionalData: aad,
    });
    return sealed.combined('bytes');
  },
  async open(key, sealed, aad) {
    const data = AESSealedData.fromCombined(sealed, { ivLength: NONCE_BYTES, tagLength: TAG_BYTES });
    return aesDecryptAsync(data, await AESEncryptionKey.import(key), { additionalData: aad, output: 'bytes' });
  },
};
