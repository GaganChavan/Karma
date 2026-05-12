// ─── KARMA APP — HISTORY SCREEN (PHASE E) ────────────────────────────
// Phase E: auto_skipped added to STATUS_CONFIG
// - Shows as ⚠️ "Not logged" with muted amber color
// - User can tap to edit auto_skipped → done/missed within 3 days
//   (XP correction happens automatically via editPastCheckin)

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView }    from 'react-native-safe-area-context';
import { useFocusEffect }  from '@react-navigation/native';
import { Colors }          from '../constants/colors';
import { DateUtils }       from '../utils/dateUtils';
import {
  getAllHabits, getCheckinsForHabit, editPastCheckin,
} from '../database/habitService';
import { getDatabase }     from '../database/database';

// Phase E: added auto_skipped entry
const STATUS_CONFIG = {
  done:         { icon: '✅', label: 'Done',       color: Colors.green },
  resisted:     { icon: '✊', label: 'Resisted',   color: Colors.green },
  missed:       { icon: '❌', label: 'Missed',     color: Colors.red },
  slip:         { icon: '😔', label: 'Slipped',    color: Colors.red },
  skipped:      { icon: '⏭', label: 'Skipped',    color: Colors.gold },
  auto_skipped: { icon: '⚠️', label: 'Not logged', color: '#F5A623' },
  none:         { icon: '⬜', label: 'No data',    color: Colors.textDim },
};

const HistoryScreen = ({ navigation }) => {
  const [habits,      setHabits]      = useState([]);
  const [dayData,     setDayData]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [editSaving,  setEditSaving]  = useState(false);

  useFocusEffect(
    useCallback(() => { _loadData(); }, [])
  );

  const _loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const db     = await getDatabase();
      const habits = await getAllHabits();
      const days   = DateUtils.getLastNDays(30).reverse(); // Most recent first

      const fromDate   = days[days.length - 1];
      const checkins   = await db.getAllAsync(
        'SELECT * FROM checkins WHERE date >= ? ORDER BY date DESC',
        [fromDate]
      ) || [];

      // Build map: date → habit_id → checkin
      const checkinMap = {};
      checkins.forEach(c => {
        if (!checkinMap[c.date]) checkinMap[c.date] = {};
        checkinMap[c.date][c.habit_id] = c;
      });

      const dayDataArr = days.map(date => {
        const dayCheckins    = checkinMap[date] || {};
        const habitStatuses  = habits.map(h => ({
          habit:   h,
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
          doneCount:   done,
          total:       habits.length,
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

    // Build options based on habit type
    // Phase E: auto_skipped can be corrected to done (if you actually did it but forgot)
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

    const currentLabel = STATUS_CONFIG[currentStatus]?.label || 'No data';
    const isAutoSkipped = currentStatus === 'auto_skipped';

    Alert.alert(
      `Edit: ${habit.name}`,
      `${DateUtils.formatDate(date)}\nCurrent: ${currentLabel}${isAutoSkipped ? '\n\nIf you actually did this, mark Done to recover XP.' : ''}`,
      [
        ...options.map(o => ({
          text: o.text,
          onPress: async () => {
            setEditSaving(true);
            try {
              await editPastCheckin(habit.id, date, o.status);
              await _loadData();
              Alert.alert('✅ Updated', `${habit.name} updated for ${DateUtils.formatDate(date)}`);
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

  // ── Render ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <ActivityIndicator size="large" color={Colors.blue} />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={_loadData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>History</Text>
        <View style={{ width: 60 }} />
      </View>

      {editSaving && (
        <View style={styles.savingBar}>
          <ActivityIndicator size="small" color={Colors.blue} />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.editHint}>
          Tap any habit status to edit (up to 3 days back) · ⚠️ = not logged
        </Text>

        {habits.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>No habits yet. Add habits to see history.</Text>
          </View>
        )}

        {dayData.map((day) => (
          <View key={day.date} style={styles.dayCard}>

            {/* Day header */}
            <View style={styles.dayHeader}>
              <View>
                <Text style={[styles.dayTitle, day.isToday && { color: Colors.blue }]}>
                  {day.isToday ? 'Today'
                   : day.isYesterday ? 'Yesterday'
                   : DateUtils.getDayOfWeek(new Date(day.date + 'T12:00:00'))}
                </Text>
                <Text style={styles.dayDate}>{DateUtils.formatDate(day.date)}</Text>
              </View>
              <View style={styles.dayScore}>
                <Text style={[styles.dayScoreText, {
                  color: day.doneCount === day.total && day.total > 0
                    ? Colors.green
                    : day.doneCount === 0
                    ? Colors.textDim
                    : Colors.gold,
                }]}>
                  {day.doneCount}/{day.total}
                </Text>
                {day.doneCount === day.total && day.total > 0 && (
                  <Text style={styles.perfectBadge}>⭐</Text>
                )}
              </View>
            </View>

            {/* Progress bar */}
            <View style={styles.dayProgressTrack}>
              <View style={[styles.dayProgressFill, {
                width: day.total > 0 ? `${(day.doneCount / day.total) * 100}%` : '0%',
                backgroundColor:
                  day.doneCount === day.total && day.total > 0 ? Colors.green
                  : day.doneCount > 0 ? Colors.blue
                  : Colors.backgroundCard,
              }]} />
            </View>

            {/* Habit rows */}
            {day.total === 0 && (
              <Text style={styles.noHabitsText}>No habits were active on this day</Text>
            )}

            {day.habitStatuses.map(({ habit, status }) => {
              const config  = STATUS_CONFIG[status] || STATUS_CONFIG.none;
              const canEdit = day.canEdit;

              return (
                <TouchableOpacity
                  key={habit.id}
                  style={styles.habitRow}
                  onPress={() => _handleEditCheckin(habit, day.date, status)}
                  activeOpacity={canEdit ? 0.7 : 1}
                  disabled={!canEdit && status === 'none'}
                >
                  <View style={[styles.habitRowIcon, {
                    backgroundColor: (habit.color || Colors.blue) + '20',
                  }]}>
                    <Text style={{ fontSize: 16 }}>{habit.icon}</Text>
                  </View>

                  <Text style={[styles.habitRowName, {
                    color: status === 'none' ? Colors.textDim : Colors.textSecondary,
                  }]} numberOfLines={1}>
                    {habit.name}
                  </Text>

                  <View style={[styles.statusBadge, {
                    backgroundColor: config.color + '20',
                    borderColor:     config.color + '44',
                  }]}>
                    <Text style={styles.statusIcon}>{config.icon}</Text>
                    <Text style={[styles.statusLabel, { color: config.color }]}>
                      {config.label}
                    </Text>
                  </View>

                  {canEdit && (
                    <Text style={styles.editIcon}>✎</Text>
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
  screen:           { flex: 1, backgroundColor: Colors.background },
  scroll:           { flex: 1 },
  scrollContent:    { padding: 16 },
  center:           { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:      { color: Colors.textMuted, fontSize: 14 },
  errorText:        { color: Colors.red, textAlign: 'center', padding: 20 },
  retryBtn:         { backgroundColor: Colors.blue, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText:        { color: Colors.white, fontWeight: 'bold' },
  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:          { padding: 4, minWidth: 60 },
  backText:         { color: Colors.blue, fontSize: 14 },
  headerTitle:      { fontSize: 18, color: Colors.textPrimary, fontWeight: 'bold' },
  savingBar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8, backgroundColor: Colors.blueAlpha10 },
  savingText:       { color: Colors.blue, fontSize: 12 },
  editHint:         { fontSize: 11, color: Colors.textDim, textAlign: 'center', marginBottom: 16, letterSpacing: 0.3 },
  emptyState:       { alignItems: 'center', padding: 40, gap: 12 },
  emptyIcon:        { fontSize: 48 },
  emptyText:        { fontSize: 13, color: Colors.textDim, textAlign: 'center' },
  dayCard:          { backgroundColor: Colors.backgroundCard, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 12, padding: 14, gap: 10 },
  dayHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  dayTitle:         { fontSize: 16, color: Colors.textPrimary, fontWeight: 'bold' },
  dayDate:          { fontSize: 11, color: Colors.textDim, marginTop: 2 },
  dayScore:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dayScoreText:     { fontSize: 18, fontWeight: 'bold' },
  perfectBadge:     { fontSize: 16 },
  dayProgressTrack: { height: 5, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  dayProgressFill:  { height: '100%', borderRadius: 3 },
  noHabitsText:     { fontSize: 12, color: Colors.textDim, textAlign: 'center' },
  habitRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  habitRowIcon:     { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  habitRowName:     { flex: 1, fontSize: 13, fontWeight: '500' },
  statusBadge:      { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  statusIcon:       { fontSize: 12 },
  statusLabel:      { fontSize: 11, fontWeight: '600' },
  editIcon:         { fontSize: 14, color: Colors.textDim },
});

export default HistoryScreen;