import { Platform } from 'react-native';

/**
 * Icons for header buttons and menus. iOS takes SF Symbol names; Android only takes images
 * there and silently drops a symbol name, leaving an empty button.
 */
export const ToolbarIcons = {
  plus: Platform.OS === 'ios' ? 'plus' : require('@/assets/icons/plus.png'),
  more: Platform.OS === 'ios' ? 'ellipsis' : require('@/assets/icons/more.png'),
};

/**
 * Icons for header items that are text on iOS («Rediger», the property name). Android can't
 * show a text-only button or menu at all, so it gets an icon there and iOS keeps its text.
 */
export const AndroidToolbarIcons = {
  edit: Platform.OS === 'android' ? require('@/assets/icons/edit.png') : undefined,
  home: Platform.OS === 'android' ? require('@/assets/icons/home.png') : undefined,
};
