// ─── KARMA APP — PLACEHOLDER SCREENS (PHASE 6) ───────────────────────

import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { Colors, Typography, Spacing } from '../constants/colors';

const PlaceholderScreen = ({ title, icon, subtitle, phase }) => (
  <View style={styles.screen}>
    <StatusBar barStyle="light-content" backgroundColor="#000" />
    <Text style={styles.icon}>{icon}</Text>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>{subtitle}</Text>
    <Text style={styles.phase}>Coming in Phase {phase} 🔱</Text>
  </View>
);

export const HabitsScreen = () => (
  <PlaceholderScreen
    icon="✅"
    title="All Habits"
    subtitle="Manage, reorder, and archive your habits."
    phase="7"
  />
);

export const SettingsScreen = () => (
  <PlaceholderScreen
    icon="⚙️"
    title="Settings"
    subtitle="Theme, notifications, alter ego, backup."
    phase="7"
  />
);

const styles = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: Colors.background,
    alignItems:      'center',
    justifyContent:  'center',
    padding:         Spacing.xxxl,
    gap:             Spacing.md,
  },
  icon:     { fontSize: 56 },
  title:    { ...Typography.title2, color: Colors.textPrimary },
  subtitle: { ...Typography.body, color: Colors.textMuted, textAlign: 'center', lineHeight: 24 },
  phase:    { ...Typography.footnote, color: Colors.gold, marginTop: Spacing.md, letterSpacing: 1 },
});