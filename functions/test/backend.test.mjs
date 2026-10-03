// End-to-end check of the deployed backend in the TEST project: functions, Firestore rules and
// Storage rules, through the same public endpoints the app uses. Never point it at prod.
//
//   node --test test/backend.test.mjs
//
// Needs gcloud logged in as a project owner (to create activation codes and move an
// entitlement's date), and anonymous sign-in enabled in Firebase Auth.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { before, describe, it } from 'node:test';

const PROJECT = 'egenberedskapsappen-test';
const REGION = 'europe-north1';
const BUNDLE = 'no.htas.egenberedskap.dev';
const OWNER = process.env.GCLOUD_ACCOUNT ?? 'mikkel.holmberg@icloud.com';
const plist = readFileSync(new URL('../../apps/mobile/firebase/test/GoogleService-Info.plist', import.meta.url), 'utf8');
const API_KEY = /<key>API_KEY<\/key>\s*<string>([^<]+)</.exec(plist)[1];
const BUCKET = /<key>STORAGE_BUCKET<\/key>\s*<string>([^<]+)</.exec(plist)[1];

const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const sha256 = (text) => createHash('sha256').update(text).digest('hex');
const hex = () => randomBytes(32).toString('hex');
const ownerToken = () => execFileSync('gcloud', ['auth', 'print-access-token', `--account=${OWNER}`]).toString().trim();

async function signInAnonymously() {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Ios-Bundle-Identifier': BUNDLE },
    body: JSON.stringify({ returnSecureToken: true }),
  });
  const body = await res.json();
  assert.ok(res.ok, `anonymous sign-in failed: ${JSON.stringify(body)}`);
  return { uid: body.localId, token: body.idToken };
}

async function call(name, user, data) {
  const res = await fetch(`https://${REGION}-${PROJECT}.cloudfunctions.net/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
    body: JSON.stringify({ data }),
  });
  const body = await res.json();
  return body.error ? { error: body.error.message } : { result: body.result };
}

/** Writes as the owner, bypassing rules: test fixtures only. */
async function adminPatch(path, fields) {
  const mask = Object.keys(fields).map((f) => `updateMask.fieldPaths=${f}`).join('&');
  const res = await fetch(`${FIRESTORE}/${path}?${mask}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${ownerToken()}`, 'Content-Type': 'application/json', 'x-goog-user-project': PROJECT },
    body: JSON.stringify({ fields }),
  });
  assert.ok(res.ok, `admin write failed: ${await res.text()}`);
}

async function createActivationCode({ uses = 1, days = 365 } = {}) {
  const code = randomBytes(9).toString('hex').toUpperCase();
  await adminPatch(`activationCodes/${sha256(`egenberedskapsappen/activation-code/v1\n${code}`)}`, {
    partner: { stringValue: 'test-insurer' },
    durationDays: { integerValue: String(days) },
    maxUses: { integerValue: String(uses) },
    uses: { integerValue: '0' },
  });
  return code;
}

/** A record write as the app makes it, with the server time set by the server. */
async function writeRecord(user, vaultId, { type = 'contacts', id = 'c1', extra = {}, serverTime = true } = {}) {
  const fields = {
    type: { stringValue: type },
    id: { stringValue: id },
    data: { stringValue: 'v1.ciphertext' },
    deleted: { booleanValue: false },
    updatedAt: { stringValue: new Date().toISOString() },
    ...extra,
  };
  if (!serverTime) fields.serverUpdatedAt = { timestampValue: '2020-01-01T00:00:00Z' };
  const res = await fetch(`${FIRESTORE.replace('/documents', '/documents:commit')}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      writes: [
        {
          update: { name: `projects/${PROJECT}/databases/(default)/documents/vaults/${vaultId}/records/${type}_${id}`, fields },
          ...(serverTime && {
            updateTransforms: [{ fieldPath: 'serverUpdatedAt', setToServerValue: 'REQUEST_TIME' }],
          }),
        },
      ],
    }),
  });
  return res.status;
}

const readRecords = async (user, vaultId) =>
  (await fetch(`${FIRESTORE}/vaults/${vaultId}/records`, { headers: { Authorization: `Bearer ${user.token}` } })).status;

async function upload(user, vaultId) {
  const name = encodeURIComponent(`vaults/${vaultId}/files/a.jpg`);
  const res = await fetch(`https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o?name=${name}`, {
    method: 'POST',
    headers: { Authorization: `Firebase ${user.token}`, 'Content-Type': 'application/octet-stream' },
    body: randomBytes(1000),
  });
  return res.status;
}

describe('backup backend (test project)', () => {
  let alice;
  let phone2;
  let stranger;
  const vaultId = hex();
  const proof = hex();

  before(async () => {
    [alice, phone2, stranger] = await Promise.all([signInAnonymously(), signInAnonymously(), signInAnonymously()]);
  });

  it('refuses a vault without a valid activation code', async () => {
    const { error } = await call('createVault', alice, { activationCode: 'NOPE-NOPE-NOPE', vaultId, proof, wrappedKey: 'v1.abc' });
    assert.equal(error, 'activation-code-invalid');
  });

  it('creates a vault with an activation code, and the code works only once', async () => {
    const activationCode = await createActivationCode();
    const { result } = await call('createVault', alice, { activationCode, vaultId, proof, wrappedKey: 'v1.abc' });
    assert.ok(new Date(result.entitledUntil) > new Date());
    const again = await call('createVault', alice, { activationCode, vaultId: hex(), proof, wrappedKey: 'v1.abc' });
    assert.equal(again.error, 'activation-code-used');
  });

  it('lets members write records with server time, and nobody else', async () => {
    assert.equal(await writeRecord(alice, vaultId), 200);
    assert.equal(await readRecords(alice, vaultId), 200);
    assert.equal(await writeRecord(stranger, vaultId), 403);
    assert.equal(await readRecords(stranger, vaultId), 403);
  });

  it('rejects records with a forged time, extra fields or a mismatched id', async () => {
    assert.equal(await writeRecord(alice, vaultId, { serverTime: false }), 403);
    assert.equal(await writeRecord(alice, vaultId, { extra: { plaintext: { stringValue: 'oops' } } }), 403);
    assert.equal(await writeRecord(alice, vaultId, { extra: { id: { stringValue: 'other' } } }), 403);
  });

  it('lets a new phone join with the proof, and not with a wrong one', async () => {
    assert.equal((await call('joinVault', phone2, { vaultId, proof: hex() })).error, 'recovery-code-invalid');
    assert.equal((await call('joinVault', phone2, { vaultId: hex(), proof })).error, 'recovery-code-invalid');
    const { result } = await call('joinVault', phone2, { vaultId, proof });
    assert.equal(result.wrappedKey, 'v1.abc');
    assert.equal(await readRecords(phone2, vaultId), 200);
  });

  it('stores files for members only', async () => {
    assert.equal(await upload(alice, vaultId), 200);
    assert.equal(await upload(stranger, vaultId), 403);
  });

  it('turns read-only when the entitlement runs out, and an extension reopens it', async () => {
    await adminPatch(`vaults/${vaultId}`, { entitledUntil: { timestampValue: '2020-01-01T00:00:00Z' } });
    assert.equal(await writeRecord(alice, vaultId), 403);
    assert.equal(await readRecords(alice, vaultId), 200);

    const activationCode = await createActivationCode({ days: 30 });
    assert.equal((await call('extendVault', stranger, { vaultId, activationCode })).error, 'not-a-member');
    const { result } = await call('extendVault', alice, { vaultId, activationCode });
    assert.ok(new Date(result.entitledUntil) > new Date());
    assert.equal(await writeRecord(alice, vaultId), 200);
  });

  it('refuses requests without sign-in', async () => {
    const { error } = await call('joinVault', { token: 'not-a-token' }, { vaultId, proof });
    assert.ok(error, 'expected an error');
  });
});
