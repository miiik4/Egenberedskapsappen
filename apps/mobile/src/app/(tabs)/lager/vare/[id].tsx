import {
  CATEGORIES,
  CATEGORY_NAMES,
  computeCoverage,
  daysBetween,
  EXPIRY_REMINDER_DAYS,
  isExpired,
  isExpiringSoon,
  MEALS_PER_PERSON_PER_DAY,
  renewedDates,
  shelfLifeEnd,
  stockType,
  STORED_WATER_SHELF_LIFE_MONTHS,
  typesFor,
  WATER_LITRES_PER_PERSON_PER_DAY,
  type StockCategory,
  type StockItem,
  type StockType,
} from '@egenberedskap/core';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  confirmDelete,
  CountField,
  DateField,
  DestructiveButton,
  NumberField,
  parseNumber,
  TextField,
} from '@/components/form/fields';
import { MenuField } from '@/components/form/menu-field';
import { WarningDot } from '@/components/ui/check-circle';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Row, Section } from '@/components/ui/list';
import { Screen } from '@/components/ui/screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useActions, useData } from '@/data/data-provider';
import { capitalize, formatDate, formatDays, formatDuration, formatExpiry, todayIso } from '@/lib/format';
import { Text } from '@/components/ui/text';

/**
 * One item, edited where it's shown: every field saves on its own, the text ones when editing ends, so
 * there's no edit mode and nothing to cancel. «Ny vare» stays a sheet: a new item has nothing to show
 * until it's saved.
 */
export default function Vare() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { stock } = useData();
  const item = stock.find((i) => i.id === id);
  // Deleted from this page: confirmDelete goes back once it's gone.
  if (!item) return null;
  return <Editor key={item.id} item={item} />;
}

function Editor({ item }: { item: StockItem }) {
  const { household } = useData();
  const { saveStockItem, deleteStockItem } = useActions();
  const type = stockType(item.type);
  const today = todayIso();

  // The text fields are typed into freely and saved when editing ends: a save reloads everything.
  const [name, setName] = useState(item.name);
  const [location, setLocation] = useState(item.location);
  const [litres, setLitres] = useState(item.litres !== undefined ? String(item.litres) : '');
  const [meals, setMeals] = useState(item.meals !== undefined ? String(item.meals) : '');

  const update = async (changes: Partial<StockItem>) => {
    const next = { ...item, ...changes };
    // Clearing a date means leaving it out, not saving it as undefined.
    if (!next.expiresOn) delete next.expiresOn;
    if (!next.boughtOn) delete next.boughtOn;
    await saveStockItem(next);
  };
  const saveName = () => {
    const next = name.trim() || type.name;
    if (next !== name) setName(next);
    if (next !== item.name) update({ name: next });
  };
  const saveLocation = () => {
    if (location.trim() !== item.location) update({ location: location.trim() });
  };
  // An amount must stay a positive number; anything else goes back to what's saved.
  const saveAmount = (
    text: string,
    saved: number | undefined,
    field: 'litres' | 'meals',
    reset: (t: string) => void,
  ) => {
    const amount = parseNumber(text);
    if (amount !== undefined && amount > 0) {
      if (amount !== saved) update({ [field]: amount });
    } else {
      reset(saved !== undefined ? String(saved) : '');
    }
  };
  // Changing to water or food needs an amount; the count stands in until the user types one.
  const changeType = (next: StockType) => {
    const changes: Partial<StockItem> = { type: next };
    const { measure } = stockType(next);
    if (measure === 'litres' && item.litres === undefined) {
      changes.litres = item.quantity;
      setLitres(String(item.quantity));
    }
    if (measure === 'meals' && item.meals === undefined) {
      changes.meals = item.quantity;
      setMeals(String(item.quantity));
    }
    update(changes);
  };
  const changeCategory = (next: StockCategory) => changeType(typesFor(household, next)[0]!.id);
  // Types the household doesn't list (baby food without small children) stay pickable for an item that has one.
  const typeOptions = typesFor(household, type.category).some((t) => t.id === item.type)
    ? typesFor(household, type.category)
    : [...typesFor(household, type.category), type];

  // «Bytt innen» follows «Fylt» while it's empty or where the filling date put it; a date of the user's own stays.
  const filled = (boughtOn: string | undefined) => {
    const follows = !item.expiresOn || (item.boughtOn && item.expiresOn === shelfLifeEnd(item.type, item.boughtOn));
    const expiresOn = boughtOn && follows ? shelfLifeEnd(item.type, boughtOn) : undefined;
    return update({ boughtOn, ...(expiresOn && { expiresOn }) });
  };
  // Replaced today; with nothing to say how long the new one keeps, the old date goes and the user sets one.
  const replaced = () => update(renewedDates(item, today) ?? { boughtOn: today, expiresOn: undefined });

  const litresPerDay = computeCoverage(household, [], today).litresPerDay;

  return (
    <>
      <Stack.Screen options={{ title: item.name }} />

      <Screen keyboard>
        <ExpiryCard item={item} today={today} />

        <Section header="Vare">
          <TextField label="Navn" value={name} onChange={setName} onEndEditing={saveName} placeholder={type.name} />
          <MenuField
            label="Kategori"
            value={type.category}
            options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_NAMES[c] }))}
            onChange={changeCategory}
          />
          <MenuField
            label="Type"
            value={item.type}
            options={typeOptions.map((t) => ({ value: t.id, label: t.name }))}
            onChange={changeType}
          />
        </Section>

        <Section
          header="Mengde"
          footer={
            type.measure === 'litres'
              ? `Regnestykket bruker ${WATER_LITRES_PER_PERSON_PER_DAY} liter per person per døgn, til drikke, matlaging og hygiene.`
              : type.measure === 'meals'
                ? `Omtrent hvor mange måltider alt dette gir. ${MEALS_PER_PERSON_PER_DAY} måltider er ett døgn for én person.`
                : undefined
          }
        >
          {type.measure === 'litres' ? (
            <>
              <NumberField
                label="Antall liter"
                value={litres}
                onChange={setLitres}
                onEndEditing={() => saveAmount(litres, item.litres, 'litres', setLitres)}
                unit="l"
                decimals
              />
              <Row title="Dekker" detail={formatDays(Math.floor((item.litres ?? 0) / litresPerDay))} />
            </>
          ) : (
            <>
              <CountField label="Antall" value={item.quantity} onChange={(quantity) => update({ quantity })} max={99} />
              {type.measure === 'meals' && (
                <NumberField
                  label="Rekker til"
                  value={meals}
                  onChange={setMeals}
                  onEndEditing={() => saveAmount(meals, item.meals, 'meals', setMeals)}
                  unit="måltider"
                  decimals
                />
              )}
            </>
          )}
        </Section>

        <Section
          header="Holdbarhet"
          footer={
            type.shelfLifeMonths
              ? `«Fylt» er sist vannet ble byttet. «Bytt innen» følger ${STORED_WATER_SHELF_LIFE_MONTHS} måneder etter, som DSB anbefaler, til dere setter en egen dato. Vann på flaske: bruk datoen på flasken.`
              : 'Varen slutter å telle dagen etter at den har gått ut.'
          }
        >
          <DateField
            label={type.shelfLifeMonths ? 'Fylt' : 'Kjøpt'}
            value={item.boughtOn}
            onChange={type.shelfLifeMonths ? filled : (boughtOn) => update({ boughtOn })}
            suggest={0}
          />
          <DateField
            label={type.shelfLifeMonths ? 'Bytt innen' : 'Går ut'}
            value={item.expiresOn}
            onChange={(expiresOn) => update({ expiresOn })}
          />
          <Row
            title="Påminnelse"
            trailing={
              <Switch
                value={item.remind}
                onValueChange={(remind) => update({ remind })}
                accessibilityLabel="Påminnelse"
              />
            }
          />
          {item.remind && item.expiresOn && (
            <Row title="Varsle meg" detail={`${formatDuration(EXPIRY_REMINDER_DAYS)} før`} />
          )}
        </Section>

        <Section header="Plassering">
          <TextField
            label="Hvor"
            value={location}
            onChange={setLocation}
            onEndEditing={saveLocation}
            placeholder="F.eks. bod"
          />
        </Section>

        {item.expiresOn && (
          <Pressable
            onPress={replaced}
            accessibilityRole="button"
            style={({ pressed }) => [styles.replaced, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.replacedText}>Merk som byttet</Text>
          </Pressable>
        )}

        <DestructiveButton
          label="Slett vare"
          onPress={() => confirmDelete('Slette varen?', item.name, () => deleteStockItem(item.id))}
        />
      </Screen>
    </>
  );
}

/** «Går ut om 9 dager · Bytt vannet innen 14. oktober», with the one orange dot. */
function ExpiryCard({ item, today }: { item: StockItem; today: string }) {
  if (!item.expiresOn || !(isExpiringSoon(item, today) || isExpired(item, today))) return null;
  const left = daysBetween(today, item.expiresOn);
  return (
    <Card>
      <View style={styles.expiry}>
        <WarningDot />
        <View style={styles.expiryText}>
          <Text style={styles.expiryTitle}>{capitalize(formatExpiry(left))}</Text>
          <Text style={styles.expirySub}>
            {left < 0
              ? 'Teller ikke lenger med i døgnene'
              : `Bytt ${item.name.toLowerCase()} innen ${formatDate(item.expiresOn)}`}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  expiry: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  expiryText: { flex: 1 },
  expiryTitle: { fontSize: 17, fontWeight: '600', color: Colors.label },
  expirySub: { fontSize: 15, color: Colors.secondaryLabel },
  replaced: {
    marginHorizontal: Spacing.screen,
    height: 52,
    borderRadius: Radius.pill,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accentSoft,
  },
  replacedText: { fontSize: 17, fontWeight: '600', color: Colors.accent },
});
