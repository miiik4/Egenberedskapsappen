import { assessScenarios, isExpiringSoon, type Scenario } from '@egenberedskap/core';
import { router, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { CardButton, IconTile, Section } from '@/components/ui/list';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { Colors, Spacing } from '@/constants/theme';
import { useData } from '@/data/data-provider';
import { describeGap, formatDate, scenarioName, todayIso } from '@/lib/format';

/** More gaps than this collapse into «+N til», so a scenario never turns into a wall of pills. */
const MAX_GAPS_SHOWN = 3;

export default function Beredskap() {
  const data = useData();
  const today = todayIso();
  const scenarios = assessScenarios(
    {
      household: data.household,
      items: data.stock,
      emergencyContacts: data.contacts.length,
      hasMeetingPlace: data.meetingPlace !== null,
      // Offline documents arrive in a later step.
      offlineDocuments: 0,
      // Filming arrives in a later step, so no room is filmed yet.
      rooms: data.rooms
        .filter((room) => room.propertyId === data.selectedPropertyId)
        .map((room) => ({ name: room.name, filmed: false })),
    },
    today,
  );
  const expiringSoon = data.stock.filter((item) => isExpiringSoon(item, today)).length;
  const people = `${data.household.people} ${data.household.people === 1 ? 'person' : 'personer'}`;

  return (
    <>
      <Stack.Screen options={{ title: 'Beredskap' }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="ellipsis">
          <Stack.Toolbar.MenuAction icon="checklist" onPress={() => router.push('/kvartalssjekk')}>
            Start kvartalssjekk
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="person.2" onPress={() => router.push('/husstand')}>
            Endre husstand
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>

      <Screen>
        <Text style={styles.subtitle}>
          {data.lastQuarterlyCheck ? `${people} · sist sjekket ${formatDate(data.lastQuarterlyCheck)}` : people}
        </Text>

        <Section header="Hvis dette skjer" footer="Scenarioene byttes med sesongen.">
          {scenarios.map((scenario) => (
            <ScenarioRow key={scenario.id} scenario={scenario} />
          ))}
        </Section>

        <CardButton
          leading={<IconTile name={{ ios: 'shippingbox.fill', android: 'inventory_2' }} color={Colors.tileBlue} />}
          title="Beredskapslager"
          detail={
            expiringSoon > 0
              ? `${expiringSoon} går ut snart`
              : data.stock.length === 0
                ? 'Tomt'
                : `${data.stock.length} ${data.stock.length === 1 ? 'vare' : 'varer'}`
          }
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
  const tone = scenario.id === 'homeDamage' || scenario.id === 'noNetwork' ? 'neutral' : 'warning';
  const shown = scenario.gaps.slice(0, MAX_GAPS_SHOWN);
  const hidden = scenario.gaps.length - shown.length;

  return (
    <View style={styles.scenario}>
      <View style={styles.scenarioHead}>
        <Text style={styles.scenarioTitle}>{scenarioName[scenario.id]}</Text>
        <Text style={[styles.status, status.kind === 'ready' && { color: Colors.success }]}>{label}</Text>
      </View>
      {offlineReady && <Text style={styles.note}>Møtested, kontakter og dokumenter lagret på telefonen</Text>}
      {shown.length > 0 && (
        <View style={styles.gaps}>
          {shown.map((gap, i) => (
            <Pill key={i} label={describeGap(gap)} tone={tone} />
          ))}
          {hidden > 0 && <Pill label={`+${hidden} til`} tone="neutral" />}
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
