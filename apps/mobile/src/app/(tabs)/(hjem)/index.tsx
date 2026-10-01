import { computeCoverage, daysUntilQuarterlyCheck, nextActions, type NextAction } from '@egenberedskap/core';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { DaysCard } from '@/components/home/days-card';
import { Icon } from '@/components/ui/icon';
import { CardButton, IconTile, Row, Section } from '@/components/ui/list';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { Colors } from '@/constants/theme';
import { describeAction, formatDate, formatDayChange, greeting, initials, todayIso } from '@/lib/format';
import { household, lastQuarterlyCheck, properties, stock, user } from '@/lib/sample-data';

const TASKS_ON_HOME = 3;

export default function Home() {
  const today = todayIso();
  const coverage = computeCoverage(household, stock, today);
  const actions = nextActions(household, stock, today).slice(0, TASKS_ON_HOME);
  const checkIn = daysUntilQuarterlyCheck(lastQuarterlyCheck, today);
  const [property, setProperty] = useState(properties[0]!.id);
  const [done, setDone] = useState<Set<number>>(new Set());

  const toggle = (i: number) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <>
      <Stack.Screen options={{ title: `${greeting()}, ${user.firstName}` }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Menu>
          <Stack.Toolbar.Label>{properties.find((p) => p.id === property)!.name}</Stack.Toolbar.Label>
          {properties.map((p) => (
            <Stack.Toolbar.MenuAction key={p.id} isOn={p.id === property} onPress={() => setProperty(p.id)}>
              {p.name}
            </Stack.Toolbar.MenuAction>
          ))}
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View hidesSharedBackground>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(user.name)}</Text>
          </View>
        </Stack.Toolbar.View>
      </Stack.Toolbar>

      <Screen>
        <View style={styles.top}>
          <DaysCard coverage={coverage} onPress={() => router.navigate('/beredskap')} />
          <CardButton
            leading={<IconTile name={{ ios: 'clock', android: 'schedule' }} color={Colors.tileOrange} />}
            title={
              checkIn > 0
                ? `Kvartalssjekk om ${checkIn} ${checkIn === 1 ? 'dag' : 'dager'}`
                : 'Tid for kvartalssjekk'
            }
            subtitle={
              checkIn < 0
                ? 'Tallet kan være utdatert'
                : `Sist sjekket ${formatDate(lastQuarterlyCheck)}`
            }
            onPress={() => router.push('/kvartalssjekk')}
          />
        </View>

        {actions.length > 0 && (
          <Section header="Neste å gjøre" separatorInset={56}>
            {actions.map((action, i) => (
              <Task key={i} action={action} done={done.has(i)} onToggle={() => toggle(i)} />
            ))}
          </Section>
        )}

        <CardButton
          leading={<IconTile glyph="!" color={Colors.tileRed} />}
          title="Meld en skade"
          onPress={() => Alert.alert('Skadeveiviser', 'Kommer snart.')}
        />
      </Screen>
    </>
  );
}

function Task({ action, done, onToggle }: { action: NextAction; done: boolean; onToggle: () => void }) {
  const { title, subtitle } = describeAction(action);
  const change = 'dayChange' in action ? formatDayChange(action.dayChange) : undefined;
  return (
    <Row
      title={title}
      subtitle={subtitle}
      titleColor={done ? Colors.secondaryLabel : undefined}
      leading={
        <Pressable
          onPress={onToggle}
          hitSlop={10}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={title}
          style={[styles.check, done && styles.checkDone]}>
          {done && <Icon name={{ ios: 'checkmark', android: 'check' }} size={12} color="#FFFFFF" />}
        </Pressable>
      }
      trailing={
        change && <Pill label={change} tone={'dayChange' in action && action.dayChange > 0 ? 'accent' : 'warning'} />
      }
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
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.tertiaryLabel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: { backgroundColor: Colors.accent, borderColor: Colors.accent },
});
