import type { Suggestion } from '@egenberedskap/core';
import { createAnalysisKeys, fromBase64, openAnalysisResult, toBase64 } from '@egenberedskap/sync';
import { File } from 'expo-file-system';
import { getThumbnailAsync } from 'expo-video-thumbnails';
import { createContext, use, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { expoCrypto } from '@/backup/crypto';
import type { RemoteAnalysis } from '@/backup/firebase';
import { loadFirebase, requireFirebase } from '@/backup/load-firebase';
import { useBelongings } from '@/belongings/use-belongings';
import { EGENBEREDSKAP_PLUS_ENABLED } from '@/constants/config';
import { useActions, useData } from '@/data/data-provider';

import { frameTimes } from './frame-times';
import { AnalysisError, analysisErrorCode } from './messages';
import { cropFile, cropThing, deleteAnalysisFolder, ensureAnalysisFolder, photoFile, preparePhoto } from './photos';

/** What the server sends back, once decrypted: functions/src/analysis/prompt.ts FoundItem. */
type FoundItem = Omit<Suggestion, 'selected' | 'valueEdited' | 'cropFile'>;

type Progress = { prepared: number; uploaded: number; total: number };

/** Photos taken or picked, or a recording to take frames from. */
export type AnalysisInput = { source: 'photos'; uris: string[] } | { source: 'video'; uri: string; durationMs: number };

type AnalysisContextValue = {
  /** Firebase is in this build and backup is on: what analysis needs. */
  ready: boolean;
  /** Upload progress for analyses being sent from this phone right now. */
  progress: Record<string, Progress>;
  /** Starts analysing a room. Returns the analysis id at once; preparing and uploading go on behind. */
  start: (roomId: string, input: AnalysisInput) => Promise<string>;
  /** Adds the ticked suggestions to the room. Returns how many. */
  accept: (id: string) => Promise<number>;
  /** Throws an analysis away, here and on the server. */
  discard: (id: string) => Promise<void>;
  updateSuggestion: (id: string, index: number, change: Partial<Suggestion>) => Promise<void>;
  selectAll: (id: string, selected: boolean) => Promise<void>;
};

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

/**
 * Runs «Dokumenter med KI»: photos → server → suggestions → belongings. Follows every analysis
 * still waiting for its answer while the app is open, so leaving the app and coming back later
 * picks up where it was.
 */
export function AnalysisProvider({ children }: { children: ReactNode }) {
  const data = useData();
  const actions = useActions();
  const { save } = useBelongings();
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const sending = useRef(new Set<string>());
  const finishing = useRef(new Set<string>());
  const vaultId = data.backup?.vaultId ?? null;
  // As in BackupProvider: with Egenberedskap+ off and no backup linked, Firebase isn't loaded.
  const wanted = EGENBEREDSKAP_PLUS_ENABLED || vaultId !== null;
  const firebaseIfWanted = () => (wanted ? loadFirebase() : null);
  const available = useMemo(() => wanted && loadFirebase() !== null, [wanted]);
  const ready = available && vaultId !== null;

  const fail = async (id: string, error: unknown) => {
    await actions.setAnalysisStatus(id, 'failed', analysisErrorCode(error));
    await firebaseIfWanted()?.deleteAnalysis(id).catch(() => {});
  };

  /** The answer is in: open it, cut each thing's picture from our own photos, keep the suggestions. */
  const finish = async (id: string, job: RemoteAnalysis) => {
    const analysis = data.analyses.find((a) => a.id === id);
    const secret = await actions.analysisSecret(id);
    if (!analysis || !secret || !job.result) return;
    const { items } = await openAnalysisResult<{ items: FoundItem[] }>(
      expoCrypto,
      { secretKey: fromBase64(secret), publicKey: analysis.publicKey },
      id,
      job.result,
    );
    const suggestions: Suggestion[] = [];
    for (const [i, item] of items.entries()) {
      let crop: string | undefined;
      if (item.frame !== undefined && item.box && photoFile(id, item.frame).exists) {
        crop = `crop-${i}.jpg`;
        // A crop that won't cut leaves the thing without a picture, not the whole analysis.
        await cropThing(photoFile(id, item.frame), item.box, cropFile(id, crop)).catch(() => (crop = undefined));
      }
      suggestions.push({ ...item, ...(crop && { cropFile: crop }), selected: true, valueEdited: false });
    }
    await actions.setAnalysisSuggestions(id, suggestions);
    await requireFirebase().deleteAnalysis(id).catch(() => {});
  };

  /** Where a waiting job has got to, as the server reports it. Each finished job is handled once. */
  const onJob = (id: string, job: RemoteAnalysis | null) => {
    if (finishing.current.has(id)) return;
    if (job && job.status !== 'ready' && job.status !== 'failed') return;
    finishing.current.add(id);
    if (!job) void fail(id, new AnalysisError('expired'));
    else if (job.status === 'failed') void fail(id, new AnalysisError(job.error ?? 'failed'));
    else finish(id, job).catch((error: unknown) => fail(id, error));
  };

  // Follow every analysis that waits for its answer.
  const waitingKey = data.analyses
    .filter((a) => a.status === 'waiting')
    .map((a) => a.id)
    .join(',');
  // Follow again each time the app comes to the front, in case the connection dropped.
  const [foregrounded, setForegrounded] = useState(0);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setForegrounded((n) => n + 1);
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!waitingKey) return;
    const firebase = firebaseIfWanted();
    if (!firebase) return;
    let stops: (() => void)[] = [];
    let cancelled = false;
    // Signed in first: after a restart the job may be read before Firebase has the user back.
    // Errors (offline) are left: following starts again when the app next comes to the front.
    firebase.ensureSignedIn().then(() => {
      if (cancelled) return;
      stops = waitingKey.split(',').map((id) => firebase.watchAnalysis(id, (job) => onJob(id, job), () => {}));
    }, () => {});
    return () => {
      cancelled = true;
      stops.forEach((stop) => stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingKey, foregrounded, wanted]);

  // An upload the app was closed in the middle of can't be resumed: the photos may be half sent.
  const uploadingKey = data.analyses
    .filter((a) => a.status === 'uploading')
    .map((a) => a.id)
    .join(',');
  useEffect(() => {
    if (!uploadingKey) return;
    for (const id of uploadingKey.split(',')) {
      if (!sending.current.has(id)) void fail(id, new AnalysisError('upload-interrupted'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadingKey]);

  const value: AnalysisContextValue = {
    ready,
    progress,

    async start(roomId, input) {
      if (!vaultId) throw new AnalysisError('no-backup');
      const firebase = requireFirebase();
      const keys = createAnalysisKeys(expoCrypto);
      const times = input.source === 'video' ? frameTimes(input.durationMs) : [];
      const total = input.source === 'video' ? times.length : input.uris.length;
      const { jobId, uploadPrefix } = await firebase.startAnalysis({
        vaultId,
        source: input.source,
        scene: 'home',
        frameCount: total,
        phoneKey: keys.publicKey,
      });
      sending.current.add(jobId);
      await actions.addAnalysis({
        id: jobId,
        roomId,
        source: input.source,
        frameCount: total,
        publicKey: keys.publicKey,
        secretKey: toBase64(keys.secretKey),
      });

      const report = (change: Partial<Progress>) =>
        setProgress((all) => ({ ...all, [jobId]: { ...(all[jobId] ?? { prepared: 0, uploaded: 0, total }), ...change } }));
      void (async () => {
        try {
          ensureAnalysisFolder(jobId);
          if (input.source === 'video') {
            for (const [n, time] of times.entries()) {
              const { uri } = await getThumbnailAsync(input.uri, { time, quality: 0.9 });
              await preparePhoto(uri, photoFile(jobId, n));
              new File(uri).delete();
              report({ prepared: n + 1 });
            }
            // Only the frames are kept; the recording itself goes.
            new File(input.uri).delete();
          } else {
            for (const [n, uri] of input.uris.entries()) {
              await preparePhoto(uri, photoFile(jobId, n));
              report({ prepared: n + 1 });
            }
          }
          for (let n = 0; n < total; n++) {
            await firebase.uploadAnalysisPhoto(`${uploadPrefix}${n}.jpg`, photoFile(jobId, n).uri);
            report({ uploaded: n + 1 });
          }
          await firebase.submitAnalysis(jobId);
          await actions.setAnalysisStatus(jobId, 'waiting');
        } catch (error) {
          await fail(jobId, error);
        } finally {
          sending.current.delete(jobId);
          setProgress(({ [jobId]: _done, ...rest }) => rest);
        }
      })();
      return jobId;
    },

    async accept(id) {
      const analysis = data.analyses.find((a) => a.id === id);
      const chosen = analysis?.suggestions?.filter((s) => s.selected) ?? [];
      if (!analysis) return 0;
      for (const s of chosen) {
        await save(
          {
            roomId: analysis.roomId,
            name: s.name,
            category: s.category,
            ...(s.valueKr !== undefined && { valueKr: s.valueKr }),
            valueEstimated: s.valueKr !== undefined && !s.valueEdited,
          },
          { photo: s.cropFile ? { uri: cropFile(id, s.cropFile).uri, mimeType: 'image/jpeg' } : undefined, receipt: undefined },
        );
      }
      await value.discard(id);
      return chosen.length;
    },

    async discard(id) {
      await actions.deleteAnalysis(id);
      deleteAnalysisFolder(id);
      await firebaseIfWanted()?.deleteAnalysis(id).catch(() => {});
    },

    async updateSuggestion(id, index, change) {
      const suggestions = data.analyses.find((a) => a.id === id)?.suggestions;
      if (!suggestions?.[index]) return;
      await actions.setAnalysisSuggestions(
        id,
        suggestions.map((s, i) => (i === index ? { ...s, ...change } : s)),
      );
    },

    async selectAll(id, selected) {
      const suggestions = data.analyses.find((a) => a.id === id)?.suggestions;
      if (suggestions) await actions.setAnalysisSuggestions(id, suggestions.map((s) => ({ ...s, selected })));
    },
  };

  return <AnalysisContext value={value}>{children}</AnalysisContext>;
}

export function useAnalysis(): AnalysisContextValue {
  const value = use(AnalysisContext);
  if (!value) throw new Error('useAnalysis must be used inside <AnalysisProvider>');
  return value;
}
