/**
 * The cryptography the vault needs, supplied from outside: expo-crypto's native AES in the
 * app, Node's WebCrypto in tests. Both produce the same bytes, so the format is tested for real.
 */
export interface CryptoPrimitives {
  randomBytes(length: number): Uint8Array;
  sha256(data: Uint8Array): Promise<Uint8Array>;
  /**
   * AES-256-GCM with a fresh random 12-byte nonce. Returns nonce ‖ ciphertext ‖ 16-byte tag.
   * `aad` is authenticated but not encrypted: it binds the ciphertext to where it belongs.
   */
  seal(key: Uint8Array, plaintext: Uint8Array, aad: Uint8Array): Promise<Uint8Array>;
  /** The reverse of `seal`. Must throw if anything, the aad included, was tampered with. */
  open(key: Uint8Array, sealed: Uint8Array, aad: Uint8Array): Promise<Uint8Array>;
}

export const KEY_BYTES = 32;
