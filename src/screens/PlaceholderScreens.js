// ─── KARMA APP — PLACEHOLDER SCREENS (PHASE 5 UPDATE) ───────────────
// StatsScreen removed — now has full implementation.
// HabitsScreen and SettingsScreen still placeholder — Phase 7.

import React from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';

const PlaceholderScreen = ({ title, icon, subtitle, phase }) => (
  <View style={styles.container}>
    <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
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
    subtitle="Manage, reorder, and view all your habits in one place."
    phase="7"
  />
);

export const SettingsScreen = () => (
  <PlaceholderScreen
    icon="⚙️"
    title="Settings"
    subtitle="Notifications, alter ego, theme, backup, and more."
    phase="7"
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