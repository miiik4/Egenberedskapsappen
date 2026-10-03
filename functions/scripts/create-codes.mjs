// Creates activation codes for an insurer, and prints them once. Only their hashes are stored.
//
//   node scripts/create-codes.mjs <project> <partner> <count> [durationDays=365] [maxUses=1]
//
// Needs Google application default credentials for an account with access to the project:
//   gcloud auth application-default login
import { createHash, randomBytes } from 'node:crypto';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const [project, partner, countArg, daysArg = '365', usesArg = '1'] = process.argv.slice(2);
if (!project || !partner || !countArg) {
  console.error('Usage: node scripts/create-codes.mjs <project> <partner> <count> [durationDays] [maxUses]');
  process.exit(1);
}

// The same unambiguous alphabet as recovery codes: no I, L, O or U.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const code = () =>
  [...randomBytes(12)]
    .map((byte) => ALPHABET[byte & 31])
    .join('')
    .match(/.{4}/g)
    .join('-');

// Must match activationCodeHash in src/index.ts.
const hash = (c) =>
  createHash('sha256').update(`egenberedskapsappen/activation-code/v1\n${c.replace(/-/g, '')}`).digest('hex');

initializeApp({ credential: applicationDefault(), projectId: project });
const db = getFirestore();
const batch = db.batch();
const codes = Array.from({ length: Number(countArg) }, code);
for (const c of codes) {
  batch.create(db.collection('activationCodes').doc(hash(c)), {
    partner,
    durationDays: Number(daysArg),
    maxUses: Number(usesArg),
    uses: 0,
  });
}
await batch.commit();
console.log(codes.join('\n'));
