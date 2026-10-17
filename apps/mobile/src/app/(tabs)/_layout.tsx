import { Tabs } from 'expo-router/js-tabs';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Platform, StyleSheet, Text } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

/**
 * The four tabs. iOS gets the system tab bar. Android gets the JavaScript one: Material's
 * bottom navigation is 80 dp tall against 49 on iOS, and it rasterises its icons from the
 * Material Symbols font after the bar is on screen, so they didn't always turn up.
 */
export default function TabsLayout() {
  return Platform.OS === 'ios' ? <IosTabs /> : <AndroidTabs />;
}

function IosTabs() {
  return (
    <NativeTabs
      tintColor={Colors.accent}
      iconColor={{ default: Colors.secondaryLabel, selected: Colors.accent }}
      labelStyle={{
        default: { fontFamily: Fonts.body['600'], color: Colors.secondaryLabel },
        selected: { fontFamily: Fonts.body['600'], color: Colors.accent },
      }}>
      <NativeTabs.Trigger name="(oversikt)">
        <NativeTabs.Trigger.Label>Oversikt</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'gauge.with.needle', selected: 'gauge.with.needle.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="lager">
        <NativeTabs.Trigger.Label>Lager</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'checklist', selected: 'checklist' }} />
      </NativeTabs.Trigger>
      {/* Always one tap away, also in a crisis. Never locked. */}
      <NativeTabs.Trigger name="nodinfo">
        <NativeTabs.Trigger.Label>Nødinfo</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'cross', selected: 'cross.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="eiendeler">
        <NativeTabs.Trigger.Label>Eiendeler</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'shippingbox', selected: 'shippingbox.fill' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

/**
 * The same tabs with Material Symbols. The glyphs are the font's code points for `speed`,
 * `checklist`, `emergency` and `inventory_2` (`symbols.json` in expo-symbols), drawn as text
 * from the font the root layout loads, so they're in place on the first frame.
 */
const androidTabs = [
  { name: '(oversikt)', title: 'Oversikt', glyph: '' },
  { name: 'lager', title: 'Lager', glyph: '' },
  // Always one tap away, also in a crisis. Never locked.
  { name: 'nodinfo', title: 'Nødinfo', glyph: '' },
  { name: 'eiendeler', title: 'Eiendeler', glyph: '' },
] as const;

function AndroidTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.secondaryLabel,
        tabBarStyle: styles.bar,
        tabBarLabelStyle: styles.label,
        tabBarHideOnKeyboard: true,
      }}>
      {androidTabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => (
              <Text allowFontScaling={false} style={[styles.icon, { color, fontSize: size, lineHeight: size }]}>
                {tab.glyph}
              </Text>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  // The iOS look: a hairline over a white bar, no Material elevation.
  bar: { backgroundColor: Colors.card, borderTopColor: Colors.cardBorder, elevation: 0 },
  label: { fontFamily: Fonts.body['600'], fontSize: 11 },
  icon: { fontFamily: Fonts.symbols, includeFontPadding: false },
});
