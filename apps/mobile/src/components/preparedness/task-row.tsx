import { type FollowUp, type NextAction } from '@egenberedskap/core';
import { router, type Href } from 'expo-router';
import { Alert } from 'react-native';

import { CheckCircle } from '@/components/ui/check-circle';
import { Row } from '@/components/ui/list';
import { Pill } from '@/components/ui/pill';
import { useActions } from '@/data/data-provider';
import { describeAction } from '@/lib/format';

/** Doing a task means recording it, so each one opens the sheet it's done in, prefilled. */
export function taskHref(action: NextAction): Href {
  switch (action.kind) {
    case 'addContact':
      return '/kontakt';
    case 'addMeetingPlace':
      return '/motested';
    case 'followUp':
      return action.followUp === 'equipment'
        ? { pathname: '/lager/kategori/[id]', params: { id: 'light' } }
        : '/nodinfo';
    case 'buyWater':
      return { pathname: '/vare', params: { type: 'drinkingWater', litres: String(action.litres) } };
    case 'buyFood':
      return { pathname: '/vare', params: { type: action.suggestions[0]?.id ?? 'cannedMeals', meals: String(action.meals) } };
    case 'replace':
      return { pathname: '/lager/vare/[id]', params: { id: action.item.id } };
    case 'getType':
      return { pathname: '/vare', params: { type: action.type.id } };
  }
}

/** One thing to do, as «Neste å gjøre» on Oversikt and «Viktigst å skaffe» in Lager show it. */
export function Task({ action }: { action: NextAction }) {
  const { setFollowUp } = useActions();
  const { title, subtitle } = describeAction(action);
  const href = taskHref(action);
  const open = () => {
    if (action.kind === 'followUp') return openFollowUp(action.followUp, href, setFollowUp);
    if (action.kind === 'replace') router.navigate(href, { withAnchor: true });
    else router.push(href);
  };
  // What doing it does to the number, when it does anything: «+3 døgn», «−1 døgn».
  const change = action.dayChange !== 0 && (
    <Pill
      label={`${action.dayChange > 0 ? '+' : '−'}${Math.abs(action.dayChange)} døgn`}
      tone={action.dayChange > 0 ? 'accent' : 'warning'}
    />
  );
  return (
    <Row
      title={title}
      subtitle={subtitle}
      bold
      trailing={change || undefined}
      leading={<CheckCircle on={false} />}
      onPress={open}
    />
  );
}

/**
 * What the check left to do happens away from the phone, so the task asks whether it's done.
 * Looking over the contacts is done by opening them.
 */
function openFollowUp(followUp: FollowUp, href: Href, setFollowUp: (followUp: FollowUp, on: boolean) => Promise<void>) {
  if (followUp === 'contacts') {
    setFollowUp('contacts', false);
    router.navigate(href, { withAnchor: true });
    return;
  }
  Alert.alert('Virker lommelykten og radioen?', 'Bytt batterier, eller kjøp nytt det som ikke virker.', [
    { text: 'Ikke ennå', style: 'cancel' },
    { text: 'Se lys og strøm', onPress: () => router.navigate(href, { withAnchor: true }) },
    { text: 'Ja, de virker', onPress: () => setFollowUp('equipment', false) },
  ]);
}
