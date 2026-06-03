import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../theme';
import { useTheme } from '../theme/useTheme';
import { MainTabParamList } from '../types';

import { HomeStackNavigator } from '../screens/home/HomeStack';
import { FoodStackNavigator } from '../screens/food/FoodLogScreen';
import { WorkoutScreen } from '../screens/workout/WorkoutScreen';
import { ProgressScreen } from '../screens/progress/ProgressScreen';
import { CoachScreen } from '../screens/coach/CoachScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<string, string> = {
  Home: '⊙',
  Food: '◈',
  Workout: '◎',
  Progress: '▦',
  Coach: '✦',
};

export function TabNavigator() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: c.bg,
          borderTopColor: c.border,
          borderTopWidth: 1,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.textMuted,
        tabBarLabel: ({ color }) => (
          <Text style={{ fontFamily: fonts.sans, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color, marginTop: -2 }}>
            {route.name}
          </Text>
        ),
        tabBarIcon: ({ color }) => (
          <Text style={{ fontSize: 18, color }}>{TAB_ICONS[route.name]}</Text>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="Food" component={FoodStackNavigator} />
      <Tab.Screen name="Workout" component={WorkoutScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Coach" component={CoachScreen} />
    </Tab.Navigator>
  );
}
