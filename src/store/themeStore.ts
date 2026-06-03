import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { ThemeName, ThemeMode } from '../theme/themes';

const KEY_THEME = 'pref_theme';
const KEY_MODE = 'pref_mode';
const KEY_DOTS = 'pref_dots';
const KEY_MODEL = 'pref_coach_model';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

async function readPref(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  return SecureStore.getItemAsync(key);
}
async function writePref(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') { if (typeof localStorage !== 'undefined') localStorage.setItem(key, value); return; }
  await SecureStore.setItemAsync(key, value);
}

interface ThemeState {
  themeName: ThemeName;
  mode: ThemeMode;
  showDots: boolean;
  coachModel: string;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setTheme: (name: ThemeName) => void;
  setMode: (mode: ThemeMode) => void;
  setShowDots: (v: boolean) => void;
  setCoachModel: (id: string) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeName: 'claude',
  mode: 'auto',
  showDots: true,
  coachModel: DEFAULT_MODEL,
  hydrated: false,

  hydrate: async () => {
    const [t, m, d, mdl] = await Promise.all([readPref(KEY_THEME), readPref(KEY_MODE), readPref(KEY_DOTS), readPref(KEY_MODEL)]);
    set({
      themeName: (t as ThemeName) ?? 'claude',
      mode: (m as ThemeMode) ?? 'auto',
      showDots: d === null ? true : d === '1',
      coachModel: mdl ?? DEFAULT_MODEL,
      hydrated: true,
    });
  },

  setTheme: (name) => {
    set({ themeName: name });
    writePref(KEY_THEME, name);
  },

  setMode: (mode) => {
    set({ mode });
    writePref(KEY_MODE, mode);
  },

  setShowDots: (v) => {
    set({ showDots: v });
    writePref(KEY_DOTS, v ? '1' : '0');
  },

  setCoachModel: (id) => {
    set({ coachModel: id });
    writePref(KEY_MODEL, id);
  },
}));
