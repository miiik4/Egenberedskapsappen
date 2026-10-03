import { concat, utf8 } from './encoding';
import type { CryptoPrimitives } from './primitives';

/**
 * Crockford's base32: no I, L, O or U, so the code survives being read aloud, written by
 * hand or typed back in. 24 characters carry 120 bits, far beyond guessing.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const LENGTH = 24;
const GROUP = 4;

/** «7KQ2-M9XA-…», six groups of four. */
export function generateRecoveryCode(crypto: Pick<CryptoPrimitives, 'randomBytes'>): string {
  // 32 symbols means each byte's low five bits pick one without bias.
  const symbols = [...crypto.randomBytes(LENGTH)].map((byte) => ALPHABET[byte & 31]!);
  return chunks(symbols.join('')).join('-');
}

/**
 * Reads a code back as forgivingly as possible: any case, spaces or dashes, and the letters
 * people confuse with digits. Returns null if it can't be a valid code.
 */
export function normalizeRecoveryCode(input: string): string | null {
  const cleaned = input
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
  if (cleaned.length !== LENGTH || [...cleaned].some((c) => !ALPHABET.includes(c))) return null;
  return chunks(cleaned).join('-');
}

/**
 * The key that wraps the data key. The code is already 120 random bits, so a slow password
 * hash would add nothing; a domain-separated SHA-256 is enough.
 */
export async function recoveryKey(crypto: Pick<CryptoPrimitives, 'sha256'>, code: string): Promise<Uint8Array> {
  const normalized = normalizeRecoveryCode(code);
  if (!normalized) throw new Error('Invalid recovery code');
  return crypto.sha256(concat(utf8('egenberedskapsappen/recovery-key/v1\n'), utf8(normalized)));
}

/**
 * How the server finds a vault without ever seeing the code: two one-way hashes of it, under
 * different labels, so one can't be turned into the other. The server stores only a hash of
 * `proof`, and asks for `proof` itself before letting a new phone join.
 */
export async function vaultIdentity(
  crypto: Pick<CryptoPrimitives, 'sha256'>,
  code: string,
): Promise<{ vaultId: string; proof: string }> {
  const normalized = normalizeRecoveryCode(code);
  if (!normalized) throw new Error('Invalid recovery code');
  const hash = async (label: string) =>
    toHex(await crypto.sha256(concat(utf8(`egenberedskapsappen/${label}/v1\n`), utf8(normalized))));
  return { vaultId: await hash('vault-id'), proof: await hash('vault-proof') };
}

const toHex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');

function chunks(text: string): string[] {
  return text.match(new RegExp(`.{1,${GROUP}}`, 'g')) ?? [];
}
