import {
  computeCoverage,
  stockType,
  WATER_LITRES_PER_PERSON_PER_DAY,
  type HouseholdMembers,
  type StockType,
} from '@egenberedskap/core';
import type { StockDraft } from '@egenberedskap/store';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NumberField, parseNumber } from '@/components/form/fields';
import { MembersSection } from '@/components/form/members';
import { DaysHeadline, DayRows, limiterText } from '@/components/preparedness/day-rows';
import { PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle } from '@/components/ui/check-circle';
import { Icon } from '@/components/ui/icon';
import { AndroidKeyboardAvoiding } from '@/components/ui/keyboard-avoiding';
import { Row, Section } from '@/components/ui/list';
import { EGENBEREDSKAP_PLUS_ENABLED } from '@/constants/config';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useActions } from '@/data/data-provider';
import { todayIso } from '@/lib/format';
import { Text } from '@/components/ui/text';

/** Six things from DSB's list: enough for a first number without it taking long. */
const QUICK: { type: StockType; name: string; hint?: string }[] = [
  { type: 'drinkingWater', name: 'Vann på kanner', hint: `Minst ${WATER_LITRES_PER_PERSON_PER_DAY} liter per person per døgn` },
  { type: 'cannedMeals', name: 'Hermetikk og ferdigretter' },
  { type: 'heatSource', name: 'Ved eller annen varmekilde', hint: 'Som virker uten strøm' },
  { type: 'torch', name: 'Lommelykt' },
  { type: 'radio', name: 'Radio på batteri' },
  { type: 'firstAidKit', name: 'Førstehjelpsskrin' },
];

const STEPS = 3;

/**
 * «Kom i gang»: who lives at home, what they already have, and the number that gives. The
 * number comes straight away, in the same style as Oversikt.
 */
export default function Velkommen() {
  const { completeOnboarding } = useActions();
  const [step, setStep] = useState(0);
  const [members, setMembers] = useState<HouseholdMembers>({ adults: 2, seniors: 0, children: 0, infants: 0, dogs: 0, cats: 0 });
  const [have, setHave] = useState<StockType[]>([]);
  const [litres, setLitres] = useState('');
  const [meals, setMeals] = useState('');
  const [saving, setSaving] = useState(false);

  // Android's back button or gesture goes back a step, as the chevron does, instead of leaving the app.
  useEffect(() => {
    if (step === 0) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setStep(step - 1);
      return true;
    });
    return () => subscription.remove();
  }, [step]);

  const today = todayIso();
  const perDay = computeCoverage(members, [], today);
  const items: StockDraft[] = QUICK.filter((q) => have.includes(q.type)).flatMap((q): StockDraft[] => {
    const base = { name: q.name, type: q.type, quantity: 1, remind: true, location: '' };
    const { measure } = stockType(q.type);
    if (measure === 'litres') {
      const l = parseNumber(litres);
      return l ? [{ ...base, litres: l }] : [];
    }
    if (measure === 'meals') {
      const m = parseNumber(meals);
      return m ? [{ ...base, meals: m }] : [];
    }
    return [base];
  });
  const coverage = computeCoverage(
    members,
    items.map((item, i) => ({ ...item, id: String(i) })),
    today,
  );

  const toggle = (type: StockType) => {
    const on = !have.includes(type);
    setHave(on ? [...have, type] : have.filter((t) => t !== type));
    // Start from one day's worth, so the number moves; they can say more.
    if (on && type === 'drinkingWater' && !litres) setLitres(String(Math.ceil(perDay.litresPerDay)));
    if (on && type === 'cannedMeals' && !meals) setMeals(String(perDay.mealsPerDay));
  };

  const finish = async (withItems: StockDraft[]) => {
    setSaving(true);
    try {
      await completeOnboarding({ members, items: withItems });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.bar}>
        <View style={styles.barSide}>
          {step > 0 && (
            <Pressable
              onPress={() => setStep(step - 1)}
              accessibilityRole="button"
              accessibilityLabel="Tilbake"
              hitSlop={8}
              style={styles.back}>
              <Icon name={{ ios: 'chevron.left', android: 'arrow_back' }} size={17} color={Colors.label} />
            </Pressable>
          )}
        </View>
        <View style={styles.dots} accessibilityLabel={`Steg ${step + 1} av ${STEPS}`}>
          {Array.from({ length: STEPS }, (_, i) => (
            <View key={i} style={[styles.dot, i <= step && styles.dotDone, i === step && styles.dotCurrent]} />
          ))}
        </View>
        <View style={[styles.barSide, styles.barRight]}>
          {step < STEPS - 1 && (
            <Pressable onPress={() => finish([])} disabled={saving} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.skip}>Hopp over</Text>
            </Pressable>
          )}
        </View>
      </View>

      <AndroidKeyboardAvoiding>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets>
          {step === 0 && (
            <>
              <Intro title="Hvem bor hjemme?" lead="Vi bruker dette til å regne ut hvor mye dere trenger." />
              <MembersSection
                value={members}
                onChange={setMembers}
                footer="Bare antall per aldersgruppe. Ingen navn eller fødselsdatoer."
              />
              {EGENBEREDSKAP_PLUS_ENABLED && (
                <Pressable onPress={() => router.push('/gjenopprett')} accessibilityRole="button" hitSlop={8}>
                  <Text style={styles.restore}>Ny telefon? Gjenopprett fra sikkerhetskopi</Text>
                </Pressable>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <Intro title="Hva har dere allerede?" lead="Huk av det dere har nå. Resten kan dere fylle inn senere." />
              <Section separatorInset={56}>
                {QUICK.flatMap((q) => {
                  const on = have.includes(q.type);
                  const row = (
                    <Row key={q.type} title={q.name} subtitle={q.hint} leading={<CheckCircle on={on} />} onPress={() => toggle(q.type)} />
                  );
                  if (on && q.type === 'drinkingWater') {
                    return [row, <NumberField key="litres" label="Omtrent" value={litres} onChange={setLitres} unit="liter" decimals />];
                  }
                  if (on && q.type === 'cannedMeals') {
                    return [row, <NumberField key="meals" label="Omtrent" value={meals} onChange={setMeals} unit="måltider" />];
                  }
                  return [row];
                })}
              </Section>
            </>
          )}

          {step === 2 && (
            <>
              <View style={styles.result}>
                <Text style={styles.lead}>Uten strøm og vann klarer dere dere i</Text>
                <DaysHeadline days={coverage.days} size={64} />
                <Text style={styles.limiter}>{limiterText(coverage)}</Text>
              </View>
              <View style={styles.cardGroup}>
                <Card gap={14}>
                  <DayRows coverage={coverage} />
                </Card>
                <Text style={styles.footnote}>Det som mangler ligger klart som en handleliste i Lager.</Text>
              </View>
            </>
          )}
        </ScrollView>

        <View style={styles.bottom}>
          {step < STEPS - 1 ? (
            <PrimaryButton label="Neste" onPress={() => setStep(step + 1)} />
          ) : (
            <PrimaryButton label="Gå til oversikten" onPress={() => finish(items)} disabled={saving} />
          )}
        </View>
      </AndroidKeyboardAvoiding>
    </SafeAreaView>
  );
}

function Intro({ title, lead }: { title: string; lead: string }) {
  return (
    <View style={styles.intro}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.lead}>{lead}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  bar: { flexDirection: 'row', alignItems: 'center', height: 56, paddingHorizontal: Spacing.screen },
  barSide: { width: 96, flexDirection: 'row' },
  barRight: { justifyContent: 'flex-end' },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.card },
  dots: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.tertiaryLabel },
  dotDone: { backgroundColor: Colors.accent },
  dotCurrent: { width: 22 },
  skip: { fontSize: 17, color: Colors.accent },
  content: { paddingTop: 6, paddingBottom: 24, gap: 20 },
  intro: { paddingHorizontal: Spacing.screen + 4, gap: 6 },
  title: { fontFamily: Fonts.display, fontSize: 32, letterSpacing: -0.6, color: Colors.label },
  lead: { fontSize: 17, lineHeight: 24, color: Colors.secondaryLabel },
  restore: { textAlign: 'center', fontSize: 17, color: Colors.accent },
  result: { paddingHorizontal: Spacing.screen + 4, paddingTop: 10, gap: 2 },
  limiter: { marginTop: 8, fontSize: 17, color: Colors.label },
  cardGroup: { gap: 8 },
  footnote: { marginHorizontal: Spacing.screen + Spacing.rowInset, fontSize: 13, lineHeight: 18, color: Colors.secondaryLabel },
  bottom: { paddingHorizontal: 4, paddingTop: 12, paddingBottom: 12 },
});
