import { Platform } from 'react-native';

export const colors = {
  // ── Light mode ──
  cream: '#F0ECE0',
  creamDeep: '#E8E3D5',
  creamSurface: '#F7F4EE',
  border: '#E5E0D6',
  borderDeep: '#D8D2C4',
  text: '#1a1714',
  textSecondary: '#5c5850',
  textMuted: '#9c9488',
  orange: '#D4721E',
  orangeSoft: '#E8915A',
  orangeBg: '#FBF0E6',
  orangeBorder: '#F0C8A0',
  blue: '#4a8fa8',
  blueBg: '#EBF4F8',
  green: '#5a8a5a',
  greenBg: '#EBF4EB',
  // ── Dark mode ──
  darkBg: '#2b2a27',
  darkSurface: '#363430',
  darkBorder: '#464340',
  darkBorderDeep: '#545250',
  darkText: '#f0ece0',
  darkTextSecondary: '#b0a898',
  darkTextMuted: '#736b5e',
  darkOrange: '#E8915A',
  darkOrangeBg: '#3a2e1e',
  darkOrangeBorder: '#5a4020',
  darkBlue: '#6aafc8',
  darkGreen: '#7aaa7a',
};

export const fonts = {
  heading: Platform.select({ ios: 'Georgia', android: 'serif' }) as string,
  body: Platform.select({ ios: 'Georgia', android: 'serif' }) as string,
  sans: Platform.select({ ios: 'System', android: 'sans-serif' }) as string,
  mono: Platform.select({ ios: 'Menlo', android: 'monospace' }) as string,
  // Replaced by expo-google-fonts when loaded
  headingLoaded: 'PlayfairDisplay_700Bold',
  bodyLoaded: 'Lora_400Regular',
  bodyItalic: 'Lora_400Regular_Italic',
  bodySemiBold: 'Lora_600SemiBold',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 999,
};

export const typography = {
  heading1: { fontFamily: fonts.headingLoaded, fontSize: 28, letterSpacing: -0.5, lineHeight: 34 },
  heading2: { fontFamily: fonts.headingLoaded, fontSize: 22, letterSpacing: -0.3, lineHeight: 28 },
  heading3: { fontFamily: fonts.headingLoaded, fontSize: 18, letterSpacing: -0.2, lineHeight: 24 },
  body: { fontFamily: fonts.bodyLoaded, fontSize: 15, lineHeight: 22 },
  bodySmall: { fontFamily: fonts.bodyLoaded, fontSize: 13, lineHeight: 19 },
  bodyItalic: { fontFamily: fonts.bodyItalic, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.sans, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' as const },
  labelSmall: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' as const },
  mono: { fontFamily: fonts.mono, fontSize: 13 },
};
