import { sf, rs, sw } from '../utils/responsive';

// ─── KARMA APP — COLORS (PHASE C) ────────────────────────────────────
// Colors now comes from ThemeContext.
// This file re-exports everything for backward compatibility.
// Screens that need live theme use useTheme() hook.
// Services use the static Colors export.

export {
  Colors,
  DARK_PALETTE,
  LIGHT_PALETTE,
  updateStaticColors,
  useTheme,
  ThemeProvider,
} from './ThemeContext';

// Typography, Spacing, Radius unchanged
export const Typography = {
  largeTitle:  { fontSize: sf(34), fontWeight: '700', letterSpacing: 0.37 },
  title1:      { fontSize: sf(28), fontWeight: '700', letterSpacing: 0.36 },
  title2:      { fontSize: sf(22), fontWeight: '700', letterSpacing: 0.35 },
  title3:      { fontSize: sf(20), fontWeight: '600', letterSpacing: 0.38 },
  headline:    { fontSize: sf(17), fontWeight: '600', letterSpacing: -0.41 },
  body:        { fontSize: sf(17), fontWeight: '400', letterSpacing: -0.41 },
  callout:     { fontSize: sf(16), fontWeight: '400', letterSpacing: -0.32 },
  subheadline: { fontSize: sf(15), fontWeight: '400', letterSpacing: -0.24 },
  footnote:    { fontSize: sf(13), fontWeight: '400', letterSpacing: -0.08 },
  caption1:    { fontSize: sf(12), fontWeight: '400', letterSpacing: 0 },
  caption2:    { fontSize: sf(11), fontWeight: '400', letterSpacing: 0.07 },
};

export const Spacing = {
  xs: rs(4), sm: rs(8), md: rs(12), lg: rs(16), xl: rs(20), xxl: rs(24), xxxl: rs(32),
};

export const Radius = {
  sm: 8, md: 12, lg: 16, xl: 20, xxl: 26, full: 999,
};

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