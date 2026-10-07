import { DynamicColorIOS, Platform, type ColorValue } from 'react-native';

/**
 * The brand from the original design (Claude Design, «Egenberedskapsappen iOS v2»): navy text
 * and preparedness cards, soft white cards with a hairline border on a cool grey page, yellow
 * for what needs attention. On iOS each colour follows light and dark mode; Android gets the
 * light values until it gets its own pass.
 */
const color = (light: string, dark: string): ColorValue =>
  Platform.OS === 'ios' ? DynamicColorIOS({ light, dark }) : light;

export const Colors = {
  background: color('#F4F7FA', '#08131F'),
  card: color('#FFFFFF', '#102236'),
  /** The hairline round every card. */
  cardBorder: color('#E1E9F1', '#1D3550'),
  /** Steppers, segmented controls, date pills, round buttons. */
  fill: color('#E6EDF4', '#1B324B'),
  label: color('#0B2B4A', '#EAF2FA'),
  secondaryLabel: color('#5B7285', '#9DB2C6'),
  tertiaryLabel: color('#B4C3D2', '#4E6781'),
  separator: color('#E3EAF1', '#1D3550'),

  accent: color('#0E5FC0', '#4C9AF5'),
  accentSoft: color('#E6EFFA', '#173A63'),
  destructive: color('#D70015', '#FF5A50'),
  success: color('#248A3D', '#3DD068'),

  /** The one warning colour: the dot by something about to expire, an overfull bar. */
  warning: '#D08A1C',
  warningText: color('#8A5300', '#F1B95B'),
  warningSoft: color('#FFF1D6', '#3A2A0E'),
  /** The yellow banner, as the quarterly check on Oversikt. */
  notice: color('#FFF6E5', '#2A2111'),
  noticeBorder: color('#F3DDB0', '#4A3A1A'),
  /** Text on a pale fill, for the second avatar and similar quiet badges. */
  indigo: '#5E5CE6',
  indigoSoft: color('#E3E0F5', '#2A2856'),

  /** The navy preparedness card: the days on Oversikt. Navy in both modes. */
  hero: {
    background: color('#0B2B4A', '#123A62'),
    text: '#FFFFFF',
    muted: '#BBD6F2',
    soft: '#DCEBFA',
    track: '#23517C',
    bar: '#5FA3F0',
    caption: '#A9C5DD',
  },
} as const;

/**
 * Archivo for titles and figures, Source Sans 3 for everything else. Each weight is its own
 * font; Text in components/ui/text.tsx picks the file from fontWeight.
 */
export const Fonts = {
  display: 'Archivo_700Bold',
  displaySemibold: 'Archivo_600SemiBold',
  body: {
    '400': 'SourceSans3_400Regular',
    '500': 'SourceSans3_500Medium',
    '600': 'SourceSans3_600SemiBold',
    '700': 'SourceSans3_700Bold',
  },
} as const;

export const Radius = {
  card: 20,
  pill: 999,
  tile: 8,
} as const;

export const Spacing = {
  screen: 16,
  rowInset: 18,
} as const;
