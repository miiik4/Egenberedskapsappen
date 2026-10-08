import {
  CATEGORIES,
  CATEGORY_NAMES,
  isStockType,
  lookupBarcode,
  MEALS_PER_PERSON_PER_DAY,
  stockType,
  suggestType,
  typesFor,
  WATER_LITRES_PER_PERSON_PER_DAY,
  type StockCategory,
  type StockType,
} from '@egenberedskap/core';
import type { StockDraft } from '@egenberedskap/store';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Switch } from 'react-native';

import { confirmDelete, CountField, DateField, DestructiveButton, NumberField, parseNumber, TextField } from '@/components/form/fields';
import { MenuField } from '@/components/form/menu-field';
import { FormSheet } from '@/components/form/sheet';
import { Icon } from '@/components/ui/icon';
import { Row, Section } from '@/components/ui/list';
import { Colors } from '@/constants/theme';
import { useActions, useData } from '@/data/data-provider';
import { registerBarcodeCallback } from '@/lib/scanner';

type Params = { id?: string; type?: string; litres?: string; meals?: string; barcode?: string };

/**
 * «Ny vare», the same sheet from every «+» and «Legg til», and for editing. Category and type
 * are menus so the item lands in the right place; a type is suggested from the name. Tasks on
 * Oversikt open it prefilled, e.g. `?type=drinkingWater&litres=12`.
 */
export default function Vare() {
  const params = useLocalSearchParams<Params>();
  const { stock, household } = useData();
  const { saveStockItem, deleteStockItem } = useActions();
  const existing = stock.find((item) => item.id === params.id);

  const barcodeInitial = params.barcode ? lookupBarcode(params.barcode) : undefined;

  const initialType: StockType =
    existing?.type ??
    (params.type && isStockType(params.type)
      ? params.type
      : barcodeInitial?.type ?? (typesFor(household, 'water')[0]?.id ?? 'drinkingWater'));
  const [type, setType] = useState<StockType>(initialType);
  // Once the user picks a type themselves, the name stops steering it.
  const [typeChosen, setTypeChosen] = useState(existing !== undefined || params.type !== undefined || barcodeInitial !== undefined);
  const [name, setName] = useState(
    existing?.name ?? barcodeInitial?.name ?? (params.barcode ? `Strekkode ${params.barcode}` : '')
  );
  const [quantity, setQuantity] = useState(existing?.quantity ?? 1);
  const [litres, setLitres] = useState(
    existing?.litres !== undefined
      ? String(existing.litres)
      : barcodeInitial?.litres !== undefined
        ? String(barcodeInitial.litres)
        : (params.litres ?? '')
  );
  const [meals, setMeals] = useState(existing?.meals !== undefined ? String(existing.meals) : (params.meals ?? ''));
  const [expiresOn, setExpiresOn] = useState(existing?.expiresOn);
  const [remind, setRemind] = useState(existing?.remind ?? true);
  const [location, setLocation] = useState(existing?.location ?? '');
  const [scannedCode, setScannedCode] = useState<string | null>(params.barcode ?? null);

  const applyBarcode = (barcode: string) => {
    setScannedCode(barcode);
    const known = lookupBarcode(barcode);
    if (known) {
      setName(known.name);
      setType(known.type);
      setTypeChosen(true);
      if (known.litres !== undefined) {
        setLitres(String(known.litres));
      }
    } else {
      setName((prev) => (prev.trim() ? prev : `Strekkode ${barcode}`));
    }
  };

  const scanBarcode = () => {
    registerBarcodeCallback(applyBarcode);
    router.push({ pathname: '/skann', params: { returnTo: '/vare' } });
  };

  const info = stockType(type);
  const category = info.category;
  // Types the household doesn't list (baby food without small children) stay pickable for an item that has one.
  const typeOptions = typesFor(household, category).some((t) => t.id === type)
    ? typesFor(household, category)
    : [...typesFor(household, category), info];

  const changeName = (text: string) => {
    setName(text);
    const guess = !typeChosen && suggestType(text);
    if (guess) setType(guess);
  };
  const changeCategory = (next: StockCategory) => {
    setType(typesFor(household, next)[0]!.id);
    setTypeChosen(true);
  };

  const amountOk =
    info.measure === 'litres'
      ? (parseNumber(litres) ?? 0) > 0
      : info.measure === 'meals'
        ? (parseNumber(meals) ?? 0) > 0
        : true;

  const save = async () => {
    const draft: StockDraft = {
      id: existing?.id,
      name: name.trim() || info.name,
      type,
      quantity,
      ...(info.measure === 'litres' && { litres: parseNumber(litres)! }),
      ...(info.measure === 'meals' && { meals: parseNumber(meals)! }),
      ...(expiresOn && { expiresOn }),
      ...(existing?.boughtOn && { boughtOn: existing.boughtOn }),
      remind,
      location,
    };
    await saveStockItem(draft);
    router.back();
  };

  return (
    <FormSheet title={existing ? 'Rediger vare' : 'Ny vare'} canSave={amountOk} onSave={save}>
      <Section header="Vare">
        <TextField label="Navn" value={name} onChange={changeName} placeholder={info.name} autoFocus={!existing && !params.type} />
        <Row
          title="Skann strekkode"
          detail={scannedCode ?? undefined}
          leading={<Icon name={{ ios: 'barcode.viewfinder', android: 'barcode_scanner' }} size={18} color={Colors.accent} />}
          chevron
          onPress={scanBarcode}
        />
        <MenuField
          label="Kategori"
          value={category}
          options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_NAMES[c] }))}
          onChange={changeCategory}
        />
        <MenuField
          label="Type"
          value={type}
          options={typeOptions.map((t) => ({ value: t.id, label: t.name }))}
          onChange={(next) => {
            setType(next);
            setTypeChosen(true);
          }}
        />
      </Section>

      <Section
        header="Mengde"
        footer={
          info.measure === 'litres'
            ? `Regnestykket bruker ${WATER_LITRES_PER_PERSON_PER_DAY} liter per person per døgn, til drikke og matlaging.`
            : info.measure === 'meals'
              ? `Omtrent hvor mange måltider alt dette gir. ${MEALS_PER_PERSON_PER_DAY} måltider er ett døgn for én person.`
              : existing
                ? undefined
                : 'Vi foreslår type ut fra navnet.'
        }>
        {info.measure === 'litres' ? (
          <NumberField label="Antall liter" value={litres} onChange={setLitres} unit="l" decimals />
        ) : (
          <CountField label="Antall" value={quantity} onChange={setQuantity} max={99} />
        )}
        {info.measure === 'meals' && (
          <NumberField label="Rekker til" value={meals} onChange={setMeals} unit="måltider" decimals />
        )}
      </Section>

      <Section header="Holdbarhet" footer="Varen slutter å telle dagen etter at den har gått ut.">
        <DateField label="Går ut" value={expiresOn} onChange={setExpiresOn} />
        <Row
          title="Påminnelse"
          trailing={
            <Switch value={remind} onValueChange={setRemind} accessibilityLabel="Påminnelse" trackColor={{ true: Colors.accent }} />
          }
        />
      </Section>

      <Section header="Plassering">
        <TextField label="Hvor" value={location} onChange={setLocation} placeholder="F.eks. bod" />
      </Section>

      {existing && (
        <DestructiveButton
          label="Slett vare"
          onPress={() => confirmDelete('Slette varen?', existing.name, () => deleteStockItem(existing.id))}
        />
      )}
    </FormSheet>
  );
}
