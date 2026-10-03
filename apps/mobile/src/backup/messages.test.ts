import { describe, expect, it } from 'vitest';

import { backupErrorMessage, cleanActivationCode } from './messages';

describe('backupErrorMessage', () => {
  it('explains each reason the server gives', () => {
    expect(backupErrorMessage({ code: 'functions/not-found', message: 'activation-code-invalid' })).toContain('finnes ikke');
    expect(backupErrorMessage({ code: 'functions/failed-precondition', message: 'activation-code-used' })).toContain('allerede brukt');
    expect(backupErrorMessage({ code: 'functions/failed-precondition', message: 'activation-code-expired' })).toContain('gått ut');
    expect(backupErrorMessage({ code: 'functions/not-found', message: 'recovery-code-invalid' })).toContain('Fant ingen');
    expect(backupErrorMessage({ code: 'functions/resource-exhausted', message: 'too-many-devices' })).toContain('for mange');
  });

  it('recognises being offline, and a code that does not decrypt', () => {
    expect(backupErrorMessage({ code: 'firestore/unavailable', message: '' })).toContain('nettforbindelse');
    expect(backupErrorMessage(Object.assign(new Error('x'), { name: 'DecryptionError' }))).toContain('kunne ikke åpne');
  });

  it('falls back to something calm for the unexpected', () => {
    expect(backupErrorMessage(new Error('boom'))).toBe('Noe gikk galt. Prøv igjen om litt.');
    expect(backupErrorMessage(undefined)).toBe('Noe gikk galt. Prøv igjen om litt.');
  });
});

describe('cleanActivationCode', () => {
  it('ignores case, spaces and dashes', () => {
    expect(cleanActivationCode(' ab12-cd34 ef56 ')).toBe('AB12CD34EF56');
  });
});
