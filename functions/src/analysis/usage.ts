/**
 * How much analysis a household gets: one at a time, and at most DAILY_LIMIT a day. Each
 * analysis costs real money at the model provider, and the insurer pays for it through the
 * entitlement, so a runaway phone shouldn't be able to run up the bill.
 *
 * Kept per vault in analysisUsage/{vaultId}. Pure, so it can be tested without Firestore.
 */
export const DAILY_LIMIT = 20;
/** An analysis still marked as running after this has died somewhere; it no longer blocks. */
export const STALE_AFTER_MS = 30 * 60 * 1000;

export type Usage = { day: string; count: number; activeJob?: string | null; activeSince?: number | null };

export type Admission = { ok: true; usage: Usage } | { ok: false; reason: 'busy' | 'daily-limit' };

const dayOf = (now: number) => new Date(now).toISOString().slice(0, 10);

export function admit(current: Usage | undefined, jobId: string, now: number): Admission {
  const today = dayOf(now);
  const usage: Usage = current && current.day === today ? current : { day: today, count: 0 };
  const running = current?.activeJob && current.activeSince && now - current.activeSince < STALE_AFTER_MS;
  if (running) return { ok: false, reason: 'busy' };
  if (usage.count >= DAILY_LIMIT) return { ok: false, reason: 'daily-limit' };
  return { ok: true, usage: { day: today, count: usage.count + 1, activeJob: jobId, activeSince: now } };
}

/** The job is over, one way or another: the household may start the next. */
export function release(current: Usage | undefined, jobId: string): Usage | undefined {
  if (!current || current.activeJob !== jobId) return undefined;
  return { ...current, activeJob: null, activeSince: null };
}
