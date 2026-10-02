import { computeCoverage, daysUntilQuarterlyCheck, nextActions, type NextAction } from '@egenberedskap/core';
import { router, Stack, type Href } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { DaysCard } from '@/components/home/days-card';
import { CardButton, IconTile, Row, Section } from '@/components/ui/list';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { Colors } from '@/constants/theme';
import { useActions, useData } from '@/data/data-provider';
import { useNotifications } from '@/notifications/notifications-provider';
import { describeAction, formatDate, formatDayChange, greeting, initials, todayIso } from '@/lib/format';

const TASKS_ON_HOME = 3;

export default function Home() {
  const data = useData();
  const { selectProperty } = useActions();
  const today = todayIso();
  const coverage = computeCoverage(data.household, data.stock, today);
  const actions = nextActions(data.household, data.stock, today).slice(0, TASKS_ON_HOME);
  // The first check falls due a quarter after the household was set up.
  const lastCheck = data.lastQuarterlyCheck ?? data.onboardedOn ?? today;
  const checkIn = daysUntilQuarterlyCheck(lastCheck, today);
  const property = data.properties.find((p) => p.id === data.selectedPropertyId);
  const { permission, requestPermission } = useNotifications();

  return (
    <>
      <Stack.Screen options={{ title: data.profile.name ? `${greeting()}, ${data.profile.name}` : greeting() }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Menu>
          <Stack.Toolbar.Label>{property?.name ?? 'Eiendom'}</Stack.Toolbar.Label>
          {data.properties.map((p) => (
            <Stack.Toolbar.MenuAction key={p.id} isOn={p.id === property?.id} onPress={() => selectProperty(p.id)}>
              {p.name}
            </Stack.Toolbar.MenuAction>
          ))}
          <Stack.Toolbar.MenuAction icon="plus" onPress={() => router.push('/eiendom')}>
            Ny eiendom
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View hidesSharedBackground>
          <Pressable
            onPress={() => router.push('/husstand')}
            accessibilityRole="button"
            accessibilityLabel="Husstand"
            style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(data.profile.name || '?')}</Text>
          </Pressable>
        </Stack.Toolbar.View>
      </Stack.Toolbar>

      <Screen>
        <View style={styles.top}>
          <DaysCard coverage={coverage} onPress={() => router.navigate('/beredskap')} />
          <CardButton
            leading={<IconTile name={{ ios: 'clock', android: 'schedule' }} color={Colors.tileOrange} />}
            title={
              checkIn > 0 ? `Kvartalssjekk om ${checkIn} ${checkIn === 1 ? 'dag' : 'dager'}` : 'Tid for kvartalssjekk'
            }
            subtitle={
              checkIn < 0
                ? 'Tallet kan være utdatert'
                : data.lastQuarterlyCheck
                  ? `Sist sjekket ${formatDate(data.lastQuarterlyCheck)}`
                  : 'Ikke sjekket ennå'
            }
            onPress={() => router.push('/kvartalssjekk')}
          />
          {permission === 'undetermined' && (
            <CardButton
              leading={<IconTile name={{ ios: 'bell.fill', android: 'notifications' }} color={Colors.tileBlue} />}
              title="Slå på påminnelser"
              subtitle="Før noe går ut, og når det er tid for kvartalssjekk"
              onPress={requestPermission}
            />
          )}
        </View>

        {actions.length > 0 && (
          <Section header="Neste å gjøre" separatorInset={56}>
            {actions.map((action, i) => (
              <Task key={i} action={action} />
            ))}
          </Section>
        )}

        <CardButton
          leading={<IconTile glyph="!" color={Colors.tileRed} />}
          title="Meld en skade"
          onPress={() => Alert.alert('Skadeveiviser', 'Kommer i en senere versjon.')}
        />
      </Screen>
    </>
  );
}

/** Doing a task means recording it, so each one opens the stockpile form, prefilled. */
function taskHref(action: NextAction): Href {
  switch (action.kind) {
    case 'buyWater':
      return { pathname: '/vare', params: { category: 'water', litres: String(action.litres) } };
    case 'buyFood':
      return { pathname: '/vare', params: { category: 'food', personDays: String(action.personDays) } };
    case 'replace':
      return { pathname: '/vare', params: { id: action.item.id } };
    case 'getEssential':
      return { pathname: '/vare', params: { category: action.category } };
  }
}

function Task({ action }: { action: NextAction }) {
  const { title, subtitle } = describeAction(action);
  const change = 'dayChange' in action ? formatDayChange(action.dayChange) : undefined;
  return (
    <Row
      title={title}
      subtitle={subtitle}
      onPress={() => router.push(taskHref(action))}
      leading={<View style={styles.check} />}
      trailing={change && <Pill label={change} tone={'dayChange' in action && action.dayChange > 0 ? 'accent' : 'warning'} />}
    />
  );
}

const styles = StyleSheet.create({
  top: { gap: 14 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accentSoft,
  },
  avatarText: { color: Colors.accent, fontSize: 15, fontWeight: '600' },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.tertiaryLabel },
});
