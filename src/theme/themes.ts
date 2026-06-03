// Semantic palette — every screen reads these keys, so swapping the palette reskins the whole app.
export interface Palette {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderDeep: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  accentBg: string;
  accentBorder: string;
  blue: string;
  green: string;
  water: string;
  danger: string;
  onAccent: string;     // text/icon color on top of accent fills
  glass: boolean;       // translucent surfaces
  gradient: string[];   // backdrop gradient (used by glass + accents)
}

export type ThemeName = 'claude' | 'perplexity' | 'gemini' | 'glass';
export type ThemeMode = 'light' | 'dark' | 'auto';

export interface ThemeDef {
  name: ThemeName;
  label: string;
  blurb: string;
  light: Palette;
  dark: Palette;
}

const claude: ThemeDef = {
  name: 'claude',
  label: 'Claude',
  blurb: 'Warm cream & terracotta, editorial calm',
  light: {
    bg: '#F0ECE0', surface: '#E8E3D5', surfaceAlt: '#F7F4EE', border: '#E5E0D6', borderDeep: '#D8D2C4',
    text: '#1a1714', textSecondary: '#5c5850', textMuted: '#9c9488',
    accent: '#D4721E', accentSoft: '#E8915A', accentBg: '#FBF0E6', accentBorder: '#F0C8A0',
    blue: '#4a8fa8', green: '#5a8a5a', water: '#4a8fa8', danger: '#c0392b',
    onAccent: '#ffffff', glass: false, gradient: ['#F0ECE0', '#E8E3D5'],
  },
  dark: {
    bg: '#2b2a27', surface: '#363430', surfaceAlt: '#2b2a27', border: '#464340', borderDeep: '#545250',
    text: '#f0ece0', textSecondary: '#b0a898', textMuted: '#736b5e',
    accent: '#E8915A', accentSoft: '#E8915A', accentBg: '#3a2e1e', accentBorder: '#5a4020',
    blue: '#6aafc8', green: '#7aaa7a', water: '#6aafc8', danger: '#e07a6a',
    onAccent: '#2b2a27', glass: false, gradient: ['#2b2a27', '#1f1e1b'],
  },
};

const perplexity: ThemeDef = {
  name: 'perplexity',
  label: 'Perplexity',
  blurb: 'Offblack, paper white, true turquoise',
  light: {
    bg: '#FBFAF4', surface: '#F0EEE6', surfaceAlt: '#FFFFFF', border: '#E3E1D8', borderDeep: '#D2D0C6',
    text: '#091717', textSecondary: '#3a4a4a', textMuted: '#8a9999',
    accent: '#20808D', accentSoft: '#1FB8CD', accentBg: '#E4F3F4', accentBorder: '#A8D9DD',
    blue: '#1FB8CD', green: '#3a9d7a', water: '#1FB8CD', danger: '#c0392b',
    onAccent: '#ffffff', glass: false, gradient: ['#FBFAF4', '#F0EEE6'],
  },
  dark: {
    bg: '#091717', surface: '#13201f', surfaceAlt: '#0d1a19', border: '#1f3433', borderDeep: '#2c4544',
    text: '#FBFAF4', textSecondary: '#a8b8b8', textMuted: '#5f7373',
    accent: '#1FB8CD', accentSoft: '#20808D', accentBg: '#0f2b2c', accentBorder: '#1f5557',
    blue: '#1FB8CD', green: '#4cc99a', water: '#1FB8CD', danger: '#e07a6a',
    onAccent: '#091717', glass: false, gradient: ['#091717', '#0d1f1e'],
  },
};

const gemini: ThemeDef = {
  name: 'gemini',
  label: 'Gemini',
  blurb: 'Google blue, soft gradients',
  light: {
    bg: '#FFFFFF', surface: '#F0F4F9', surfaceAlt: '#F8FAFD', border: '#E3E8EF', borderDeep: '#D0D7E2',
    text: '#1f1f1f', textSecondary: '#444746', textMuted: '#8a8f98',
    accent: '#1a73e8', accentSoft: '#4285F4', accentBg: '#E8F0FE', accentBorder: '#A8C7FA',
    blue: '#1a73e8', green: '#1e8e3e', water: '#1a73e8', danger: '#d93025',
    onAccent: '#ffffff', glass: false, gradient: ['#4285F4', '#9b72cb', '#d96570'],
  },
  dark: {
    bg: '#1e1f20', surface: '#282a2c', surfaceAlt: '#1e1f20', border: '#37393b', borderDeep: '#444746',
    text: '#e3e3e3', textSecondary: '#c4c7c5', textMuted: '#8a8f98',
    accent: '#8ab4f8', accentSoft: '#aecbfa', accentBg: '#1f3047', accentBorder: '#2f4a6d',
    blue: '#8ab4f8', green: '#81c995', water: '#8ab4f8', danger: '#f28b82',
    onAccent: '#1e1f20', glass: false, gradient: ['#8ab4f8', '#c58af9', '#f28b82'],
  },
};

const glass: ThemeDef = {
  name: 'glass',
  label: 'Glass',
  blurb: 'Frosted translucent panels',
  light: {
    bg: '#dfe6f5', surface: 'rgba(255,255,255,0.62)', surfaceAlt: 'rgba(255,255,255,0.78)',
    border: 'rgba(255,255,255,0.85)', borderDeep: 'rgba(120,120,160,0.3)',
    text: '#1a1c2e', textSecondary: 'rgba(26,28,46,0.72)', textMuted: 'rgba(26,28,46,0.45)',
    accent: '#7c5cff', accentSoft: '#9b7fff', accentBg: 'rgba(124,92,255,0.14)', accentBorder: 'rgba(124,92,255,0.4)',
    blue: '#3aa0ff', green: '#2bb673', water: '#3aa0ff', danger: '#e0556b',
    onAccent: '#ffffff', glass: true, gradient: ['#cfe0ff', '#e7dcff', '#ffe9f0'],
  },
  dark: {
    bg: '#0f1020', surface: 'rgba(255,255,255,0.10)', surfaceAlt: 'rgba(255,255,255,0.14)',
    border: 'rgba(255,255,255,0.22)', borderDeep: 'rgba(255,255,255,0.30)',
    text: '#f5f6ff', textSecondary: 'rgba(245,246,255,0.7)', textMuted: 'rgba(245,246,255,0.45)',
    accent: '#a78bfa', accentSoft: '#c4b5fd', accentBg: 'rgba(167,139,250,0.18)', accentBorder: 'rgba(167,139,250,0.4)',
    blue: '#7dd3fc', green: '#6ee7b7', water: '#7dd3fc', danger: '#fda4af',
    onAccent: '#0f1020', glass: true, gradient: ['#1a1438', '#0f1020', '#10243a'],
  },
};

export const THEMES: Record<ThemeName, ThemeDef> = { claude, perplexity, gemini, glass };
export const THEME_LIST: ThemeDef[] = [claude, perplexity, gemini, glass];
