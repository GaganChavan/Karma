// ─── KARMA APP — HABIT DETAIL SCREEN (FULLY FIXED) ──────────────────

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { DateUtils } from '../utils/dateUtils';
import {
  getHabitById, getStreak, getCheckinsForHabit,
  checkIn, getPunishmentLevel, getWeeklyCompletionRate,
} from '../database/habitService';
import { getMilestoneMessage } from '../constants/slogans';

const PUNISHMENT_LABELS = ['', 'MILD', 'MODERATE', 'HARSH', 'MAXIMUM'];
const PUNISHMENT_COLORS = [
  Colors.blue,
  Colors.punishLevel1,
  Colors.punishLevel2,
  Colors.punishLevel3,
  Colors.punishLevel4,
];

const HabitDetailScreen = ({ navigation, route }) => {
  const { habitId } = route.params;

  const [habit,        setHabit]        = useState(null);
  const [streak,       setStreak]       = useState({ current: 0, longest: 0 });
  const [checkins,     setCheckins]     = useState([]);
  const [todayStatus,  setTodayStatus]  = useState(null); // direct string state
  const [slipCount,    setSlipCount]    = useState(0);
  const [punishLevel,  setPunishLevel]  = useState(0);
  const [weekRate,     setWeekRate]     = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState(null);

  useFocusEffect(
    useCallback(() => { _loadData(); }, [habitId])
  );

  const _loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [habitData, streakData, checkinsData, weekRateData] = await Promise.all([
        getHabitById(habitId),
        getStreak(habitId),
        getCheckinsForHabit(habitId, 90),
        getWeeklyCompletionRate(habitId),
      ]);

      const today      = DateUtils.today();
      const todayEntry = checkinsData.find(c => c.date === today);

      // Set today status directly as a string
      setTodayStatus(todayEntry?.status || null);
      setSlipCount(todayEntry?.slip_count || 0);

      let punish = 0;
      if (habitData.type === 'break') {
        punish = await getPunishmentLevel(habitId);
      }

      setHabit(habitData);
      setStreak(streakData);
      setCheckins(checkinsData);
      setPunishLevel(punish);
      setWeekRate(weekRateData);

    } catch (err) {
      console.error('HabitDetail _loadData error:', err);
      setError(err.message || 'Failed to load habit');
    } finally {
      setLoading(false);
    }
  };

  const _doCheckIn = async (status, newSlipCount = 0) => {
    if (saving) return;

    // Optimistic UI update — update state immediately so user sees change
    const previousStatus   = todayStatus;
    const previousSlipCount = slipCount;
    setTodayStatus(status);
    setSlipCount(newSlipCount);
    setSaving(true);

    try {
      await checkIn(habitId, status, null, newSlipCount);

      // Reload streak and stats after save
      const [newStreak, newWeekRate] = await Promise.all([
        getStreak(habitId),
        getWeeklyCompletionRate(habitId),
      ]);
      setStreak(newStreak);
      setWeekRate(newWeekRate);

      // Check milestone
      if ((status === 'done' || status === 'resisted') &&
          [3,7,14,21,30,48,60,75,90,180,365].includes(newStreak.current)) {
        Alert.alert(
          '🏆 Milestone Reached!',
          getMilestoneMessage(newStreak.current, habit.name)
        );
      }

    } catch (err) {
      // Rollback optimistic update on error
      setTodayStatus(previousStatus);
      setSlipCount(previousSlipCount);
      Alert.alert('Check-in Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const _handleBuildMainBtn = () => {
    // Main button toggles between done and missed
    if (todayStatus === 'done') {
      _doCheckIn('missed'); // undo
    } else {
      _doCheckIn('done');   // complete
    }
  };

  const _handleSkip = () => {
    _doCheckIn('skipped');
  };

  const _handleMissed = () => {
    _doCheckIn('missed');
  };

  const _handleBreakCheckin = () => {
    Alert.alert(
      habit.name,
      'How did you do today?',
      [
        {
          text:    '✊ I Resisted',
          onPress: () => _doCheckIn('resisted'),
        },
        {
          text:    '😔 I Slipped',
          style:   'destructive',
          onPress: () => _doCheckIn('slip', slipCount + 1),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // ── Computed from todayStatus string ─────────────────────────────

  const isDone    = todayStatus === 'done';
  const isResisted = todayStatus === 'resisted';
  const isSkipped = todayStatus === 'skipped';
  const isMissed  = todayStatus === 'missed';
  const isSlipped = todayStatus === 'slip';
  const isDoneOrResisted = isDone || isResisted;

  const accentColor = punishLevel > 0
    ? PUNISHMENT_COLORS[punishLevel]
    : (habit?.color || Colors.blue);

  const weekDates  = DateUtils.getWeekDates();
  const checkinMap = {};
  checkins.forEach(c => { checkinMap[c.date] = c; });
  // Also reflect today's optimistic state in week view
  if (todayStatus) {
    const today = DateUtils.today();
    checkinMap[today] = { ...(checkinMap[today] || {}), status: todayStatus };
  }

  // Build habit main button
  const mainBtnLabel = () => {
    if (isDone)    return '✓ Done Today — Tap to Undo';
    if (isSkipped) return '⏭ Skipped — Tap to Complete';
    if (isMissed)  return '✗ Missed — Tap to Complete';
    return '☀️ Mark Complete';
  };

  const mainBtnColor = () => {
    if (isDone)             return Colors.green;
    if (isSkipped || isMissed) return Colors.textMuted;
    return accentColor;
  };

  // ── Loading / Error ───────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.blue} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error || !habit) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorMsg}>{error || 'Habit not found'}</Text>
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
        <Text style={styles.headerTitle} numberOfLines={1}>{habit.name}</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddHabit', { habitId })}
          style={styles.editBtn}
        >
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Hero */}
        <View style={[styles.heroCard, {
          backgroundColor: accentColor + '18',
          borderColor:     accentColor + '44',
        }]}>
          <Text style={styles.heroIcon}>{habit.icon}</Text>
          <Text style={styles.heroName}>{habit.name}</Text>
          <View style={[styles.typeBadge, {
            backgroundColor: habit.type === 'build' ? Colors.greenAlpha : Colors.redAlpha,
          }]}>
            <Text style={[styles.typeBadgeText, {
              color: habit.type === 'build' ? Colors.green : Colors.red,
            }]}>
              {habit.type === 'build' ? '🟢 BUILD' : '🔴 BREAK'}
            </Text>
          </View>
          {punishLevel > 0 && (
            <Text style={[styles.punishTag, { color: accentColor }]}>
              ⚠️ {PUNISHMENT_LABELS[punishLevel]} PUNISHMENT ACTIVE
            </Text>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            {
              label: habit.type === 'build' ? 'STREAK' : 'DAYS CLEAN',
              value: streak.current > 0
                ? `${streak.current} ${habit.type === 'build' ? '🔥' : '✊'}`
                : '0',
              color: streak.current > 0 ? accentColor : Colors.textMuted,
            },
            {
              label: 'BEST',
              value: `${streak.longest} ⭐`,
              color: Colors.gold,
            },
            {
              label: 'THIS WEEK',
              value: `${weekRate}%`,
              color: weekRate >= 70 ? Colors.green : weekRate >= 40 ? Colors.gold : Colors.red,
            },
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Week View */}
        <Text style={styles.sectionLabel}>THIS WEEK</Text>
        <View style={styles.weekRow}>
          {weekDates.map((d) => {
            const c    = checkinMap[d.dateStr];
            const done = c?.status === 'done' || c?.status === 'resisted';
            const slip = c?.status === 'slip';
            const miss = c?.status === 'missed';
            const skip = c?.status === 'skipped';
            return (
              <View key={d.dateStr} style={styles.weekDay}>
                <Text style={[styles.weekLabel, d.isToday && { color: Colors.blue }]}>
                  {d.label}
                </Text>
                <View style={[styles.weekCircle, {
                  backgroundColor:
                    done ? accentColor      :
                    slip ? Colors.red+'40'  :
                    miss ? Colors.red+'20'  :
                    skip ? Colors.gold+'20' :
                    d.isToday ? Colors.blueAlpha20 :
                    Colors.backgroundCard,
                  borderColor:
                    d.isToday ? Colors.blue      :
                    done      ? accentColor      :
                    slip      ? Colors.red        :
                    miss      ? Colors.red+'66'   :
                    skip      ? Colors.gold+'66'  :
                    Colors.border,
                  borderWidth: d.isToday ? 2 : 1,
                }]}>
                  <Text style={{ fontSize: 11 }}>
                    {done ? '✓' : slip ? '✗' : miss ? '–' : skip ? '⏭' : ''}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Today's Action */}
        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>TODAY'S ACTION</Text>

        {habit.type === 'build' ? (
          <View style={styles.buildBtnCol}>

            {/* Primary button */}
            <TouchableOpacity
              style={[styles.mainBtn, {
                backgroundColor: mainBtnColor(),
                opacity: saving ? 0.6 : 1,
              }]}
              onPress={_handleBuildMainBtn}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving
                ? <ActivityIndicator color={Colors.white} size="small" />
                : <Text style={styles.mainBtnText}>{mainBtnLabel()}</Text>
              }
            </TouchableOpacity>

            {/* Skip + Missed row */}
            <View style={styles.secondRow}>
              <TouchableOpacity
                style={[styles.secondBtn, {
                  borderColor:     isSkipped ? Colors.gold : Colors.border,
                  backgroundColor: isSkipped ? Colors.goldAlpha : Colors.backgroundCard,
                  opacity:         saving ? 0.6 : 1,
                }]}
                onPress={_handleSkip}
                disabled={saving}
                activeOpacity={0.8}
              >
                <Text style={[styles.secondBtnText, {
                  color: isSkipped ? Colors.gold : Colors.textMuted,
                }]}>
                  ⏭ {isSkipped ? 'Skipped ✓' : 'Skip Today'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondBtn, {
                  borderColor:     isMissed ? Colors.red : Colors.border,
                  backgroundColor: isMissed ? Colors.redAlpha : Colors.backgroundCard,
                  opacity:         saving ? 0.6 : 1,
                }]}
                onPress={_handleMissed}
                disabled={saving}
                activeOpacity={0.8}
              >
                <Text style={[styles.secondBtnText, {
                  color: isMissed ? Colors.red : Colors.textMuted,
                }]}>
                  ✗ {isMissed ? 'Missed ✓' : 'Mark Missed'}
                </Text>
              </TouchableOpacity>
            </View>

          </View>

        ) : (
          /* Break habit */
          <View style={styles.breakBtnRow}>
            <TouchableOpacity
              style={[styles.breakBtn, {
                borderColor:     isResisted ? Colors.green : Colors.green + '55',
                backgroundColor: isResisted ? Colors.greenAlpha : Colors.green + '10',
                opacity:         saving ? 0.6 : 1,
              }]}
              onPress={() => _doCheckIn('resisted')}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={[styles.breakBtnText, { color: Colors.green }]}>
                {isResisted ? '✓ Resisted Today' : '✊ I Resisted'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.breakBtn, {
                borderColor:     isSlipped ? Colors.red : Colors.red + '55',
                backgroundColor: isSlipped ? Colors.redAlpha : Colors.red + '10',
                opacity:         saving ? 0.6 : 1,
              }]}
              onPress={_handleBreakCheckin}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={[styles.breakBtnText, { color: Colors.red }]}>
                {isSlipped ? `😔 Slipped (${slipCount}x)` : '😔 Log Slip'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Today status indicator */}
        {todayStatus && (
          <View style={styles.statusBar}>
            <Text style={styles.statusText}>
              {todayStatus === 'done'      && '✅ Marked complete today'}
              {todayStatus === 'resisted'  && '✊ Resisted today — streak growing'}
              {todayStatus === 'skipped'   && '⏭ Skipped today — no streak impact'}
              {todayStatus === 'missed'    && '❌ Missed today — streak reset'}
              {todayStatus === 'slip'      && `😔 Slipped ${slipCount}x today`}
            </Text>
          </View>
        )}

        {/* Punishment message */}
        {punishLevel > 0 && (
          <View style={[styles.punishMsg, { borderColor: accentColor + '44' }]}>
            <Text style={[styles.punishLabel, { color: accentColor }]}>
              KARMA SPEAKS
            </Text>
            <Text style={styles.punishText}>
              {punishLevel === 1 && "You're slipping, Neel. This is becoming a pattern."}
              {punishLevel === 2 && "3-4 slips this week. Your future self is watching."}
              {punishLevel === 3 && "Serious. You are working against yourself. What needs to change?"}
              {punishLevel === 4 && "Consistent failure. Full attention required, Neel. Day 1 again."}
            </Text>
          </View>
        )}

        {/* 30 Day History */}
        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>LAST 30 DAYS</Text>
        <View style={styles.historyGrid}>
          {DateUtils.getLastNDays(30).map((dateStr) => {
            const c    = checkinMap[dateStr];
            const done = c?.status === 'done' || c?.status === 'resisted';
            const slip = c?.status === 'slip';
            const miss = c?.status === 'missed';
            return (
              <View key={dateStr} style={[styles.historyCell, {
                backgroundColor:
                  done ? accentColor + 'CC' :
                  slip ? Colors.red  + '88' :
                  miss ? Colors.red  + '33' :
                  Colors.backgroundCard,
              }]} />
            );
          })}
        </View>

        <View style={styles.historyLegend}>
          {[
            { color: accentColor, label: 'Done' },
            { color: Colors.red + '88', label: 'Slip' },
            { color: Colors.red + '33', label: 'Missed' },
            { color: Colors.backgroundCard, label: 'No data' },
          ].map((l, i) => (
            <View key={i} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: l.color }]} />
              <Text style={styles.legendText}>{l.label}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  center: {
    flex: 1, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  loadingText: { color: Colors.textMuted, fontSize: 13 },
  errorMsg:    { color: Colors.red, textAlign: 'center', padding: 20 },
  retryBtn:    { backgroundColor: Colors.blue, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText:   { color: Colors.white, fontWeight: 'bold' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn:     { padding: 4, minWidth: 50 },
  backText:    { color: Colors.blue, fontSize: 14 },
  headerTitle: { fontSize: 15, color: Colors.textPrimary, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  editBtn:     { padding: 4, minWidth: 50, alignItems: 'flex-end' },
  editText:    { color: Colors.gold, fontSize: 14 },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16 },

  heroCard: {
    borderRadius: 20, borderWidth: 1, padding: 20,
    alignItems: 'center', marginBottom: 16, gap: 8,
  },
  heroIcon:  { fontSize: 48 },
  heroName:  { fontSize: 20, color: Colors.textPrimary, fontWeight: 'bold', textAlign: 'center' },
  typeBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  typeBadgeText: { fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  punishTag: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: Colors.backgroundCard,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    padding: 12, alignItems: 'center', gap: 4,
  },
  statValue: { fontSize: 18, fontWeight: 'bold' },
  statLabel: { fontSize: 8, color: Colors.textDim, letterSpacing: 1, textAlign: 'center' },

  sectionLabel: { fontSize: 9, color: Colors.textDim, letterSpacing: 3, marginBottom: 10 },

  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  weekDay: { alignItems: 'center', gap: 6, flex: 1 },
  weekLabel: { fontSize: 9, color: Colors.textDim },
  weekCircle: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },

  // Build buttons
  buildBtnCol: { gap: 10 },
  mainBtn: {
    borderRadius: 16, paddingVertical: 16, alignItems: 'center',
    shadowColor: Colors.blue, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  mainBtnText: { color: Colors.white, fontSize: 15, fontWeight: 'bold' },
  secondRow:   { flexDirection: 'row', gap: 10 },
  secondBtn: {
    flex: 1, borderRadius: 12, borderWidth: 1,
    paddingVertical: 12, alignItems: 'center',
  },
  secondBtnText: { fontSize: 12, fontWeight: '600' },

  // Break buttons
  breakBtnRow: { flexDirection: 'row', gap: 10 },
  breakBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1,
  },
  breakBtnText: { fontSize: 14, fontWeight: 'bold' },

  // Status bar
  statusBar: {
    marginTop: 10, backgroundColor: Colors.backgroundCard,
    borderRadius: 10, padding: 10, alignItems: 'center',
  },
  statusText: { fontSize: 12, color: Colors.textMuted },

  // Punishment
  punishMsg: {
    marginTop: 12, backgroundColor: Colors.backgroundCard,
    borderRadius: 12, borderWidth: 1, padding: 14, gap: 6,
  },
  punishLabel: { fontSize: 9, letterSpacing: 2, fontWeight: 'bold' },
  punishText:  { fontSize: 12, color: Colors.textSecondary, lineHeight: 18, fontStyle: 'italic' },

  // History
  historyGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  historyCell:   { width: '6%', aspectRatio: 1, borderRadius: 3 },
  historyLegend: { flexDirection: 'row', gap: 16, marginTop: 10, flexWrap: 'wrap' },
  legendItem:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:     { width: 10, height: 10, borderRadius: 2 },
  legendText:    { fontSize: 10, color: Colors.textDim },
});

export default HabitDetailScreen;