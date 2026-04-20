// ─── KARMA APP — PLACEHOLDER SCREENS ────────────────────────────────
// Phase 2 will replace these with full implementations.

import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { Colors } from '../constants/colors';

const PlaceholderScreen = ({ title, icon, subtitle }) => (
  <View style={styles.container}>
    <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
    <Text style={styles.icon}>{icon}</Text>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>{subtitle}</Text>
    <Text style={styles.phase}>Coming in Phase 2 🔱</Text>
  </View>
);

export const HabitsScreen = () => (
  <PlaceholderScreen
    icon="✅"
    title="Your Habits"
    subtitle="Add, edit, and manage all your habits here."
  />
);

export const StatsScreen = () => (
  <PlaceholderScreen
    icon="📊"
    title="Karma Stats"
    subtitle="Your consistency heatmap, streaks, and milestones."
  />
);

export const SettingsScreen = () => (
  <PlaceholderScreen
    icon="⚙️"
    title="Settings"
    subtitle="Notifications, alter ego, splash image, backup."
  />
);

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: Colors.background,
    alignItems:      'center',
    justifyContent:  'center',
    padding:         32,
    gap:             10,
  },
  icon:     { fontSize: 56 },
  title:    { fontSize: 22, color: Colors.textPrimary, fontWeight: 'bold' },
  subtitle: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  phase:    { fontSize: 12, color: Colors.blue, marginTop: 8, letterSpacing: 1 },
});