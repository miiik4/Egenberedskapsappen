import { randomUUID } from 'node:crypto';

import { Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { defineString, projectID } from 'firebase-functions/params';
import { onDocumentDeleted, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import { db, HEX_64, PROTECTED, requireString, requireUser, type Vault } from '../shared.js';
import { MAX_FRAMES, type Scene, type Source } from './prompt.js';
import { PHONE_KEY, sealForPhone } from './seal.js';
import { admit, release, STALE_AFTER_MS, type Usage } from './usage.js';

/**
 * «Film et rom» on the server. The one place where content leaves the phone unencrypted:
 * photos of a room, for the model to look at. They live here for minutes.
 *
 * 1. startAnalysis: the phone asks to analyse N photos, with a public key made for this job.
 *    Needs a vault with a current entitlement (the insurer pays for analysis as for backup).
 * 2. The phone uploads the photos to analysis/{uid}/{jobId}/{n}.jpg (storage.rules).
 * 3. submitAnalysis: all photos are there; the job is queued.
 * 4. onAnalysisQueued: the model looks at the photos; the list of things found is encrypted to
 *    the phone's key and left on the job; the photos are deleted, whatever happened.
 * 5. The phone reads the job (firestore.rules), decrypts the list, and deletes the job. It may
 *    also delete a job to cancel it; onAnalysisDeleted then removes its photos and frees the
 *    household to start another.
 * 6. sweepAnalyses: anything left behind, by a phone that never came back, is removed.
 *
 * Status: uploading → queued → analysing → ready | failed.
 */

type JobStatus = 'uploading' | 'queued' | 'analysing' | 'ready' | 'failed';

type Job = {
  uid: string;
  vaultId: string;
  status: JobStatus;
  source: Source;
  scene: Scene;
  frameCount: number;
  phoneKey: string;
  createdAt: Timestamp;
  /** Removed by sweepAnalyses after this, and by the Firestore TTL policy as a backstop. */
  expiresAt: Timestamp;
  claimedAt?: Timestamp;
  result?: ReturnType<typeof sealForPhone>;
  /** A code for the app to explain, never content. */
  error?: string;
};

const JOB_LIFETIME_MS = 24 * 60 * 60 * 1000;

// Vertex AI region and models. Photos are processed where the model runs, so the region must
// be in the EU. Check that both models are offered there before deploying.
const LOCATION = defineString('ANALYSIS_LOCATION', { default: 'europe-north1' });
const ANALYST_MODEL = defineString('ANALYSIS_MODEL', { default: 'gemini-2.5-pro' });
const VERIFIER_MODEL = defineString('ANALYSIS_VERIFIER_MODEL', { default: 'gemini-2.5-flash' });

const jobs = db.collection('analysisJobs');
const usageOf = (vaultId: string) => db.collection('analysisUsage').doc(vaultId);
const prefix = (job: Pick<Job, 'uid'>, jobId: string) => `analysis/${job.uid}/${jobId}/`;
const deleteFrames = (job: Pick<Job, 'uid'>, jobId: string) => getStorage().bucket().deleteFiles({ prefix: prefix(job, jobId) });

const isEntitled = (vault: Vault | undefined, uid: string) =>
  vault !== undefined && vault.members[uid] === true && vault.entitledUntil.toMillis() > Date.now();

/** Asks to analyse a set of photos. Returns where to upload them. */
export const startAnalysis = onCall(PROTECTED, async (request) => {
  const uid = requireUser(request);
  const { vaultId, source, scene, frameCount, phoneKey } = request.data ?? {};
  requireString(vaultId, 'vault-id', HEX_64);
  requireString(phoneKey, 'phone-key', PHONE_KEY, 44);
  if (source !== 'photos' && source !== 'video') throw new HttpsError('invalid-argument', 'invalid-source');
  if (scene !== 'home' && scene !== 'travel') throw new HttpsError('invalid-argument', 'invalid-scene');
  if (!Number.isInteger(frameCount) || frameCount < 1 || frameCount > MAX_FRAMES[source as Source]) {
    throw new HttpsError('invalid-argument', 'invalid-frame-count');
  }

  const jobId = randomUUID();
  await db.runTransaction(async (tx) => {
    const vault = (await tx.get(db.collection('vaults').doc(vaultId))).data() as Vault | undefined;
    if (!isEntitled(vault, uid)) throw new HttpsError('permission-denied', 'not-entitled');
    const usageRef = usageOf(vaultId);
    const admission = admit((await tx.get(usageRef)).data() as Usage | undefined, jobId, Date.now());
    if (!admission.ok) throw new HttpsError('resource-exhausted', admission.reason);
    tx.set(usageRef, admission.usage);
    const now = Date.now();
    const job: Job = {
      uid,
      vaultId,
      status: 'uploading',
      source,
      scene,
      frameCount,
      phoneKey,
      createdAt: Timestamp.fromMillis(now),
      expiresAt: Timestamp.fromMillis(now + JOB_LIFETIME_MS),
    };
    tx.create(jobs.doc(jobId), job);
  });
  return { jobId, uploadPrefix: prefix({ uid }, jobId) };
});

/** Every photo is uploaded: queue the analysis. */
export const submitAnalysis = onCall(PROTECTED, async (request) => {
  const uid = requireUser(request);
  const jobId = requireString(request.data?.jobId, 'job-id', /^[0-9a-f-]{36}$/);
  const ref = jobs.doc(jobId);
  const job = (await ref.get()).data() as Job | undefined;
  if (!job || job.uid !== uid) throw new HttpsError('not-found', 'job-not-found');
  if (job.status !== 'uploading') throw new HttpsError('failed-precondition', 'job-not-uploading');

  const [files] = await getStorage().bucket().getFiles({ prefix: prefix(job, jobId) });
  if (files.length !== job.frameCount) throw new HttpsError('failed-precondition', 'frames-missing');

  await db.runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data() as Job | undefined;
    if (current?.status !== 'uploading') throw new HttpsError('failed-precondition', 'job-not-uploading');
    tx.update(ref, { status: 'queued' });
  });
  return {};
});

/**
 * Runs the analysis once a job is queued. Runs as the service account, without App Check,
 * so the entitlement is checked again here. Claims the job first, since an event can arrive
 * more than once.
 */
export const onAnalysisQueued = onDocumentUpdated(
  { document: 'analysisJobs/{jobId}', memory: '2GiB', timeoutSeconds: 300 },
  async (event) => {
    const before = event.data?.before.data() as Job | undefined;
    const after = event.data?.after.data() as Job | undefined;
    if (before?.status !== 'uploading' || after?.status !== 'queued') return;
    const jobId = event.params.jobId;
    const ref = jobs.doc(jobId);

    const claimed = await db.runTransaction(async (tx) => {
      const job = (await tx.get(ref)).data() as Job | undefined;
      if (job?.status !== 'queued' || job.claimedAt) return false;
      tx.update(ref, { status: 'analysing', claimedAt: Timestamp.now() });
      return true;
    });
    if (!claimed) return;

    try {
      const vault = (await db.collection('vaults').doc(after.vaultId).get()).data() as Vault | undefined;
      if (!isEntitled(vault, after.uid)) throw new JobError('not-entitled');

      const [files] = await getStorage().bucket().getFiles({ prefix: prefix(after, jobId) });
      // Numbered as the phone sent them, which is how it will find each thing's photo again.
      const numbered = files
        .map((file) => ({ file, n: Number(/(\d+)\.jpg$/.exec(file.name)?.[1]) }))
        .filter(({ n }) => Number.isInteger(n) && n >= 0 && n < after.frameCount)
        .sort((a, b) => a.n - b.n);
      if (numbered.length !== after.frameCount || numbered.some(({ n }, i) => n !== i)) throw new JobError('frames-missing');
      const frames = await Promise.all(numbered.map(async ({ file }) => (await file.download())[0]));

      // Loaded here, not at the top: every function shares this module, and the vault functions
      // shouldn't pay for loading sharp and the model SDK on a cold start.
      const { gemini } = await import('./model.js');
      const { runPipeline } = await import('./pipeline.js');
      const model = gemini({
        project: projectID.value(),
        location: LOCATION.value(),
        analystModel: ANALYST_MODEL.value(),
        verifierModel: VERIFIER_MODEL.value(),
      });
      const items = await runPipeline(frames, after.source, after.scene, model, (line) => console.log(line));
      await ref.update({ status: 'ready', result: sealForPhone(after.phoneKey, jobId, { items }) });
    } catch (error) {
      const code = error instanceof JobError ? error.code : 'analysis-failed';
      // The message may quote the model; log only what kind of error it was.
      console.error(`analysis ${jobId} failed: ${code}`, error instanceof Error ? error.name : typeof error);
      // The phone may have cancelled, deleting the job; then there's nothing left to mark.
      await ref.update({ status: 'failed', error: code }).catch(() => {});
    } finally {
      await deleteFrames(after, jobId).catch((e: unknown) => console.error(`analysis ${jobId}: could not delete frames`, e));
      await releaseUsage(after.vaultId, jobId);
    }
  },
);

/**
 * A job was deleted: by the phone, once it has the result or to cancel, or by the sweep. Its
 * photos go, and the household may start another. Harmless when both were done already.
 */
export const onAnalysisDeleted = onDocumentDeleted('analysisJobs/{jobId}', async (event) => {
  const job = event.data?.data() as Job | undefined;
  if (!job) return;
  await deleteFrames(job, event.params.jobId).catch((e: unknown) => console.error(`analysis ${event.params.jobId}: could not delete frames`, e));
  await releaseUsage(job.vaultId, event.params.jobId);
});

/**
 * Hourly: deletes jobs past their lifetime with any photos they left, and fails jobs that
 * stopped half way (a phone that never finished uploading, an analysis that died).
 * Cloud Scheduler isn't offered in europe-north1, so this one runs in europe-west1. It only
 * lists and deletes; it never reads a photo or a result.
 */
export const sweepAnalyses = onSchedule(
  { schedule: 'every 60 minutes', timeZone: 'Europe/Oslo', region: 'europe-west1' },
  async () => {
    const now = Date.now();
    const old = await jobs.where('createdAt', '<', Timestamp.fromMillis(now - STALE_AFTER_MS)).get();
    for (const doc of old.docs) {
      const job = doc.data() as Job;
      try {
        if (job.expiresAt.toMillis() < now) {
          await deleteFrames(job, doc.id);
          await doc.ref.delete();
        } else if (job.status === 'uploading' || job.status === 'queued' || job.status === 'analysing') {
          await deleteFrames(job, doc.id);
          await doc.ref.update({ status: 'failed', error: 'timed-out' });
        } else {
          continue;
        }
        await releaseUsage(job.vaultId, doc.id);
      } catch (e) {
        console.error(`sweep: analysis ${doc.id}`, e);
      }
    }
  },
);

async function releaseUsage(vaultId: string, jobId: string) {
  const ref = usageOf(vaultId);
  await db.runTransaction(async (tx) => {
    const next = release((await tx.get(ref)).data() as Usage | undefined, jobId);
    if (next) tx.set(ref, next);
  });
}

class JobError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}
