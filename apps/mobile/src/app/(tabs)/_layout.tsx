import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <NativeTabs tintColor={Colors.accent}>
      <NativeTabs.Trigger name="(hjem)">
        <NativeTabs.Trigger.Label>Hjem</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="beredskap">
        <NativeTabs.Trigger.Label>Beredskap</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'shield', selected: 'shield.fill' }} md="shield" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="eiendeler">
        <NativeTabs.Trigger.Label>Eiendeler</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'shippingbox', selected: 'shippingbox.fill' }} md="inventory_2" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="dokumenter">
        <NativeTabs.Trigger.Label>Dokumenter</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'doc.text', selected: 'doc.text.fill' }} md="description" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
