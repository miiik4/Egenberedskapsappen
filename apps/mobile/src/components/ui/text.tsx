import type { Ref } from 'react';
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';

import { Fonts } from '@/constants/theme';

/**
 * Text in the brand's typeface. React Native has no app-wide default font, and each weight of
 * Source Sans 3 is its own font file, so this picks the file from fontWeight. A style that
 * names its own fontFamily (Archivo for titles and figures) is left as it is.
 */
function brandFont(style: TextProps['style']): TextStyle | undefined {
  const flat = StyleSheet.flatten(style) ?? {};
  if (flat.fontFamily) return undefined;
  const weight = String(flat.fontWeight ?? '400');
  const file =
    weight === 'bold' || Number(weight) >= 700
      ? Fonts.body['700']
      : weight === '600'
        ? Fonts.body['600']
        : weight === '500'
          ? Fonts.body['500']
          : Fonts.body['400'];
  // The weight is in the file; asking iOS for it again would fake a bolder cut.
  return { fontFamily: file, fontWeight: 'normal' };
}

export function Text({ style, ...props }: TextProps) {
  return <NativeText {...props} style={[style, brandFont(style)]} />;
}

export function TextInput({ style, ...props }: TextInputProps & { ref?: Ref<NativeTextInput> }) {
  return <NativeTextInput {...props} style={[style, brandFont(style)]} />;
}
