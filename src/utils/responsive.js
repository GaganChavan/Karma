// ─── KARMA APP — responsive.js ───────────────────────────────────────
// Utility for scaling fonts and spacing across different Android screen sizes.
//
// Base design is 390dp wide (iPhone 14 / mid-range Android).
// OnePlus Nord is ~393dp — virtually identical, scales to 1.0.
// Smaller phones (360dp) scale DOWN slightly.
// Larger phones (412dp+) scale UP slightly.
//
// Exports:
//   sf(size)  → scaled font size    (use for fontSize)
//   rs(size)  → scaled spacing      (use for padding, margin, gap)
//   sw(size)  → scaled width value  (use for fixed widths/heights)
//   SCREEN    → { width, height, isSmall, isLarge }

import { Dimensions, PixelRatio } from 'react-native';

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');

// Base design width — all values in your StyleSheet are designed for this
const BASE_WIDTH = 390;

// Scale ratio — clamped so it never goes wild on tablets or tiny phones
const scale = Math.min(Math.max(WINDOW_WIDTH / BASE_WIDTH, 0.85), 1.2);

/**
 * sf — Scale Font size
 * Keeps fonts readable on small screens, comfortable on large ones.
 * Rounded to nearest 0.5 to avoid sub-pixel blurring.
 *
 * @param {number} size - font size for BASE_WIDTH screen
 * @returns {number}
 */
export const sf = (size) => {
  const scaled = size * scale;
  return Math.round(scaled * 2) / 2; // round to nearest 0.5
};

/**
 * rs — Responsive Spacing
 * Scales padding, margin, gap values proportionally.
 *
 * @param {number} size - spacing for BASE_WIDTH screen
 * @returns {number}
 */
export const rs = (size) => {
  return Math.round(size * scale);
};

/**
 * sw — Responsive Width/Height
 * Scales fixed dimension values (width, height, borderRadius for px values).
 *
 * @param {number} size - dimension for BASE_WIDTH screen
 * @returns {number}
 */
export const sw = (size) => {
  return Math.round(size * scale);
};

/**
 * SCREEN — Device info for layout decisions
 */
export const SCREEN = {
  width:   WINDOW_WIDTH,
  height:  WINDOW_HEIGHT,
  scale,
  isSmall: WINDOW_WIDTH < 375,   // e.g. older budget phones
  isLarge: WINDOW_WIDTH >= 414,  // e.g. Plus/Pro Max / large Androids
};

export default { sf, rs, sw, SCREEN };