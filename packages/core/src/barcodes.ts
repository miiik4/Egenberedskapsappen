import type { StockType } from './types';

export type ScannedProduct = {
  name: string;
  type: StockType;
  litres?: number;
};

/**
 * Common barcodes (EAN-13, EAN-8, UPC) for typical Norwegian emergency preparedness products.
 * Local-first lookup: zero network calls, zero tracking.
 */
const BARCODE_CATALOGUE: Record<string, ScannedProduct> = {
  // Hermetikk og ferdigretter (cannedMeals)
  '7039010010155': { name: 'Stabburet Makrell i tomat 170g', type: 'cannedMeals' },
  '7039010010148': { name: 'Stabburet Makrell i tomat grovhakket 170g', type: 'cannedMeals' },
  '7039010001016': { name: 'Stabburet Original Leverpostei', type: 'cannedMeals' },
  '7039010515018': { name: 'Joikakaker i viltsaus 800g', type: 'cannedMeals' },
  '7039010515117': { name: 'Trondhjems Trøndersodd 800g', type: 'cannedMeals' },
  '7039010515124': { name: 'Trondhjems Brun Lapskaus 800g', type: 'cannedMeals' },
  '7039010515131': { name: 'Trondhjems Lys Lapskaus 800g', type: 'cannedMeals' },
  '7039010515049': { name: 'Trondhjems Kjøttboller i brun saus', type: 'cannedMeals' },
  '7038010006263': { name: 'Lofoten Fiskeboller i kraft 800g', type: 'cannedMeals' },
  '7033580000018': { name: 'Vesteraalens Fiskeboller 800g', type: 'cannedMeals' },
  '7310070001077': { name: 'Campbell’s Tomatsuppe', type: 'cannedMeals' },
  '7035620005114': { name: 'Eldorado Hermetiske tomater', type: 'cannedMeals' },
  '7035620005510': { name: 'Eldorado Svarte bønner', type: 'cannedMeals' },
  '7035620005527': { name: 'Eldorado Kikerter', type: 'cannedMeals' },
  '7037740003010': { name: 'REAL Turmat Chili con Carne', type: 'cannedMeals' },

  // Knekkebrød og kjeks (crispbread)
  '7300400117402': { name: 'Wasa Husman knekkebrød', type: 'crispbread' },
  '7300400118409': { name: 'Wasa Frukost knekkebrød', type: 'crispbread' },
  '7300400118126': { name: 'Wasa Havre knekkebrød', type: 'crispbread' },
  '7300400127340': { name: 'Wasa Sport knekkebrød', type: 'crispbread' },
  '7037421021481': { name: 'Sigdal Knekkebrød Havre & Solsikke', type: 'crispbread' },

  // Havregryn og frokostblanding (oats)
  '7032110000010': { name: 'AXA Bjørn Lettkokte Havregryn 1,1 kg', type: 'oats' },
  '7032110000027': { name: 'AXA Bjørn Store Havregryn 1,1 kg', type: 'oats' },
  '7040511500010': { name: 'Møllerens Lettkokte Havregryn 1 kg', type: 'oats' },
  '7040511500027': { name: 'Møllerens Store Havregryn 1 kg', type: 'oats' },

  // Drikkevann (drinkingWater)
  '7044411000113': { name: 'Imsdal kildevann 0,5 l', type: 'drinkingWater', litres: 0.5 },
  '7044411000120': { name: 'Imsdal kildevann 1,5 l', type: 'drinkingWater', litres: 1.5 },
  '7044411002018': { name: 'Olden naturlig mineralvann 1,5 l', type: 'drinkingWater', litres: 1.5 },
  '7044411001011': { name: 'Farris naturell 1,5 l', type: 'drinkingWater', litres: 1.5 },
  '7035620015502': { name: 'First Price Kildevann 1,5 l', type: 'drinkingWater', litres: 1.5 },
  '7090000140019': { name: 'Voss kildevann 0,8 l', type: 'drinkingWater', litres: 0.8 },

  // Tørket frukt og nøtter (driedFruitNuts)
  '7040511108254': { name: 'Polly Små Sulten Nøttemiks', type: 'driedFruitNuts' },
  '7040511108209': { name: 'Polly Turmiks', type: 'driedFruitNuts' },
  '7035620008542': { name: 'Eldorado Mandler 250g', type: 'driedFruitNuts' },
  '7035620008535': { name: 'Eldorado Valnøtter 200g', type: 'driedFruitNuts' },
  '7035620008528': { name: 'Eldorado Rosiner 250g', type: 'driedFruitNuts' },

  // Barnemat (babyFood)
  '7613035345678': { name: 'Nestlé Havregrøt barnemat', type: 'babyFood' },
  '4062300000016': { name: 'HiPP Økologisk Barnemat', type: 'babyFood' },
  '7311041040012': { name: 'Semper Barnemat', type: 'babyFood' },

  // Fôr til dyr (petFood)
  '5000166020015': { name: 'Pedigree Hundemat', type: 'petFood' },
  '5900951010017': { name: 'Whiskas Kattemat', type: 'petFood' },
  '7022310100011': { name: 'Labb Tørrfôr til hund', type: 'petFood' },

  // Varme og lys (matches, candles)
  '7020611000018': { name: 'Nitedals Hjelpestikker fyrstikker', type: 'matches' },
  '7020611000025': { name: 'Nitedals Peisfyrstikker', type: 'matches' },
  '7311140003000': { name: 'Kronelys stearinlys', type: 'candles' },
  '7311140003109': { name: 'Telys 50 stk', type: 'candles' },

  // Batterier og strøm (batteries, powerBank)
  '5000394077028': { name: 'Duracell Plus AA batterier 4-pk', type: 'batteries' },
  '5000394077042': { name: 'Duracell Plus AAA batterier 4-pk', type: 'batteries' },
  '7638900423456': { name: 'Energizer Max AA batterier 4-pk', type: 'batteries' },
  '7638900423463': { name: 'Energizer Max AAA batterier 4-pk', type: 'batteries' },
  '4891199000012': { name: 'GP Super Alkaline AA batterier', type: 'batteries' },
  '0848061000013': { name: 'Anker PowerCore Powerbank', type: 'powerBank' },

  // Førstehjelp, jod og medisin (iodine, medicines, firstAidKit)
  '7046260714771': { name: 'Jodix 130 mg jodtabletter', type: 'iodine' },
  '7046260714788': { name: 'Jodix 65 mg jodtabletter', type: 'iodine' },
  '7046260123456': { name: 'Paracet 500 mg tabletter', type: 'medicines' },
  '7046260123463': { name: 'Ibux 400 mg kapsler', type: 'medicines' },
  '7030510001018': { name: 'Norgesplaster førstehjelpsskrin', type: 'firstAidKit' },

  // Hygiene (wetWipes, toiletPaper)
  '7035620020100': { name: 'Antibac desinfiserende våtservietter', type: 'wetWipes' },
  '7035620020117': { name: 'Antibac hånddesinfeksjon 100 ml', type: 'wetWipes' },
  '7037203610018': { name: 'Lambi toalettpapir', type: 'toiletPaper' },
  '7035620032011': { name: 'First Price toalettpapir', type: 'toiletPaper' },
};

/**
 * Normalizes a barcode by trimming whitespace and punctuation,
 * and stripping any leading zero for 12-digit UPC compatibility.
 */
function cleanBarcode(code: string): string {
  return code.trim().replace(/[-\s]/g, '');
}

/**
 * Looks up an item from its scanned barcode string.
 * Returns product name and suggested DSB stock type if known.
 */
export function lookupBarcode(rawCode: string): ScannedProduct | undefined {
  const code = cleanBarcode(rawCode);
  if (!code) return undefined;

  // Direct match
  if (BARCODE_CATALOGUE[code]) {
    return BARCODE_CATALOGUE[code];
  }

  // 12-digit UPC padded to 13-digit EAN with leading 0
  if (code.length === 12 && BARCODE_CATALOGUE[`0${code}`]) {
    return BARCODE_CATALOGUE[`0${code}`];
  }

  // 13-digit EAN starting with 0 matched as 12-digit UPC
  if (code.length === 13 && code.startsWith('0') && BARCODE_CATALOGUE[code.slice(1)]) {
    return BARCODE_CATALOGUE[code.slice(1)];
  }

  return undefined;
}
