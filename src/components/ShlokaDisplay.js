// ─── KARMA APP — SHLOKA DISPLAY COMPONENT ────────────────────────────
// Renders a shloka in 4 layers:
//   Sanskrit script — gold, large
//   Transliteration — white, medium
//   Meaning — muted, italic
//   Reference — dim, small
//
// Used on Home, Habit Detail, Celebration, Identity screens.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../constants/colors';

const ShlokaDisplay = ({
  shloka,           // { sanskrit, roman, meaning, reference }
  variant = 'card', // 'card' | 'inline' | 'large'
  showDivider = true,
}) => {
  if (!shloka) return null;

  if (variant === 'large') {
    return (
      <View style={styles.largeContainer}>
        {/* Sanskrit — the crown */}
        <Text style={styles.largeSanskrit}>{shloka.sanskrit}</Text>

        {/* Divider */}
        {showDivider && <View style={styles.divider} />}

        {/* Transliteration */}
        <Text style={styles.largeRoman}>{shloka.roman}</Text>

        {/* Meaning */}
        <Text style={styles.largeMeaning}>"{shloka.meaning}"</Text>

        {/* Reference */}
        <Text style={styles.reference}>— {shloka.reference}</Text>
      </View>
    );
  }

  if (variant === 'inline') {
    return (
      <View style={styles.inlineContainer}>
        <Text style={styles.inlineSanskrit}>{shloka.sanskrit}</Text>
        <Text style={styles.inlineRoman}>{shloka.roman}</Text>
        <Text style={styles.inlineMeaning}>"{shloka.meaning}"</Text>
        <Text style={styles.reference}>— {shloka.reference}</Text>
      </View>
    );
  }

  // Default — card
  return (
    <View style={styles.card}>
      {/* Sanskrit */}
      <Text style={styles.cardSanskrit}>{shloka.sanskrit}</Text>

      {/* Thin gold line */}
      <View style={styles.cardDivider} />

      {/* Transliteration */}
      <Text style={styles.cardRoman}>{shloka.roman}</Text>

      {/* Meaning */}
      <Text style={styles.cardMeaning}>"{shloka.meaning}"</Text>

      {/* Reference */}
      <Text style={styles.reference}>— {shloka.reference}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // ── CARD variant ──────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius:    Radius.lg,
    borderWidth:      1,
    borderColor:     Colors.goldAlpha25,
    padding:         Spacing.xl,
    gap:             Spacing.sm,
  },
  cardSanskrit: {
    fontSize:     18,
    color:        Colors.gold,
    textAlign:    'center',
    lineHeight:   28,
    fontWeight:   '600',
    letterSpacing: 0.5,
  },
  cardDivider: {
    height:          1,
    backgroundColor: Colors.goldAlpha25,
    marginVertical:  Spacing.xs,
    marginHorizontal: Spacing.xl,
  },
  cardRoman: {
    ...Typography.footnote,
    color:     Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  cardMeaning: {
    ...Typography.callout,
    color:     Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
  },

  // ── LARGE variant — splash / celebration ──────────────────────────
  largeContainer: {
    alignItems: 'center',
    gap:         Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  largeSanskrit: {
    fontSize:     22,
    color:        Colors.gold,
    textAlign:    'center',
    lineHeight:   34,
    fontWeight:   '700',
    letterSpacing: 0.5,
  },
  divider: {
    width:           80,
    height:           1,
    backgroundColor: Colors.goldAlpha40,
  },
  largeRoman: {
    ...Typography.subheadline,
    color:     Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  largeMeaning: {
    ...Typography.callout,
    color:     Colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    fontStyle: 'italic',
  },

  // ── INLINE variant — home screen ──────────────────────────────────
  inlineContainer: {
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  inlineSanskrit: {
    fontSize:   15,
    color:      Colors.gold,
    lineHeight: 22,
    fontWeight: '600',
  },
  inlineRoman: {
    ...Typography.caption1,
    color:     Colors.textMuted,
    fontStyle: 'italic',
  },
  inlineMeaning: {
    ...Typography.caption1,
    color:     Colors.textDim,
    fontStyle: 'italic',
    lineHeight: 17,
  },

  // ── Shared ────────────────────────────────────────────────────────
  reference: {
    ...Typography.caption2,
    color:     Colors.textDim,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});

export default ShlokaDisplay;