/**
 * What to tell the user when backup fails. Function errors carry our own reason as the
 * message (see functions/src/index.ts); Firebase's own errors carry a code like
 * «firestore/unavailable».
 */
export function backupErrorMessage(error: unknown): string {
  const message = String((error as { message?: string })?.message ?? '');
  const code = String((error as { code?: string })?.code ?? '');
  const has = (text: string) => message.includes(text);

  if (has('activation-code-invalid')) return 'Aktiveringskoden finnes ikke. Sjekk at den er skrevet riktig.';
  if (has('activation-code-used')) return 'Aktiveringskoden er allerede brukt.';
  if (has('activation-code-expired')) return 'Aktiveringskoden har gått ut. Be forsikringsselskapet om en ny.';
  if (has('recovery-code-invalid') || has('Invalid recovery code')) {
    return 'Fant ingen sikkerhetskopi med denne koden. Sjekk at den er skrevet riktig.';
  }
  if (has('too-many-devices')) return 'Sikkerhetskopien er koblet til for mange telefoner.';
  if ((error as { name?: string })?.name === 'DecryptionError') return 'Koden kunne ikke åpne sikkerhetskopien.';
  if (/unavailable|network|deadline|retry-limit/.test(code)) return 'Ingen nettforbindelse. Prøv igjen når du er på nett.';
  return 'Noe gikk galt. Prøv igjen om litt.';
}

/** The insurer's code as people type it: any case, spaces or dashes. */
export const cleanActivationCode = (input: string) => input.toUpperCase().replace(/[^0-9A-Z]/g, '');
