import {
  computeCoverage,
  daysUntilQuarterlyCheck,
  featuredGuide,
  missingTypes,
  nextActions,
  type NextAction,
} from '@egenberedskap/core';
import { router, Stack, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DaysHeadline, DayRows, limiterText } from '@/components/preparedness/day-rows';
import { useHomeInsurance } from '@/components/preparedness/home-insurance';
import { Card } from '@/components/ui/card';
import { CheckCircle } from '@/components/ui/check-circle';
import { Icon } from '@/components/ui/icon';
import { LinkText } from '@/components/ui/link-text';
import { Row, Section } from '@/components/ui/list';
import { Screen } from '@/components/ui/screen';
import { Colors, Spacing } from '@/constants/theme';
import { useData } from '@/data/data-provider';
import { GUIDES } from '@/guides/guides';
import { useNotifications } from '@/notifications/notifications-provider';
import { describeAction, formatIn, formatKr, householdLabel, todayIso } from '@/lib/format';

const TASKS_SHOWN = 3;
/** «Utstyr» on Oversikt: the categories that aren't counted in days. */
const GEAR = ['light', 'communication', 'firstAid', 'hygiene'];

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
  const gearMissing = missingTypes(household, stock, today).filter((t) => GEAR.includes(t.category)).length;
  const guide = GUIDES[featuredGuide(household, Number(today.slice(5, 7)))];
  // The first check falls due a quarter after the household was set up.
  const checkIn = daysUntilQuarterlyCheck(data.lastQuarterlyCheck ?? data.onboardedOn ?? today, today);
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

        <Card gap={16}>
          <View style={styles.lead}>
            <Text style={styles.leadText}>Uten strøm og vann klarer dere dere i</Text>
            <DaysHeadline days={coverage.days} />
          </View>
          <DayRows
            coverage={coverage}
            // Each day row is also a category of the list: vann, mat, varme.
            onPress={(kind) => toLager({ pathname: '/lager/kategori/[id]', params: { id: kind } })}
          />
          <Text style={styles.limiter}>{limiterText(coverage)}</Text>
        </Card>

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
          <Section footer="Før noe går ut, og når det er tid for kvartalssjekk.">
            <Row title="Slå på påminnelser" titleColor={Colors.accent} onPress={requestPermission} />
          </Section>
        )}

        {(actions.length > 0 || alert) && (
          <>
            <Section header="Neste å gjøre" separatorInset={56}>
              {alert && (
                <Row
                  title={alert === 'over' ? 'Innboet kan være underforsikret' : 'Innboet nærmer seg forsikringssummen'}
                  subtitle="Se over forsikringssummen"
                  leading={<CheckCircle on={false} />}
                  onPress={() => router.push('/forsikring')}
                />
              )}
              {actions.map((action, i) => (
                <Task key={i} action={action} />
              ))}
            </Section>
            <LinkText label="Se hele listen" onPress={() => toLager({ pathname: '/lager', params: { filter: 'mangler' } })} />
          </>
        )}

        <Section header="Husstand">
          <Row
            title="Kvartalssjekk"
            detail={checkIn > 0 ? capitalize(formatIn(checkIn)) : 'Nå'}
            chevron
            onPress={() => router.push('/kvartalssjekk')}
          />
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
  return (
    <Row
      title={title}
      subtitle={subtitle}
      leading={<CheckCircle on={false} />}
      onPress={() => (action.kind === 'replace' ? router.navigate(href, { withAnchor: true }) : router.push(href))}
    />
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const styles = StyleSheet.create({
  subtitle: { marginHorizontal: Spacing.screen + 4, marginTop: -16, fontSize: 17, color: Colors.secondaryLabel },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accentSoft,
  },
  lead: { gap: 2 },
  leadText: { fontSize: 15, color: Colors.secondaryLabel },
  limiter: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.separator,
    fontSize: 15,
    color: Colors.label,
  },
});
