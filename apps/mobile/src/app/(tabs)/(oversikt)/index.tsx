import {
  CHECK_HEADS_UP_DAYS,
  computeCoverage,
  daysUntilCheck,
  featuredGuide,
  missingTypes,
  nextActions,
  nextCheck,
  TARGET_DAYS,
  type Coverage,
  type NextAction,
} from '@egenberedskap/core';
import { router, Stack, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { PartnerCard } from '@/components/partner-card';
import { DaysHero, type HeroAction } from '@/components/preparedness/days-hero';
import { DAY_ROWS } from '@/components/preparedness/day-rows';
import { INSURANCE_ALERT_TITLE, useHomeInsurance } from '@/components/preparedness/home-insurance';
import { Task, taskHref } from '@/components/preparedness/task-row';
import { CheckCircle, WarningDot } from '@/components/ui/check-circle';
import { Icon } from '@/components/ui/icon';
import { LinkText } from '@/components/ui/link-text';
import { Row, Section } from '@/components/ui/list';
import { Screen } from '@/components/ui/screen';
import { Colors, Spacing } from '@/constants/theme';
import { useData } from '@/data/data-provider';
import { GUIDES } from '@/guides/guides';
import { useNotifications } from '@/notifications/notifications-provider';
import {
  describeAction,
  formatDate,
  formatIn,
  formatKr,
  formatMeals,
  formatNumber,
  householdLabel,
  todayIso,
} from '@/lib/format';
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
  const plan = { contacts: data.contacts.length, meetingPlace: data.meetingPlace !== null, followUps: data.followUps };
  const all = nextActions(household, stock, today, plan);
  const actions = all.slice(0, TASKS_SHOWN);
  // «Utstyr»: the categories that aren't counted in days.
  const gearMissing = missingTypes(household, stock, today).filter((t) => !DAY_ROWS.some((r) => r.kind === t.category)).length;
  const guide = GUIDES[featuredGuide(household, Number(today.slice(5, 7)))];
  // The first check falls due one interval after the household was set up.
  const checkFrom = data.lastCheck ?? data.onboardedOn ?? today;
  const checkIn = daysUntilCheck(checkFrom, data.checkIntervalMonths, today);
  const { property, policy, alert } = useHomeInsurance();
  const { permission, requestPermission } = useNotifications();

  const toLager = (href: Href) => router.navigate(href, { withAnchor: true });
  const nextCheckOn = formatDate(nextCheck(checkFrom, data.checkIntervalMonths));
  const heroAction = limitAction(coverage, all, nextCheckOn);

  return (
    <>
      <Stack.Screen options={{ title: 'Oversikt' }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View hidesSharedBackground>
          <Pressable
            onPress={() => router.push('/husstand')}
            accessibilityRole="button"
            accessibilityLabel="Innstillinger"
            style={styles.avatar}>
            <Icon name={{ ios: 'gearshape.fill', android: 'settings' }} size={16} color={Colors.accent} />
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
            action={heroAction}
          />
          {/* A quiet line while it's a while off, a card as it nears, yellow once it's due. Before
              the first check that's one interval after setup, like any other. */}
          {checkIn > CHECK_HEADS_UP_DAYS ? (
            <Pressable
              onPress={() => router.push('/beredskapssjekk')}
              accessibilityRole="button"
              hitSlop={8}
              style={({ pressed }) => [styles.quiet, pressed && { opacity: 0.6 }]}>
              <Text style={styles.quietText}>
                Neste beredskapssjekk {nextCheckOn} ·{' '}
                <Text style={styles.quietLink}>Ta den nå</Text>
              </Text>
            </Pressable>
          ) : (
            <Notice
              title={checkIn > 0 ? `Beredskapssjekk ${formatIn(checkIn)}` : 'Tid for beredskapssjekk'}
              subtitle={data.lastCheck ? `Sist sjekket ${formatDate(data.lastCheck)}` : 'Ikke sjekket ennå'}
              attention={checkIn <= 0}
              onPress={() => router.push('/beredskapssjekk')}
            />
          )}
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
            <LinkText strong label="Se hele listen" onPress={() => toLager('/lager')} />
          </>
        )}

        <PartnerCard />

        <Section header="Forsikring">
          <Row
            title="Innboforsikring"
            detail={policy?.sumKr !== undefined ? formatKr(policy.sumKr) : 'Legg til'}
            chevron
            onPress={() => router.push('/forsikring')}
          />
        </Section>
      </Screen>
    </>
  );
}

/**
 * The foot of the days card: the task for whatever holds the number down, worded as in «Neste å
 * gjøre». With nothing at all yet, the first step; once the week is there, the check that keeps it.
 */
function limitAction(coverage: Coverage, actions: NextAction[], nextCheckOn: string): HeroAction {
  if (coverage.days >= TARGET_DAYS) {
    return {
      title: 'Dere følger DSBs anbefaling',
      subtitle: `Neste sjekk ${nextCheckOn} holder tallet riktig`,
      onPress: () => router.push('/beredskapssjekk'),
    };
  }
  const action = actions.find((a) =>
    coverage.limitedBy === 'water'
      ? a.kind === 'buyWater'
      : coverage.limitedBy === 'food'
        ? a.kind === 'buyFood'
        : a.kind === 'getType' && a.type.id === 'heatSource',
  );
  // Always there below the week; the fallback only keeps the card from going blank.
  if (!action) return { title: 'Se hva som mangler', onPress: () => router.navigate('/lager', { withAnchor: true }) };
  const href = taskHref(action);
  const onPress = () => router.push(href);
  if (action.kind === 'buyWater') {
    return coverage.litres === 0
      ? { title: 'Start med vannet', subtitle: `${formatNumber(action.litres)} liter, eller legg inn det dere har`, onPress }
      : { title: `Kjøp ${formatNumber(action.litres)} liter vann til`, subtitle: 'Drikkevann på kanner', onPress };
  }
  if (action.kind === 'buyFood') {
    // One example keeps it to a line; «Neste å gjøre» lists them all.
    const [example] = action.suggestions;
    return {
      title: `Kjøp mat for ${action.days} døgn til`,
      subtitle: example ? `${formatMeals(action.meals)}, f.eks. ${example.name.toLowerCase()}` : formatMeals(action.meals),
      onPress,
    };
  }
  return { ...describeAction(action), onPress };
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
  quiet: { marginHorizontal: Spacing.screen + 4 },
  quietText: { fontSize: 15, color: Colors.secondaryLabel },
  quietLink: { color: Colors.accent, fontWeight: '600' },
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
