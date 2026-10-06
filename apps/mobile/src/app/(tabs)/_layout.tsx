import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <NativeTabs tintColor={Colors.accent}>
      <NativeTabs.Trigger name="(oversikt)">
        <NativeTabs.Trigger.Label>Oversikt</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'gauge.with.needle', selected: 'gauge.with.needle.fill' }} md="speed" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="lager">
        <NativeTabs.Trigger.Label>Lager</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'checklist', selected: 'checklist' }} md="checklist" />
      </NativeTabs.Trigger>
      {/* Always one tap away, also in a crisis. Never locked. */}
      <NativeTabs.Trigger name="nodinfo">
        <NativeTabs.Trigger.Label>Nødinfo</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'cross', selected: 'cross.fill' }} md="emergency" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="eiendeler">
        <NativeTabs.Trigger.Label>Eiendeler</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'shippingbox', selected: 'shippingbox.fill' }} md="inventory_2" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
