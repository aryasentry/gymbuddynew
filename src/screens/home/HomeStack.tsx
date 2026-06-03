import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardScreen } from './DashboardScreen';
import { SettingsScreen } from '../settings/SettingsScreen';
import { RemindersScreen } from '../reminders/RemindersScreen';
import { WeeklyReportScreen } from '../report/WeeklyReportScreen';

export type HomeStackParamList = {
  Dashboard: undefined;
  Settings: undefined;
  Reminders: undefined;
  WeeklyReport: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Reminders" component={RemindersScreen} />
      <Stack.Screen name="WeeklyReport" component={WeeklyReportScreen} />
    </Stack.Navigator>
  );
}
