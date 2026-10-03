import { Platform } from 'react-native';

/**
 * Icons for header buttons and menus. iOS takes SF Symbol names; Android only takes images
 * there and silently drops a symbol name, leaving an empty button.
 */
export const ToolbarIcons = {
  plus: Platform.OS === 'ios' ? 'plus' : require('@/assets/icons/plus.png'),
  more: Platform.OS === 'ios' ? 'ellipsis' : require('@/assets/icons/more.png'),
};
