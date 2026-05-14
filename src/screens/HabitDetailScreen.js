// ─── KARMA APP — HABIT DETAIL (PHASE F-3) ────────────────────────────
// Phase F-3 changes:
// 1. Heatmap day labels: ['M','','W','','F','','S'] → ['M','T','W','T','F','S','S']
// 2. HABIT MILESTONES: full visual row (all 11 slots, earned=gold, locked=dim)
//    Tapping an earned badge shows the date achieved
// 3. HABIT JOURNEY stats card: 30-day consistency%, XP from this habit, best streak
//    30-day denominator = actual days since habit created (not checkins.length)
// 4. XP notes corrected: missed = –2 XP (was –5)
// 5. Import getHabitXPTotal, MILESTONE_DAYS from gamificationService

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Alert, ActivityIndicator, Modal, FlatList,
  TextInput, Dimensions,
} from 'react-native';
import { SafeAreaView }  from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, Typography, Spacing, Radius } from '../constants/colors';
import { DateUtils }     from '../utils/dateUtils';
import {
  getHabitById, getStreak, getCheckinsForHabit,
  getPunishmentLevel, getWeeklyCompletionRate,
} from '../database/habitService';
import {
  checkMilestone, getHabitMilestones, useStreakFreeze,
  getStreakFreezeCount, MILESTONE_INFO, MILESTONE_DAYS,
  calculateCheckinXP, awardXP, getHabitXPTotal,
} from '../services/gamificationService';
import { getShloka, getMilestoneContext, getPunishContext } from '../constants/shlokas';
import { logSlipTrigger, getTriggerPattern, TRIGGER_OPTIONS } from '../database/moodService';
import ShlokaDisplay from '../components/ShlokaDisplay';
import { getDatabase }   from '../database/database';
import { getActiveRecovery, offerStreakRecovery, progressRecovery } from '../services/wfoService';

const { width } = Dimensions.get('window');

const PUNISH_LABELS  = ['', 'MILD', 'MODERATE', 'HARSH', 'MAXIMUM'];
const KRISHNA_SPEAKS = [
  '',
  'The horse stirred. The rein slipped. Tighten your grip — the path is not lost.',
  'The senses are winning. Where is your charioteer?',
  'Arjuna also wanted to surrender. Krishna said — rise and fight.',
  'The self alone is friend or enemy. You are choosing the enemy. Today that changes.',
];

// ── 90-Day Heatmap ────────────────────────────────────────────────────
const CELL = 11;
const GAP  = 2;

const getStatusColor = (status, accentColor, colors) => {
  if (!status)                                    return colors.backgroundCard;
  if (status === 'done' || status === 'resisted') return accentColor;
  if (status === 'slip')                          return colors.red + '77';
  if (status === 'missed')                        return colors.red + '30';
  if (status === 'skipped')                       return colors.backgroundElevated;
  if (status === 'auto_skipped')                  return '#F5A62340';
  return colors.backgroundCard;
};

const HabitHeatmap90 = ({ checkins90, accentColor, habitCreatedAt }) => {
  const { colors } = useTheme();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const createdDate = habitCreatedAt ? new Date(habitCreatedAt) : new Date(today);
  createdDate.setHours(0, 0, 0, 0);

  const ninetyAgo = new Date(today);
  ninetyAgo.setDate(today.getDate() - 89);
  const APP_BIRTH   = new Date('2026-05-01T00:00:00');
  const candidates  = [createdDate, APP_BIRTH, ninetyAgo];
  const startDate   = candidates.reduce((max, d) => d > max ? d : max);

  const statusMap = {};
  checkins90.forEach(c => { statusMap[c.date] = c.status; });

  const days = [];
  const d = new Date(startDate);
  while (d <= today) {
    days.push({ date: d.toISOString().split('T')[0], isToday: d.getTime() === today.getTime() });
    d.setDate(d.getDate() + 1);
  }

  const firstDow = (new Date(days[0]?.date).getDay() + 6) % 7; // Mon=0
  const padded   = Array(firstDow).fill(null).concat(days);

  const weeks = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  const monthLabels = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const first = week.find(d => d !== null);
    if (!first) return;
    const m = new Date(first.date).getMonth();
    if (m !== lastMonth) {
      monthLabels.push({ col: wi, label: new Date(first.date).toLocaleString('default', { month: 'short' }) });
      lastMonth = m;
    }
  });

  const gridW      = weeks.length * (CELL + GAP);
  const totalDays  = days.length;
  const doneDays   = days.filter(d => {
    const s = statusMap[d.date];
    return s === 'done' || s === 'resisted';
  }).length;
  const missedDays = days.filter(d => {
    const s = statusMap[d.date];
    return s === 'missed' || s === 'slip';
  }).length;
  const skippedDays = days.filter(d => {
    const s = statusMap[d.date];
    return s === 'skipped' || s === 'auto_skipped';
  }).length;

  // Phase F-3: denominator excludes skipped days for consistency
  const possibleDays  = Math.max(1, totalDays - skippedDays);
  const consistency   = Math.round((doneDays / possibleDays) * 100);

  return (
    <View style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.separator, padding: Spacing.lg, marginBottom: Spacing.lg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2 }}>90-DAY BATTLEFIELD</Text>
        <View style={{ backgroundColor: accentColor + '20', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 }}>
          <Text style={{ ...Typography.caption2, color: accentColor, fontWeight: '700' }}>{consistency}% consistent</Text>
        </View>
      </View>

      {/* Summary */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.separator }}>
        {[
          { val: doneDays,   label: 'done',    color: accentColor },
          { val: missedDays, label: 'missed',  color: colors.red },
          { val: skippedDays,label: 'skipped', color: colors.textMuted },
          { val: totalDays,  label: 'tracked', color: colors.textPrimary },
        ].map((s, i) => (
          <View key={i} style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: s.color }}>{s.val}</Text>
            <Text style={{ fontSize: 10, color: colors.textDim }}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Grid */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Month labels */}
          <View style={{ height: 14, position: 'relative', marginLeft: 16, width: gridW, marginBottom: 2 }}>
            {monthLabels.map((ml, i) => (
              <Text key={i} style={{ position: 'absolute', left: ml.col * (CELL + GAP), fontSize: 9, color: colors.textDim }}>
                {ml.label}
              </Text>
            ))}
          </View>

          {/* FIX: Day labels — was ['M','','W','','F','','S'] (showed only M,W,F,S) */}
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: 12, marginRight: 4 }}>
              {['M','T','W','T','F','S','S'].map((l, i) => (
                <Text key={i} style={{
                  fontSize: 7, color: colors.textDim,
                  height: CELL + GAP, lineHeight: CELL + GAP,
                  textAlign: 'right',
                }}>
                  {l}
                </Text>
              ))}
            </View>
            <View style={{ flexDirection: 'row' }}>
              {weeks.map((week, wi) => (
                <View key={wi} style={{ flexDirection: 'column', marginRight: GAP }}>
                  {week.map((day, di) => {
                    if (!day) return <View key={di} style={{ width: CELL, height: CELL, marginBottom: GAP }} />;
                    const status = statusMap[day.date];
                    const bg = getStatusColor(status, accentColor, colors);
                    return (
                      <View key={di} style={{
                        width: CELL, height: CELL, borderRadius: 2, marginBottom: GAP,
                        backgroundColor: bg,
                        borderWidth: day.isToday ? 1.5 : 0,
                        borderColor: accentColor,
                      }} />
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
        <Text style={{ fontSize: 9, color: colors.textDim }}>Legend:</Text>
        {[
          { color: accentColor,          label: 'Done' },
          { color: colors.red + '30',   label: 'Missed' },
          { color: colors.backgroundElevated, label: 'Skipped', border: true },
          { color: '#F5A62340',          label: 'Auto-skip' },
          { color: colors.backgroundCard,label: 'None', border: true },
        ].map((l, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: l.color, borderWidth: l.border ? 1 : 0, borderColor: colors.separator }} />
            <Text style={{ fontSize: 9, color: colors.textDim }}>{l.label}</Text>
          </View>
        ))}
        <Text style={{ fontSize: 9, color: accentColor }}>⬛ = today</Text>
      </View>

      {/* Start date */}
      <Text style={{ fontSize: 9, color: colors.textDim, textAlign: 'right', marginTop: 6 }}>
        Since {new Date(days[0]?.date || today).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
      </Text>
    </View>
  );
};

// ── Main Screen ────────────────────────────────────────────────────────
const HabitDetailScreen = ({ navigation, route }) => {
  const { habitId, showTrigger = false } = route.params;
  const { colors } = useTheme();

  const [habit,          setHabit]          = useState(null);
  const [streak,         setStreak]          = useState({ current: 0, longest: 0 });
  const [checkins,       setCheckins]        = useState([]);
  const [todayStatus,    setTodayStatus]     = useState(null);
  const [todayValue,     setTodayValue]      = useState(null);
  const [slipCount,      setSlipCount]       = useState(0);
  const [punishLevel,    setPunishLevel]     = useState(0);
  const [weekRate,       setWeekRate]        = useState(0);
  const [milestones,     setMilestones]      = useState([]);
  const [freezeCount,    setFreezeCount]     = useState(0);
  const [triggerPattern, setTriggerPattern]  = useState(null);
  const [weekProgress,   setWeekProgress]    = useState(null);
  const [weekDoneCount,  setWeekDoneCount]   = useState(0);
  const [weekDaysElapsed,setWeekDaysElapsed] = useState(0);
  const [activeRecovery, setActiveRecovery]  = useState(null);
  const [habitXP,        setHabitXP]         = useState(0);   // Phase F-3
  const [loading,        setLoading]         = useState(true);
  const [saving,         setSaving]          = useState(false);
  const [error,          setError]           = useState(null);
  const [triggerModal,   setTriggerModal]    = useState(false);
  const [quantModal,     setQuantModal]      = useState(false);
  const [pendingSlips,   setPendingSlips]    = useState(0);
  const [quantInput,     setQuantInput]      = useState('');

  useFocusEffect(useCallback(() => {
    _loadData();
    if (showTrigger) setTimeout(() => setTriggerModal(true), 500);
  }, [habitId]));

  const _loadData = async () => {
    try {
      setLoading(true);
      const [h, s, cs, weekData, ms, fc, tp, recovery, xp] = await Promise.all([
        getHabitById(habitId),
        getStreak(habitId),
        getCheckinsForHabit(habitId, 90),
        getWeeklyCompletionRate(habitId),
        getHabitMilestones(habitId),
        getStreakFreezeCount(),
        getTriggerPattern(habitId),
        getActiveRecovery(habitId),
        getHabitXPTotal(habitId),           // Phase F-3
      ]);
      const today  = DateUtils.today();
      const todayC = cs.find(c => c.date === today);
      setHabit(h);
      setStreak(s);
      setCheckins(cs);
      setTodayStatus(todayC?.status || null);
      setTodayValue(todayC?.value  || null);
      setSlipCount(todayC?.slip_count || 0);
      setWeekRate(weekData?.rate || 0);
      setWeekDoneCount(weekData?.done || 0);
      setWeekDaysElapsed(weekData?.daysElapsed || 0);
      setMilestones(ms);
      setFreezeCount(fc);
      setTriggerPattern(tp);
      setActiveRecovery(recovery);
      setHabitXP(xp || 0);                 // Phase F-3
      if (h.type === 'break') setPunishLevel(await getPunishmentLevel(habitId));
      if (h.frequency_type === 'weekly') {
        setWeekProgress(await _getWeekProgress(h, cs));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const _getWeekProgress = async (habit, cs) => {
    const weekDates = DateUtils.getWeekDates();
    const done = weekDates.filter(d => {
      const c = cs.find(x => x.date === d.dateStr);
      return c?.status === 'done' || c?.status === 'resisted';
    }).length;
    return { done, target: habit.weekly_target || 5 };
  };

  const _doCheckIn = async (status, newSlips = 0, value = null) => {
    if (saving) return;
    const prev     = todayStatus;
    const prevSlip = slipCount;
    setTodayStatus(status);
    setSlipCount(newSlips);
    if (value !== null) setTodayValue(value);
    setSaving(true);
    try {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO checkins (habit_id, date, status, slip_count, value)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(habit_id, date) DO UPDATE SET
           status     = excluded.status,
           slip_count = excluded.slip_count,
           value      = excluded.value,
           created_at = datetime('now','localtime')`,
        [habitId, DateUtils.today(), status, newSlips, value]
      );
      const ns = await getStreak(habitId);
      setStreak(ns);

      // Recovery progress
      if ((status === 'done' || status === 'resisted') && activeRecovery) {
        const result = await progressRecovery(habitId);
        if (result?.completed) {
          setTimeout(() => Alert.alert(
            '🔥 Streak Recovered!',
            `You completed the recovery challenge and restored your ${result.lostStreak}-day streak.`,
            [{ text: '🔱 Jai ho' }]
          ), 300);
          setActiveRecovery(null);
        }
      }

      // Milestone check
      if (status === 'done' || status === 'resisted') {
        const hit = await checkMilestone(habitId, ns.current);
        if (hit) {
          const shloka = getShloka(getMilestoneContext(hit.days));
          setTimeout(() => Alert.alert(
            `${hit.badge} ${hit.title}`,
            `${hit.desc}\n\n+${hit.xp} XP\n\n${shloka.sanskrit}\n"${shloka.meaning}"\n— ${shloka.reference}`,
            [{ text: '🔱 Jai Shri Krishna' }]
          ), 300);
          setMilestones(await getHabitMilestones(habitId));
        }
      }

      // Offer streak recovery
      if ((status === 'missed' || status === 'slip') && (prev === 'done' || prev === 'resisted' || prev === null)) {
        const prevStreak = streak.current;
        if (prevStreak >= 2 && !activeRecovery) {
          const recovery = await offerStreakRecovery(habitId, prevStreak);
          if (recovery) setActiveRecovery(recovery);
        }
      }

      const newWeekData = await getWeeklyCompletionRate(habitId);
      setWeekRate(newWeekData?.rate || 0);
      setWeekDoneCount(newWeekData?.done || 0);
      setWeekDaysElapsed(newWeekData?.daysElapsed || 0);
      const tp = await getTriggerPattern(habitId);
      setTriggerPattern(tp);

      const cs2 = await getCheckinsForHabit(habitId, 90);
      setCheckins(cs2);
      if (habit?.frequency_type === 'weekly') {
        setWeekProgress(await _getWeekProgress(habit, cs2));
      }

      // Refresh habit XP
      const newXP = await getHabitXPTotal(habitId);
      setHabitXP(newXP || 0);
    } catch (err) {
      setTodayStatus(prev);
      setSlipCount(prevSlip);
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const _handleQuantComplete = () => {
    setQuantInput(todayValue ? String(todayValue) : '');
    setQuantModal(true);
  };

  const _saveQuantValue = async () => {
    const val = parseFloat(quantInput);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Invalid', 'Enter a valid number greater than 0');
      return;
    }
    setQuantModal(false);
    await _doCheckIn('done', 0, val);
  };

  const _handleSlip = () => {
    setPendingSlips(slipCount + 1);
    setTriggerModal(true);
  };

  const _onTriggerSelected = async (triggerKey) => {
    setTriggerModal(false);
    try {
      await _doCheckIn('slip', pendingSlips);
      await logSlipTrigger({ habitId, trigger: triggerKey });
      const tp = await getTriggerPattern(habitId);
      setTriggerPattern(tp);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const _useFreeze = async () => {
    if (freezeCount <= 0) {
      Alert.alert('🧊 No Freezes',
        'Earn freezes by maintaining 80%+ weekly consistency.\n\n' +
        'Skip = valid reason (WFO, sick) — streak protected.\n' +
        'Missed = honest fail — streak breaks.');
      return;
    }
    Alert.alert('🧊 Use Streak Freeze?',
      `${freezeCount} freeze${freezeCount > 1 ? 's' : ''} available.\n\nThis protects your streak for today without checking in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Protect the Streak', onPress: async () => {
          const r = await useStreakFreeze(habitId);
          Alert.alert(r.success ? '🧊 Protected!' : 'Error', r.message);
          if (r.success) _loadData();
        }},
      ]
    );
  };

  // ── Computed ──────────────────────────────────────────────────────────
  const isDone      = todayStatus === 'done';
  const isResisted  = todayStatus === 'resisted';
  const isSkipped   = todayStatus === 'skipped';
  const isMissed    = todayStatus === 'missed';
  const isSlipped   = todayStatus === 'slip';
  const isComplete  = isDone || isResisted;

  const punishColor  = [colors.gold, colors.orange, colors.punishLevel2, colors.red, colors.punishLevel4][punishLevel] || colors.gold;
  const accentColor  = punishLevel > 0 ? punishColor : (habit?.color || colors.gold);
  const punishShloka = punishLevel > 0 ? getShloka(getPunishContext(punishLevel)) : null;

  const cMap = {};
  checkins.forEach(c => { cMap[c.date] = c; });
  if (todayStatus) cMap[DateUtils.today()] = { ...(cMap[DateUtils.today()] || {}), status: todayStatus, value: todayValue };

  const earnedDays    = milestones.map(m => m.milestone_days);
  const nextMilestone = MILESTONE_DAYS.find(d => !earnedDays.includes(d));
  const weekDates     = DateUtils.getWeekDates();
  const isQuantifiable = habit?.is_quantifiable;
  const dailyTarget   = habit?.daily_target || 1;
  const unit          = habit?.unit || '';
  const isWeekly      = habit?.frequency_type === 'weekly';

  // Phase F-3: 30-day consistency with correct denominator
  const _calc30DayConsistency = () => {
    if (!habit) return 0;
    const today30     = new Date();
    const ago30       = new Date();
    ago30.setDate(today30.getDate() - 29);
    const ago30Str    = ago30.toISOString().split('T')[0];
    const habitBirth  = (habit.created_at || ago30Str).split('T')[0];
    const effectiveStart = habitBirth > ago30Str ? habitBirth : ago30Str;

    const done30 = checkins.filter(c =>
      c.date >= effectiveStart &&
      (c.status === 'done' || c.status === 'resisted')
    ).length;
    const skipped30 = checkins.filter(c =>
      c.date >= effectiveStart &&
      (c.status === 'skipped' || c.status === 'auto_skipped')
    ).length;

    const startD   = new Date(effectiveStart + 'T00:00:00');
    const expected = Math.floor((today30 - startD) / 86400000) + 1;
    const possible = Math.max(1, expected - skipped30);

    return Math.min(100, Math.round((done30 / possible) * 100));
  };
  const consistency30 = _calc30DayConsistency();

  const quantNum      = parseFloat(quantInput) || 0;
  const quantFeedback = quantNum > 0 ? (
    quantNum < dailyTarget   ? { emoji: '💪', color: colors.orange, text: `${Math.round((quantNum/dailyTarget)*100)}% of target — partial, still counts!` } :
    quantNum === dailyTarget ? { emoji: '🎯', color: colors.gold,   text: 'Exactly on target — full done!' } :
                               { emoji: '🔥', color: colors.green,  text: `${quantNum} ${unit} — beyond target!` }
  ) : null;

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <ActivityIndicator size="large" color={colors.gold} />
      <Text style={{ ...Typography.body, color: colors.textMuted }}>Loading...</Text>
    </View>
  );

  if (error || !habit) return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <Text style={{ ...Typography.body, color: colors.red, textAlign: 'center' }}>{error || 'Habit not found'}</Text>
      <TouchableOpacity onPress={_loadData} style={{ backgroundColor: colors.gold, paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.lg }}>
        <Text style={{ ...Typography.headline, color: '#000' }}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ ...Typography.body, color: colors.gold }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ ...Typography.headline, color: colors.textPrimary, flex: 1, textAlign: 'center' }} numberOfLines={1}>
          {habit.name}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddHabit', { habitId })} style={styles.backBtn}>
          <Text style={{ ...Typography.body, color: colors.textMuted }}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.xl }} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: colors.backgroundCard, borderColor: accentColor + '30' }]}>
          <View style={[styles.heroIcon, { backgroundColor: accentColor + '20' }]}>
            <Text style={{ fontSize: 38 }}>{habit.icon}</Text>
          </View>
          <Text style={{ ...Typography.title2, color: colors.textPrimary, textAlign: 'center' }}>{habit.name}</Text>
          <View style={{ flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', justifyContent: 'center' }}>
            <View style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: habit.type === 'build' ? colors.greenAlpha15 : colors.redAlpha15 }}>
              <Text style={{ ...Typography.caption1, fontWeight: '700', letterSpacing: 1, color: habit.type === 'build' ? colors.green : colors.red }}>
                {habit.type === 'build' ? '🟢 BUILD DHARMA' : '🔴 BREAK THE CHAIN'}
              </Text>
            </View>
            {isQuantifiable ? (
              <View style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: colors.blueAlpha15 }}>
                <Text style={{ ...Typography.caption1, fontWeight: '700', letterSpacing: 1, color: colors.blue }}>
                  🔢 {dailyTarget} {unit}/day
                </Text>
              </View>
            ) : null}
            {isWeekly ? (
              <View style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: colors.goldAlpha15 }}>
                <Text style={{ ...Typography.caption1, fontWeight: '700', letterSpacing: 1, color: colors.gold }}>
                  📅 {habit.weekly_target}× per week
                </Text>
              </View>
            ) : null}
          </View>
          {punishLevel > 0 && (
            <Text style={{ ...Typography.caption2, fontWeight: '700', letterSpacing: 1, color: accentColor }}>
              ⚠️ {PUNISH_LABELS[punishLevel]} — THE HORSE IS RUNNING
            </Text>
          )}
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg }}>
          {[
            {
              label: isWeekly ? 'WEEK STREAK' : (habit.type === 'build' ? 'REIN HELD' : 'DAYS CLEAN'),
              value: streak.current > 0 ? `${streak.current} ${habit.type === 'build' ? '🪔' : '✊'}` : '0',
              color: streak.current > 0 ? accentColor : colors.textMuted,
            },
            { label: 'BEST', value: `${streak.longest} 🏆`, color: colors.gold },
            {
              label: 'THIS WEEK',
              value: isWeekly && weekProgress
                ? `${weekProgress.done}/${weekProgress.target}`
                : `${weekDoneCount}/${weekDaysElapsed}d`,
              color: weekRate >= 70 ? colors.green : weekRate >= 40 ? colors.gold : colors.red,
            },
          ].map((s, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: colors.backgroundCard, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', gap: 5, borderWidth: 1, borderColor: colors.separator }}>
              <Text style={{ fontSize: 22, fontWeight: '700', color: s.color }}>{s.value}</Text>
              <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 1, textAlign: 'center' }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Weekly progress bar */}
        {isWeekly && weekProgress && (
          <View style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.separator, padding: Spacing.lg, marginBottom: Spacing.lg, gap: Spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2 }}>THIS WEEK'S PROGRESS</Text>
              <Text style={{ ...Typography.caption1, color: weekProgress.done >= weekProgress.target ? colors.green : colors.gold, fontWeight: '700' }}>
                {weekProgress.done}/{weekProgress.target} done
              </Text>
            </View>
            <View style={{ height: 8, backgroundColor: colors.backgroundElevated, borderRadius: Radius.full, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${Math.min((weekProgress.done / weekProgress.target) * 100, 100)}%`, backgroundColor: weekProgress.done >= weekProgress.target ? colors.green : accentColor, borderRadius: Radius.full }} />
            </View>
            {weekProgress.done >= weekProgress.target && (
              <Text style={{ ...Typography.caption1, color: colors.green, textAlign: 'center' }}>✓ Weekly target met — streak maintained 🔱</Text>
            )}
          </View>
        )}

        {/* Streak Recovery Banner */}
        {activeRecovery && (
          <View style={{ backgroundColor: colors.goldAlpha15, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.gold + '40', padding: Spacing.lg, marginBottom: Spacing.lg, gap: Spacing.sm }}>
            <Text style={{ ...Typography.caption2, color: colors.gold, letterSpacing: 2, fontWeight: '700' }}>🔥 STREAK RECOVERY</Text>
            <Text style={{ ...Typography.subheadline, color: colors.textPrimary }}>
              You broke a {activeRecovery.lost_streak}-day streak. Complete {activeRecovery.target_days} more days to recover it.
            </Text>
            <View style={{ height: 6, backgroundColor: colors.backgroundElevated, borderRadius: Radius.full, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${Math.min((activeRecovery.done_days / activeRecovery.target_days) * 100, 100)}%`, backgroundColor: colors.gold, borderRadius: Radius.full }} />
            </View>
            <Text style={{ ...Typography.caption1, color: colors.textDim }}>
              {activeRecovery.done_days}/{activeRecovery.target_days} recovery days — check in to progress
            </Text>
          </View>
        )}

        {/* Trigger pattern */}
        {habit.type === 'break' && triggerPattern && triggerPattern.totalSlips >= 3 && (
          <View style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.goldAlpha25, padding: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.lg }}>
            <Text style={{ ...Typography.caption2, color: colors.gold, letterSpacing: 2, fontWeight: '700' }}>🧠 BATTLEFIELD INTELLIGENCE</Text>
            <Text style={{ ...Typography.subheadline, color: colors.textPrimary }}>
              {triggerPattern.topInfo?.icon} <Text style={{ fontWeight: '700', color: colors.gold }}>{triggerPattern.topInfo?.label}</Text> triggers {triggerPattern.percentage}% of your slips
            </Text>
            <Text style={{ ...Typography.caption1, color: colors.textDim, lineHeight: 18 }}>
              Based on {triggerPattern.totalSlips} logged slips. Plan for this specific state.
            </Text>
          </View>
        )}

        {/* Next milestone banner */}
        {nextMilestone && streak.current > 0 && (
          <View style={{ backgroundColor: colors.goldAlpha15, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.goldAlpha25, padding: Spacing.md, marginBottom: Spacing.lg, alignItems: 'center' }}>
            <Text style={{ ...Typography.subheadline, color: colors.textSecondary }}>
              {MILESTONE_INFO[nextMilestone]?.badge} {nextMilestone - streak.current} days to{' '}
              <Text style={{ color: colors.gold, fontWeight: '700' }}>{MILESTONE_INFO[nextMilestone]?.title}</Text>
            </Text>
          </View>
        )}

        {/* Week view */}
        <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2, marginBottom: Spacing.md }}>
          THIS WEEK'S BATTLEFIELD
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg }}>
          {weekDates.map((d) => {
            const c     = cMap[d.dateStr];
            const done  = c?.status === 'done' || c?.status === 'resisted';
            const slip  = c?.status === 'slip';
            const miss  = c?.status === 'missed';
            const skip  = c?.status === 'skipped' || c?.status === 'auto_skipped';
            const val   = c?.value;
            return (
              <View key={d.dateStr} style={{ alignItems: 'center', gap: 7, flex: 1 }}>
                <Text style={{ ...Typography.caption2, color: d.isToday ? colors.gold : colors.textDim }}>{d.label}</Text>
                {(() => {
                  let bgColor, textColor = '#000';
                  if (done && isQuantifiable && val) {
                    const ratio = Math.min(val / dailyTarget, 1.5);
                    const opacity = ratio >= 1 ? 'FF' : ratio >= 0.75 ? 'CC' : ratio >= 0.5 ? '88' : ratio >= 0.25 ? '55' : '33';
                    bgColor = accentColor + opacity;
                    textColor = ratio >= 0.75 ? '#000' : colors.textMuted;
                  } else {
                    bgColor = done ? accentColor
                      : slip  ? colors.red + '55'
                      : miss  ? colors.red + '25'
                      : skip  ? colors.backgroundElevated
                      : d.isToday ? colors.goldAlpha15
                      : colors.backgroundCard;
                  }
                  return (
                    <View style={{
                      width: 34, height: 34, borderRadius: 17,
                      backgroundColor: bgColor,
                      borderWidth:  d.isToday ? 2 : 1,
                      borderColor:  d.isToday ? colors.gold : done ? accentColor : slip ? colors.red : colors.separator,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: isQuantifiable ? 8 : 11, color: done ? textColor : colors.textDim }}>
                        {isQuantifiable && val ? `${val}` : done ? '✓' : slip ? '✗' : miss ? '–' : skip ? '⏭' : ''}
                      </Text>
                    </View>
                  );
                })()}
              </View>
            );
          })}
        </View>

        {/* TODAY'S BATTLE */}
        <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2, marginBottom: Spacing.md, marginTop: Spacing.sm }}>
          TODAY'S BATTLE
        </Text>

        {/* ── Quantifiable build ── */}
        {isQuantifiable && habit.type === 'build' ? (
          <View style={{ gap: Spacing.sm, marginBottom: Spacing.md }}>
            <TouchableOpacity
              style={{ borderRadius: Radius.lg, paddingVertical: 18, alignItems: 'center', backgroundColor: isDone ? colors.green : accentColor, opacity: saving ? 0.6 : 1 }}
              onPress={_handleQuantComplete}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving
                ? <ActivityIndicator color="#000" />
                : <Text style={{ ...Typography.headline, color: isDone ? colors.white : '#000' }}>
                    {isDone
                      ? `✓ ${todayValue} ${unit} logged${todayValue !== null && todayValue < dailyTarget ? ' (partial)' : todayValue !== null && todayValue > dailyTarget ? ' (exceeded!)' : ''} — Tap to update`
                      : `📊 Log ${dailyTarget} ${unit}`}
                  </Text>
              }
            </TouchableOpacity>

            {isDone && todayValue !== null && (
              <View style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' }}>
                <Text style={{ ...Typography.callout, color: todayValue >= dailyTarget ? colors.green : colors.orange }}>
                  {todayValue > dailyTarget   ? `🔥 ${todayValue}/${dailyTarget} ${unit} — beyond target!`    :
                   todayValue === dailyTarget  ? `✅ ${todayValue}/${dailyTarget} ${unit} — exact target!`    :
                                                `💪 ${todayValue}/${dailyTarget} ${unit} — partial (${Math.round((todayValue/dailyTarget)*100)}%)`}
                </Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  style={{ borderRadius: Radius.lg, borderWidth: 1, paddingVertical: 12, alignItems: 'center', borderColor: isSkipped ? colors.gold : colors.separator, backgroundColor: isSkipped ? colors.goldAlpha15 : colors.backgroundCard }}
                  onPress={() => _doCheckIn('skipped')}
                  disabled={saving}
                >
                  <Text style={{ ...Typography.subheadline, fontWeight: '600', color: isSkipped ? colors.gold : colors.textMuted }}>
                    ⏭ {isSkipped ? 'Skipped ✓' : 'Skip'}
                  </Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 9, color: colors.textDim, textAlign: 'center', marginTop: 3 }}>Streak protected · –1 XP</Text>
              </View>
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  style={{ borderRadius: Radius.lg, borderWidth: 1, paddingVertical: 12, alignItems: 'center', borderColor: isMissed ? colors.red : colors.separator, backgroundColor: isMissed ? colors.redAlpha15 : colors.backgroundCard }}
                  onPress={() => _doCheckIn('missed')}
                  disabled={saving}
                >
                  <Text style={{ ...Typography.subheadline, fontWeight: '600', color: isMissed ? colors.red : colors.textMuted }}>
                    ✗ {isMissed ? 'Missed ✓' : 'Missed'}
                  </Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 9, color: colors.textDim, textAlign: 'center', marginTop: 3 }}>Streak breaks · –2 XP</Text>
              </View>
            </View>

            {streak.current > 0 && !isComplete && (
              <TouchableOpacity
                style={{ borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.greenAlpha25, backgroundColor: colors.greenAlpha15, paddingVertical: 12, alignItems: 'center', opacity: freezeCount > 0 ? 1 : 0.4 }}
                onPress={_useFreeze}
              >
                <Text style={{ ...Typography.subheadline, color: colors.green, fontWeight: '600' }}>
                  🧊 Streak Freeze — {freezeCount} available
                </Text>
              </TouchableOpacity>
            )}
          </View>

        ) : habit.type === 'build' ? (
          /* ── Standard build ── */
          <View style={{ gap: Spacing.sm, marginBottom: Spacing.md }}>
            <TouchableOpacity
              style={{ borderRadius: Radius.lg, paddingVertical: 18, alignItems: 'center', backgroundColor: isDone ? colors.green : isSkipped || isMissed ? colors.backgroundElevated : accentColor, opacity: saving ? 0.6 : 1 }}
              onPress={() => _doCheckIn(isDone ? 'missed' : 'done')}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving
                ? <ActivityIndicator color={isDone ? colors.white : '#000'} />
                : <Text style={{ ...Typography.headline, color: isDone ? colors.white : isSkipped || isMissed ? colors.textMuted : '#000' }}>
                    {isDone    ? '✓ The rein held — Tap to undo'
                    : isSkipped ? '⏭ Skipped — Tap to complete'
                    : isMissed  ? '✗ Missed — Tap to complete'
                    :             '☀️ Mark Complete'}
                  </Text>
              }
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  style={{ borderRadius: Radius.lg, borderWidth: 1, paddingVertical: 14, alignItems: 'center', borderColor: isSkipped ? colors.gold : colors.separator, backgroundColor: isSkipped ? colors.goldAlpha15 : colors.backgroundCard }}
                  onPress={() => _doCheckIn('skipped')}
                  disabled={saving}
                >
                  <Text style={{ ...Typography.subheadline, fontWeight: '600', color: isSkipped ? colors.gold : colors.textMuted }}>
                    ⏭ {isSkipped ? 'Skipped ✓' : 'Skip'}
                  </Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 9, color: colors.textDim, textAlign: 'center', marginTop: 4 }}>
                  Streak protected · –1 XP
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  style={{ borderRadius: Radius.lg, borderWidth: 1, paddingVertical: 14, alignItems: 'center', borderColor: isMissed ? colors.red : colors.separator, backgroundColor: isMissed ? colors.redAlpha15 : colors.backgroundCard }}
                  onPress={() => _doCheckIn('missed')}
                  disabled={saving}
                >
                  <Text style={{ ...Typography.subheadline, fontWeight: '600', color: isMissed ? colors.red : colors.textMuted }}>
                    ✗ {isMissed ? 'Missed ✓' : 'Missed'}
                  </Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 9, color: colors.textDim, textAlign: 'center', marginTop: 4 }}>
                  Streak breaks · –2 XP · be honest
                </Text>
              </View>
            </View>

            {streak.current > 0 && !isComplete && (
              <TouchableOpacity
                style={{ borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.greenAlpha25, backgroundColor: colors.greenAlpha15, paddingVertical: 13, alignItems: 'center', opacity: freezeCount > 0 ? 1 : 0.4 }}
                onPress={_useFreeze}
              >
                <Text style={{ ...Typography.subheadline, color: colors.green, fontWeight: '600' }}>
                  🧊 Streak Freeze — {freezeCount} available
                </Text>
              </TouchableOpacity>
            )}
          </View>

        ) : (
          /* ── Break habit ── */
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md }}>
            <TouchableOpacity
              style={{ flex: 1, borderRadius: Radius.lg, borderWidth: 1, paddingVertical: 18, alignItems: 'center', borderColor: isResisted ? colors.green : colors.separator, backgroundColor: isResisted ? colors.greenAlpha15 : colors.backgroundCard }}
              onPress={() => _doCheckIn('resisted')}
              disabled={saving}
            >
              <Text style={{ ...Typography.subheadline, fontWeight: '600', color: colors.green, textAlign: 'center' }}>
                {isResisted ? '✓ The rein held' : '✊ The rein held'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, borderRadius: Radius.lg, borderWidth: 1, paddingVertical: 18, alignItems: 'center', borderColor: isSlipped ? colors.red : colors.separator, backgroundColor: isSlipped ? colors.redAlpha15 : colors.backgroundCard }}
              onPress={_handleSlip}
              disabled={saving}
            >
              <Text style={{ ...Typography.subheadline, fontWeight: '600', color: colors.red, textAlign: 'center' }}>
                {isSlipped ? `😔 Bolted (${slipCount}×)` : '😔 Log slip'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Status message */}
        {todayStatus && (
          <View style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.md }}>
            <Text style={{ ...Typography.subheadline, color: colors.textMuted }}>
              {isDone && (isQuantifiable
                ? `📊 ${todayValue} ${unit} logged today${todayValue >= dailyTarget ? ' ✅' : ' 💪'}`
                : '✅ The dharma is fulfilled for today')}
              {isResisted && '✊ The rein held — your streak grows'}
              {isSkipped  && '⏭ Skipped — streak protected, no impact'}
              {isMissed   && '❌ The battle was missed — begin again tomorrow'}
              {isSlipped  && `😔 The horse bolted ${slipCount}× today`}
            </Text>
          </View>
        )}

        {/* Krishna speaks */}
        {punishLevel > 0 && punishShloka && (
          <View style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: accentColor + '30', padding: Spacing.xl, gap: Spacing.md, marginBottom: Spacing.md }}>
            <Text style={{ ...Typography.caption2, letterSpacing: 2, fontWeight: '700', color: accentColor }}>☸ KRISHNA SPEAKS</Text>
            <Text style={{ ...Typography.callout, color: colors.textSecondary, lineHeight: 24, fontStyle: 'italic' }}>
              "{KRISHNA_SPEAKS[punishLevel]}"
            </Text>
            <ShlokaDisplay shloka={punishShloka} variant="inline" />
          </View>
        )}

        {/* ── Phase F-3: HABIT MILESTONES — full visual row ── */}
        <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2, marginBottom: Spacing.md, marginTop: Spacing.sm }}>
          HABIT MILESTONES
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.lg }}>
          <View style={{ flexDirection: 'row', gap: Spacing.sm, paddingVertical: 4, paddingHorizontal: 2 }}>
            {MILESTONE_DAYS.map(days => {
              const info   = MILESTONE_INFO[days] || {};
              const earned = milestones.find(m => m.milestone_days === days);
              const isNext = days === nextMilestone;
              const daysLeft = nextMilestone === days ? nextMilestone - streak.current : null;
              return (
                <TouchableOpacity
                  key={days}
                  onPress={() => {
                    if (earned) {
                      Alert.alert(
                        `${info.badge} ${info.title}`,
                        `${info.desc}\n\nAchieved on ${new Date(earned.achieved_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
                        [{ text: '🔱 Jai ho' }]
                      );
                    } else if (isNext) {
                      Alert.alert(
                        `${info.badge} ${info.title} — ${days} days`,
                        `${info.desc}\n\n${daysLeft > 0 ? `${daysLeft} more days to unlock this.` : 'Almost there!'}`,
                        [{ text: 'Keep going' }]
                      );
                    }
                  }}
                  activeOpacity={earned || isNext ? 0.7 : 1}
                >
                  <View style={{
                    backgroundColor: earned ? colors.goldAlpha15 : isNext ? colors.backgroundElevated : colors.backgroundCard,
                    borderRadius: Radius.lg,
                    borderWidth: earned ? 1.5 : 1,
                    borderColor: earned ? colors.gold : isNext ? colors.gold + '50' : colors.separator,
                    paddingHorizontal: Spacing.md,
                    paddingVertical: Spacing.sm + 2,
                    alignItems: 'center',
                    gap: 4,
                    minWidth: 60,
                    opacity: earned ? 1 : isNext ? 0.75 : 0.4,
                  }}>
                    <Text style={{ fontSize: 22, opacity: earned ? 1 : 0.6 }}>
                      {earned ? info.badge : isNext ? info.badge : '🔒'}
                    </Text>
                    <Text style={{
                      ...Typography.caption2,
                      color:      earned ? colors.gold : isNext ? colors.textMuted : colors.textDim,
                      fontWeight: earned ? '700' : '400',
                    }}>
                      {days}d
                    </Text>
                    {earned && (
                      <Text style={{ fontSize: 8, color: colors.green, fontWeight: '700' }}>✓</Text>
                    )}
                    {isNext && !earned && (
                      <Text style={{ fontSize: 8, color: colors.gold }}>next</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* ── Phase F-3: HABIT JOURNEY stats card ── */}
        <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2, marginBottom: Spacing.md }}>
          HABIT JOURNEY
        </Text>
        <View style={{
          flexDirection: 'row',
          backgroundColor: colors.backgroundCard,
          borderRadius: Radius.lg,
          borderWidth: 1,
          borderColor: colors.separator,
          marginBottom: Spacing.lg,
          overflow: 'hidden',
        }}>
          {[
            {
              label: '30D RATE',
              value: `${consistency30}%`,
              color: consistency30 >= 70 ? colors.green : consistency30 >= 40 ? colors.gold : colors.red,
              note: consistency30 >= 70 ? 'excellent' : consistency30 >= 40 ? 'building' : 'needs work',
            },
            {
              label: 'HABIT XP',
              value: habitXP >= 0 ? `+${habitXP}` : `${habitXP}`,
              color: habitXP > 0 ? colors.blue : habitXP < 0 ? colors.red : colors.textMuted,
              note: 'from this habit',
            },
            {
              label: 'BEST STREAK',
              value: `${streak.longest}d`,
              color: streak.longest > 0 ? colors.gold : colors.textMuted,
              note: streak.longest > 0 ? 'all-time' : 'start now',
            },
          ].map((s, i) => (
            <View key={i} style={{
              flex: 1,
              padding: Spacing.md,
              alignItems: 'center',
              gap: 4,
              borderRightWidth: i < 2 ? 1 : 0,
              borderRightColor: colors.separator,
            }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: s.color }}>{s.value}</Text>
              <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 0.8, textAlign: 'center' }}>{s.label}</Text>
              <Text style={{ fontSize: 9, color: s.color, opacity: 0.8 }}>{s.note}</Text>
            </View>
          ))}
        </View>

        {/* 90-day heatmap */}
        <HabitHeatmap90
          checkins90={checkins}
          accentColor={accentColor}
          habitCreatedAt={habit.created_at}
        />

        {/* Neural progress link */}
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.backgroundCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.separator, padding: Spacing.lg, marginBottom: Spacing.lg }}
          onPress={() => navigation.navigate('NeuralProgress', { habitId, habitName: habit.name, accentColor })}
          activeOpacity={0.8}
        >
          <View style={{ gap: 4 }}>
            <Text style={{ ...Typography.subheadline, color: colors.textPrimary, fontWeight: '600' }}>🧠 Neural Rewiring Progress</Text>
            <Text style={{ ...Typography.caption1, color: colors.textDim }}>
              66-day pathway science · see your practice sessions
            </Text>
          </View>
          <Text style={{ ...Typography.title3, color: colors.textDim, fontWeight: '300' }}>›</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Quantifiable Modal ── */}
      <Modal visible={quantModal} transparent animationType="slide" onRequestClose={() => setQuantModal(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay90, justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.backgroundCard, borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl, padding: Spacing.xxl, gap: Spacing.lg, paddingBottom: 44 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.separator, alignSelf: 'center' }} />
            <Text style={{ ...Typography.title3, color: colors.textPrimary, textAlign: 'center' }}>
              How many {unit} today?
            </Text>
            <Text style={{ ...Typography.callout, color: colors.textMuted, textAlign: 'center' }}>
              🎯 Target: {dailyTarget} {unit}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, justifyContent: 'center' }}>
              <TextInput
                style={{ ...Typography.largeTitle, color: colors.textPrimary, backgroundColor: colors.backgroundElevated, borderRadius: Radius.lg, padding: Spacing.lg, minWidth: 120, textAlign: 'center', borderWidth: 2, borderColor: quantFeedback?.color || colors.goldAlpha40 }}
                value={quantInput}
                onChangeText={setQuantInput}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textPlaceholder}
                autoFocus
                onSubmitEditing={_saveQuantValue}
              />
              {unit ? <Text style={{ ...Typography.title2, color: colors.textMuted }}>{unit}</Text> : null}
            </View>

            {quantNum > 0 && dailyTarget > 0 && (
              <View style={{ height: 6, backgroundColor: colors.backgroundElevated, borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${Math.min(100, Math.round((quantNum/dailyTarget)*100))}%`, backgroundColor: quantFeedback?.color || colors.gold, borderRadius: 3 }} />
              </View>
            )}

            {quantFeedback && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: quantFeedback.color + '15', borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: quantFeedback.color + '40' }}>
                <Text style={{ fontSize: 22 }}>{quantFeedback.emoji}</Text>
                <Text style={{ ...Typography.callout, color: quantFeedback.color, flex: 1 }}>{quantFeedback.text}</Text>
              </View>
            )}

            <TouchableOpacity
              style={{ backgroundColor: quantNum > 0 ? (quantFeedback?.color || colors.gold) : colors.backgroundElevated, borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center' }}
              onPress={_saveQuantValue}
              disabled={quantNum <= 0}
            >
              <Text style={{ ...Typography.headline, color: quantNum > 0 ? '#000' : colors.textMuted }}>
                {quantNum > 0 ? `Save ${quantNum} ${unit}` : 'Enter a number'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setQuantModal(false)} style={{ alignItems: 'center' }}>
              <Text style={{ ...Typography.callout, color: colors.textDim }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Trigger Modal ── */}
      <Modal visible={triggerModal} transparent animationType="slide" onRequestClose={() => setTriggerModal(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay90, justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.backgroundCard, borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl, padding: Spacing.xl, paddingBottom: 44, gap: Spacing.lg }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.separator, alignSelf: 'center' }} />
            <Text style={{ ...Typography.title3, color: colors.textPrimary, textAlign: 'center' }}>What triggered the slip?</Text>
            <Text style={{ ...Typography.callout, color: colors.textMuted, textAlign: 'center' }}>
              Be honest with your charioteer. This builds your battlefield intelligence.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center' }}>
              {TRIGGER_OPTIONS.map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={{ width: '22%', backgroundColor: colors.backgroundElevated, borderRadius: Radius.lg, borderWidth: 1, borderColor: t.color + '66', padding: Spacing.md, alignItems: 'center', gap: 6, aspectRatio: 1, justifyContent: 'center' }}
                  onPress={() => _onTriggerSelected(t.key)}
                >
                  <Text style={{ fontSize: 24 }}>{t.icon}</Text>
                  <Text style={{ ...Typography.caption2, fontWeight: '700', textAlign: 'center', color: t.color }}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={{ alignItems: 'center', paddingVertical: Spacing.md }}
              onPress={() => { setTriggerModal(false); _doCheckIn('slip', pendingSlips); }}
            >
              <Text style={{ ...Typography.callout, color: colors.textDim }}>Skip — log without trigger</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  backBtn:  { padding: Spacing.xs, minWidth: 60 },
  hero:     { alignItems: 'center', borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.xxl, marginBottom: Spacing.lg, gap: Spacing.md },
  heroIcon: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});

export default HabitDetailScreen;