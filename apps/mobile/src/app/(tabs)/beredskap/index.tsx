import { assessScenarios, isExpiringSoon, type Scenario } from '@egenberedskap/core';
import { router, Stack } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { CardButton, IconTile, Section } from '@/components/ui/list';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { Colors, Spacing } from '@/constants/theme';
import { describeGap, formatDate, scenarioName, todayIso } from '@/lib/format';
import { contacts, documents, household, lastQuarterlyCheck, meetingPlace, rooms, stock } from '@/lib/sample-data';

export default function Beredskap() {
  const today = todayIso();
  const scenarios = assessScenarios(
    {
      household,
      items: stock,
      emergencyContacts: contacts.length,
      hasMeetingPlace: Boolean(meetingPlace),
      offlineDocuments: documents.length,
      rooms,
    },
    today,
  );
  const expiringSoon = stock.filter((item) => isExpiringSoon(item, today)).length;

  return (
    <>
      <Stack.Screen options={{ title: 'Beredskap' }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="ellipsis">
          <Stack.Toolbar.MenuAction icon="checklist" onPress={() => router.push('/kvartalssjekk')}>
            Start kvartalssjekk
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="person.2" onPress={() => Alert.alert('Husstand', 'Kommer snart.')}>
            Endre husstand
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>

      <Screen>
        <Text style={styles.subtitle}>
          {household.people} personer · sist sjekket {formatDate(lastQuarterlyCheck)}
        </Text>

        <Section header="Hvis dette skjer" footer="Scenarioene byttes med sesongen.">
          {scenarios.map((scenario) => (
            <ScenarioRow key={scenario.id} scenario={scenario} />
          ))}
        </Section>

        <CardButton
          leading={<IconTile name={{ ios: 'shippingbox.fill', android: 'inventory_2' }} color={Colors.tileBlue} />}
          title="Beredskapslager"
          detail={expiringSoon > 0 ? `${expiringSoon} går ut snart` : undefined}
          onPress={() => router.push('/beredskap/lager')}
        />
      </Screen>
    </>
  );
}

function ScenarioRow({ scenario }: { scenario: Scenario }) {
  const { status } = scenario;
  const label =
    status.kind === 'days'
      ? `${status.days} døgn`
      : status.kind === 'ready'
        ? 'På plass'
        : status.kind === 'partial'
          ? 'Delvis'
          : 'Ikke startet';
  const offlineReady = scenario.id === 'noNetwork' && status.kind === 'ready';

  return (
    <View style={styles.scenario}>
      <View style={styles.scenarioHead}>
        <Text style={styles.scenarioTitle}>{scenarioName[scenario.id]}</Text>
        <Text style={[styles.status, status.kind === 'ready' && { color: Colors.success }]}>{label}</Text>
      </View>
      {offlineReady && (
        <Text style={styles.note}>Møtested, kontakter og dokumenter lagret på telefonen</Text>
      )}
      {scenario.gaps.length > 0 && (
        <View style={styles.gaps}>
          {scenario.gaps.map((gap, i) => (
            <Pill
              key={i}
              label={describeGap(gap)}
              tone={scenario.id === 'homeDamage' || scenario.id === 'noNetwork' ? 'neutral' : 'warning'}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginHorizontal: Spacing.screen + 4, marginTop: -16, fontSize: 17, color: Colors.secondaryLabel },
  scenario: { paddingHorizontal: Spacing.rowInset, paddingVertical: 13, gap: 8 },
  scenarioHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  scenarioTitle: { flex: 1, fontSize: 17, color: Colors.label },
  status: { fontSize: 17, color: Colors.secondaryLabel },
  note: { fontSize: 15, color: Colors.secondaryLabel, marginTop: -4 },
  gaps: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
