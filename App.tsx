import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, PlayfairDisplay_400Regular, PlayfairDisplay_700Bold, PlayfairDisplay_400Regular_Italic } from '@expo-google-fonts/playfair-display';
import { Lora_400Regular, Lora_700Bold, Lora_400Regular_Italic, Lora_600SemiBold } from '@expo-google-fonts/lora';

import { LoadingScreen } from './src/components/common/LoadingScreen';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useThemeStore } from './src/store/themeStore';
import { useTheme } from './src/theme/useTheme';
import { initNotifications } from './src/utils/notifications';

export default function App() {
  const { isDark } = useTheme();
  const { hydrated, hydrate } = useThemeStore();

  useEffect(() => { hydrate(); initNotifications(); }, []);

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Regular_Italic,
    Lora_400Regular,
    Lora_700Bold,
    Lora_600SemiBold,
    Lora_400Regular_Italic,
  });

  if (!fontsLoaded || !hydrated) {
    return <LoadingScreen message="GymBuddy" />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
