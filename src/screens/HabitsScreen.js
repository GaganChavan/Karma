// ─── KARMA APP — HABITS SCREEN (PHASE E) ────────────────────────────
// Phase E changes:
// - Pause button added alongside Edit/Archive actions
// - Paused section shown below active habits, above archived
// - Resume button restores habit to full active flow
// - Paused habits show ⏸ badge and "Logs preserved" note

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, Typography, Spacing, Radius } from '../constants/colors';
import { getDatabase } from '../database/database';
import {
  archiveHabit, getSetting,
  getPausedHabits, pauseHabit, resumeHabit,
} from '../database/habitService';
import { cancelHabitNotification } from '../services/notificationService';

// Returns Mon→Sun dates of current week
const getCurrentWeekDates = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay();
  const daysFromMon = dow === 0 ? 6 : dow - 1;
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - daysFromMon + i);
    dates.push({
      dateStr: d.toISOString().split('T')[0],
      label: ['M','T','W','T','F','S','S'][i],
      isToday: i === daysFromMon,
      isFuture: i > daysFromMon,
    });
  }
  return dates;
};

// 7-dot strip component
const WeekDots = ({ habitId, weekDates, checkinMap, accentColor, colors }) => (
  <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>
    {weekDates.map((d, i) => {
      const status = checkinMap[habitId]?.[d.dateStr];
      const done = status === 'done' || status === 'resisted';
      const bad  = status === 'missed' || status === 'slip';
      const skip = status === 'skipped' || status === 'auto_skipped';
      const bg = done ? accentColor
               : bad  ? colors.red + '99'
               : skip ? colors.backgroundElevated
               : colors.backgroundCard;
      return (
        <View key={i} style={{ alignItems: 'center', gap: 2 }}>
          <View style={{
            width: 9, height: 9, borderRadius: 5,
            backgroundColor: d.isFuture ? 'transparent' : bg,
            borderWidth: d.isToday ? 1.5 : 0,
            borderColor: colors.gold,
            opacity: d.isFuture ? 0.2 : 1,
          }} />
          <Text style={{ fontSize: 7, color: d.isToday ? colors.gold : colors.textDim }}>{d.label}</Text>
        </View>
      );
    })}
  </View>
);

const HabitsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [habits, setHabits]           = useState([]);
  const [paused, setPaused]           = useState([]);   // Phase E
  const [archived, setArchived]       = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [checkinMap, setCheckinMap]   = useState({});
  const [loading, setLoading]         = useState(true);
  const [alterEgo, setAlterEgo]       = useState('Gagan');
  const [error, setError]             = useState(null);

  const weekDates = getCurrentWeekDates();

  useFocusEffect(useCallback(() => { _loadData(); }, []));

  const _loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const db = await getDatabase();
      const ego = await getSetting('alter_ego');

      const [active, pausedList, archivedList] = await Promise.all([
        // Active = is_active AND NOT paused
        db.getAllAsync('SELECT * FROM habits WHERE is_active=1 AND is_paused=0 ORDER BY sort_order ASC, created_at ASC'),
        getPausedHabits(),
        db.getAllAsync('SELECT * FROM habits WHERE is_active=0 ORDER BY updated_at DESC'),
      ]);

      // Fetch this week's checkins for all habits in one query
      const fromDate = weekDates[0].dateStr;
      const toDate   = weekDates[6].dateStr;
      const weekCheckins = await db.getAllAsync(
        `SELECT habit_id, date, status FROM checkins WHERE date >= ? AND date <= ?`,
        [fromDate, toDate]
      ) || [];

      const cMap = {};
      weekCheckins.forEach(c => {
        if (!cMap[c.habit_id]) cMap[c.habit_id] = {};
        cMap[c.habit_id][c.date] = c.status;
      });

      setHabits(active || []);
      setPaused(pausedList || []);
      setArchived(archivedList || []);
      setCheckinMap(cMap);
      setAlterEgo(ego || 'Gagan');
    } catch (err) {
      setError(err.message || 'Failed to load habits');
    } finally {
      setLoading(false);
    }
  };

  // Archive
  const _archive = (habit) => {
    Alert.alert(
      'Archive Habit',
      `Archive "${habit.name}"?\n\nYour history and streaks are preserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', style: 'destructive', onPress: async () => {
          try {
            await archiveHabit(habit.id);
            await cancelHabitNotification(habit.id);
            await _loadData();
          } catch (err) { Alert.alert('Error', err.message); }
        }},
      ]
    );
  };

  // Restore from archive
  const _restore = async (habit) => {
    try {
      const db = await getDatabase();
      await db.runAsync(
        `UPDATE habits SET is_active=1, updated_at=datetime('now','localtime') WHERE id=?`,
        [habit.id]
      );
      await _loadData();
      Alert.alert('✅ Restored', `"${habit.name}" is active again.`);
    } catch (err) { Alert.alert('Error', err.message); }
  };

  // Phase E: Pause an active habit
  const _pause = (habit) => {
    Alert.alert(
      '⏸ Pause Habit',
      `Pause "${habit.name}"?\n\nAll your logs and streaks are preserved. No XP will be affected while paused. Resume anytime.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Pause', onPress: async () => {
          try {
            await pauseHabit(habit.id);
            await cancelHabitNotification(habit.id);
            await _loadData();
          } catch (err) { Alert.alert('Error', err.message); }
        }},
      ]
    );
  };

  // Phase E: Resume a paused habit
  const _resume = async (habit) => {
    try {
      await resumeHabit(habit.id);
      await _loadData();
      Alert.alert('▶ Resumed', `"${habit.name}" is back in your daily flow.`);
    } catch (err) { Alert.alert('Error', err.message); }
  };

  const _renderHabit = (habit, isArchived = false) => {
    const accent = habit.color || colors.gold;
    const todayStr = new Date().toISOString().split('T')[0];
    const todayStatus = checkinMap[habit.id]?.[todayStr];
    const doneToday = todayStatus === 'done' || todayStatus === 'resisted';

    return (
      <TouchableOpacity
        key={habit.id}
        style={[styles.habitRow, {
          borderLeftWidth: doneToday ? 3 : 0,
          borderLeftColor: accent,
          opacity: isArchived ? 0.6 : 1,
        }]}
        onPress={() => { if (!isArchived) navigation.navigate('HabitDetail', { habitId: habit.id }); }}
        activeOpacity={isArchived ? 1 : 0.75}
      >
        {/* Icon */}
        <View style={[styles.habitIcon, { backgroundColor: accent + '20' }]}>
          <Text style={{ fontSize: 22 }}>{habit.icon}</Text>
        </View>

        {/* Info + dots */}
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ ...Typography.callout, color: colors.textPrimary, fontWeight: '600' }}>{habit.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={{ ...Typography.caption1, fontWeight: '700', color: habit.type === 'build' ? colors.green : colors.red }}>
              {habit.type === 'build' ? '🟢 Build' : '🔴 Break'}
            </Text>
            <Text style={{ ...Typography.caption1, color: colors.textDim }}>·</Text>
            <Text style={{ ...Typography.caption1, color: colors.textDim }}>
              {habit.frequency_type === 'weekly' ? `${habit.weekly_target}×/week` : 'Daily'}
            </Text>
            {habit.is_quantifiable ? (
              <>
                <Text style={{ ...Typography.caption1, color: colors.textDim }}>·</Text>
                <Text style={{ ...Typography.caption1, color: colors.textDim }}>
                  {habit.daily_target} {habit.unit}
                </Text>
              </>
            ) : null}
          </View>

          {/* 7-day dots — only for active non-archived habits */}
          {!isArchived && (
            <WeekDots
              habitId={habit.id}
              weekDates={weekDates}
              checkinMap={checkinMap}
              accentColor={accent}
              colors={colors}
            />
          )}
        </View>

        {/* Actions */}
        {isArchived ? (
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: colors.green + '55' }]}
            onPress={() => _restore(habit)}
          >
            <Text style={{ ...Typography.caption1, color: colors.green, fontWeight: '600' }}>Restore</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ gap: 5 }}>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.gold + '55' }]}
              onPress={() => navigation.navigate('AddHabit', { habitId: habit.id })}
            >
              <Text style={{ ...Typography.caption1, color: colors.gold, fontWeight: '600' }}>Edit</Text>
            </TouchableOpacity>
            {/* Phase E: Pause button */}
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.blue + '55' }]}
              onPress={() => _pause(habit)}
            >
              <Text style={{ ...Typography.caption1, color: colors.blue, fontWeight: '600' }}>⏸ Pause</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.separator }]}
              onPress={() => _archive(habit)}
            >
              <Text style={{ ...Typography.caption1, color: colors.textMuted }}>Archive</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <StatusBar barStyle="light-content" />
      <ActivityIndicator size="large" color={colors.gold} />
      <Text style={{ ...Typography.body, color: colors.textMuted }}>Loading habits...</Text>
    </View>
  );

  if (error) return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <Text style={{ ...Typography.body, color: colors.red, textAlign: 'center' }}>{error}</Text>
      <TouchableOpacity style={{ backgroundColor: colors.gold, paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.lg }} onPress={_loadData}>
        <Text style={{ ...Typography.headline, color: '#000' }}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const buildHabits  = habits.filter(h => h.type === 'build');
  const breakHabits  = habits.filter(h => h.type === 'break');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <Text style={{ ...Typography.title2, color: colors.textPrimary }}>Habits</Text>
        <TouchableOpacity
          style={{ backgroundColor: colors.gold, paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full }}
          onPress={() => navigation.navigate('AddHabit')}
        >
          <Text style={{ ...Typography.footnote, color: '#000', fontWeight: '700' }}>+ New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.xl }} showsVerticalScrollIndicator={false}>

        {/* Summary */}
        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl }}>
          {[
            { num: buildHabits.length,  label: 'Building',  color: colors.green },
            { num: breakHabits.length,  label: 'Breaking',  color: colors.red },
            { num: paused.length,       label: 'Paused',    color: colors.blue },
            { num: archived.length,     label: 'Archived',  color: colors.textMuted },
          ].map((s, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: colors.backgroundCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.separator, padding: Spacing.sm, alignItems: 'center', gap: 3 }}>
              <Text style={{ fontSize: 22, fontWeight: '700', color: s.color }}>{s.num}</Text>
              <Text style={{ ...Typography.caption2, color: colors.textDim }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Week legend */}
        {habits.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: Spacing.md, paddingHorizontal: Spacing.xs }}>
            <Text style={{ ...Typography.caption2, color: colors.textDim }}>This week:</Text>
            {[
              { color: colors.gold,              label: 'Done' },
              { color: colors.red + '99',        label: 'Missed' },
              { color: colors.backgroundElevated,label: 'Skipped', border: true },
            ].map((l, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: l.color, borderWidth: l.border ? 1 : 0, borderColor: colors.separator }} />
                <Text style={{ fontSize: 9, color: colors.textDim }}>{l.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Build habits */}
        {buildHabits.length > 0 && (
          <>
            <Text style={[styles.groupLabel, { color: colors.textDim }]}>BUILD HABITS</Text>
            <View style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.separator, marginBottom: Spacing.xs }}>
              {buildHabits.map((h, i) => (
                <View key={h.id}>
                  {i > 0 && <View style={{ height: 1, backgroundColor: colors.separator, marginHorizontal: Spacing.lg }} />}
                  {_renderHabit(h)}
                </View>
              ))}
            </View>
          </>
        )}

        {/* Break habits */}
        {breakHabits.length > 0 && (
          <>
            <Text style={[styles.groupLabel, { color: colors.textDim }]}>BREAK HABITS</Text>
            <View style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.separator, marginBottom: Spacing.xs }}>
              {breakHabits.map((h, i) => (
                <View key={h.id}>
                  {i > 0 && <View style={{ height: 1, backgroundColor: colors.separator, marginHorizontal: Spacing.lg }} />}
                  {_renderHabit(h)}
                </View>
              ))}
            </View>
          </>
        )}

        {/* Empty state */}
        {habits.length === 0 && paused.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 60, gap: 14 }}>
            <Text style={{ fontSize: 56 }}>☸</Text>
            <Text style={{ ...Typography.title3, color: colors.textSecondary, textAlign: 'center' }}>No habits yet, {alterEgo}</Text>
            <Text style={{ ...Typography.body, color: colors.textDim, textAlign: 'center', lineHeight: 24 }}>
              Tap New above to add your first habit.
            </Text>
          </View>
        )}

        {/* ── Phase E: Paused section ── */}
        {paused.length > 0 && (
          <View style={{ marginTop: Spacing.xl }}>
            <Text style={[styles.groupLabel, { color: colors.textDim }]}>⏸  PAUSED — {paused.length}</Text>
            <View style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.separator }}>
              {paused.map((habit, i) => (
                <View key={habit.id}>
                  {i > 0 && <View style={{ height: 1, backgroundColor: colors.separator, marginHorizontal: Spacing.lg }} />}
                  <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    padding: Spacing.lg, gap: Spacing.md,
                    opacity: 0.65,
                    borderLeftWidth: 3,
                    borderLeftColor: colors.textMuted,
                  }}>
                    <View style={[styles.habitIcon, { backgroundColor: (habit.color || colors.gold) + '15' }]}>
                      <Text style={{ fontSize: 22 }}>{habit.icon}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={{ ...Typography.callout, color: colors.textPrimary, fontWeight: '600' }}>
                        {habit.name}
                      </Text>
                      <Text style={{ ...Typography.caption1, color: colors.textMuted }}>
                        Paused · Logs preserved · Streak frozen
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.actionBtn, { borderColor: colors.gold + '55', backgroundColor: colors.gold + '15' }]}
                      onPress={() => _resume(habit)}
                    >
                      <Text style={{ ...Typography.caption1, color: colors.gold, fontWeight: '700' }}>▶ Resume</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
            <Text style={{ ...Typography.caption2, color: colors.textDim, textAlign: 'center', marginTop: Spacing.sm }}>
              Paused habits don't affect your Karma Score or XP
            </Text>
          </View>
        )}

        {/* Archived */}
        {archived.length > 0 && (
          <>
            <TouchableOpacity
              style={{ paddingVertical: Spacing.lg, marginTop: Spacing.lg }}
              onPress={() => setShowArchived(!showArchived)}
            >
              <Text style={{ ...Typography.callout, color: colors.textMuted }}>
                {showArchived ? '▼' : '▶'} {archived.length} Archived Habit{archived.length > 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
            {showArchived && (
              <View style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.separator }}>
                {archived.map((h, i) => (
                  <View key={h.id}>
                    {i > 0 && <View style={{ height: 1, backgroundColor: colors.separator, marginHorizontal: Spacing.lg }} />}
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
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderBottomWidth: 1 },
  groupLabel: { ...Typography.caption2, letterSpacing: 1.5, marginBottom: Spacing.xs, marginTop: Spacing.lg },
  habitRow:   { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md, paddingLeft: Spacing.md },
  habitIcon:  { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  actionBtn:  { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center' },
});

export default HabitsScreen;