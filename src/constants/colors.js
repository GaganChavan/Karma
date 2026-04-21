// ─── KARMA APP — COLOR SYSTEM (PHASE 7 — DYNAMIC THEME) ─────────────
// Supports Dark (default) and Light mode.
// setAppTheme() is called at startup — all screens pick up the right colors.
// Based on Apple's exact dark & light mode palettes.

// ── Dark Palette (Apple dark mode) ───────────────────────────────────
const DARK = {
  background:          '#000000',
  backgroundCard:      '#1C1C1E',
  backgroundElevated:  '#2C2C2E',
  backgroundTertiary:  '#3A3A3C',

  textPrimary:    '#FFFFFF',
  textSecondary:  'rgba(235,235,245,0.85)',
  textMuted:      'rgba(235,235,245,0.55)',
  textDim:        'rgba(235,235,245,0.30)',
  textPlaceholder:'rgba(235,235,245,0.20)',

  gold:        '#F5A623',
  goldBright:  '#FFD60A',
  goldSoft:    '#FFB347',
  goldAlpha15: 'rgba(245,166,35,0.15)',
  goldAlpha25: 'rgba(245,166,35,0.25)',
  goldAlpha40: 'rgba(245,166,35,0.40)',

  blue:        '#0A84FF',
  blueAlpha15: 'rgba(10,132,255,0.15)',
  blueAlpha25: 'rgba(10,132,255,0.25)',

  green:        '#30D158',
  greenAlpha15: 'rgba(48,209,88,0.15)',
  greenAlpha25: 'rgba(48,209,88,0.25)',

  red:        '#FF453A',
  redAlpha15: 'rgba(255,69,58,0.15)',
  redAlpha25: 'rgba(255,69,58,0.25)',

  orange:       '#FF9F0A',
  orangeAlpha15:'rgba(255,159,10,0.15)',

  purple: '#BF5AF2',

  separator:      'rgba(255,255,255,0.10)',
  separatorStrong:'rgba(255,255,255,0.18)',

  white:     '#FFFFFF',
  whiteDim:  'rgba(255,255,255,0.06)',
  whiteHint: 'rgba(255,255,255,0.04)',

  punishLevel1: '#FF9F0A',
  punishLevel2: '#FF6B35',
  punishLevel3: '#FF453A',
  punishLevel4: '#BF1A1A',

  overlay:   'rgba(0,0,0,0.75)',
  overlay90: 'rgba(0,0,0,0.90)',

  isDark: true,
  statusBar: 'light-content',
  navBackground: '#000000',
};

// ── Light Palette (Apple light mode) ─────────────────────────────────
const LIGHT = {
  background:         '#F2F2F7',
  backgroundCard:     '#FFFFFF',
  backgroundElevated: '#F2F2F7',
  backgroundTertiary: '#E5E5EA',

  textPrimary:    '#000000',
  textSecondary:  'rgba(60,60,67,0.85)',
  textMuted:      'rgba(60,60,67,0.55)',
  textDim:        'rgba(60,60,67,0.35)',
  textPlaceholder:'rgba(60,60,67,0.25)',

  gold:        '#D4891A',
  goldBright:  '#C9A800',
  goldSoft:    '#E09020',
  goldAlpha15: 'rgba(212,137,26,0.12)',
  goldAlpha25: 'rgba(212,137,26,0.20)',
  goldAlpha40: 'rgba(212,137,26,0.35)',

  blue:        '#007AFF',
  blueAlpha15: 'rgba(0,122,255,0.12)',
  blueAlpha25: 'rgba(0,122,255,0.20)',

  green:        '#34C759',
  greenAlpha15: 'rgba(52,199,89,0.12)',
  greenAlpha25: 'rgba(52,199,89,0.20)',

  red:        '#FF3B30',
  redAlpha15: 'rgba(255,59,48,0.12)',
  redAlpha25: 'rgba(255,59,48,0.20)',

  orange:       '#FF9500',
  orangeAlpha15:'rgba(255,149,0,0.12)',

  purple: '#AF52DE',

  separator:      'rgba(60,60,67,0.12)',
  separatorStrong:'rgba(60,60,67,0.20)',

  white:     '#FFFFFF',
  whiteDim:  'rgba(0,0,0,0.04)',
  whiteHint: 'rgba(0,0,0,0.02)',

  punishLevel1: '#FF9500',
  punishLevel2: '#FF6B35',
  punishLevel3: '#FF3B30',
  punishLevel4: '#C0392B',

  overlay:   'rgba(0,0,0,0.40)',
  overlay90: 'rgba(0,0,0,0.60)',

  isDark: false,
  statusBar: 'dark-content',
  navBackground: '#F2F2F7',
};

// ── Mutable Colors object — screens import this ───────────────────────
// setAppTheme() updates it in place before first render.
export const Colors = { ...DARK };

export const setAppTheme = (theme) => {
  const palette = theme === 'light' ? LIGHT : DARK;
  Object.assign(Colors, palette);
};

export const getThemePalette = (theme) =>
  theme === 'light' ? LIGHT : DARK;

// ── Typography scale (Apple SF Pro equivalent) ────────────────────────
export const Typography = {
  largeTitle:  { fontSize: 34, fontWeight: '700', letterSpacing: 0.37 },
  title1:      { fontSize: 28, fontWeight: '700', letterSpacing: 0.36 },
  title2:      { fontSize: 22, fontWeight: '700', letterSpacing: 0.35 },
  title3:      { fontSize: 20, fontWeight: '600', letterSpacing: 0.38 },
  headline:    { fontSize: 17, fontWeight: '600', letterSpacing: -0.41 },
  body:        { fontSize: 17, fontWeight: '400', letterSpacing: -0.41 },
  callout:     { fontSize: 16, fontWeight: '400', letterSpacing: -0.32 },
  subheadline: { fontSize: 15, fontWeight: '400', letterSpacing: -0.24 },
  footnote:    { fontSize: 13, fontWeight: '400', letterSpacing: -0.08 },
  caption1:    { fontSize: 12, fontWeight: '400', letterSpacing: 0 },
  caption2:    { fontSize: 11, fontWeight: '400', letterSpacing: 0.07 },
};

// ── Spacing & Radius ──────────────────────────────────────────────────
export const Spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
};

export const Radius = {
  sm: 8, md: 12, lg: 16, xl: 20, xxl: 26, full: 999,
};

// ── Habit Options ─────────────────────────────────────────────────────
export const HabitColors = [
  '#F5A623', '#30D158', '#0A84FF', '#FF453A',
  '#BF5AF2', '#FF9F0A', '#5AC8FA', '#FF2D55',
  '#34C759', '#AC8E68',
];

export const HabitIcons = [
  '🧘','💪','📖','🚿','💧','🌅','🌙','🏃',
  '🥗','✍️','🎯','🧠','💤','🚫','📱','🍕',
  '☕','🎵','🧹','💰','🌿','⏰','🔥','⭐',
  '🏋️','🚴','🎨','📝','🌍','🔬','🧗','🎭',
];