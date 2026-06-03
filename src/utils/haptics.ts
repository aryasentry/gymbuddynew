import { Vibration, Platform } from 'react-native';

// Lightweight tactile feedback — uses Vibration so no extra native dependency
export const haptic = {
  light: () => { if (Platform.OS === 'android') Vibration.vibrate(10); },
  medium: () => { if (Platform.OS === 'android') Vibration.vibrate(20); },
  success: () => { if (Platform.OS !== 'web') Vibration.vibrate([0, 30, 60, 30]); },
};
