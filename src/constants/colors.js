// ─── KARMA APP — COLOR SYSTEM (PHASE 6 — APPLE DARK) ────────────────
// Inspired by Apple's dark mode palette + Zerodha's data-first approach.
// Gold replaces blue as primary accent — suits Karma's Indian identity.
// True black base — not dark grey. Every color earns its place.

export const Colors = {
  // ── Apple Dark Mode Backgrounds ──────────────────────────────────
  background:          '#000000',   // True black — Apple dark base
  backgroundCard:      '#1C1C1E',   // Apple secondary system background
  backgroundElevated:  '#2C2C2E',   // Apple tertiary system background
  backgroundTertiary:  '#3A3A3C',   // Apple quaternary

  // ── Text Hierarchy (Apple Labels) ────────────────────────────────
  textPrimary:   '#FFFFFF',                    // White — primary label
  textSecondary: 'rgba(235,235,245,0.85)',     // Secondary label
  textMuted:     'rgba(235,235,245,0.55)',     // Tertiary label
  textDim:       'rgba(235,235,245,0.30)',     // Quaternary label
  textPlaceholder:'rgba(235,235,245,0.20)',   // Placeholder

  // ── Primary Accent — GOLD (Karma / Indian / Neel identity) ───────
  gold:           '#F5A623',
  goldBright:     '#FFD60A',
  goldSoft:       '#FFB347',
  goldAlpha15:    'rgba(245,166,35,0.15)',
  goldAlpha25:    'rgba(245,166,35,0.25)',
  goldAlpha40:    'rgba(245,166,35,0.40)',

  // ── Secondary Accent — BLUE (Sky / Depth / Pisces) ───────────────
  blue:           '#0A84FF',   // Apple blue
  blueAlpha15:    'rgba(10,132,255,0.15)',
  blueAlpha25:    'rgba(10,132,255,0.25)',

  // ── Semantic Colors (Apple) ───────────────────────────────────────
  green:          '#30D158',   // Apple green
  greenAlpha15:   'rgba(48,209,88,0.15)',
  greenAlpha25:   'rgba(48,209,88,0.25)',

  red:            '#FF453A',   // Apple red
  redAlpha15:     'rgba(255,69,58,0.15)',
  redAlpha25:     'rgba(255,69,58,0.25)',

  orange:         '#FF9F0A',   // Apple orange
  orangeAlpha15:  'rgba(255,159,10,0.15)',

  purple:         '#BF5AF2',   // Apple purple

  // ── Separators ───────────────────────────────────────────────────
  separator:      'rgba(255,255,255,0.10)',
  separatorStrong:'rgba(255,255,255,0.18)',

  // ── Whites ───────────────────────────────────────────────────────
  white:     '#FFFFFF',
  whiteDim:  'rgba(255,255,255,0.06)',
  whiteHint: 'rgba(255,255,255,0.04)',

  // ── Punishment Escalation ─────────────────────────────────────────
  punishLevel1: '#FF9F0A',   // Orange
  punishLevel2: '#FF6B35',   // Deep orange
  punishLevel3: '#FF453A',   // Red
  punishLevel4: '#BF1A1A',   // Dark red

  // ── Overlay ───────────────────────────────────────────────────────
  overlay:  'rgba(0,0,0,0.75)',
  overlay90:'rgba(0,0,0,0.90)',
};

// Typography scale — Apple-inspired
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

// Spacing scale
export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  xxxl:32,
};

// Radius scale
export const Radius = {
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 26,
  full: 999,
};

// Habit color options
export const HabitColors = [
  '#F5A623', // Gold
  '#30D158', // Green
  '#0A84FF', // Blue
  '#FF453A', // Red
  '#BF5AF2', // Purple
  '#FF9F0A', // Orange
  '#5AC8FA', // Cyan
  '#FF2D55', // Pink
  '#34C759', // Mint
  '#AC8E68', // Brown
];

// Habit icon options
export const HabitIcons = [
  '🧘','💪','📖','🚿','💧','🌅','🌙','🏃',
  '🥗','✍️','🎯','🧠','💤','🚫','📱','🍕',
  '☕','🎵','🧹','💰','🌿','⏰','🔥','⭐',
  '🏋️','🚴','🧗','🎨','🎭','📝','🔬','🌍',
];