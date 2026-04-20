// ─── KARMA APP — HABIT DETAIL SCREEN (FIXED) ────────────────────────
// Fixed: Skip + Missed buttons now reflect visually
// Fixed: XP handled in habitService before insert

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

  const [habit,       setHabit]       = useState(null);
  const [streak,      setStreak]      = useState({ current: 0, longest: 0 });
  const [checkins,    setCheckins]    = useState([]);
  const [todayCheckin,setTodayCheckin]= useState(null);
  const [punishLevel, setPunishLevel] = useState(0);
  const [weekRate,    setWeekRate]    = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState(null);

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

      const today        = DateUtils.today();
      const todayEntry   = checkinsData.find(c => c.date === today) || null;

      let punish = 0;
      if (habitData.type === 'break') {
        punish = await getPunishmentLevel(habitId);
      }

      setHabit(habitData);
      setStreak(streakData);
      setCheckins(checkinsData);
      setTodayCheckin(todayEntry);
      setPunishLevel(punish);
      setWeekRate(weekRateData);
    } catch (err) {
      console.error('HabitDetail load:', err);
      setError(err.message || 'Failed to load habit');
    } finally {
      setLoading(false);
    }
  };

  const _handleCheckIn = async (status, slipCount = 0) => {
    if (saving) return;
    setSaving(true);
    try {
      await checkIn(habitId, status, null, slipCount);
      await _loadData();

      // Check milestone only on completion
      if (status === 'done' || status === 'resisted') {
        const newStreak  = await getStreak(habitId);
        const milestones = [3,7,14,21,30,48,60,75,90,180,365];
        if (milestones.includes(newStreak.current)) {
          Alert.alert(
            '🏆 Milestone Reached!',
            getMilestoneMessage(newStreak.current, habit.name)
          );
        }
      }
    } catch (err) {
      Alert.alert('Check-in Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const _handleBreakCheckin = () => {
    Alert.alert(
      habit.name,
      'How did you do today?',
      [
        {
          text:    '✊ I Resisted',
          onPress: () => _handleCheckIn('resisted'),
        },
        {
          text:    '😔 I Slipped',
          style:   'destructive',
          onPress: () => {
            const slips = todayCheckin?.slip_count || 0;
            _handleCheckIn('slip', slips + 1);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // ── Computed ─────────────────────────────────────────────────────

  const todayStatus    = todayCheckin?.status || null;
  const isDoneToday    = todayStatus === 'done' || todayStatus === 'resisted';
  const isSkippedToday = todayStatus === 'skipped';
  const isMissedToday  = todayStatus === 'missed';
  const isSlippedToday = todayStatus === 'slip';

  const accentColor = punishLevel > 0
    ? PUNISHMENT_COLORS[punishLevel]
    : (habit?.color || Colors.blue);

  const weekDates  = DateUtils.getWeekDates();
  const checkinMap = {};
  checkins.forEach(c => { checkinMap[c.date] = c; });

  // ── Button label for build habits ─────────────────────────────────

  const buildMainBtnLabel = () => {
    if (isDoneToday)    return '✓ Done Today — Tap to Undo';
    if (isSkippedToday) return '⏭ Skipped — Tap to Complete';
    if (isMissedToday)  return '✗ Missed — Tap to Complete';
    return '☀️ Mark Complete';
  };

  const buildMainBtnColor = () => {
    if (isDoneToday) return Colors.green;
    if (isSkippedToday || isMissedToday) return Colors.textMuted;
    return accentColor;
  };

  // ── Loading / Error ───────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.blue} />
      </View>
    );
  }

  if (error || !habit) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || 'Habit not found'}</Text>
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
        {/* Hero Card */}
        <View style={[styles.heroCard, {
          backgroundColor: accentColor + '18',
          borderColor:     accentColor + '44',
        }]}>
          <Text style={styles.heroIcon}>{habit.icon}</Text>
          <Text style={styles.heroName}>{habit.name}</Text>
          <View style={[styles.typeBadge, {
            backgroundColor: habit.type === 'build'
              ? Colors.greenAlpha : Colors.redAlpha,
          }]}>
            <Text style={[styles.typeBadgeText, {
              color: habit.type === 'build' ? Colors.green : Colors.red,
            }]}>
              {habit.type === 'build' ? '🟢 BUILD' : '🔴 BREAK'}
            </Text>
          </View>
          {punishLevel > 0 && (
            <View style={[styles.punishBadge, { backgroundColor: accentColor + '22' }]}>
              <Text style={[styles.punishBadgeText, { color: accentColor }]}>
                ⚠️ {PUNISHMENT_LABELS[punishLevel]} PUNISHMENT
              </Text>
            </View>
          )}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {[
            {
              label: habit.type === 'build' ? 'CURRENT STREAK' : 'DAYS CLEAN',
              value: `${streak.current}${streak.current > 0
                ? (habit.type === 'build' ? ' 🔥' : ' ✊') : ''}`,
              color: streak.current > 0 ? accentColor : Colors.textMuted,
            },
            {
              label: 'PERSONAL BEST',
              value: `${streak.longest} ⭐`,
              color: Colors.gold,
            },
            {
              label: 'THIS WEEK',
              value: `${weekRate}%`,
              color: weekRate > 70 ? Colors.green
                   : weekRate > 40 ? Colors.gold
                   : Colors.red,
            },
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Week View */}
        <View style={styles.weekSection}>
          <Text style={styles.sectionLabel}>THIS WEEK</Text>
          <View style={styles.weekRow}>
            {weekDates.map((d) => {
              const c      = checkinMap[d.dateStr];
              const done   = c?.status === 'done' || c?.status === 'resisted';
              const slip   = c?.status === 'slip';
              const missed = c?.status === 'missed';
              const skip   = c?.status === 'skipped';
              return (
                <View key={d.dateStr} style={styles.weekDay}>
                  <Text style={[styles.weekLabel,
                    d.isToday && { color: Colors.blue }
                  ]}>
                    {d.label}
                  </Text>
                  <View style={[styles.weekCircle, {
                    backgroundColor:
                      done   ? accentColor :
                      slip   ? Colors.red + '40' :
                      missed ? Colors.redAlpha :
                      skip   ? Colors.backgroundCard :
                      d.isToday ? Colors.blueAlpha20 :
                      Colors.backgroundCard,
                    borderColor:
                      d.isToday ? Colors.blue :
                      done      ? accentColor :
                      slip      ? Colors.red :
                      Colors.border,
                    borderWidth: d.isToday ? 2 : 1,
                  }]}>
                    <Text style={{ fontSize: 12 }}>
                      {done   ? '✓'
                     : slip   ? '✗'
                     : missed ? '–'
                     : skip   ? '⏭'
                     : d.isToday ? '·'
                     : ''}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Check-in Section */}
        <View style={styles.checkinSection}>
          <Text style={styles.sectionLabel}>TODAY'S ACTION</Text>

          {habit.type === 'build' ? (
            <View style={styles.buildBtnCol}>
              {/* Primary — Mark Complete */}
              <TouchableOpacity
                style={[styles.checkinBtn, {
                  backgroundColor: buildMainBtnColor(),
                  opacity:         saving ? 0.7 : 1,
                }]}
                onPress={() => _handleCheckIn(isDoneToday ? 'missed' : 'done')}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving
                  ? <ActivityIndicator color={Colors.white} />
                  : <Text style={styles.checkinBtnText}>{buildMainBtnLabel()}</Text>
                }
              </TouchableOpacity>

              {/* Secondary — Skip + Missed */}
              <View style={styles.buildSecondRow}>
                <TouchableOpacity
                  style={[styles.secondaryBtn, {
                    borderColor:     isSkippedToday ? Colors.gold : Colors.textDim,
                    backgroundColor: isSkippedToday ? Colors.goldAlpha : 'transparent',
                  }]}
                  onPress={() => _handleCheckIn('skipped')}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.secondaryBtnText, {
                    color: isSkippedToday ? Colors.gold : Colors.textMuted,
                  }]}>
                    {isSkippedToday ? '⏭ Skipped' : '⏭ Skip Today'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryBtn, {
                    borderColor:     isMissedToday ? Colors.red : Colors.red + '55',
                    backgroundColor: isMissedToday ? Colors.redAlpha : 'transparent',
                  }]}
                  onPress={() => _handleCheckIn('missed')}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.secondaryBtnText, {
                    color: isMissedToday ? Colors.red : Colors.red + 'AA',
                  }]}>
                    {isMissedToday ? '✗ Marked Missed' : '✗ Mark Missed'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

          ) : (
            /* Break habit buttons */
            <View style={styles.breakBtnCol}>
              <View style={styles.breakBtnRow}>
                <TouchableOpacity
                  style={[styles.breakBtn, {
                    backgroundColor: isDoneToday ? Colors.greenAlpha : Colors.green + '15',
                    borderColor:     isDoneToday ? Colors.green : Colors.green + '66',
                    flex:             1,
                    opacity:          saving ? 0.7 : 1,
                  }]}
                  onPress={() => _handleCheckIn('resisted')}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.breakBtnText, { color: Colors.green }]}>
                    {isDoneToday ? '✓ Resisted Today' : '✊ I Resisted'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.breakBtn, {
                    backgroundColor: isSlippedToday ? Colors.redAlpha : Colors.red + '15',
                    borderColor:     isSlippedToday ? Colors.red : Colors.red + '66',
                    flex:             1,
                    opacity:          saving ? 0.7 : 1,
                  }]}
                  onPress={_handleBreakCheckin}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.breakBtnText, { color: Colors.red }]}>
                    {isSlippedToday
                      ? `😔 Slipped (${todayCheckin?.slip_count || 1}x)`
                      : '😔 Log Slip'
                    }
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Punishment message */}
          {punishLevel > 0 && (
            <View style={[styles.punishMsg, { borderColor: accentColor + '44' }]}>
              <Text style={[styles.punishMsgLabel, { color: accentColor }]}>
                KARMA SPEAKS
              </Text>
              <Text style={styles.punishMsgText}>
                {punishLevel === 1 && "You're slipping, Neel. This is becoming a pattern."}
                {punishLevel === 2 && "3-4 slips this week. Your future self is watching. Fix this now."}
                {punishLevel === 3 && "This is serious. You are actively working against yourself. What needs to change?"}
                {punishLevel === 4 && "Consistent failure. This deserves your full attention, Neel. Today is day 1 again."}
              </Text>
            </View>
          )}
        </View>

        {/* 30 Day History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionLabel}>LAST 30 DAYS</Text>
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
                    slip ? Colors.red + '66' :
                    miss ? Colors.red + '22' :
                    Colors.backgroundCard,
                }]} />
              );
            })}
          </View>
          <View style={styles.historyLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: accentColor }]} />
              <Text style={styles.legendText}>Done</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.red + '66' }]} />
              <Text style={styles.legendText}>Slip</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.red + '22' }]} />
              <Text style={styles.legendText}>Missed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.backgroundCard }]} />
              <Text style={styles.legendText}>No data</Text>
            </View>
          </View>
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
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  errorText: { color: Colors.red, textAlign: 'center', marginBottom: 12 },
  retryBtn:  { backgroundColor: Colors.blue, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: Colors.white, fontWeight: 'bold' },

  header: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: 16,
    paddingVertical:   14,
    borderBottomWidth:  1,
    borderBottomColor:  Colors.border,
  },
  backBtn:  { padding: 4 },
  backText: { color: Colors.blue, fontSize: 14 },
  editBtn:  { padding: 4 },
  editText: { color: Colors.gold, fontSize: 14 },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16 },

  heroCard: {
    borderRadius:   20,
    borderWidth:     1,
    padding:        20,
    alignItems:     'center',
    marginBottom:   16,
    gap:             8,
  },
  heroIcon:  { fontSize: 48 },
  heroName:  { fontSize: 20, color: Colors.textPrimary, fontWeight: 'bold', textAlign: 'center' },
  typeBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  typeBadgeText:  { fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  punishBadge:    { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  punishBadgeText:{ fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: Colors.backgroundCard,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    padding: 12, alignItems: 'center', gap: 4,
  },
  statValue: { fontSize: 18, fontWeight: 'bold' },
  statLabel: { fontSize: 8, color: Colors.textDim, letterSpacing: 1, textAlign: 'center' },

  weekSection:  { marginBottom: 16 },
  sectionLabel: { fontSize: 9, color: Colors.textDim, letterSpacing: 3, marginBottom: 10 },
  weekRow:      { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay:      { alignItems: 'center', gap: 6, flex: 1 },
  weekLabel:    { fontSize: 9, color: Colors.textDim },
  weekCircle: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },

  checkinSection: { marginBottom: 16 },

  // Build habit buttons
  buildBtnCol:    { gap: 8 },
  buildSecondRow: { flexDirection: 'row', gap: 8 },
  checkinBtn: {
    borderRadius:    16,
    paddingVertical:  16,
    alignItems:      'center',
    shadowColor:     Colors.blue,
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.3,
    shadowRadius:    10,
    elevation:        5,
  },
  checkinBtnText:   { color: Colors.white, fontSize: 15, fontWeight: 'bold' },
  secondaryBtn: {
    flex:            1,
    borderRadius:    12,
    borderWidth:      1,
    paddingVertical:  12,
    alignItems:      'center',
  },
  secondaryBtnText: { fontSize: 12, fontWeight: '600' },

  // Break habit buttons
  breakBtnCol: { gap: 8 },
  breakBtnRow: { flexDirection: 'row', gap: 10 },
  breakBtn: {
    borderRadius:    14,
    paddingVertical:  14,
    alignItems:      'center',
    borderWidth:      1,
  },
  breakBtnText: { fontSize: 14, fontWeight: 'bold' },

  punishMsg: {
    marginTop:       12,
    backgroundColor: Colors.backgroundCard,
    borderRadius:    12,
    borderWidth:      1,
    padding:         14,
    gap:              6,
  },
  punishMsgLabel: { fontSize: 9, letterSpacing: 2, fontWeight: 'bold' },
  punishMsgText:  { fontSize: 12, color: Colors.textSecondary, lineHeight: 18, fontStyle: 'italic' },

  historySection: { marginBottom: 16 },
  historyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  historyCell: { width: '6%', aspectRatio: 1, borderRadius: 3 },
  historyLegend: { flexDirection: 'row', gap: 16, marginTop: 8, flexWrap: 'wrap' },
  legendItem:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:     { width: 10, height: 10, borderRadius: 2 },
  legendText:    { fontSize: 10, color: Colors.textDim },
});

export default HabitDetailScreen;