/**
 * When to take frames from a recording: evenly spread, about two a second, between 12 and the
 * 60 the server takes. The server keeps the sharpest of each stretch, since a walk round a room
 * is mostly motion blur.
 */
export function frameTimes(durationMs: number): number[] {
  const count = Math.min(60, Math.max(12, Math.round((durationMs / 1000) * 2)));
  // Stay clear of the very ends, where the phone is still being raised or lowered.
  const start = Math.min(500, durationMs / 10);
  const span = Math.max(0, durationMs - 2 * start);
  return Array.from({ length: count }, (_, i) => Math.round(start + (span * i) / Math.max(1, count - 1)));
}
