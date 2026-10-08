import { claimTotals } from '@egenberedskap/core';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { CLAIM_KIND_LABELS } from '@/claims/claim-types';
import { FormSheet } from '@/components/form/sheet';
import { PrimaryButton } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { AddRow, Row, Section } from '@/components/ui/list';
import { Text } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';
import { useData } from '@/data/data-provider';
import { countLabel, formatDate, formatKr } from '@/lib/format';

/**
 * Overview of damage claims («Meld en skade»): drafts and reported claims.
 */
export default function Skader() {
  const { claims } = useData();

  // Sort claims: latest happenedOn first
  const sortedClaims = [...claims].sort((a, b) => b.happenedOn.localeCompare(a.happenedOn));
  const drafts = sortedClaims.filter((c) => !c.reportedOn);
  const reported = sortedClaims.filter((c) => Boolean(c.reportedOn));

  return (
    <FormSheet title="Meld en skade">
      <View style={styles.intro}>
        <Text style={styles.lead}>
          Dokumenter skade eller tap på innboet ditt ved brann, vann, innbrudd eller uvær. Her samler du bilder,
          kvitteringer og tapte gjenstander, og lager en samlet skaderapport til forsikringsselskapet.
        </Text>
      </View>

      {claims.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Icon name={{ ios: 'doc.text.magnifyingglass', android: 'description' }} size={36} color={Colors.accent} />
          </View>
          <Text style={styles.emptyTitle}>Ingen skader registrert</Text>
          <Text style={styles.emptyText}>
            Har det skjedd et uhell eller innbrudd? Start en skademelding for å samle dokumentasjon.
          </Text>
          <View style={styles.emptyAction}>
            <PrimaryButton
              label="Meld ny skade"
              onPress={() => router.push('/skade')}
            />
          </View>
        </View>
      ) : (
        <>
          {drafts.length > 0 && (
            <Section header="Utkast" footer="Utkast er ikke delt med forsikringsselskapet ennå.">
              {drafts.map((claim) => {
                const totals = claimTotals(claim.items, { includeEstimates: true });
                const kind = CLAIM_KIND_LABELS[claim.kind] ?? claim.kind;
                const subtitle = `${formatDate(claim.happenedOn)} · ${countLabel(claim.items.length)}`;
                return (
                  <Row
                    key={claim.id}
                    title={kind}
                    subtitle={subtitle}
                    detail={totals.totalKr > 0 ? formatKr(totals.totalKr) : undefined}
                    chevron
                    onPress={() => router.push({ pathname: '/skade', params: { id: claim.id } })}
                  />
                );
              })}
            </Section>
          )}

          {reported.length > 0 && (
            <Section header="Meldte skader" footer="Skader som er delt eller meldt inn.">
              {reported.map((claim) => {
                const totals = claimTotals(claim.items, { includeEstimates: true });
                const kind = CLAIM_KIND_LABELS[claim.kind] ?? claim.kind;
                const subtitle = claim.reportedOn
                  ? `Meldt ${formatDate(claim.reportedOn)}`
                  : formatDate(claim.happenedOn);
                return (
                  <Row
                    key={claim.id}
                    title={kind}
                    subtitle={subtitle}
                    detail={totals.totalKr > 0 ? formatKr(totals.totalKr) : undefined}
                    chevron
                    onPress={() => router.push({ pathname: '/skade', params: { id: claim.id } })}
                  />
                );
              })}
            </Section>
          )}

          <Section>
            <AddRow title="Meld ny skade" onPress={() => router.push('/skade')} />
          </Section>
        </>
      )}
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  intro: {
    paddingHorizontal: Spacing.screen,
    paddingTop: 4,
    paddingBottom: 12,
  },
  lead: {
    fontSize: 15,
    lineHeight: 21,
    color: Colors.secondaryLabel,
  },
  emptyCard: {
    marginHorizontal: Spacing.screen,
    padding: 24,
    borderRadius: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.label,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 21,
    color: Colors.secondaryLabel,
    textAlign: 'center',
  },
  emptyAction: {
    alignSelf: 'stretch',
    marginTop: 12,
  },
});
