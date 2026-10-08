import {
  claimDeadline,
  claimProblems,
  claimTotals,
  isClaimKind,
  type ClaimKind,
  type IsoDate,
} from '@egenberedskap/core';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { shareClaimReport } from '@/claims/make-claim-report';
import {
  CLAIM_KIND_LABELS,
  CLAIM_KIND_OPTIONS,
  CLAIM_PROBLEM_INFO,
  DAMAGE_LABELS,
} from '@/claims/claim-types';
import { useClaims } from '@/claims/use-claims';
import {
  confirmDelete,
  DateField,
  DestructiveButton,
  NumberField,
  parseNumber,
  TextField,
} from '@/components/form/fields';
import { MenuField } from '@/components/form/menu-field';
import { FormSheet } from '@/components/form/sheet';
import { useHomeInsurance } from '@/components/preparedness/home-insurance';
import { PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { EmptyRow, Row, Section } from '@/components/ui/list';
import { Pill } from '@/components/ui/pill';
import { Text } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useData } from '@/data/data-provider';
import { storedFile } from '@/documents/files';
import type { Source } from '@/documents/use-documents';
import { countLabel, formatDate, formatDateWithYear, formatKr, todayIso } from '@/lib/format';

/**
 * Screen for creating, viewing and editing a damage claim («Meld en skade»).
 */
export default function Skade() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { claims } = useData();
  const existing = claims.find((c) => c.id === params.id);

  if (!params.id || !existing) {
    return <NewClaim existing={existing} />;
  }

  return <ExistingClaim claim={existing} />;
}

/** Form to create a new damage claim */
function NewClaim({ existing }: { existing?: (ReturnType<typeof useData>)['claims'][number] }) {
  const { properties, selectedPropertyId } = useData();
  const { saveClaim } = useClaims();

  const [kind, setKind] = useState<ClaimKind>('water');
  const [happenedOn, setHappenedOn] = useState<IsoDate | undefined>(todayIso());
  const [description, setDescription] = useState('');
  const [policeReport, setPoliceReport] = useState('');
  const [saving, setSaving] = useState(false);

  const propertyId = selectedPropertyId ?? properties[0]?.id;

  const save = async () => {
    if (!happenedOn) return;
    setSaving(true);
    try {
      const id = await saveClaim({
        id: existing?.id,
        propertyId,
        kind,
        happenedOn,
        description: description.trim(),
        policeReport: policeReport.trim() || undefined,
      });
      router.replace({ pathname: '/skade', params: { id } });
    } catch {
      Alert.alert('Kunne ikke opprette skadesak', 'Vennligst sjekk opplysningene og prøv igjen.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormSheet
      title="Meld ny skade"
      canSave={Boolean(happenedOn) && !saving}
      onSave={save}>
      <View style={styles.intro}>
        <Text style={styles.lead}>
          Hva har skjedd? Velg skadetype og dato for hendelsen. Du kan legge til bilder og berørte gjenstander i neste steg.
        </Text>
      </View>

      <Section header="Om skaden">
        <MenuField
          label="Type skade"
          value={kind}
          options={CLAIM_KIND_OPTIONS}
          onChange={(v) => isClaimKind(v) && setKind(v)}
        />
        <DateField
          label="Skadedato"
          value={happenedOn}
          onChange={setHappenedOn}
          suggest={0}
        />
        <TextField
          label="Beskrivelse"
          value={description}
          onChange={setDescription}
          placeholder="Kort om hva som skjedde"
        />
        {(kind === 'theft' || policeReport.trim() !== '') && (
          <TextField
            label="Anmeldelse"
            value={policeReport}
            onChange={setPoliceReport}
            placeholder="Politianmeldelsesnr."
            autoCapitalize="none"
          />
        )}
      </Section>

      <View style={styles.actionPadding}>
        <PrimaryButton
          label={saving ? 'Oppretter...' : 'Opprett skadesak'}
          disabled={!happenedOn || saving}
          onPress={save}
        />
      </View>
    </FormSheet>
  );
}

/** Full workspace for an existing damage claim */
function ExistingClaim({ claim }: { claim: (ReturnType<typeof useData>)['claims'][number] }) {
  const { properties, owner, policies } = useData();
  const { policy } = useHomeInsurance();
  const {
    saveClaim,
    removeClaim,
    setClaimReported,
    addPhotos,
    removePhoto,
  } = useClaims();

  const property = properties.find((p) => p.id === claim.propertyId);
  const claimPolicy = policies.find((p) => p.propertyId === claim.propertyId) ?? policy;

  // Local state for editable fields
  const [kind, setKind] = useState<ClaimKind>(claim.kind);
  const [happenedOn, setHappenedOn] = useState<IsoDate | undefined>(claim.happenedOn);
  const [description, setDescription] = useState(claim.description);
  const [policeReport, setPoliceReport] = useState(claim.policeReport ?? '');
  const [deductible, setDeductible] = useState(
    claimPolicy?.deductibleKr !== undefined ? String(claimPolicy.deductibleKr) : '',
  );
  const [sharing, setSharing] = useState(false);
  const [savingChanges, setSavingChanges] = useState(false);

  const deductibleKr = parseNumber(deductible);
  const totals = claimTotals(claim.items, { includeEstimates: true, deductibleKr });
  const problems = claimProblems(claim, claim.items, claim.photos.length, todayIso());
  const deadline = claimDeadline(claim.happenedOn);

  const hasChanges =
    kind !== claim.kind ||
    happenedOn !== claim.happenedOn ||
    description !== claim.description ||
    policeReport !== (claim.policeReport ?? '');

  const save = async () => {
    if (!happenedOn) return;
    setSavingChanges(true);
    try {
      await saveClaim({
        id: claim.id,
        propertyId: claim.propertyId,
        kind,
        happenedOn,
        description: description.trim(),
        policeReport: policeReport.trim() || undefined,
      });
      router.back();
    } catch {
      Alert.alert('Kunne ikke lagre endringene', 'Vennligst sjekk feltene og prøv igjen.');
    } finally {
      setSavingChanges(false);
    }
  };

  const handlePickPhoto = async (source: Source) => {
    try {
      await addPhotos(claim.id, source);
    } catch {
      Alert.alert('Kunne ikke legge til bilde', 'Prøv igjen.');
    }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      await shareClaimReport({
        claim,
        totals,
        deductibleKr,
        owner,
        property: property?.name,
        policyCompany: claimPolicy?.company,
      });
    } catch {
      Alert.alert('Kunne ikke lage skaderapporten', 'Prøv igjen.');
    } finally {
      setSharing(false);
    }
  };

  const toggleReported = async () => {
    const next = claim.reportedOn ? null : todayIso();
    await setClaimReported(claim.id, next);
  };

  return (
    <FormSheet
      title={CLAIM_KIND_LABELS[claim.kind] ?? 'Skade'}
      canSave={hasChanges && !savingChanges}
      onSave={save}>
      {/* Status banner */}
      <View style={styles.statusRow}>
        <Pill
          label={claim.reportedOn ? `Meldt ${formatDate(claim.reportedOn)}` : 'Utkast'}
          tone={claim.reportedOn ? 'accent' : 'warning'}
        />
        <Text style={styles.statusDate}>
          Skadedato: {formatDate(claim.happenedOn)}
        </Text>
      </View>

      {/* Calculations & Summary Card */}
      <Card gap={14}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Økonomisk sammendrag</Text>
          <Text style={styles.cardSub}>
            {countLabel(claim.items.length)}
          </Text>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Dokumentert tap</Text>
            <Text style={styles.summaryValue}>{formatKr(totals.totalKr)}</Text>
          </View>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Egenandel</Text>
            <Text style={styles.summaryValue}>
              {deductibleKr !== undefined ? formatKr(deductibleKr) : '0 kr'}
            </Text>
          </View>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Estimert erstatning</Text>
            <Text style={[styles.summaryValue, styles.highlightValue]}>
              {formatKr(totals.afterDeductibleKr)}
            </Text>
          </View>
        </View>

        <View style={styles.deadlineRow}>
          <Icon name={{ ios: 'clock', android: 'schedule' }} size={15} color={Colors.secondaryLabel} />
          <Text style={styles.deadlineText}>
            Meldingsfrist (fal. § 8-5): {formatDateWithYear(deadline)}
          </Text>
        </View>
      </Card>

      {/* Warnings & Problems */}
      {problems.length > 0 && (
        <View style={styles.problemsContainer}>
          {problems.map((problem) => {
            const info = CLAIM_PROBLEM_INFO[problem];
            return (
              <View key={problem} style={styles.problemBanner}>
                <Icon
                  name={{ ios: 'exclamationmark.triangle.fill', android: 'warning' }}
                  size={18}
                  color={Colors.warning}
                />
                <View style={styles.problemText}>
                  <Text style={styles.problemTitle}>{info.title}</Text>
                  <Text style={styles.problemDetail}>{info.detail}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Skadedetaljer */}
      <Section header="Skadeopplysninger">
        <MenuField
          label="Skadetype"
          value={kind}
          options={CLAIM_KIND_OPTIONS}
          onChange={(v) => isClaimKind(v) && setKind(v)}
        />
        <DateField
          label="Skadedato"
          value={happenedOn}
          onChange={setHappenedOn}
          suggest={0}
        />
        <TextField
          label="Beskrivelse"
          value={description}
          onChange={setDescription}
          placeholder="Hva skjedde?"
        />
        <TextField
          label="Anmeldelse"
          value={policeReport}
          onChange={setPoliceReport}
          placeholder="Politianmeldelsesnr. ved tyveri"
          autoCapitalize="none"
        />
        <NumberField
          label="Egenandel"
          value={deductible}
          onChange={setDeductible}
          unit="kr"
        />
      </Section>

      {/* Bilder av skaden */}
      <Section
        header={`Bilder av skaden (${claim.photos.length})`}
        footer="Ta oversikts- og detaljbilder av skadeomfanget. Bildene legges ved skaderapporten.">
        {claim.photos.length > 0 && (
          <View style={styles.photoGrid}>
            {claim.photos.map((photo) => (
              <View key={photo.id} style={styles.photoThumbWrapper}>
                <Pressable
                  onPress={() => router.push({ pathname: '/fil', params: { id: photo.id } })}
                  accessibilityRole="imagebutton"
                  accessibilityLabel="Vis bilde i fullskjerm">
                  <Image
                    source={{ uri: storedFile(photo.fileName).uri }}
                    style={styles.photoThumb}
                    contentFit="cover"
                  />
                </Pressable>
                <Pressable
                  onPress={() => removePhoto(photo.id)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Slett bilde"
                  style={styles.removePhotoBadge}>
                  <Icon name={{ ios: 'xmark', android: 'close' }} size={12} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}
          </View>
        )}
        <Row
          title="Ta bilde med kamera"
          titleColor={Colors.accent}
          onPress={() => handlePickPhoto('camera')}
        />
        <Row
          title="Velg fra bildebibliotek"
          titleColor={Colors.accent}
          onPress={() => handlePickPhoto('photos')}
        />
      </Section>

      {/* Gjenstander */}
      <Section
        header={`Gjenstander (${claim.items.length})`}
        footer="Legg til ting som er skadet eller stjålet for å dokumentere tapet overfor forsikringsselskapet.">
        {claim.items.length === 0 ? (
          <EmptyRow text="Ingen gjenstander er lagt til ennå." />
        ) : (
          claim.items.map((item) => {
            const damageText = DAMAGE_LABELS[item.damage] ?? item.damage;
            const subtitle = `${item.category} · ${damageText}${item.receipt ? ' · Kvittering på plass' : ''}`;
            const valueText = item.valueKr !== undefined ? formatKr(item.valueKr) : 'Uoppgitt';

            return (
              <Row
                key={item.id}
                title={item.name}
                subtitle={subtitle}
                detail={valueText}
                chevron
                onPress={() =>
                  router.push({
                    pathname: '/skade-ting',
                    params: { claimId: claim.id, itemId: item.id },
                  })
                }
              />
            );
          })
        )}
        <Row
          title="Legg til fra dokumentert innbo"
          titleColor={Colors.accent}
          onPress={() =>
            router.push({
              pathname: '/skade-ting',
              params: { claimId: claim.id, mode: 'choose' },
            })
          }
        />
        <Row
          title="Legg til annen gjenstand"
          titleColor={Colors.accent}
          onPress={() =>
            router.push({
              pathname: '/skade-ting',
              params: { claimId: claim.id, mode: 'custom' },
            })
          }
        />
      </Section>

      {/* Handlinger */}
      <Section header="Rapport og innsending">
        <Row
          title={claim.reportedOn ? 'Marker som utkast' : 'Marker som meldt til forsikring'}
          subtitle={
            claim.reportedOn
              ? `Meldt ${formatDate(claim.reportedOn)}`
              : 'Hold oversikt over når du meldte skaden'
          }
          titleColor={claim.reportedOn ? Colors.secondaryLabel : Colors.accent}
          onPress={toggleReported}
        />
      </Section>

      <View style={styles.actionPadding}>
        <PrimaryButton
          label={sharing ? 'Lager PDF...' : 'Del skaderapport (PDF)'}
          disabled={sharing}
          onPress={handleShare}
        />
      </View>

      <DestructiveButton
        label="Slett skadesak"
        onPress={() =>
          confirmDelete(
            'Slette skadesaken?',
            'Alle tilknyttede skadebilder og gjenstandsoppføringer for denne saken slettes.',
            () => removeClaim(claim.id),
          )
        }
      />
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
  actionPadding: {
    paddingHorizontal: Spacing.screen,
    paddingVertical: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screen,
    paddingVertical: 8,
  },
  statusDate: {
    fontSize: 14,
    color: Colors.secondaryLabel,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.label,
  },
  cardSub: {
    fontSize: 15,
    color: Colors.secondaryLabel,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 4,
  },
  summaryCol: {
    flex: 1,
    gap: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.secondaryLabel,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.label,
  },
  highlightValue: {
    color: Colors.accent,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.separator,
  },
  deadlineText: {
    fontSize: 13,
    color: Colors.secondaryLabel,
  },
  problemsContainer: {
    paddingHorizontal: Spacing.screen,
    gap: 8,
  },
  problemBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: Radius.card,
    backgroundColor: Colors.notice,
    borderWidth: 1,
    borderColor: Colors.noticeBorder,
  },
  problemText: {
    flex: 1,
    gap: 2,
  },
  problemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.label,
  },
  problemDetail: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.secondaryLabel,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 14,
  },
  photoThumbWrapper: {
    position: 'relative',
  },
  photoThumb: {
    width: 76,
    height: 76,
    borderRadius: 8,
    backgroundColor: Colors.fill,
  },
  removePhotoBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.destructive,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.card,
  },
});
