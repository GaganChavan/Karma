// ─── KARMA APP — THEME CONTEXT ───────────────────────────────────────
// Proper React Context for theme switching.
// ALL screens subscribe to this — switching theme re-renders everything.
// No app restart needed.

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance } from 'react-native';

// ── Palettes ──────────────────────────────────────────────────────────

export const DARK_PALETTE = {
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
  purple:       '#BF5AF2',

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

  isDark:     true,
  statusBar:  'light-content',
  navBg:      'rgba(0,0,0,0.96)',
};

export const LIGHT_PALETTE = {
  background:          '#F2F2F7',
  backgroundCard:      '#FFFFFF',
  backgroundElevated:  '#F2F2F7',
  backgroundTertiary:  '#E5E5EA',

  textPrimary:    '#000000',
  textSecondary:  'rgba(60,60,67,0.85)',
  textMuted:      'rgba(60,60,67,0.55)',
  textDim:        'rgba(60,60,67,0.35)',
  textPlaceholder:'rgba(60,60,67,0.25)',

  gold:        '#C47D0E',
  goldBright:  '#C9A800',
  goldSoft:    '#E09020',
  goldAlpha15: 'rgba(196,125,14,0.12)',
  goldAlpha25: 'rgba(196,125,14,0.22)',
  goldAlpha40: 'rgba(196,125,14,0.35)',

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
  purple:       '#AF52DE',

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

  isDark:    false,
  statusBar: 'dark-content',
  navBg:     'rgba(242,242,247,0.97)',
};

// ── Context ───────────────────────────────────────────────────────────

const ThemeContext = createContext({
  colors:     DARK_PALETTE,
  isDark:     true,
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

// ── Provider ──────────────────────────────────────────────────────────

export const ThemeProvider = ({ children, initialTheme = 'dark' }) => {
  const [isDark, setIsDark] = useState(initialTheme !== 'light');

  const colors = isDark ? DARK_PALETTE : LIGHT_PALETTE;

  const toggleTheme = (forceDark) => {
    if (typeof forceDark === 'boolean') {
      setIsDark(forceDark);
    } else {
      setIsDark(prev => !prev);
    }
  };

  return (
    <ThemeContext.Provider value={{ colors, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// ── Static Colors for non-component files ─────────────────────────────
// Services and non-React files use this.
// Gets updated when theme changes via updateStaticColors().
export let Colors = { ...DARK_PALETTE };

export const updateStaticColors = (palette) => {
  Object.assign(Colors, palette);
};