// ─── KARMA APP — HISTORY SCREEN (PHASE E — FIXED) ────────────────────
// Fixes:
// 1. Replaced static Colors import with useTheme() — responds to dark/light
// 2. Colors.border → colors.separator (didn't exist)
// 3. Colors.blueAlpha10 → colors.blueAlpha15 (didn't exist)

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView }   from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, Typography, Spacing, Radius } from '../constants/colors';
import { DateUtils }      from '../utils/dateUtils';
import {
  getAllHabits, editPastCheckin,
} from '../database/habitService';
import { getDatabase }    from '../database/database';

// Phase E: auto_skipped entry — built dynamically using theme colors below
const STATUS_CONFIG_STATIC = {
  done:         { icon: '✅', label: 'Done'       },
  resisted:     { icon: '✊', label: 'Resisted'   },
  missed:       { icon: '❌', label: 'Missed'     },
  slip:         { icon: '😔', label: 'Slipped'    },
  skipped:      { icon: '⏭', label: 'Skipped'    },
  auto_skipped: { icon: '⚠️', label: 'Not logged' },
  none:         { icon: '⬜', label: 'No data'    },
};

// Color resolved at render time using live theme colors
const getStatusColor = (status, colors) => {
  switch (status) {
    case 'done':
    case 'resisted':     return colors.green;
    case 'missed':
    case 'slip':         return colors.red;
    case 'skipped':      return colors.gold;
    case 'auto_skipped': return '#F5A623';
    default:             return colors.textDim;
  }
};

// XP hint for edit dialog
const _getXPHint = (oldStatus, newStatus) => {
  const wasAutoSkip = oldStatus === 'auto_skipped';
  const wasDone     = oldStatus === 'done';
  const wasResisted = oldStatus === 'resisted';
  if (wasAutoSkip) {
    if (newStatus === 'done')     return '  +13 XP  (refund penalty + done bonus)';
    if (newStatus === 'resisted') return '  +18 XP  (refund penalty + resisted bonus)';
    if (newStatus === 'missed' || newStatus === 'skipped') return '  +3 XP  (penalty refunded)';
  }
  if ((wasDone || wasResisted) && newStatus !== 'done' && newStatus !== 'resisted') {
    return wasDone ? '  -10 XP  (done reversed)' : '  -15 XP  (resisted reversed)';
  }
  if (!wasDone && !wasResisted && oldStatus !== 'auto_skipped') {
    if (newStatus === 'done')     return '  +10 XP';
    if (newStatus === 'resisted') return '  +15 XP';
  }
  if (wasDone && newStatus === 'resisted') return '  +5 XP';
  if (wasResisted && newStatus === 'done') return '  -5 XP';
  return '';
};

const HistoryScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme(); // FIX: live theme colors
  const [habits,     setHabits]     = useState([]);
  const [dayData,    setDayData]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  useFocusEffect(
    useCallback(() => { _loadData(); }, [])
  );

  const _loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const db     = await getDatabase();
      const habits = await getAllHabits();
      const days   = DateUtils.getLastNDays(30).reverse();
      const fromDate = days[days.length - 1];

      const checkins = await db.getAllAsync(
        'SELECT * FROM checkins WHERE date >= ? ORDER BY date DESC',
        [fromDate]
      ) || [];

      const checkinMap = {};
      checkins.forEach(c => {
        if (!checkinMap[c.date]) checkinMap[c.date] = {};
        checkinMap[c.date][c.habit_id] = c;
      });

      const dayDataArr = days.map(date => {
        const dayCheckins   = checkinMap[date] || {};
        const habitStatuses = habits.map(h => ({
          habit:  h,
          checkin: dayCheckins[h.id] || null,
          status:  dayCheckins[h.id]?.status || 'none',
        }));
        const done = habitStatuses.filter(
          s => s.status === 'done' || s.status === 'resisted'
        ).length;
        return {
          date,
          isToday:     DateUtils.isToday(date),
          isYesterday: DateUtils.isYesterday(date),
          canEdit:     DateUtils.daysBetween(date, DateUtils.today()) <= 3,
          habitStatuses,
          doneCount: done,
          total:     habits.length,
        };
      });

      setHabits(habits);
      setDayData(dayDataArr);
    } catch (err) {
      console.error('HistoryScreen load:', err);
      setError(err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const _handleEditCheckin = async (habit, date, currentStatus) => {
    const canEdit = DateUtils.daysBetween(date, DateUtils.today()) <= 3;
    if (!canEdit) {
      Alert.alert(
        '🔒 Can\'t Edit',
        'You can only edit check-ins up to 3 days back. This keeps your data honest.',
        [{ text: 'OK' }]
      );
      return;
    }

    const options = habit.type === 'build'
      ? [
          { text: '✅ Mark Done',    status: 'done' },
          { text: '❌ Mark Missed',  status: 'missed' },
          { text: '⏭ Mark Skipped', status: 'skipped' },
        ]
      : [
          { text: '✊ Mark Resisted', status: 'resisted' },
          { text: '😔 Mark Slipped',  status: 'slip' },
        ];

    const currentLabel  = STATUS_CONFIG_STATIC[currentStatus]?.label || 'No data';
    const isAutoSkipped = currentStatus === 'auto_skipped';
    const optionHints   = options
      .map(o => `${o.text}${_getXPHint(currentStatus, o.status)}`)
      .join('\n');

    Alert.alert(
      `Edit: ${habit.name}`,
      `${DateUtils.formatDate(date)}\nCurrent: ${currentLabel}${
        isAutoSkipped
          ? '\n\nYou forgot to log this day. If you actually did it, mark Done to recover XP.'
          : ''
      }\n\n${optionHints}`,
      [
        ...options.map(o => ({
          text: o.text.split(' ').slice(0, 2).join(' '),
          onPress: async () => {
            setEditSaving(true);
            try {
              await editPastCheckin(habit.id, date, o.status);
              await _loadData();
              const xpHint = _getXPHint(currentStatus, o.status);
              Alert.alert(
                '✅ Updated',
                `${habit.name} → ${STATUS_CONFIG_STATIC[o.status]?.label || o.status}${
                  xpHint ? `\n${xpHint.trim()}` : ''
                }`
              );
            } catch (err) {
              Alert.alert('Error', err.message);
            } finally {
              setEditSaving(false);
            }
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // ── Render ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color={colors.blue} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading history...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Text style={[styles.errorText, { color: colors.red }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.blue }]}
          onPress={_loadData}
        >
          <Text style={[styles.retryText, { color: colors.white }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.blue }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>History</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Saving indicator */}
      {editSaving && (
        <View style={[styles.savingBar, { backgroundColor: colors.blueAlpha15 }]}>
          <ActivityIndicator size="small" color={colors.blue} />
          <Text style={[styles.savingText, { color: colors.blue }]}>Saving...</Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.editHint, { color: colors.textDim }]}>
          Tap any habit to edit (up to 3 days back) · ⚠️ = not logged
        </Text>

        {habits.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={[styles.emptyText, { color: colors.textDim }]}>
              No habits yet. Add habits to see history.
            </Text>
          </View>
        )}

        {dayData.map((day) => (
          <View
            key={day.date}
            style={[styles.dayCard, {
              backgroundColor: colors.backgroundCard,
              borderColor:     colors.separator,  // FIX: was Colors.border
            }]}
          >
            {/* Day header */}
            <View style={styles.dayHeader}>
              <View>
                <Text style={[styles.dayTitle, {
                  color: day.isToday ? colors.blue : colors.textPrimary,
                }]}>
                  {day.isToday
                    ? 'Today'
                    : day.isYesterday
                    ? 'Yesterday'
                    : DateUtils.getDayOfWeek(new Date(day.date + 'T12:00:00'))}
                </Text>
                <Text style={[styles.dayDate, { color: colors.textDim }]}>
                  {DateUtils.formatDate(day.date)}
                </Text>
              </View>
              <View style={styles.dayScore}>
                <Text style={[styles.dayScoreText, {
                  color:
                    day.doneCount === day.total && day.total > 0 ? colors.green
                    : day.doneCount === 0 ? colors.textDim
                    : colors.gold,
                }]}>
                  {day.doneCount}/{day.total}
                </Text>
                {day.doneCount === day.total && day.total > 0 && (
                  <Text style={styles.perfectBadge}>⭐</Text>
                )}
              </View>
            </View>

            {/* Progress bar */}
            <View style={[styles.dayProgressTrack, { backgroundColor: colors.separator }]}>
              <View style={[styles.dayProgressFill, {
                width: day.total > 0 ? `${(day.doneCount / day.total) * 100}%` : '0%',
                backgroundColor:
                  day.doneCount === day.total && day.total > 0 ? colors.green
                  : day.doneCount > 0 ? colors.blue
                  : colors.backgroundCard,
              }]} />
            </View>

            {day.total === 0 && (
              <Text style={[styles.noHabitsText, { color: colors.textDim }]}>
                No habits were active on this day
              </Text>
            )}

            {/* Habit rows */}
            {day.habitStatuses.map(({ habit, status }) => {
              const cfg      = STATUS_CONFIG_STATIC[status] || STATUS_CONFIG_STATIC.none;
              const clr      = getStatusColor(status, colors);
              const canEdit  = day.canEdit;
              return (
                <TouchableOpacity
                  key={habit.id}
                  style={styles.habitRow}
                  onPress={() => _handleEditCheckin(habit, day.date, status)}
                  activeOpacity={canEdit ? 0.7 : 1}
                  disabled={!canEdit && status === 'none'}
                >
                  <View style={[styles.habitRowIcon, {
                    backgroundColor: (habit.color || colors.blue) + '20',
                  }]}>
                    <Text style={{ fontSize: 16 }}>{habit.icon}</Text>
                  </View>

                  <Text
                    style={[styles.habitRowName, {
                      color: status === 'none' ? colors.textDim : colors.textSecondary,
                    }]}
                    numberOfLines={1}
                  >
                    {habit.name}
                  </Text>

                  <View style={[styles.statusBadge, {
                    backgroundColor: clr + '20',
                    borderColor:     clr + '44',
                  }]}>
                    <Text style={styles.statusIcon}>{cfg.icon}</Text>
                    <Text style={[styles.statusLabel, { color: clr }]}>
                      {cfg.label}
                    </Text>
                  </View>

                  {canEdit && (
                    <Text style={[styles.editIcon, { color: colors.textDim }]}>✎</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen:           { flex: 1 },
  scroll:           { flex: 1 },
  scrollContent:    { padding: 16 },
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:      { fontSize: 14 },
  errorText:        { textAlign: 'center', padding: 20 },
  retryBtn:         { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText:        { fontWeight: 'bold' },
  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn:          { padding: 4, minWidth: 60 },
  backText:         { fontSize: 14 },
  headerTitle:      { fontSize: 18, fontWeight: 'bold' },
  savingBar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8 },
  savingText:       { fontSize: 12 },
  editHint:         { fontSize: 11, textAlign: 'center', marginBottom: 16, letterSpacing: 0.3 },
  emptyState:       { alignItems: 'center', padding: 40, gap: 12 },
  emptyIcon:        { fontSize: 48 },
  emptyText:        { fontSize: 13, textAlign: 'center' },
  dayCard:          { borderRadius: 16, borderWidth: 1, marginBottom: 12, padding: 14, gap: 10 },
  dayHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  dayTitle:         { fontSize: 16, fontWeight: 'bold' },
  dayDate:          { fontSize: 11, marginTop: 2 },
  dayScore:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dayScoreText:     { fontSize: 18, fontWeight: 'bold' },
  perfectBadge:     { fontSize: 16 },
  dayProgressTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  dayProgressFill:  { height: '100%', borderRadius: 3 },
  noHabitsText:     { fontSize: 12, textAlign: 'center' },
  habitRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  habitRowIcon:     { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  habitRowName:     { flex: 1, fontSize: 13, fontWeight: '500' },
  statusBadge:      { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  statusIcon:       { fontSize: 12 },
  statusLabel:      { fontSize: 11, fontWeight: '600' },
  editIcon:         { fontSize: 14 },
});

export default HistoryScreen;