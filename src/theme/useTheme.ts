import { useColorScheme } from 'react-native';
import { useThemeStore } from '../store/themeStore';
import { THEMES, Palette, ThemeName, ThemeMode } from './themes';

export interface ActiveTheme {
  c: Palette;
  isDark: boolean;
  themeName: ThemeName;
  mode: ThemeMode;
}

// Resolves selected theme + light/dark/auto into a flat palette.
// Screens: `const { c, isDark } = useTheme()` then use c.bg, c.text, c.accent, ...
export function useTheme(): ActiveTheme {
  const system = useColorScheme();
  const { themeName, mode } = useThemeStore();

  const isDark = mode === 'auto' ? system === 'dark' : mode === 'dark';
  const def = THEMES[themeName] ?? THEMES.claude;
  const c = isDark ? def.dark : def.light;

  return { c, isDark, themeName, mode };
}
