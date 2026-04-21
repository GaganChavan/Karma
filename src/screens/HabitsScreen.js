// ─── KARMA APP — HABITS SCREEN (PHASE 7) ─────────────────────────────
// Full habit management. Active + archived. Clean Apple-style list.

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Alert, ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView }   from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radius } from '../constants/colors';
import { getDatabase } from '../database/database';
import { archiveHabit, getSetting } from '../database/habitService';
import { cancelHabitNotification } from '../services/notificationService';

const HabitsScreen = ({ navigation }) => {
  const [habits,       setHabits]       = useState([]);
  const [archived,     setArchived]     = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [alterEgo,     setAlterEgo]     = useState('Neel');
  const [error,        setError]        = useState(null);

  useFocusEffect(useCallback(() => { _loadData(); }, []));

  const _loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const db  = await getDatabase();
      const ego = await getSetting('alter_ego');

      const active = await db.getAllAsync(
        'SELECT * FROM habits WHERE is_active = 1 ORDER BY sort_order ASC, created_at ASC'
      ) || [];

      const archivedList = await db.getAllAsync(
        'SELECT * FROM habits WHERE is_active = 0 ORDER BY updated_at DESC'
      ) || [];

      setHabits(active);
      setArchived(archivedList);
      setAlterEgo(ego || 'Neel');
    } catch (err) {
      setError(err.message || 'Failed to load habits');
    } finally {
      setLoading(false);
    }
  };

  const _archive = (habit) => {
    Alert.alert(
      'Archive Habit',
      `Archive "${habit.name}"?\n\nYour history and streaks are preserved. You can restore it later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text:  'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              await archiveHabit(habit.id);
              await cancelHabitNotification(habit.id);
              await _loadData();
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const _restore = async (habit) => {
    try {
      const db = await getDatabase();
      await db.runAsync(
        `UPDATE habits SET is_active = 1, updated_at = datetime('now','localtime') WHERE id = ?`,
        [habit.id]
      );
      await _loadData();
      Alert.alert('✅ Restored', `"${habit.name}" is active again.`);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const _renderHabit = (habit, isArchived = false) => (
    <TouchableOpacity
      key={habit.id}
      style={[styles.habitRow, isArchived && { opacity: 0.6 }]}
      onPress={() => {
        if (!isArchived) {
          navigation.navigate('HabitDetail', { habitId: habit.id });
        }
      }}
      activeOpacity={isArchived ? 1 : 0.7}
    >
      {/* Icon */}
      <View style={[styles.habitIcon, { backgroundColor: (habit.color || Colors.gold) + '20' }]}>
        <Text style={{ fontSize: 22 }}>{habit.icon}</Text>
      </View>

      {/* Info */}
      <View style={styles.habitInfo}>
        <Text style={styles.habitName}>{habit.name}</Text>
        <View style={styles.habitMeta}>
          <Text style={[styles.habitType, {
            color: habit.type === 'build' ? Colors.green : Colors.red,
          }]}>
            {habit.type === 'build' ? '🟢 Build' : '🔴 Break'}
          </Text>
          <Text style={styles.habitDot}>·</Text>
          <Text style={styles.habitFreq}>
            {habit.frequency === 'daily' ? 'Daily' : 'Selected days'}
          </Text>
          {habit.reminder_type !== 'none' && habit.reminder_time && (
            <>
              <Text style={styles.habitDot}>·</Text>
              <Text style={styles.habitReminder}>
                {habit.reminder_type === 'hard' ? '⏰' : '🔔'} {habit.reminder_time}
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Actions */}
      {isArchived ? (
        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={() => _restore(habit)}
        >
          <Text style={styles.restoreBtnText}>Restore</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.habitActions}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('AddHabit', { habitId: habit.id })}
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.archiveBtn}
            onPress={() => _archive(habit)}
          >
            <Text style={styles.archiveBtnText}>Archive</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle={Colors.statusBar} backgroundColor={Colors.background} />
        <ActivityIndicator size="large" color={Colors.gold} />
        <Text style={styles.loadText}>Loading habits...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle={Colors.statusBar} backgroundColor={Colors.background} />
        <Text style={styles.errText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={_loadData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const buildHabits = habits.filter(h => h.type === 'build');
  const breakHabits = habits.filter(h => h.type === 'break');

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle={Colors.statusBar} backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Habits</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddHabit')}
        >
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryNum, { color: Colors.green }]}>{buildHabits.length}</Text>
            <Text style={styles.summaryLabel}>Building</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryNum, { color: Colors.red }]}>{breakHabits.length}</Text>
            <Text style={styles.summaryLabel}>Breaking</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryNum, { color: Colors.textMuted }]}>{archived.length}</Text>
            <Text style={styles.summaryLabel}>Archived</Text>
          </View>
        </View>

        {/* Build habits */}
        {buildHabits.length > 0 && (
          <>
            <Text style={styles.groupLabel}>BUILD HABITS</Text>
            <View style={styles.group}>
              {buildHabits.map((h, i) => (
                <View key={h.id}>
                  {i > 0 && <View style={styles.separator} />}
                  {_renderHabit(h)}
                </View>
              ))}
            </View>
          </>
        )}

        {/* Break habits */}
        {breakHabits.length > 0 && (
          <>
            <Text style={styles.groupLabel}>BREAK HABITS</Text>
            <View style={styles.group}>
              {breakHabits.map((h, i) => (
                <View key={h.id}>
                  {i > 0 && <View style={styles.separator} />}
                  {_renderHabit(h)}
                </View>
              ))}
            </View>
          </>
        )}

        {/* Empty state */}
        {habits.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>☸</Text>
            <Text style={styles.emptyTitle}>No habits yet, {alterEgo}</Text>
            <Text style={styles.emptySub}>
              Tap New above to add your first habit and begin building karma.
            </Text>
          </View>
        )}

        {/* Archived section */}
        {archived.length > 0 && (
          <>
            <TouchableOpacity
              style={styles.archivedToggle}
              onPress={() => setShowArchived(!showArchived)}
            >
              <Text style={styles.archivedToggleText}>
                {showArchived ? '▼' : '▶'}  {archived.length} Archived Habit{archived.length > 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>

            {showArchived && (
              <View style={styles.group}>
                {archived.map((h, i) => (
                  <View key={h.id}>
                    {i > 0 && <View style={styles.separator} />}
                    {_renderHabit(h, true)}
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  center: {
    flex: 1, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center', gap: 14,
  },
  loadText: { ...Typography.body, color: Colors.textMuted },
  errText:  { ...Typography.body, color: Colors.red, textAlign: 'center' },
  retryBtn: {
    backgroundColor: Colors.gold,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.lg,
  },
  retryText: { ...Typography.headline, color: '#000' },

  header: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical:   Spacing.lg,
    borderBottomWidth:  1,
    borderBottomColor:  Colors.separator,
  },
  headerTitle: { ...Typography.title2, color: Colors.textPrimary },
  addBtn: {
    backgroundColor: Colors.gold,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius:    Radius.full,
  },
  addBtnText: { ...Typography.footnote, color: '#000', fontWeight: '700' },

  scroll:        { flex: 1 },
  scrollContent: { padding: Spacing.xl, gap: 0 },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    gap:            Spacing.sm,
    marginBottom:  Spacing.xl,
  },
  summaryCard: {
    flex:           1,
    backgroundColor: Colors.backgroundCard,
    borderRadius:   Radius.lg,
    borderWidth:     1,
    borderColor:    Colors.separator,
    padding:        Spacing.md,
    alignItems:     'center',
    gap:             4,
  },
  summaryNum:   { fontSize: 26, fontWeight: '700' },
  summaryLabel: { ...Typography.caption2, color: Colors.textDim },

  // Group
  groupLabel: {
    ...Typography.caption2,
    color:         Colors.textDim,
    letterSpacing: 1.5,
    marginBottom:  Spacing.xs,
    marginTop:     Spacing.lg,
  },
  group: {
    backgroundColor: Colors.backgroundCard,
    borderRadius:    Radius.lg,
    overflow:        'hidden',
    borderWidth:      1,
    borderColor:     Colors.separator,
    marginBottom:    Spacing.xs,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.separator,
    marginHorizontal: Spacing.lg,
  },

  // Habit row
  habitRow: {
    flexDirection:  'row',
    alignItems:     'center',
    padding:        Spacing.lg,
    gap:            Spacing.md,
  },
  habitIcon: {
    width: 44, height: 44, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  habitInfo:     { flex: 1, gap: 5 },
  habitName:     { ...Typography.callout, color: Colors.textPrimary, fontWeight: '600' },
  habitMeta:     { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  habitType:     { ...Typography.caption1, fontWeight: '600' },
  habitDot:      { ...Typography.caption1, color: Colors.textDim },
  habitFreq:     { ...Typography.caption1, color: Colors.textDim },
  habitReminder: { ...Typography.caption1, color: Colors.textDim },

  habitActions: { flexDirection: 'row', gap: Spacing.sm },
  editBtn: {
    borderWidth:       1,
    borderColor:       Colors.gold + '55',
    borderRadius:      Radius.md,
    paddingHorizontal: 10,
    paddingVertical:    6,
  },
  editBtnText:    { ...Typography.caption1, color: Colors.gold, fontWeight: '600' },
  archiveBtn: {
    borderWidth:       1,
    borderColor:       Colors.separator,
    borderRadius:      Radius.md,
    paddingHorizontal: 10,
    paddingVertical:    6,
  },
  archiveBtnText: { ...Typography.caption1, color: Colors.textMuted },

  restoreBtn: {
    borderWidth:       1,
    borderColor:       Colors.green + '55',
    borderRadius:      Radius.md,
    paddingHorizontal: 12,
    paddingVertical:    7,
  },
  restoreBtnText: { ...Typography.caption1, color: Colors.green, fontWeight: '600' },

  // Empty
  empty: {
    alignItems: 'center', paddingVertical: 60, gap: 14,
  },
  emptyIcon:  { fontSize: 56 },
  emptyTitle: { ...Typography.title3, color: Colors.textSecondary, textAlign: 'center' },
  emptySub:   { ...Typography.body, color: Colors.textDim, textAlign: 'center', lineHeight: 24 },

  // Archived toggle
  archivedToggle: {
    paddingVertical:   Spacing.lg,
    paddingHorizontal: Spacing.xs,
    marginTop:         Spacing.lg,
  },
  archivedToggleText: { ...Typography.callout, color: Colors.textMuted },
});

export default HabitsScreen;