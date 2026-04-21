// ─── KARMA APP — HABIT DETAIL (PHASE 6) ──────────────────────────────
// Apple Health-inspired detail. Large numbers. Gold accents. No noise.

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView }   from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radius } from '../constants/colors';
import { DateUtils } from '../utils/dateUtils';
import {
  getHabitById, getStreak, getCheckinsForHabit,
  checkIn, getPunishmentLevel, getWeeklyCompletionRate,
} from '../database/habitService';
import {
  checkMilestone, getHabitMilestones,
  useStreakFreeze, getStreakFreezeCount, MILESTONE_INFO,
} from '../services/gamificationService';

const PUNISH_LABELS = ['', 'MILD', 'MODERATE', 'HARSH', 'MAXIMUM'];
const PUNISH_COLORS = [
  Colors.gold, Colors.orange,
  Colors.punishLevel2, Colors.red, Colors.punishLevel4,
];

const HabitDetailScreen = ({ navigation, route }) => {
  const { habitId } = route.params;

  const [habit,       setHabit]       = useState(null);
  const [streak,      setStreak]      = useState({ current: 0, longest: 0 });
  const [checkins,    setCheckins]    = useState([]);
  const [todayStatus, setTodayStatus] = useState(null);
  const [slipCount,   setSlipCount]   = useState(0);
  const [punishLevel, setPunishLevel] = useState(0);
  const [weekRate,    setWeekRate]    = useState(0);
  const [milestones,  setMilestones]  = useState([]);
  const [freezeCount, setFreezeCount] = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState(null);

  useFocusEffect(useCallback(() => { _loadData(); }, [habitId]));

  const _loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [h, s, cs, wr, ms, fc] = await Promise.all([
        getHabitById(habitId),
        getStreak(habitId),
        getCheckinsForHabit(habitId, 90),
        getWeeklyCompletionRate(habitId),
        getHabitMilestones(habitId),
        getStreakFreezeCount(),
      ]);
      const today = DateUtils.today();
      const todayC = cs.find(c => c.date === today);
      setHabit(h);
      setStreak(s);
      setCheckins(cs);
      setTodayStatus(todayC?.status || null);
      setSlipCount(todayC?.slip_count || 0);
      setWeekRate(wr);
      setMilestones(ms);
      setFreezeCount(fc);
      if (h.type === 'break') setPunishLevel(await getPunishmentLevel(habitId));
    } catch (err) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const _doCheckIn = async (status, newSlips = 0) => {
    if (saving) return;
    const prev = todayStatus;
    const prevSlip = slipCount;
    setTodayStatus(status);
    setSlipCount(newSlips);
    setSaving(true);
    try {
      await checkIn(habitId, status, null, newSlips);
      const ns = await getStreak(habitId);
      setStreak(ns);
      if (status === 'done' || status === 'resisted') {
        const hit = await checkMilestone(habitId, ns.current);
        if (hit) {
          setTimeout(() => {
            Alert.alert(`${hit.badge} ${hit.title}!`, `${hit.desc}\n\n+${hit.xp} XP`, [{ text: '🔱 Let\'s Go' }]);
          }, 300);
          setMilestones(await getHabitMilestones(habitId));
        }
      }
    } catch (err) {
      setTodayStatus(prev);
      setSlipCount(prevSlip);
      Alert.alert('Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const _useFreeze = async () => {
    if (freezeCount <= 0) {
      Alert.alert('🧊 No Freezes', 'Earn freezes by maintaining 80%+ consistency for a week.');
      return;
    }
    Alert.alert(
      '🧊 Use Streak Freeze?',
      `${freezeCount} freeze${freezeCount > 1 ? 's' : ''} available. This protects your streak for today.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use Freeze',
          onPress: async () => {
            const r = await useStreakFreeze(habitId);
            if (r.success) { Alert.alert('🧊 Protected!', r.message); _loadData(); }
            else Alert.alert('Error', r.message);
          },
        },
      ]
    );
  };

  // ── Computed ──────────────────────────────────────────────────────

  const isDone     = todayStatus === 'done';
  const isResisted = todayStatus === 'resisted';
  const isSkipped  = todayStatus === 'skipped';
  const isMissed   = todayStatus === 'missed';
  const isSlipped  = todayStatus === 'slip';
  const isComplete = isDone || isResisted;

  const accentColor = punishLevel > 0
    ? PUNISH_COLORS[punishLevel]
    : (habit?.color || Colors.gold);

  const cMap = {};
  checkins.forEach(c => { cMap[c.date] = c; });
  if (todayStatus) cMap[DateUtils.today()] = { ...(cMap[DateUtils.today()] || {}), status: todayStatus };

  const earnedDays    = milestones.map(m => m.milestone_days);
  const nextMilestone = [3,7,14,21,30,48,60,75,90,180,365].find(d => !earnedDays.includes(d));
  const weekDates     = DateUtils.getWeekDates();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.gold} />
      </View>
    );
  }
  if (error || !habit) {
    return (
      <View style={styles.center}>
        <Text style={styles.errText}>{error || 'Habit not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={_loadData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

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
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.hero, { borderColor: accentColor + '30' }]}>
          <View style={[styles.heroIconWrap, { backgroundColor: accentColor + '20' }]}>
            <Text style={styles.heroEmoji}>{habit.icon}</Text>
          </View>
          <Text style={styles.heroName}>{habit.name}</Text>
          <View style={[styles.typePill, {
            backgroundColor: habit.type === 'build' ? Colors.greenAlpha15 : Colors.redAlpha15,
          }]}>
            <Text style={[styles.typePillText, {
              color: habit.type === 'build' ? Colors.green : Colors.red,
            }]}>
              {habit.type === 'build' ? '🟢  BUILD HABIT' : '🔴  BREAK HABIT'}
            </Text>
          </View>
          {punishLevel > 0 && (
            <View style={[styles.punishPill, { backgroundColor: accentColor + '20' }]}>
              <Text style={[styles.punishPillText, { color: accentColor }]}>
                ⚠️  {PUNISH_LABELS[punishLevel]} PUNISHMENT ACTIVE
              </Text>
            </View>
          )}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {[
            {
              label: habit.type === 'build' ? 'STREAK' : 'DAYS CLEAN',
              value: streak.current > 0
                ? `${streak.current}${habit.type === 'build' ? ' 🔥' : ' ✊'}`
                : '0',
              color: streak.current > 0 ? accentColor : Colors.textMuted,
            },
            { label: 'PERSONAL BEST', value: `${streak.longest} ⭐`, color: Colors.gold },
            {
              label: 'THIS WEEK',
              value: `${weekRate}%`,
              color: weekRate >= 70 ? Colors.green : weekRate >= 40 ? Colors.gold : Colors.red,
            },
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Next milestone */}
        {nextMilestone && streak.current > 0 && (
          <View style={styles.nextMilestone}>
            <Text style={styles.nextMilestoneText}>
              {MILESTONE_INFO[nextMilestone]?.badge}  {nextMilestone - streak.current} days to{' '}
              <Text style={{ color: Colors.gold, fontWeight: '700' }}>
                {MILESTONE_INFO[nextMilestone]?.title}
              </Text>
            </Text>
          </View>
        )}

        {/* Week view */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>THIS WEEK</Text>
          <View style={styles.weekRow}>
            {weekDates.map((d) => {
              const c    = cMap[d.dateStr];
              const done = c?.status === 'done' || c?.status === 'resisted';
              const slip = c?.status === 'slip';
              const miss = c?.status === 'missed';
              const skip = c?.status === 'skipped';
              return (
                <View key={d.dateStr} style={styles.weekDay}>
                  <Text style={[styles.weekLabel, d.isToday && { color: Colors.gold }]}>
                    {d.label}
                  </Text>
                  <View style={[styles.weekDot, {
                    backgroundColor:
                      done ? accentColor :
                      slip ? Colors.red + '55' :
                      miss ? Colors.red + '30' :
                      skip ? Colors.gold + '30' :
                      Colors.backgroundCard,
                    borderColor:
                      d.isToday ? Colors.gold :
                      done      ? accentColor :
                      slip      ? Colors.red :
                      Colors.separator,
                    borderWidth: d.isToday ? 2 : 1,
                  }]}>
                    <Text style={{ fontSize: 11, color: done ? '#000' : Colors.textDim }}>
                      {done ? '✓' : slip ? '✗' : miss ? '–' : skip ? '·' : ''}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TODAY'S ACTION</Text>

          {habit.type === 'build' ? (
            <View style={styles.buildActions}>
              {/* Primary */}
              <TouchableOpacity
                style={[styles.primaryBtn, {
                  backgroundColor:
                    isDone    ? Colors.green :
                    isSkipped ? Colors.backgroundElevated :
                    isMissed  ? Colors.backgroundElevated :
                    accentColor,
                  opacity: saving ? 0.6 : 1,
                }]}
                onPress={() => _doCheckIn(isDone ? 'missed' : 'done')}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving
                  ? <ActivityIndicator color={isDone ? Colors.white : '#000'} />
                  : <Text style={[styles.primaryBtnText, {
                      color: isDone ? Colors.white :
                             isSkipped || isMissed ? Colors.textMuted : '#000',
                    }]}>
                      {isDone    ? '✓  Done Today — Tap to Undo'
                      : isSkipped ? '⏭  Skipped — Tap to Complete'
                      : isMissed  ? '✗  Missed — Tap to Complete'
                      : '☀️  Mark Complete'}
                    </Text>
                }
              </TouchableOpacity>

              {/* Secondary row */}
              <View style={styles.secondaryRow}>
                <TouchableOpacity
                  style={[styles.secondaryBtn, {
                    borderColor:     isSkipped ? Colors.gold : Colors.separator,
                    backgroundColor: isSkipped ? Colors.goldAlpha15 : Colors.backgroundCard,
                  }]}
                  onPress={() => _doCheckIn('skipped')}
                  disabled={saving}
                >
                  <Text style={[styles.secondaryBtnText, {
                    color: isSkipped ? Colors.gold : Colors.textMuted,
                  }]}>
                    ⏭  {isSkipped ? 'Skipped ✓' : 'Skip Today'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryBtn, {
                    borderColor:     isMissed ? Colors.red : Colors.separator,
                    backgroundColor: isMissed ? Colors.redAlpha15 : Colors.backgroundCard,
                  }]}
                  onPress={() => _doCheckIn('missed')}
                  disabled={saving}
                >
                  <Text style={[styles.secondaryBtnText, {
                    color: isMissed ? Colors.red : Colors.textMuted,
                  }]}>
                    ✗  {isMissed ? 'Missed ✓' : 'Mark Missed'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Freeze */}
              {streak.current > 0 && !isComplete && (
                <TouchableOpacity
                  style={[styles.freezeBtn, { opacity: freezeCount > 0 ? 1 : 0.4 }]}
                  onPress={_useFreeze}
                >
                  <Text style={styles.freezeBtnText}>
                    🧊  Use Streak Freeze ({freezeCount} available)
                  </Text>
                </TouchableOpacity>
              )}
            </View>

          ) : (
            <View style={styles.breakRow}>
              <TouchableOpacity
                style={[styles.breakBtn, {
                  borderColor:     isResisted ? Colors.green : Colors.separator,
                  backgroundColor: isResisted ? Colors.greenAlpha15 : Colors.backgroundCard,
                }]}
                onPress={() => _doCheckIn('resisted')}
                disabled={saving}
              >
                <Text style={[styles.breakBtnText, { color: Colors.green }]}>
                  {isResisted ? '✓  Resisted Today' : '✊  I Resisted'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.breakBtn, {
                  borderColor:     isSlipped ? Colors.red : Colors.separator,
                  backgroundColor: isSlipped ? Colors.redAlpha15 : Colors.backgroundCard,
                }]}
                onPress={() => Alert.alert(habit.name, 'Log a slip?', [
                  { text: '😔 Log Slip', style: 'destructive',
                    onPress: () => _doCheckIn('slip', slipCount + 1) },
                  { text: 'Cancel', style: 'cancel' },
                ])}
                disabled={saving}
              >
                <Text style={[styles.breakBtnText, { color: Colors.red }]}>
                  {isSlipped ? `😔  Slipped (${slipCount}×)` : '😔  Log Slip'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Status pill */}
          {todayStatus && (
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>
                {isDone     && '✅  Marked complete today'}
                {isResisted && '✊  Resisted today — streak growing'}
                {isSkipped  && '⏭  Skipped — no streak impact'}
                {isMissed   && '❌  Missed — streak will reset'}
                {isSlipped  && `😔  Slipped ${slipCount}× today`}
              </Text>
            </View>
          )}

          {/* Punishment */}
          {punishLevel > 0 && (
            <View style={[styles.punishCard, { borderColor: accentColor + '30' }]}>
              <Text style={[styles.punishLabel, { color: accentColor }]}>KARMA SPEAKS</Text>
              <Text style={styles.punishText}>
                {punishLevel === 1 && '"You\'re slipping, Neel. This is becoming a pattern."'}
                {punishLevel === 2 && '"3–4 slips this week. Your future self is watching."'}
                {punishLevel === 3 && '"Serious. You are working against yourself. What changes today?"'}
                {punishLevel === 4 && '"Consistent failure. Full attention required. Day 1 begins now, Neel."'}
              </Text>
            </View>
          )}
        </View>

        {/* Badges */}
        {milestones.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>BADGES EARNED</Text>
            <View style={styles.badgeRow}>
              {milestones.map((m) => {
                const info = MILESTONE_INFO[m.milestone_days] || {};
                return (
                  <View key={m.id} style={styles.badge}>
                    <Text style={styles.badgeEmoji}>{info.badge || '🏆'}</Text>
                    <Text style={styles.badgeDays}>{m.milestone_days}d</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* 30-day heatmap */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>LAST 30 DAYS</Text>
          <View style={styles.heatGrid}>
            {DateUtils.getLastNDays(30).map((date) => {
              const c    = cMap[date];
              const done = c?.status === 'done' || c?.status === 'resisted';
              const slip = c?.status === 'slip';
              const miss = c?.status === 'missed';
              const isT  = DateUtils.isToday(date);
              return (
                <View key={date} style={[styles.heatCell, {
                  backgroundColor:
                    done ? accentColor + 'CC' :
                    slip ? Colors.red + '77' :
                    miss ? Colors.red + '30' :
                    Colors.backgroundCard,
                  borderWidth: isT ? 1.5 : 0,
                  borderColor: Colors.gold,
                }]} />
              );
            })}
          </View>
          <View style={styles.heatLegend}>
            {[
              { color: accentColor, label: 'Done' },
              { color: Colors.red + '77', label: 'Slip' },
              { color: Colors.red + '30', label: 'Missed' },
              { color: Colors.backgroundCard, label: 'No data' },
            ].map((l, i) => (
              <View key={i} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                <Text style={styles.legendText}>{l.label}</Text>
              </View>
            ))}
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
    alignItems: 'center', justifyContent: 'center', gap: 14,
  },
  errText:  { ...Typography.body, color: Colors.red, textAlign: 'center' },
  retryBtn: { backgroundColor: Colors.gold, paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.lg },
  retryText:{ ...Typography.headline, color: '#000' },

  header: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical:   Spacing.md,
    borderBottomWidth:  1,
    borderBottomColor:  Colors.separator,
  },
  backBtn:  { padding: Spacing.xs },
  backText: { ...Typography.body, color: Colors.gold },
  editBtn:  { padding: Spacing.xs },
  editText: { ...Typography.body, color: Colors.textMuted },

  scroll:  { flex: 1 },
  content: { padding: Spacing.xl, gap: 0 },

  // Hero
  hero: {
    alignItems:     'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius:   Radius.xl,
    borderWidth:     1,
    padding:        Spacing.xxl,
    marginBottom:   Spacing.lg,
    gap:            Spacing.md,
  },
  heroIconWrap: {
    width: 72, height: 72, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  heroEmoji:    { fontSize: 38 },
  heroName:     { ...Typography.title2, color: Colors.textPrimary, textAlign: 'center' },
  typePill:     { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full },
  typePillText: { ...Typography.caption1, fontWeight: '700', letterSpacing: 1 },
  punishPill:   { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full },
  punishPillText:{ ...Typography.caption2, fontWeight: '700', letterSpacing: 1 },

  // Stats
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  statCard: {
    flex: 1, backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.lg, padding: Spacing.md,
    alignItems: 'center', gap: 5,
  },
  statVal:   { fontSize: 22, fontWeight: '700' },
  statLabel: { ...Typography.caption2, color: Colors.textDim, letterSpacing: 1, textAlign: 'center' },

  // Next milestone
  nextMilestone: {
    backgroundColor: Colors.goldAlpha15,
    borderRadius:    Radius.lg,
    borderWidth:      1,
    borderColor:     Colors.goldAlpha25,
    padding:         Spacing.md,
    marginBottom:    Spacing.lg,
    alignItems:      'center',
  },
  nextMilestoneText: { ...Typography.subheadline, color: Colors.textSecondary },

  // Section
  section:      { marginBottom: Spacing.xl },
  sectionLabel: {
    ...Typography.caption2, color: Colors.textDim,
    letterSpacing: 2, marginBottom: Spacing.md,
  },

  // Week
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { alignItems: 'center', gap: 7, flex: 1 },
  weekLabel:{ ...Typography.caption2, color: Colors.textDim },
  weekDot: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },

  // Build actions
  buildActions: { gap: Spacing.sm },
  primaryBtn: {
    borderRadius:  Radius.lg,
    paddingVertical: 18,
    alignItems:    'center',
  },
  primaryBtnText: { ...Typography.headline },

  secondaryRow: { flexDirection: 'row', gap: Spacing.sm },
  secondaryBtn: {
    flex: 1, borderRadius: Radius.lg, borderWidth: 1,
    paddingVertical: 14, alignItems: 'center',
  },
  secondaryBtnText: { ...Typography.subheadline, fontWeight: '600' },

  freezeBtn: {
    borderRadius:    Radius.lg,
    borderWidth:      1,
    borderColor:     Colors.greenAlpha25,
    backgroundColor: Colors.greenAlpha15,
    paddingVertical:  13,
    alignItems:      'center',
  },
  freezeBtnText: { ...Typography.subheadline, color: Colors.green, fontWeight: '600' },

  // Break actions
  breakRow: { flexDirection: 'row', gap: Spacing.sm },
  breakBtn: {
    flex: 1, borderRadius: Radius.lg, borderWidth: 1,
    paddingVertical: 18, alignItems: 'center',
  },
  breakBtnText: { ...Typography.headline },

  // Status
  statusPill: {
    backgroundColor: Colors.backgroundCard,
    borderRadius:    Radius.md,
    padding:         Spacing.md,
    alignItems:      'center',
    marginTop:        Spacing.xs,
  },
  statusPillText: { ...Typography.subheadline, color: Colors.textMuted },

  // Punishment
  punishCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius:    Radius.lg,
    borderWidth:      1,
    padding:         Spacing.lg,
    gap:             Spacing.sm,
    marginTop:       Spacing.sm,
  },
  punishLabel: { ...Typography.caption2, letterSpacing: 2, fontWeight: '700' },
  punishText:  { ...Typography.callout, color: Colors.textSecondary, lineHeight: 22, fontStyle: 'italic' },

  // Badges
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  badge: {
    backgroundColor: Colors.goldAlpha15,
    borderRadius:    Radius.lg,
    borderWidth:      1,
    borderColor:     Colors.goldAlpha25,
    padding:         Spacing.md,
    alignItems:      'center',
    gap:              4,
    minWidth:         64,
  },
  badgeEmoji: { fontSize: 24 },
  badgeDays:  { ...Typography.caption1, color: Colors.gold, fontWeight: '700' },

  // Heatmap
  heatGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 4,
  },
  heatCell: {
    width: '6%', aspectRatio: 1, borderRadius: 3,
  },
  heatLegend: { flexDirection: 'row', gap: 16, marginTop: 10, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:  { width: 10, height: 10, borderRadius: 2 },
  legendText: { ...Typography.caption2, color: Colors.textDim },
});

export default HabitDetailScreen;