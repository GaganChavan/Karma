// ─── KARMA APP — LOADING SCREEN ─────────────────────────────────────

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

const LoadingScreen = ({ message = 'Loading your karma...' }) => (
  <View style={styles.container}>
    <Text style={styles.wheel}>☸</Text>
    <ActivityIndicator size="large" color={Colors.blue} style={styles.spinner} />
    <Text style={styles.message}>{message}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: Colors.background,
    alignItems:      'center',
    justifyContent:  'center',
    gap:             16,
  },
  wheel: {
    fontSize: 48,
    opacity:  0.6,
  },
  spinner: {
    marginVertical: 8,
  },
  message: {
    fontSize: 14,
    color:    Colors.textMuted,
    letterSpacing: 0.5,
  },
});

export default LoadingScreen;