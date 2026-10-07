/** A failure with a code the user can be told about: from the backend, or from the phone. */
export class AnalysisError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

/** What went wrong, in words the user can act on. */
const TEXTS: Record<string, string> = {
  busy: 'En analyse pågår allerede. Vent til den er ferdig.',
  'daily-limit': 'Dere har brukt opp dagens analyser. Prøv igjen i morgen.',
  'not-entitled': 'KI-analysen krever sikkerhetskopi med gyldig avtale fra forsikringsselskapet.',
  'no-backup': 'KI-analysen krever at sikkerhetskopi er slått på.',
  'frames-missing': 'Bildene kom ikke fram. Prøv igjen.',
  'upload-interrupted': 'Opplastingen ble avbrutt da appen ble lukket. Prøv igjen.',
  'timed-out': 'Analysen tok for lang tid. Prøv igjen.',
  expired: 'Analysen er ikke lenger tilgjengelig. Prøv igjen.',
  offline: 'Ingen nettforbindelse. Prøv igjen når du er på nett.',
};

/**
 * The code for any error along the way. Callable errors arrive as «functions/resource-exhausted»
 * with the backend's reason («busy», «daily-limit») as the message.
 */
export function analysisErrorCode(error: unknown): string {
  if (error instanceof AnalysisError) return error.code;
  const { code, message } = (error ?? {}) as { code?: string; message?: string };
  const known = Object.keys(TEXTS).find((k) => message?.includes(k));
  if (known) return known;
  return /unavailable|network|deadline/.test(String(code)) ? 'offline' : 'failed';
}

/** Takes an error or a stored code. */
export function analysisErrorText(errorOrCode: unknown): string {
  const code = typeof errorOrCode === 'string' ? errorOrCode : analysisErrorCode(errorOrCode);
  return TEXTS[code] ?? 'Noe gikk galt under analysen. Prøv igjen.';
}
