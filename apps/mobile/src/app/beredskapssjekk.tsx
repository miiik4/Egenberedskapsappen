import { addDays, EXPIRY_REVIEW_AFTER_DAYS, expiresBeforeNextCheck, nextCheck, renewExpiring } from '@egenberedskap/core';
import { router, type Href } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useActions, useData } from '@/data/data-provider';
import { useNotifications } from '@/notifications/notifications-provider';
import { formatDate, formatMonths, householdLabel, todayIso } from '@/lib/format';
import { Text } from '@/components/ui/text';

type Step = {
  key: string;
  question: string;
  detail?: string;
  /** The first answer is the "all good" one and gets the filled button. */
  answers: [string, string];
  /** Where to go after saving if the second answer was chosen, to put it right. */
  fix?: Href;
};

export default function Beredskapssjekk() {
  const { household, stock, checkIntervalMonths } = useData();
  const { recordCheck, setExpiryReview, saveStockItem } = useActions();
  const { permission, requestPermission } = useNotifications();
  const insets = useSafeAreaInsets();
  // A page sheet on iOS; on Android a full screen drawn edge to edge, so keep clear of the system bars.
  const android = Platform.OS === 'android';
  const today = todayIso();
  const expiring = stock.filter(
    (item) => item.expiresOn && expiresBeforeNextCheck(item.expiresOn, today, checkIntervalMonths),
  ).length;
  const untilNextCheck = formatMonths(checkIntervalMonths);

  const steps: Step[] = [
    {
      key: 'household',
      question: `Er dere fortsatt ${householdLabel(household)}?`,
      answers: ['Ja', 'Nei, endre'],
      fix: '/husstand',
    },
    {
      key: 'expiry',
      question: 'Gå gjennom utløpsdatoer',
      detail:
        expiring > 0
          ? `${expiring} ${expiring === 1 ? 'vare går' : 'varer går'} ut innen ${untilNextCheck}`
          : `Ingen varer går ut innen ${untilNextCheck}`,
      answers: ['Byttet', 'Påminn meg'],
    },
    { key: 'equipment', question: 'Test lommelykt og radio', answers: ['Virker', 'Må fikses'] },
    { key: 'contacts', question: 'Stemmer nødkontaktene?', answers: ['Ja', 'Endre'], fix: '/nodinfo' },
  ];

  const [answers, setAnswers] = useState<string[]>([]);
  const current = answers.length;
  const complete = current === steps.length;
  const answer = (value: string) => setAnswers((prev) => [...prev, value]);
  // A second tap before the screen closes would record the check twice.
  const saving = useRef(false);

  const save = async () => {
    if (saving.current) return;
    saving.current = true;
    const answered = Object.fromEntries(steps.map((step, i) => [step.key, answers[i]!]));
    // «Byttet»: what the check brought up was bought today. Dates first, so a failure leaves the check unrecorded.
    const { renewed, needDate } =
      answered.expiry === 'Byttet' ? renewExpiring(stock, today, checkIntervalMonths) : { renewed: [], needDate: [] };
    try {
      for (const item of renewed) await saveStockItem(item);
      await recordCheck(answered);
      if (answered.expiry === 'Påminn meg') {
        await setExpiryReview(addDays(today, EXPIRY_REVIEW_AFTER_DAYS));
        if (permission === 'undetermined') await requestPermission();
      }
    } catch (error) {
      saving.current = false;
      throw error;
    }
    // Open the first thing that needs putting right, if any.
    const fix = steps.find((step, i) => step.fix && answers[i] === step.answers[1])?.fix;
    router.back();
    if (fix) router.navigate(fix);
    const [first] = needDate;
    if (first) {
      // With no shelf life to go by, only the new pack knows the date.
      const href: Href =
        needDate.length === 1 ? { pathname: '/lager/vare/[id]', params: { id: first.id } } : '/lager';
      Alert.alert(
        `${needDate.length} ${needDate.length === 1 ? 'vare trenger' : 'varer trenger'} ny dato`,
        'Sett utløpsdatoen fra den nye pakningen.',
        [
          { text: 'Senere', style: 'cancel' },
          { text: 'Til lageret', onPress: () => router.navigate(href, { withAnchor: true }) },
        ],
      );
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, android && { paddingBottom: insets.bottom + 40 }]}>
      <View style={[styles.topBar, android && { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Lukk"
          hitSlop={8}
          style={styles.close}>
          <Icon name={{ ios: 'xmark', android: 'close' }} size={15} color={Colors.label} />
        </Pressable>
        <Text style={styles.duration}>Ca. 5 minutter</Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.intro}>
        <Text style={styles.title}>Beredskapssjekk</Text>
        <Text style={styles.lead}>Beredskap blir fort utdatert. Fire raske spørsmål holder tallet riktig.</Text>
      </View>

      <View style={styles.card}>
        {steps.map((step, i) => {
          const state = i < current ? 'done' : i === current ? 'active' : 'pending';
          return (
            <View key={step.key} style={[styles.step, i > 0 && styles.stepDivider]}>
              <View
                style={[
                  styles.badge,
                  state === 'done' && { backgroundColor: Colors.success, borderColor: Colors.success },
                  state === 'active' && { backgroundColor: Colors.accent, borderColor: Colors.accent },
                ]}>
                {state === 'done' ? (
                  <Icon name={{ ios: 'checkmark', android: 'check' }} size={11} color="#FFFFFF" />
                ) : (
                  <Text style={[styles.badgeText, state === 'active' && { color: '#FFFFFF' }]}>{i + 1}</Text>
                )}
              </View>
              <View style={styles.stepBody}>
                <Text
                  style={[
                    styles.question,
                    state === 'active' && styles.questionActive,
                    state === 'pending' && { color: Colors.secondaryLabel },
                  ]}>
                  {step.question}
                </Text>
                {state === 'done' && <Text style={styles.detail}>{answers[i]}</Text>}
                {state === 'active' && step.detail && <Text style={styles.detail}>{step.detail}</Text>}
                {state === 'active' && (
                  <View style={styles.actions}>
                    {step.answers.map((label, a) => (
                      <Pressable
                        key={label}
                        onPress={() => answer(label)}
                        style={({ pressed }) => [
                          styles.action,
                          a === 0 ? styles.actionPrimary : styles.actionSecondary,
                          pressed && { opacity: 0.8 },
                        ]}>
                        <Text style={[styles.actionText, a === 0 && { color: '#FFFFFF' }]}>{label}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <Text style={styles.footnote}>
        Neste sjekk blir foreslått rundt {formatDate(nextCheck(today, checkIntervalMonths))}. Hvor ofte velger du under
        Husstand.
      </Text>

      {complete && (
        <Pressable onPress={save} style={[styles.action, styles.actionPrimary, styles.save]}>
          <Text style={[styles.actionText, { color: '#FFFFFF' }]}>Lagre sjekken</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40, gap: 20 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screen,
    paddingTop: 16,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.fill,
  },
  spacer: { width: 44 },
  duration: { fontSize: 15, color: Colors.secondaryLabel },
  intro: { paddingHorizontal: Spacing.screen + 4, gap: 6 },
  title: { fontFamily: Fonts.display, fontSize: 32, letterSpacing: -0.6, color: Colors.label },
  lead: { fontSize: 17, lineHeight: 23, color: Colors.secondaryLabel },
  card: {
    marginHorizontal: Spacing.screen,
    borderRadius: Radius.card,
    borderCurve: 'continuous',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  step: { flexDirection: 'row', gap: 14, paddingHorizontal: Spacing.rowInset, paddingVertical: 13 },
  stepDivider: { borderTopWidth: 1, borderTopColor: Colors.separator },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: Colors.tertiaryLabel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 14, fontWeight: '600', color: Colors.secondaryLabel },
  stepBody: { flex: 1, gap: 2 },
  question: { fontSize: 17, color: Colors.label },
  questionActive: { fontWeight: '600' },
  detail: { fontSize: 15, color: Colors.secondaryLabel },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  action: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: Radius.pill },
  actionPrimary: { backgroundColor: Colors.accent },
  actionSecondary: { backgroundColor: Colors.fill },
  actionText: { fontSize: 15, fontWeight: '600', color: Colors.label },
  footnote: { marginHorizontal: Spacing.screen + Spacing.rowInset, marginTop: -12, fontSize: 13, color: Colors.secondaryLabel },
  save: { flex: 0, marginHorizontal: Spacing.screen },
});
