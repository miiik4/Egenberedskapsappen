import {
  addDays,
  EXPIRY_REVIEW_AFTER_DAYS,
  expiringBeforeNextCheck,
  nextCheck,
  renewExpiring,
} from '@egenberedskap/core';
import { router, type Href } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckCircle } from '@/components/ui/check-circle';
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
  /** What's recorded for each answer. The first is the "all good" one and gets the filled button. */
  answers: string[];
  /** What the buttons say, when it isn't the answer itself. */
  labels?: string[];
  /** The first answer can't be given yet, e.g. «Byttet» with nothing ticked off. */
  firstDisabled?: boolean;
  /** Where to go after saving, to put it right, if `fixOn` was the answer. */
  fix?: Href;
  fixOn?: string;
};

export default function Beredskapssjekk() {
  const { household, stock, checkIntervalMonths, contacts } = useData();
  const { recordCheck, setExpiryReview, saveStockItem, setFollowUp } = useActions();
  const { permission, requestPermission } = useNotifications();
  const insets = useSafeAreaInsets();
  // A page sheet on iOS; on Android a full screen drawn edge to edge, so keep clear of the system bars.
  const android = Platform.OS === 'android';
  const today = todayIso();
  const expiring = expiringBeforeNextCheck(stock, today, checkIntervalMonths);
  const untilNextCheck = formatMonths(checkIntervalMonths);
  // What the user ticks off as replaced. Only those get new dates.
  const [replaced, setReplaced] = useState<ReadonlySet<string>>(new Set());
  const toggleReplaced = (id: string) =>
    setReplaced((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const steps: Step[] = [
    {
      key: 'household',
      question: `Er dere fortsatt ${householdLabel(household)}?`,
      answers: ['Ja', 'Nei, endre'],
      fix: '/husstand',
      fixOn: 'Nei, endre',
    },
    expiring.length > 0
      ? {
          key: 'expiry',
          question: 'Bytt det som går ut',
          detail: 'Huk av det dere har byttet',
          answers: ['Byttet', 'Påminn meg'],
          labels: [replaced.size > 0 ? `${replaced.size} byttet` : 'Byttet', 'Påminn meg'],
          firstDisabled: replaced.size === 0,
        }
      : { key: 'expiry', question: 'Utløpsdatoer', detail: `Ingenting går ut innen ${untilNextCheck}`, answers: ['OK'] },
    { key: 'equipment', question: 'Test lommelykt og radio', answers: ['Virker', 'Må fikses'] },
    contacts.length > 0
      ? { key: 'contacts', question: 'Stemmer nødkontaktene?', answers: ['Ja', 'Endre'], fix: '/nodinfo', fixOn: 'Endre' }
      : {
          key: 'contacts',
          question: 'Legg til nødkontakter',
          detail: 'Dere har ingen ennå',
          answers: ['Legg til', 'Senere'],
          fix: '/kontakt',
          fixOn: 'Legg til',
        },
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
    // «Byttet»: what was ticked off was bought today. Dates first, so a failure leaves the check unrecorded.
    const { renewed, needDate } =
      answered.expiry === 'Byttet'
        ? renewExpiring(
            expiring.filter((item) => replaced.has(item.id)),
            today,
          )
        : { renewed: [], needDate: [] };
    // Each thing to put right: the first opens now, the rest wait in «Neste å gjøre».
    const [first, ...later] = steps.filter((step, i) => step.fix && answers[i] === step.fixOn);
    try {
      for (const item of renewed) await saveStockItem(item);
      await recordCheck(answered);
      // A broken torch is fixed away from the phone, so it always waits on Oversikt.
      await setFollowUp('equipment', answered.equipment === 'Må fikses');
      // Without contacts, «Legg til en nødkontakt» on Oversikt already asks.
      await setFollowUp('contacts', later.some((step) => step.fixOn === 'Endre'));
      if (answered.expiry === 'Påminn meg') {
        await setExpiryReview(addDays(today, EXPIRY_REVIEW_AFTER_DAYS));
        if (permission === 'undetermined') await requestPermission();
      }
    } catch (error) {
      saving.current = false;
      throw error;
    }
    router.back();
    if (first?.fix) router.navigate(first.fix);
    const [undated] = needDate;
    if (undated) {
      // With no shelf life to go by, only the new pack knows the date.
      const href: Href =
        needDate.length === 1 ? { pathname: '/lager/vare/[id]', params: { id: undated.id } } : '/lager';
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
                {state === 'done' && (
                  <Text style={styles.detail}>{step.labels?.[step.answers.indexOf(answers[i]!)] ?? answers[i]}</Text>
                )}
                {state === 'active' && step.detail && <Text style={styles.detail}>{step.detail}</Text>}
                {state === 'active' && step.key === 'expiry' && expiring.length > 0 && (
                  <View style={styles.items}>
                    {expiring.map((item) => (
                      <Pressable
                        key={item.id}
                        onPress={() => toggleReplaced(item.id)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: replaced.has(item.id) }}
                        style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}>
                        <CheckCircle on={replaced.has(item.id)} />
                        <Text style={styles.itemName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.itemDate}>{formatDate(item.expiresOn!)}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                {state === 'active' && (
                  <View style={styles.actions}>
                    {step.answers.map((value, a) => {
                      const disabled = a === 0 && step.firstDisabled;
                      return (
                        <Pressable
                          key={value}
                          onPress={() => answer(value)}
                          disabled={disabled}
                          accessibilityState={{ disabled }}
                          style={({ pressed }) => [
                            styles.action,
                            a === 0 ? styles.actionPrimary : styles.actionSecondary,
                            disabled && { opacity: 0.4 },
                            pressed && { opacity: 0.8 },
                          ]}>
                          <Text style={[styles.actionText, a === 0 && { color: '#FFFFFF' }]}>{step.labels?.[a] ?? value}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <Text style={styles.footnote}>
        Neste sjekk blir foreslått rundt {formatDate(nextCheck(today, checkIntervalMonths))}. Hvor ofte velger du under
        Innstillinger.
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
  items: { marginTop: 8, gap: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  itemName: { flex: 1, fontSize: 16, color: Colors.label },
  itemDate: { fontSize: 14, color: Colors.secondaryLabel },
  action: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: Radius.pill },
  actionPrimary: { backgroundColor: Colors.accent },
  actionSecondary: { backgroundColor: Colors.fill },
  actionText: { fontSize: 15, fontWeight: '600', color: Colors.label },
  footnote: { marginHorizontal: Spacing.screen + Spacing.rowInset, marginTop: -12, fontSize: 13, color: Colors.secondaryLabel },
  save: { flex: 0, marginHorizontal: Spacing.screen },
});
