import {
  computeCoverage,
  daysUntilCheck,
  featuredGuide,
  missingTypes,
  nextActions,
  type NextAction,
} from '@egenberedskap/core';
import { router, Stack, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { DaysHero } from '@/components/preparedness/days-hero';
import { DAY_ROWS } from '@/components/preparedness/day-rows';
import { INSURANCE_ALERT_TITLE, useHomeInsurance } from '@/components/preparedness/home-insurance';
import { CheckCircle, WarningDot } from '@/components/ui/check-circle';
import { Icon } from '@/components/ui/icon';
import { LinkText } from '@/components/ui/link-text';
import { Row, Section } from '@/components/ui/list';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { Colors, Spacing } from '@/constants/theme';
import { useData } from '@/data/data-provider';
import { GUIDES } from '@/guides/guides';
import { useNotifications } from '@/notifications/notifications-provider';
import { describeAction, formatDate, formatIn, formatKr, householdLabel, todayIso } from '@/lib/format';
import { Text } from '@/components/ui/text';

const TASKS_SHOWN = 3;

/**
 * The front page. Colour only where it means something: everything is blue or grey, and the
 * length of a bar says what's missing.
 */
export default function Oversikt() {
  const data = useData();
  const { household, stock } = data;
  const today = todayIso();
  const coverage = computeCoverage(household, stock, today);
  const actions = nextActions(household, stock, today).slice(0, TASKS_SHOWN);
  // «Utstyr»: the categories that aren't counted in days.
  const gearMissing = missingTypes(household, stock, today).filter((t) => !DAY_ROWS.some((r) => r.kind === t.category)).length;
  const guide = GUIDES[featuredGuide(household, Number(today.slice(5, 7)))];
  // The first check falls due one interval after the household was set up.
  const checkIn = daysUntilCheck(data.lastCheck ?? data.onboardedOn ?? today, data.checkIntervalMonths, today);
  const { property, policy, alert } = useHomeInsurance();
  const { permission, requestPermission } = useNotifications();

  const toLager = (href: Href) => router.navigate(href, { withAnchor: true });

  return (
    <>
      <Stack.Screen options={{ title: 'Oversikt' }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View hidesSharedBackground>
          <Pressable
            onPress={() => router.push('/husstand')}
            accessibilityRole="button"
            accessibilityLabel="Husstand"
            style={styles.avatar}>
            <Icon name={{ ios: 'person.2.fill', android: 'group' }} size={15} color={Colors.accent} />
          </Pressable>
        </Stack.Toolbar.View>
      </Stack.Toolbar>

      <Screen>
        <Text style={styles.subtitle}>
          {property ? `${property.name} · ` : ''}
          {householdLabel(household)}
        </Text>

        <View style={styles.top}>
          <DaysHero
            coverage={coverage}
            // Each day row is also a category of the list: vann, mat, varme.
            onPressKind={(kind) => toLager({ pathname: '/lager/kategori/[id]', params: { id: kind } })}
          />
          <Notice
            title={checkIn > 0 ? `Beredskapssjekk ${formatIn(checkIn)}` : 'Tid for beredskapssjekk'}
            subtitle={data.lastCheck ? `Sist sjekket ${formatDate(data.lastCheck)}` : 'Ikke sjekket ennå'}
            // Yellow only once it's due. Before the first check that's one interval after setup, like any other.
            attention={checkIn <= 0}
            onPress={() => router.push('/beredskapssjekk')}
          />
        </View>

        <Section>
          <Row
            title="Utstyr"
            detail={gearMissing === 0 ? 'På plass' : `${gearMissing} ting mangler`}
            chevron
            onPress={() => toLager({ pathname: '/lager', params: { filter: gearMissing ? 'mangler' : 'alle' } })}
          />
          <Row
            title={guide.title}
            subtitle={`Guide · ${guide.minutes} min`}
            chevron
            onPress={() => router.push({ pathname: '/guide/[id]', params: { id: guide.id } })}
          />
        </Section>
        <LinkText label="Se alle guider" onPress={() => router.push('/guider')} />

        {permission === 'undetermined' && (
          <Section footer="Før noe går ut, og når det er tid for beredskapssjekk.">
            <Row title="Slå på påminnelser" titleColor={Colors.accent} onPress={requestPermission} />
          </Section>
        )}

        {(actions.length > 0 || alert) && (
          <>
            <Section header="Neste å gjøre" separatorInset={56}>
              {alert && (
                <Row
                  title={INSURANCE_ALERT_TITLE[alert]}
                  subtitle="Se over forsikringssummen"
                  leading={<CheckCircle on={false} />}
                  onPress={() => router.push('/forsikring')}
                />
              )}
              {actions.map((action, i) => (
                <Task key={i} action={action} />
              ))}
            </Section>
            <LinkText strong label="Se hele listen" onPress={() => toLager({ pathname: '/lager', params: { filter: 'mangler' } })} />
          </>
        )}

        <Section header="Husstand">
          <Row
            title="Innboforsikring"
            detail={policy?.sumKr !== undefined ? formatKr(policy.sumKr) : 'Legg til'}
            chevron
            onPress={() => router.push('/forsikring')}
          />
          <Row title="Hvem bor her" detail={householdLabel(household)} chevron onPress={() => router.push('/husstand')} />
        </Section>
      </Screen>
    </>
  );
}

/** Doing a task means recording it, so each one opens the item sheet, prefilled. */
function taskHref(action: NextAction): Href {
  switch (action.kind) {
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

function Task({ action }: { action: NextAction }) {
  const { title, subtitle } = describeAction(action);
  const href = taskHref(action);
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
      onPress={() => (action.kind === 'replace' ? router.navigate(href, { withAnchor: true }) : router.push(href))}
    />
  );
}

/**
 * The beredskapssjekk: a plain card while it's a while off, the yellow banner once it needs
 * doing.
 */
function Notice({
  title,
  subtitle,
  attention,
  onPress,
}: {
  title: string;
  subtitle: string;
  attention: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.notice, attention && styles.noticeAttention, pressed && { opacity: 0.8 }]}>
      {attention && <WarningDot />}
      <View style={styles.noticeText}>
        <Text style={styles.noticeTitle}>{title}</Text>
        <Text style={[styles.noticeSubtitle, attention && styles.noticeSubtitleAttention]}>{subtitle}</Text>
      </View>
      <Icon
        name={{ ios: 'chevron.right', android: 'chevron_right' }}
        size={13}
        color={attention ? Colors.warningText : Colors.tertiaryLabel}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginHorizontal: Spacing.screen + 4, marginTop: Spacing.underTitle, fontSize: 17, color: Colors.secondaryLabel },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accentSoft,
  },
  top: { gap: 12 },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: Spacing.screen,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.card,
  },
  noticeAttention: { borderColor: Colors.noticeBorder, backgroundColor: Colors.notice },
  noticeText: { flex: 1 },
  noticeTitle: { fontSize: 16, fontWeight: '600', color: Colors.label },
  noticeSubtitle: { fontSize: 14, color: Colors.secondaryLabel },
  noticeSubtitleAttention: { color: Colors.warningText },
});
