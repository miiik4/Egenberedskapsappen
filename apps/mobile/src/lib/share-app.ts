import { shouldAskToShare } from '@egenberedskap/core';
import { useEffect } from 'react';
import { Alert, Platform, Share } from 'react-native';

import { APP_SHARE_URL } from '@/constants/config';
import { useActions, useData } from '@/data/data-provider';
import { todayIso } from '@/lib/format';

/**
 * The system share sheet with a line about the app and the link to the website, which has both stores.
 * iOS takes the link as `url`, so Messages shows a preview; Android only shares `message`.
 */
export function shareApp() {
  const message = 'Jeg bruker Egenberedskapsappen til å holde oversikt over beredskapen hjemme. Kanskje noe for deg?';
  Share.share(Platform.OS === 'ios' ? { message, url: APP_SHARE_URL } : { message: `${message} ${APP_SHARE_URL}` }).catch(
    () => {},
  );
}

/** Long enough for the screen to settle after launch, so the question doesn't land on a half-drawn page. */
const ASK_AFTER_MS = 1500;

/**
 * Asks «Vil du dele appen med en venn?» while `focused`, when `shouldAskToShare` says it's time.
 * «Del appen» and «Ikke spør igjen» hide it for good; «Senere» lets it come back after a while.
 * Used on Oversikt only, so it never lands on emergency information or a document.
 */
export function useSharePrompt(focused: boolean) {
  const { sharePrompt, onboardedOn, stock } = useData();
  const { markSharePromptAsked, hideSharePrompt } = useActions();
  const ask = focused && shouldAskToShare(sharePrompt, onboardedOn, stock.length > 0, todayIso());

  useEffect(() => {
    if (!ask) return;
    const timer = setTimeout(() => {
      // Saved as it's shown, so closing the app with the question up doesn't bring it straight back.
      markSharePromptAsked().catch(() => {});
      const hide = () => hideSharePrompt().catch(() => {});
      const share = { text: 'Del appen', isPreferred: true, onPress: () => (hide(), shareApp()) };
      const never = { text: 'Ikke spør igjen', onPress: hide };
      const later = { text: 'Senere', style: 'cancel' as const };
      Alert.alert(
        'Vil du dele appen med en venn?',
        'Kjenner du noen som bør ha et lager hjemme? Du kan også dele fra Innstillinger senere.',
        // iOS stacks three buttons in this order, with cancel last. Android places them by position:
        // the first to the left, the last as the positive one to the right.
        Platform.OS === 'ios' ? [share, never, later] : [never, later, share],
      );
    }, ASK_AFTER_MS);
    return () => clearTimeout(timer);
  }, [ask, markSharePromptAsked, hideSharePrompt]);
}
