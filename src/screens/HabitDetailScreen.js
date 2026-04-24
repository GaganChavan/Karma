// ─── KARMA APP — HABIT DETAIL (PHASE C) ──────────────────────────────
// Added: Quantifiable number input — track pages, reps, glasses
// Added: Flexible streak display — shows weekly progress

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Alert, ActivityIndicator,
  Modal, FlatList, TextInput,
} from 'react-native';
import { SafeAreaView }   from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, Typography, Spacing, Radius } from '../constants/colors';
import { DateUtils } from '../utils/dateUtils';
import {
  getHabitById, getStreak, getCheckinsForHabit,
  checkIn, getPunishmentLevel, getWeeklyCompletionRate,
} from '../database/habitService';
import {
  checkMilestone, getHabitMilestones,
  useStreakFreeze, getStreakFreezeCount, MILESTONE_INFO,
} from '../services/gamificationService';
import { getShloka, getMilestoneContext, getPunishContext } from '../constants/shlokas';
import { logSlipTrigger, getTriggerPattern, TRIGGER_OPTIONS } from '../database/moodService';
import ShlokaDisplay from '../components/ShlokaDisplay';
import { getDatabase } from '../database/database';

const PUNISH_COLORS_KEYS = ['gold','orange','punishLevel2','red','punishLevel4'];
const PUNISH_LABELS = ['','MILD','MODERATE','HARSH','MAXIMUM'];
const KRISHNA_SPEAKS = [
  '',
  'The horse stirred. The rein slipped. Tighten your grip — the path is not lost.',
  'The senses are winning, Neel. Where is your charioteer?',
  'Arjuna also wanted to surrender. Krishna said — rise and fight.',
  'The self alone is friend or enemy. You are choosing the enemy. Today that changes.',
];

const HabitDetailScreen = ({ navigation, route }) => {
  const { habitId, showTrigger = false } = route.params;
  const { colors } = useTheme();

  const [habit,         setHabit]         = useState(null);
  const [streak,        setStreak]         = useState({ current: 0, longest: 0 });
  const [checkins,      setCheckins]       = useState([]);
  const [todayStatus,   setTodayStatus]    = useState(null);
  const [todayValue,    setTodayValue]     = useState(null);
  const [slipCount,     setSlipCount]      = useState(0);
  const [punishLevel,   setPunishLevel]    = useState(0);
  const [weekRate,      setWeekRate]       = useState(0);
  const [milestones,    setMilestones]     = useState([]);
  const [freezeCount,   setFreezeCount]    = useState(0);
  const [triggerPattern,setTriggerPattern] = useState(null);
  const [weekProgress,  setWeekProgress]   = useState(null);
  const [loading,       setLoading]        = useState(true);
  const [saving,        setSaving]         = useState(false);
  const [error,         setError]          = useState(null);
  const [triggerModal,  setTriggerModal]   = useState(false);
  const [quantModal,    setQuantModal]     = useState(false);
  const [pendingSlips,  setPendingSlips]   = useState(0);
  const [quantInput,    setQuantInput]     = useState('');

  useFocusEffect(useCallback(() => {
    _loadData();
    if (showTrigger) setTimeout(() => setTriggerModal(true), 500);
  }, [habitId]));

  const _loadData = async () => {
    try {
      setLoading(true);
      const [h, s, cs, wr, ms, fc, tp] = await Promise.all([
        getHabitById(habitId),
        getStreak(habitId),
        getCheckinsForHabit(habitId, 90),
        getWeeklyCompletionRate(habitId),
        getHabitMilestones(habitId),
        getStreakFreezeCount(),
        getTriggerPattern(habitId),
      ]);
      const today  = DateUtils.today();
      const todayC = cs.find(c => c.date === today);
      setHabit(h);
      setStreak(s);
      setCheckins(cs);
      setTodayStatus(todayC?.status || null);
      setTodayValue(todayC?.value || null);
      setSlipCount(todayC?.slip_count || 0);
      setWeekRate(wr);
      setMilestones(ms);
      setFreezeCount(fc);
      setTriggerPattern(tp);
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
    const prev = todayStatus; const prevSlip = slipCount;
    setTodayStatus(status); setSlipCount(newSlips);
    if (value !== null) setTodayValue(value);
    setSaving(true);
    try {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO checkins (habit_id, date, status, slip_count, value)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(habit_id, date) DO UPDATE SET
           status = excluded.status,
           slip_count = excluded.slip_count,
           value = excluded.value,
           created_at = datetime('now','localtime')`,
        [habitId, DateUtils.today(), status, newSlips, value]
      );
      const ns = await getStreak(habitId);
      setStreak(ns);
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
      const newRate = await getWeeklyCompletionRate(habitId);
      setWeekRate(newRate);
      const tp = await getTriggerPattern(habitId);
      setTriggerPattern(tp);
      if (habit?.frequency_type === 'weekly') {
        const cs2 = await getCheckinsForHabit(habitId, 90);
        setCheckins(cs2);
        setWeekProgress(await _getWeekProgress(habit, cs2));
      }
    } catch (err) {
      setTodayStatus(prev); setSlipCount(prevSlip);
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
    const target = habit?.daily_target || 1;
    const status = val >= target ? 'done' : 'missed';
    await _doCheckIn(status, 0, val);
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
    } catch (err) { Alert.alert('Error', err.message); }
  };

  const _useFreeze = async () => {
    if (freezeCount <= 0) {
      Alert.alert('🧊 No Freezes', 'Earn freezes by maintaining 80%+ weekly consistency.');
      return;
    }
    Alert.alert('🧊 Use Streak Freeze?', `${freezeCount} freeze${freezeCount > 1 ? 's' : ''} available.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Protect the Streak',
        onPress: async () => {
          const r = await useStreakFreeze(habitId);
          Alert.alert(r.success ? '🧊 Protected!' : 'Error', r.message);
          if (r.success) _loadData();
        },
      },
    ]);
  };

  // ── Computed ──────────────────────────────────────────────────────
  const isDone     = todayStatus === 'done';
  const isResisted = todayStatus === 'resisted';
  const isSkipped  = todayStatus === 'skipped';
  const isMissed   = todayStatus === 'missed';
  const isSlipped  = todayStatus === 'slip';
  const isComplete = isDone || isResisted;

  const punishColor  = [colors.gold, colors.orange, colors.punishLevel2, colors.red, colors.punishLevel4][punishLevel] || colors.gold;
  const accentColor  = punishLevel > 0 ? punishColor : (habit?.color || colors.gold);
  const punishShloka = punishLevel > 0 ? getShloka(getPunishContext(punishLevel)) : null;

  const cMap = {};
  checkins.forEach(c => { cMap[c.date] = c; });
  if (todayStatus) cMap[DateUtils.today()] = { ...(cMap[DateUtils.today()] || {}), status: todayStatus, value: todayValue };

  const earnedDays    = milestones.map(m => m.milestone_days);
  const nextMilestone = [3,7,14,21,30,48,60,75,90,180,365].find(d => !earnedDays.includes(d));
  const weekDates     = DateUtils.getWeekDates();
  const isQuantifiable = habit?.is_quantifiable;
  const dailyTarget   = habit?.daily_target || 1;
  const unit          = habit?.unit || '';
  const isWeekly      = habit?.frequency_type === 'weekly';

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ ...Typography.body, color: colors.gold }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ ...Typography.headline, color: colors.textPrimary, flex: 1, textAlign: 'center' }} numberOfLines={1}>{habit.name}</Text>
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
                {habit.type === 'build' ? '🟢  BUILD DHARMA' : '🔴  BREAK THE CHAIN'}
              </Text>
            </View>
            {isQuantifiable ? (
              <View style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: colors.blueAlpha15 }}>
                <Text style={{ ...Typography.caption1, fontWeight: '700', letterSpacing: 1, color: colors.blue }}>
                  🔢  {dailyTarget} {unit}/day
                </Text>
              </View>
            ) : null}
            {isWeekly ? (
              <View style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: colors.goldAlpha15 }}>
                <Text style={{ ...Typography.caption1, fontWeight: '700', letterSpacing: 1, color: colors.gold }}>
                  📅  {habit.weekly_target}× per week
                </Text>
              </View>
            ) : null}
          </View>
          {punishLevel > 0 && (
            <Text style={{ ...Typography.caption2, fontWeight: '700', letterSpacing: 1, color: accentColor }}>
              ⚠️  {PUNISH_LABELS[punishLevel]} — THE HORSE IS RUNNING
            </Text>
          )}
        </View>

        {/* Stats */}
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
                : `${weekRate}%`,
              color: weekRate >= 70 ? colors.green : weekRate >= 40 ? colors.gold : colors.red,
            },
          ].map((s, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: colors.backgroundCard, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', gap: 5, borderWidth: 1, borderColor: colors.separator }}>
              <Text style={{ fontSize: 22, fontWeight: '700', color: s.color }}>{s.value}</Text>
              <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 1, textAlign: 'center' }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Weekly progress bar (weekly streak mode) */}
        {isWeekly && weekProgress && (
          <View style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.separator, padding: Spacing.lg, marginBottom: Spacing.lg, gap: Spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2 }}>THIS WEEK'S PROGRESS</Text>
              <Text style={{ ...Typography.caption1, color: weekProgress.done >= weekProgress.target ? colors.green : colors.gold, fontWeight: '700' }}>
                {weekProgress.done}/{weekProgress.target} done
              </Text>
            </View>
            <View style={{ height: 8, backgroundColor: colors.backgroundElevated, borderRadius: Radius.full, overflow: 'hidden' }}>
              <View style={{
                height: '100%',
                width: `${Math.min((weekProgress.done / weekProgress.target) * 100, 100)}%`,
                backgroundColor: weekProgress.done >= weekProgress.target ? colors.green : accentColor,
                borderRadius: Radius.full,
              }} />
            </View>
            {weekProgress.done >= weekProgress.target && (
              <Text style={{ ...Typography.caption1, color: colors.green, textAlign: 'center' }}>
                ✓ Weekly target met — streak maintained 🔱
              </Text>
            )}
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

        {/* Next milestone */}
        {nextMilestone && streak.current > 0 && (
          <View style={{ backgroundColor: colors.goldAlpha15, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.goldAlpha25, padding: Spacing.md, marginBottom: Spacing.lg, alignItems: 'center' }}>
            <Text style={{ ...Typography.subheadline, color: colors.textSecondary }}>
              {MILESTONE_INFO[nextMilestone]?.badge}  {nextMilestone - streak.current} days to <Text style={{ color: colors.gold, fontWeight: '700' }}>{MILESTONE_INFO[nextMilestone]?.title}</Text>
            </Text>
          </View>
        )}

        {/* Week view */}
        <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2, marginBottom: Spacing.md }}>THIS WEEK'S BATTLEFIELD</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg }}>
          {weekDates.map((d) => {
            const c    = cMap[d.dateStr];
            const done = c?.status === 'done' || c?.status === 'resisted';
            const slip = c?.status === 'slip';
            const miss = c?.status === 'missed';
            const val  = c?.value;
            return (
              <View key={d.dateStr} style={{ alignItems: 'center', gap: 7, flex: 1 }}>
                <Text style={{ ...Typography.caption2, color: d.isToday ? colors.gold : colors.textDim }}>{d.label}</Text>
                <View style={{
                  width: 34, height: 34, borderRadius: 17,
                  backgroundColor: done ? accentColor : slip ? colors.red+'55' : miss ? colors.red+'25' : d.isToday ? colors.goldAlpha15 : colors.backgroundCard,
                  borderWidth: d.isToday ? 2 : 1,
                  borderColor: d.isToday ? colors.gold : done ? accentColor : slip ? colors.red : colors.separator,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: isQuantifiable ? 8 : 11, color: done ? '#000' : colors.textDim }}>
                    {isQuantifiable && val ? `${val}` : done ? '✓' : slip ? '✗' : miss ? '–' : ''}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Today's action */}
        <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2, marginBottom: Spacing.md, marginTop: Spacing.sm }}>TODAY'S BATTLE</Text>

        {/* Quantifiable check-in */}
        {isQuantifiable && habit.type === 'build' ? (
          <View style={{ gap: Spacing.sm, marginBottom: Spacing.md }}>
            <TouchableOpacity
              style={{
                borderRadius: Radius.lg, paddingVertical: 18, alignItems: 'center',
                backgroundColor: isDone ? colors.green : accentColor,
                opacity: saving ? 0.6 : 1,
              }}
              onPress={_handleQuantComplete}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving
                ? <ActivityIndicator color="#000" />
                : <Text style={{ ...Typography.headline, color: isDone ? colors.white : '#000' }}>
                    {isDone
                      ? `✓  ${todayValue} ${unit} done — Tap to update`
                      : `📊  Log ${dailyTarget} ${unit}`
                    }
                  </Text>
              }
            </TouchableOpacity>
            {isDone && todayValue !== null && (
              <View style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' }}>
                <Text style={{ ...Typography.callout, color: colors.green }}>
                  {todayValue >= dailyTarget
                    ? `✅ Target met — ${todayValue}/${dailyTarget} ${unit}`
                    : `⚠️ Partial — ${todayValue}/${dailyTarget} ${unit}`
                  }
                </Text>
              </View>
            )}
          </View>

        ) : habit.type === 'build' ? (
          <View style={{ gap: Spacing.sm, marginBottom: Spacing.md }}>
            <TouchableOpacity
              style={{
                borderRadius: Radius.lg, paddingVertical: 18, alignItems: 'center',
                backgroundColor: isDone ? colors.green : isSkipped || isMissed ? colors.backgroundElevated : accentColor,
                opacity: saving ? 0.6 : 1,
              }}
              onPress={() => _doCheckIn(isDone ? 'missed' : 'done')}
              disabled={saving} activeOpacity={0.8}
            >
              {saving
                ? <ActivityIndicator color={isDone ? colors.white : '#000'} />
                : <Text style={{ ...Typography.headline, color: isDone ? colors.white : isSkipped || isMissed ? colors.textMuted : '#000' }}>
                    {isDone ? '✓  The rein held — Tap to undo' : isSkipped ? '⏭  Skipped — Tap to complete' : isMissed ? '✗  Missed — Tap to complete' : '☀️  Mark Complete'}
                  </Text>
              }
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <TouchableOpacity
                style={{ flex: 1, borderRadius: Radius.lg, borderWidth: 1, paddingVertical: 14, alignItems: 'center', borderColor: isSkipped ? colors.gold : colors.separator, backgroundColor: isSkipped ? colors.goldAlpha15 : colors.backgroundCard }}
                onPress={() => _doCheckIn('skipped')} disabled={saving}
              >
                <Text style={{ ...Typography.subheadline, fontWeight: '600', color: isSkipped ? colors.gold : colors.textMuted }}>⏭  {isSkipped ? 'Skipped ✓' : 'Skip'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, borderRadius: Radius.lg, borderWidth: 1, paddingVertical: 14, alignItems: 'center', borderColor: isMissed ? colors.red : colors.separator, backgroundColor: isMissed ? colors.redAlpha15 : colors.backgroundCard }}
                onPress={() => _doCheckIn('missed')} disabled={saving}
              >
                <Text style={{ ...Typography.subheadline, fontWeight: '600', color: isMissed ? colors.red : colors.textMuted }}>✗  {isMissed ? 'Missed ✓' : 'Missed'}</Text>
              </TouchableOpacity>
            </View>
            {streak.current > 0 && !isComplete && (
              <TouchableOpacity
                style={{ borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.greenAlpha25, backgroundColor: colors.greenAlpha15, paddingVertical: 13, alignItems: 'center', opacity: freezeCount > 0 ? 1 : 0.4 }}
                onPress={_useFreeze}
              >
                <Text style={{ ...Typography.subheadline, color: colors.green, fontWeight: '600' }}>🧊  Streak Freeze — {freezeCount} available</Text>
              </TouchableOpacity>
            )}
          </View>

        ) : (
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md }}>
            <TouchableOpacity
              style={{ flex: 1, borderRadius: Radius.lg, borderWidth: 1, paddingVertical: 18, alignItems: 'center', borderColor: isResisted ? colors.green : colors.separator, backgroundColor: isResisted ? colors.greenAlpha15 : colors.backgroundCard }}
              onPress={() => _doCheckIn('resisted')} disabled={saving}
            >
              <Text style={{ ...Typography.subheadline, fontWeight: '600', color: colors.green, textAlign: 'center' }}>
                {isResisted ? '✓  The rein held' : '✊  The rein held'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, borderRadius: Radius.lg, borderWidth: 1, paddingVertical: 18, alignItems: 'center', borderColor: isSlipped ? colors.red : colors.separator, backgroundColor: isSlipped ? colors.redAlpha15 : colors.backgroundCard }}
              onPress={_handleSlip} disabled={saving}
            >
              <Text style={{ ...Typography.subheadline, fontWeight: '600', color: colors.red, textAlign: 'center' }}>
                {isSlipped ? `😔  Bolted (${slipCount}×)` : '😔  Log slip'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Status */}
        {todayStatus && (
          <View style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.md }}>
            <Text style={{ ...Typography.subheadline, color: colors.textMuted }}>
              {isDone     && (isQuantifiable ? `📊 ${todayValue} ${unit} logged today` : '✅  The dharma is fulfilled for today')}
              {isResisted && '✊  The rein held — your streak grows'}
              {isSkipped  && '⏭  Skipped — no streak impact'}
              {isMissed   && '❌  The battle was missed — begin again tomorrow'}
              {isSlipped  && `😔  The horse bolted ${slipCount}× today`}
            </Text>
          </View>
        )}

        {/* Krishna speaks */}
        {punishLevel > 0 && punishShloka && (
          <View style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: accentColor + '30', padding: Spacing.xl, gap: Spacing.md, marginBottom: Spacing.md }}>
            <Text style={{ ...Typography.caption2, letterSpacing: 2, fontWeight: '700', color: accentColor }}>☸  KRISHNA SPEAKS</Text>
            <Text style={{ ...Typography.callout, color: colors.textSecondary, lineHeight: 24, fontStyle: 'italic' }}>"{KRISHNA_SPEAKS[punishLevel]}"</Text>
            <ShlokaDisplay shloka={punishShloka} variant="inline" />
          </View>
        )}

        {/* Badges */}
        {milestones.length > 0 && (
          <>
            <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2, marginBottom: Spacing.md, marginTop: Spacing.sm }}>VICTORIES EARNED</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md }}>
              {milestones.map((m) => {
                const info = MILESTONE_INFO[m.milestone_days] || {};
                return (
                  <View key={m.id} style={{ backgroundColor: colors.goldAlpha15, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.goldAlpha25, padding: Spacing.md, alignItems: 'center', gap: 4, minWidth: 64 }}>
                    <Text style={{ fontSize: 24 }}>{info.badge || '🏆'}</Text>
                    <Text style={{ ...Typography.caption1, color: colors.gold, fontWeight: '700' }}>{m.milestone_days}d</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* 30-day heatmap */}
        <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2, marginBottom: Spacing.md, marginTop: Spacing.sm }}>30-DAY BATTLEFIELD</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: Spacing.md }}>
          {DateUtils.getLastNDays(30).map((date) => {
            const c    = cMap[date];
            const done = c?.status === 'done' || c?.status === 'resisted';
            const slip = c?.status === 'slip';
            const miss = c?.status === 'missed';
            const isT  = DateUtils.isToday(date);
            return (
              <View key={date} style={{
                width: '6%', aspectRatio: 1, borderRadius: 3,
                backgroundColor: done ? accentColor+'CC' : slip ? colors.red+'77' : miss ? colors.red+'30' : colors.backgroundCard,
                borderWidth: isT ? 1.5 : 0, borderColor: colors.gold,
              }} />
            );
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Quantifiable input modal */}
      <Modal visible={quantModal} transparent animationType="slide" onRequestClose={() => setQuantModal(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay90, justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.backgroundCard, borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl, padding: Spacing.xxl, gap: Spacing.xl, paddingBottom: 44 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.separator, alignSelf: 'center' }} />
            <Text style={{ ...Typography.title3, color: colors.textPrimary, textAlign: 'center' }}>
              Log {habit?.name}
            </Text>
            <Text style={{ ...Typography.callout, color: colors.textMuted, textAlign: 'center' }}>
              Target: {dailyTarget} {unit}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, justifyContent: 'center' }}>
              <TextInput
                style={{
                  ...Typography.largeTitle,
                  color: colors.textPrimary,
                  backgroundColor: colors.backgroundElevated,
                  borderRadius: Radius.lg,
                  padding: Spacing.lg,
                  minWidth: 120,
                  textAlign: 'center',
                  borderWidth: 2,
                  borderColor: colors.goldAlpha40,
                }}
                value={quantInput}
                onChangeText={setQuantInput}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textPlaceholder}
                autoFocus
              />
              {unit ? <Text style={{ ...Typography.title2, color: colors.textMuted }}>{unit}</Text> : null}
            </View>
            {parseFloat(quantInput) > 0 && (
              <Text style={{ ...Typography.callout, color: parseFloat(quantInput) >= dailyTarget ? colors.green : colors.orange, textAlign: 'center' }}>
                {parseFloat(quantInput) >= dailyTarget
                  ? `✅ Target met!`
                  : `${((parseFloat(quantInput) / dailyTarget) * 100).toFixed(0)}% of target`
                }
              </Text>
            )}
            <TouchableOpacity
              style={{ backgroundColor: colors.gold, borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center' }}
              onPress={_saveQuantValue}
            >
              <Text style={{ ...Typography.headline, color: '#000' }}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setQuantModal(false)} style={{ alignItems: 'center' }}>
              <Text style={{ ...Typography.callout, color: colors.textDim }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Trigger journal modal */}
      <Modal visible={triggerModal} transparent animationType="slide" onRequestClose={() => setTriggerModal(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay90, justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.backgroundCard, borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl, padding: Spacing.xl, paddingBottom: 44, gap: Spacing.lg }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.separator, alignSelf: 'center' }} />
            <Text style={{ ...Typography.title3, color: colors.textPrimary, textAlign: 'center' }}>What triggered the slip?</Text>
            <Text style={{ ...Typography.callout, color: colors.textMuted, textAlign: 'center' }}>Be honest with your charioteer. This builds your battlefield intelligence.</Text>
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
            <TouchableOpacity style={{ alignItems: 'center', paddingVertical: Spacing.md }} onPress={() => { setTriggerModal(false); _doCheckIn('slip', pendingSlips); }}>
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