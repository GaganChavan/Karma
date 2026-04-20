// ─── KARMA APP — COLOR SYSTEM ───────────────────────────────────────
// Dark theme. Deep navy + Electric blue + Gold accents.
// Built for Neel — Sky (Gagan) meets Pisces depth.

export const Colors = {
  // ── Backgrounds
  background:          '#020408',
  backgroundSecondary: '#050A18',
  backgroundTertiary:  '#0A1628',
  backgroundCard:      'rgba(255,255,255,0.03)',

  // ── Brand Blue (Neel = Blue Sky)
  blue:        '#1E7FFF',
  blueLight:   '#4D9FFF',
  blueDark:    '#0A4FBF',
  blueAlpha10: 'rgba(30,127,255,0.10)',
  blueAlpha20: 'rgba(30,127,255,0.20)',
  blueAlpha30: 'rgba(30,127,255,0.30)',

  // ── Gold (Milestones + Celebrations)
  gold:       '#FFB347',
  goldBright: '#FFD700',
  goldAlpha:  'rgba(255,179,71,0.20)',

  // ── Success / Build habits
  green:      '#00D4AA',
  greenAlpha: 'rgba(0,212,170,0.15)',

  // ── Break habits / Danger
  red:      '#FF3B30',
  redAlpha: 'rgba(255,59,48,0.15)',

  // ── Warning / Punishment
  orange:      '#FF8C00',
  orangeAlpha: 'rgba(255,140,0,0.15)',
  yellow:      '#FFB347',

  // ── Purple accent
  purple:      '#8B5CF6',
  purpleAlpha: 'rgba(139,92,246,0.15)',

  // ── Text hierarchy
  textPrimary:   '#E8F0FF',
  textSecondary: '#8899BB',
  textMuted:     '#556688',
  textDim:       '#334455',

  // ── Borders
  border:      'rgba(255,255,255,0.06)',
  borderBlue:  'rgba(30,127,255,0.20)',
  borderGold:  'rgba(255,179,71,0.30)',
  borderRed:   'rgba(255,59,48,0.30)',

  // ── Punishment levels (escalating)
  punishLevel1: '#FFB347',  // Mild
  punishLevel2: '#FF8C00',  // Moderate
  punishLevel3: '#FF3B30',  // Harsh
  punishLevel4: '#8B0000',  // Maximum

  // ── Overlays
  overlay: 'rgba(2,4,8,0.85)',

  // ── White shades
  white:      '#FFFFFF',
  whiteSoft:  'rgba(255,255,255,0.08)',
  whiteDim:   'rgba(255,255,255,0.04)',
};

// Habit type colors
export const HabitColors = [
  '#1E7FFF', // Blue
  '#00D4AA', // Green
  '#8B5CF6', // Purple
  '#FF6B6B', // Coral
  '#FFB347', // Gold
  '#00B4D8', // Cyan
  '#F72585', // Pink
  '#4CC9F0', // Sky
  '#06D6A0', // Mint
  '#FB8500', // Orange
];

// Habit icons
export const HabitIcons = [
  '🧘','💪','📖','🚿','💧','🌅','🌙','🏃',
  '🥗','✍️','🎯','🧠','💤','🚫','📱','🍕',
  '☕','🎵','🧹','💰','🌿','⏰','🔥','⭐',
];