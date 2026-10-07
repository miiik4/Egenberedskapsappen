import { createHash, timingSafeEqual } from 'node:crypto';

import { FieldValue, Timestamp, type Transaction } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { db, HEX_64, PROTECTED, requireString, requireUser, type Vault } from './shared.js';

export { onAnalysisDeleted, onAnalysisQueued, startAnalysis, submitAnalysis, sweepAnalyses } from './analysis/jobs.js';

/**
 * Backups are end-to-end encrypted and have no accounts: a vault is found by an id derived
 * from the user's recovery code, and joined by proving knowledge of that code. Nothing here
 * ever sees the code itself, the data key or any content.
 *
 * - vaultId: SHA-256 of the recovery code under one label (hex)
 * - proof: SHA-256 of the recovery code under another label (hex). Only its own hash is
 *   stored, so even a full database leak can't be used to join a vault.
 * - wrappedKey: the data key, sealed under the recovery code; opaque to the server.
 *
 * Insurers pay for backup through activation codes. A code gives the vault an entitlement
 * for a number of days; while it lasts, members may write. Reading is always allowed.
 */

/** A vault outliving many reinstalls is fine; hundreds of members would mean abuse. */
const MAX_MEMBERS = 20;

type ActivationCode = {
  partner: string;
  durationDays: number;
  maxUses: number;
  uses: number;
  expiresAt?: Timestamp;
};

const sha256Hex = (text: string) => createHash('sha256').update(text).digest('hex');

/** Codes are stored by hash, so the list of valid codes can't leak from the database. */
export function activationCodeHash(code: string): string {
  const normalized = code.toUpperCase().replace(/[\s-]/g, '');
  return sha256Hex(`egenberedskapsappen/activation-code/v1\n${normalized}`);
}

/** Checks an activation code and uses it up; returns how long it entitles to. */
async function redeem(tx: Transaction, code: string): Promise<{ partner: string; days: number }> {
  const ref = db.collection('activationCodes').doc(activationCodeHash(code));
  const snapshot = await tx.get(ref);
  const data = snapshot.data() as ActivationCode | undefined;
  if (!data) throw new HttpsError('not-found', 'activation-code-invalid');
  if (data.expiresAt && data.expiresAt.toMillis() < Date.now()) {
    throw new HttpsError('failed-precondition', 'activation-code-expired');
  }
  if (data.uses >= data.maxUses) throw new HttpsError('failed-precondition', 'activation-code-used');
  tx.update(ref, { uses: FieldValue.increment(1) });
  return { partner: data.partner, days: data.durationDays };
}

const daysFrom = (start: number, days: number) => Timestamp.fromMillis(start + days * 24 * 60 * 60 * 1000);

/** Turns backup on: a new vault, paid for by the insurer's activation code. */
export const createVault = onCall(PROTECTED, async (request) => {
  const uid = requireUser(request);
  const { activationCode, vaultId, proof, wrappedKey } = request.data ?? {};
  requireString(activationCode, 'activation-code', /^[0-9A-Za-z\s-]+$/, 40);
  requireString(vaultId, 'vault-id', HEX_64);
  requireString(proof, 'proof', HEX_64);
  requireString(wrappedKey, 'wrapped-key', /^v1\.[A-Za-z0-9+/=]+$/, 200);

  const ref = db.collection('vaults').doc(vaultId);
  return db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) throw new HttpsError('already-exists', 'vault-exists');
    const { partner, days } = await redeem(tx, activationCode);
    const entitledUntil = daysFrom(Date.now(), days);
    const vault: Vault = {
      members: { [uid]: true },
      proofHash: sha256Hex(proof),
      wrappedKey,
      partner,
      entitledUntil,
      createdAt: Timestamp.now(),
    };
    tx.create(ref, vault);
    return { entitledUntil: entitledUntil.toDate().toISOString() };
  });
});

/** A new phone joins an existing vault by proving it knows the recovery code. */
export const joinVault = onCall(PROTECTED, async (request) => {
  const uid = requireUser(request);
  const { vaultId, proof } = request.data ?? {};
  requireString(vaultId, 'vault-id', HEX_64);
  requireString(proof, 'proof', HEX_64);

  const ref = db.collection('vaults').doc(vaultId);
  return db.runTransaction(async (tx) => {
    const vault = (await tx.get(ref)).data() as Vault | undefined;
    // The same answer for «no such vault» and «wrong proof», so neither can be probed for.
    const matches =
      vault !== undefined && timingSafeEqual(Buffer.from(sha256Hex(proof)), Buffer.from(vault.proofHash));
    if (!vault || !matches) throw new HttpsError('not-found', 'recovery-code-invalid');
    if (!vault.members[uid] && Object.keys(vault.members).length >= MAX_MEMBERS) {
      throw new HttpsError('resource-exhausted', 'too-many-devices');
    }
    tx.update(ref, { [`members.${uid}`]: true });
    return { wrappedKey: vault.wrappedKey, entitledUntil: vault.entitledUntil.toDate().toISOString() };
  });
});

/** A new activation code from the insurer extends the entitlement from where it stands. */
export const extendVault = onCall(PROTECTED, async (request) => {
  const uid = requireUser(request);
  const { vaultId, activationCode } = request.data ?? {};
  requireString(vaultId, 'vault-id', HEX_64);
  requireString(activationCode, 'activation-code', /^[0-9A-Za-z\s-]+$/, 40);

  const ref = db.collection('vaults').doc(vaultId);
  return db.runTransaction(async (tx) => {
    const vault = (await tx.get(ref)).data() as Vault | undefined;
    if (!vault?.members[uid]) throw new HttpsError('permission-denied', 'not-a-member');
    const { partner, days } = await redeem(tx, activationCode);
    const entitledUntil = daysFrom(Math.max(Date.now(), vault.entitledUntil.toMillis()), days);
    tx.update(ref, { entitledUntil, partner });
    return { entitledUntil: entitledUntil.toDate().toISOString() };
  });
});
