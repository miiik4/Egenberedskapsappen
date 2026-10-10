import { buildReport, summarizeRooms } from '@egenberedskap/core';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateField, TextField } from '@/components/form/fields';
import { FormSheet } from '@/components/form/sheet';
import { PrimaryButton } from '@/components/ui/button';
import { CheckCircle } from '@/components/ui/check-circle';
import { EmptyRow, Row, Section } from '@/components/ui/list';
import { EGENBEREDSKAP_PLUS_ENABLED } from '@/constants/config';
import { Colors } from '@/constants/theme';
import { useActions, useData } from '@/data/data-provider';
import { countLabel, formatKr } from '@/lib/format';
import { shareReport } from '@/report/make-report';
import { Text } from '@/components/ui/text';

/**
 * «Innbooversikt» as a PDF for the insurer: who it's for, which rooms, and with or without
 * pictures, estimates and receipts. Shared from the phone; nothing is sent from here.
 */
export default function Rapport() {
  const { rooms, belongings, properties, selectedPropertyId, owner } = useData();
  const { setOwner } = useActions();
  const property = properties.find((p) => p.id === selectedPropertyId);
  const summaries = summarizeRooms(belongings);
  const documented = rooms.filter((r) => r.propertyId === property?.id && summaries.has(r.id));

  const [name, setName] = useState(owner.name);
  const [birthDate, setBirthDate] = useState(owner.birthDate);
  const [chosen, setChosen] = useState(() => new Set(documented.map((r) => r.id)));
  const [pictures, setPictures] = useState(true);
  const [estimates, setEstimates] = useState(true);
  const [receipts, setReceipts] = useState(true);
  const [making, setMaking] = useState(false);
  const insets = useSafeAreaInsets();

  const roomIds = documented.filter((r) => chosen.has(r.id)).map((r) => r.id);
  const report = buildReport(documented, belongings, { roomIds, includeEstimates: estimates });

  const toggle = (id: string) =>
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const make = async () => {
    setMaking(true);
    try {
      await setOwner({ name, ...(birthDate && { birthDate }) });
      await shareReport({
        report,
        owner: { name: name.trim(), ...(birthDate && { birthDate }) },
        property: property?.name ?? '',
        includePictures: pictures,
        includeReceipts: receipts,
        includeEstimates: estimates,
      });
    } catch {
      Alert.alert('Kunne ikke lage rapporten', 'Prøv igjen.');
    } finally {
      setMaking(false);
    }
  };

  return (
    <View style={styles.root}>
      <FormSheet title="Innbooversikt">
        <Section header="Om deg" footer="Står på rapporten, så forsikringsselskapet ser hvem den gjelder.">
          <TextField label="Navn" value={name} onChange={setName} placeholder="Fornavn og etternavn" autoCapitalize="words" textContentType="name" />
          {/* A new date starts some 35 years back, closer to most birthdays than today. */}
          <DateField label="Fødselsdato" value={birthDate} onChange={setBirthDate} suggest={Math.round(-35 * 365.25)} />
        </Section>

        <Section header="Rom" separatorInset={56}>
          {documented.length === 0 && <EmptyRow text="Ingenting er registrert ennå." />}
          {documented.map((room) => {
            const summary = summaries.get(room.id)!;
            return (
              <Row
                key={room.id}
                title={room.name}
                subtitle={`${countLabel(summary.count)} · ${formatKr(summary.valueKr)}`}
                leading={<CheckCircle on={chosen.has(room.id)} />}
                onPress={() => toggle(room.id)}
              />
            );
          })}
        </Section>

        {/* Estimates only come from the AI analysis, part of Egenberedskap+ (constants/config.ts). */}
        <Section
          header="Ta med"
          footer={EGENBEREDSKAP_PLUS_ENABLED ? 'Anslåtte verdier er KI-anslag. Uten dem står tingene med, men uten verdi.' : undefined}>
          <Toggle label="Bilder" value={pictures} onChange={setPictures} />
          {EGENBEREDSKAP_PLUS_ENABLED && <Toggle label="Anslåtte verdier" value={estimates} onChange={setEstimates} />}
          <Toggle label="Kvitteringer" value={receipts} onChange={setReceipts} />
        </Section>
      </FormSheet>

      {/* Edge to edge on Android, the button keeps clear of the navigation bar. */}
      <View style={[styles.bottom, Platform.OS === 'android' && { paddingBottom: insets.bottom + 12 }]}>
        {/* Says why the button is off, when it is. */}
        <Text style={styles.summary}>
          {documented.length === 0
            ? 'Legg til ting i et rom først'
            : roomIds.length === 0
              ? 'Velg minst ett rom'
              : `${countLabel(report.count)} · ${formatKr(report.totalKr)}`}
        </Text>
        <PrimaryButton label={making ? 'Lager rapporten …' : 'Lag PDF og del'} onPress={make} disabled={report.count === 0 || making} />
      </View>
    </View>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <Row
      title={label}
      trailing={<Switch value={value} onValueChange={onChange} accessibilityLabel={label} trackColor={{ true: Colors.accent }} />}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  summary: { textAlign: 'center', fontSize: 15, color: Colors.secondaryLabel },
  bottom: { gap: 8, paddingTop: 10, paddingBottom: 34, backgroundColor: Colors.background },
});
