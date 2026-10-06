import Constants, { ExecutionEnvironment } from 'expo-constants';

import type * as Firebase from './firebase';

let loaded: typeof Firebase | null | undefined;

/**
 * The Firebase module, or null in a build without it (Expo Go). `./firebase` imports the native
 * Firebase packages at the top, and in Expo Go that import itself throws, so it has to be
 * required behind a guard rather than imported statically.
 */
export function loadFirebase(): typeof Firebase | null {
  if (loaded === undefined && Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    // Expo Go: don't even try, the failed import would log an error on every start.
    loaded = null;
  }
  if (loaded === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const module = require('./firebase') as typeof Firebase;
      loaded = module.firebaseAvailable() ? module : null;
    } catch {
      loaded = null;
    }
  }
  return loaded;
}

/** For code that only runs once backup is known to be available. */
export function requireFirebase(): typeof Firebase {
  const firebase = loadFirebase();
  if (!firebase) throw new Error('Firebase is not available in this build');
  return firebase;
}
