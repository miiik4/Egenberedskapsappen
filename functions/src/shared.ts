import { initializeApp } from 'firebase-admin/app';
import { getFirestore, type Timestamp } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';

// Shared by every function: set up once, before any module touches Firestore.

initializeApp();
// Next to the database, in Finland.
setGlobalOptions({ region: 'europe-north1', maxInstances: 10 });

export const db = getFirestore();

export const HEX_64 = /^[0-9a-f]{64}$/;

export type Vault = {
  members: Record<string, boolean>;
  proofHash: string;
  wrappedKey: string;
  partner: string;
  entitledUntil: Timestamp;
  createdAt: Timestamp;
};

export function requireUser(request: CallableRequest): string {
  // consumeAppCheckToken only marks a reused token; refusing it is up to us.
  if (request.app?.alreadyConsumed) throw new HttpsError('unauthenticated', 'app-check-token-reused');
  if (!request.auth) throw new HttpsError('unauthenticated', 'sign-in-required');
  return request.auth.uid;
}

export function requireString(value: unknown, name: string, pattern?: RegExp, maxLength = 200): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength || (pattern && !pattern.test(value))) {
    throw new HttpsError('invalid-argument', `invalid-${name}`);
  }
  return value;
}

/**
 * Every call must come from our app (App Check: App Attest on iPhone, Play Integrity on
 * Android, debug tokens in development builds). Each token works once, so a recorded request
 * can't be replayed: the app asks for single-use tokens for these calls.
 */
export const PROTECTED = { enforceAppCheck: true, consumeAppCheckToken: true } as const;
