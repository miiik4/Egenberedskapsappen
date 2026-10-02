import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { useActions, useData } from '@/data/data-provider';
import { seedDemoData } from '@/lib/demo-data';

/**
 * Development only, reached by deep link (`…/--/utvikling`): resets the database and fills
 * it with the household from the design, then goes Home. Does nothing in a release build.
 */
export default function Utvikling() {
  const actions = useActions();
  const data = useData();
  const [done, setDone] = useState(!__DEV__);

  useEffect(() => {
    if (!__DEV__) return;
    (async () => {
      await actions.reset();
      await seedDemoData(actions, { ...data, onboarded: false });
      setDone(true);
    })();
    // Run once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return done ? <Redirect href="/" /> : null;
}
