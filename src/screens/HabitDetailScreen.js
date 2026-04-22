// ─── KARMA APP — HABIT DETAIL (GITA PHASE A) ────────────────────────
// Krishna speaks. The chariot language throughout.
// Gita shlokas for punishment, milestones, encouragement.

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
import {
  getShloka, getMilestoneContext, getPunishContext,
} from '../constants/shlokas';
import ShlokaDisplay from '../components/ShlokaDisplay';

const PUNISH_LABELS  = ['', 'MILD', 'MODERATE', 'HARSH', 'MAXIMUM'];
const PUNISH_COLORS  = [
  Colors.gold, Colors.orange,
  Colors.punishLevel2, Colors.red, Colors.punishLevel4,
];

// Krishna speaks at each punishment level
const KRISHNA_SPEAKS = [
  '',
  'The horse stirred. The rein slipped. Tighten your grip — the path is not lost.',
  'The senses are winning, Neel. Where is your charioteer? Krishna does not fight for Arjuna — Arjuna must fight.',
  'Arjuna also wanted to surrender. Krishna said — rise. You have been given a chariot and a battlefield. Use them.',
  'The self alone is the friend of the self. The self alone is the enemy. You are choosing the enemy. Today that changes.',
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
      const today  = DateUtils.today();
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
      setError(err.message || 'The chariot could not load this habit');
    } finally {
      setLoading(false);
    }
  };

  const _doCheckIn = async (status, newSlips = 0) => {
    if (saving) return;
    const prev     = todayStatus;
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
          const shloka = getShloka(getMilestoneContext(hit.days));
          setTimeout(() => {
            Alert.alert(
              `${hit.badge} ${hit.title}`,
              `${hit.desc}\n\n+${hit.xp} Karma XP\n\n${shloka.sanskrit}\n"${shloka.meaning}"\n— ${shloka.reference}`,
              [{ text: '🔱 Jai Shri Krishna' }]
            );
          }, 300);
          setMilestones(await getHabitMilestones(habitId));
        }
      }
      const newRate = await getWeeklyCompletionRate(habitId);
      setWeekRate(newRate);
    } catch (err) {
      setTodayStatus(prev);
      setSlipCount(prevSlip);
      Alert.alert('The rein slipped', err.message);
    } finally {
      setSaving(false);
    }
  };

  const _useFreeze = async () => {
    const freezeShloka = getShloka('streakFreeze');
    if (freezeCount <= 0) {
      Alert.alert(
        '🧊 No Freezes',
        'Earn streak freezes by holding 80%+ consistency for a full week.\n\n' +
        '"' + freezeShloka.meaning + '"\n— ' + freezeShloka.reference
      );
      return;
    }
    Alert.alert(
      '🧊 Use Streak Freeze?',
      `${freezeCount} freeze${freezeCount > 1 ? 's' : ''} available.\n\nYour streak is protected for today.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Protect the Streak',
          onPress: async () => {
            const r = await useStreakFreeze(habitId);
            if (r.success) {
              Alert.alert('🧊 Protected', r.message + '\n\n"' + freezeShloka.meaning + '"');
              _loadData();
            } else {
              Alert.alert('Error', r.message);
            }
          },
        },
      ]
    );
  };

  // ── Computed ──────────────────────────────────────────────────────

  const isDone      = todayStatus === 'done';
  const isResisted  = todayStatus === 'resisted';
  const isSkipped   = todayStatus === 'skipped';
  const isMissed    = todayStatus === 'missed';
  const isSlipped   = todayStatus === 'slip';
  const isComplete  = isDone || isResisted;

  const accentColor   = punishLevel > 0
    ? PUNISH_COLORS[punishLevel]
    : (habit?.color || Colors.gold);

  const cMap = {};
  checkins.forEach(c => { cMap[c.date] = c; });
  if (todayStatus) {
    cMap[DateUtils.today()] = { ...(cMap[DateUtils.today()] || {}), status: todayStatus };
  }

  const earnedDays    = milestones.map(m => m.milestone_days);
  const nextMilestone = [3,7,14,21,30,48,60,75,90,180,365].find(d => !earnedDays.includes(d));
  const weekDates     = DateUtils.getWeekDates();

  // Get punishment shloka
  const punishShloka = punishLevel > 0
    ? getShloka(getPunishContext(punishLevel))
    : null;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.gold} />
        <Text style={styles.loadText}>The chariot is readying...</Text>
      </View>
    );
  }

  if (error || !habit) {
    return (
      <View style={styles.center}>
        <Text style={styles.errText}>{error || 'Habit not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={_loadData}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

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
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.hero, { borderColor: accentColor + '30' }]}>
          <View style={[styles.heroIcon, { backgroundColor: accentColor + '20' }]}>
            <Text style={{ fontSize: 38 }}>{habit.icon}</Text>
          </View>
          <Text style={styles.heroName}>{habit.name}</Text>
          <View style={[styles.typePill, {
            backgroundColor: habit.type === 'build' ? Colors.greenAlpha15 : Colors.redAlpha15,
          }]}>
            <Text style={[styles.typePillText, {
              color: habit.type === 'build' ? Colors.green : Colors.red,
            }]}>
              {habit.type === 'build' ? '🟢  BUILD DHARMA' : '🔴  BREAK THE CHAIN'}
            </Text>
          </View>
          {punishLevel > 0 && (
            <View style={[styles.punishPill, { backgroundColor: accentColor + '20' }]}>
              <Text style={[styles.punishPillText, { color: accentColor }]}>
                ⚠️  {PUNISH_LABELS[punishLevel]} — THE HORSE IS RUNNING
              </Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            {
              label: habit.type === 'build' ? 'REIN HELD' : 'DAYS CLEAN',
              value: streak.current > 0
                ? `${streak.current} ${habit.type === 'build' ? '🪔' : '✊'}`
                : '0',
              color: streak.current > 0 ? accentColor : Colors.textMuted,
            },
            { label: 'BEST', value: `${streak.longest} 🏆`, color: Colors.gold },
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
        <Text style={styles.sectionLabel}>THIS WEEK'S BATTLEFIELD</Text>
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
                    done ? accentColor      :
                    slip ? Colors.red+'55'  :
                    miss ? Colors.red+'25'  :
                    skip ? Colors.gold+'25' :
                    d.isToday ? Colors.goldAlpha15 : Colors.backgroundCard,
                  borderColor:
                    d.isToday ? Colors.gold  :
                    done      ? accentColor  :
                    slip      ? Colors.red   :
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

        {/* Action */}
        <Text style={[styles.sectionLabel, { marginTop: Spacing.xl }]}>TODAY'S BATTLE</Text>

        {habit.type === 'build' ? (
          <View style={styles.buildActions}>
            <TouchableOpacity
              style={[styles.mainBtn, {
                backgroundColor:
                  isDone    ? Colors.green           :
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
                : <Text style={[styles.mainBtnText, {
                    color: isDone ? Colors.white :
                           isSkipped || isMissed ? Colors.textMuted : '#000',
                  }]}>
                    {isDone    ? '✓  The rein held — Tap to undo'
                    : isSkipped ? '⏭  Skipped — Tap to complete'
                    : isMissed  ? '✗  Missed — Tap to complete'
                    : '☀️  Mark Complete — Claim your karma'}
                  </Text>
              }
            </TouchableOpacity>

            <View style={styles.secondRow}>
              <TouchableOpacity
                style={[styles.secBtn, {
                  borderColor:     isSkipped ? Colors.gold : Colors.separator,
                  backgroundColor: isSkipped ? Colors.goldAlpha15 : Colors.backgroundCard,
                }]}
                onPress={() => _doCheckIn('skipped')}
                disabled={saving}
              >
                <Text style={[styles.secBtnText, { color: isSkipped ? Colors.gold : Colors.textMuted }]}>
                  ⏭  {isSkipped ? 'Skipped ✓' : 'Skip Today'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secBtn, {
                  borderColor:     isMissed ? Colors.red : Colors.separator,
                  backgroundColor: isMissed ? Colors.redAlpha15 : Colors.backgroundCard,
                }]}
                onPress={() => _doCheckIn('missed')}
                disabled={saving}
              >
                <Text style={[styles.secBtnText, { color: isMissed ? Colors.red : Colors.textMuted }]}>
                  ✗  {isMissed ? 'Missed ✓' : 'Mark Missed'}
                </Text>
              </TouchableOpacity>
            </View>

            {streak.current > 0 && !isComplete && (
              <TouchableOpacity
                style={[styles.freezeBtn, { opacity: freezeCount > 0 ? 1 : 0.4 }]}
                onPress={_useFreeze}
              >
                <Text style={styles.freezeBtnText}>
                  🧊  Streak Freeze — {freezeCount} available
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
                {isResisted ? '✓  The rein held today' : '✊  The rein held — I resisted'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.breakBtn, {
                borderColor:     isSlipped ? Colors.red : Colors.separator,
                backgroundColor: isSlipped ? Colors.redAlpha15 : Colors.backgroundCard,
              }]}
              onPress={() => Alert.alert(
                'The horse bolted',
                'Be honest with your charioteer.',
                [
                  { text: '😔 Yes — log the slip', style: 'destructive',
                    onPress: () => _doCheckIn('slip', slipCount + 1) },
                  { text: 'Cancel', style: 'cancel' },
                ]
              )}
              disabled={saving}
            >
              <Text style={[styles.breakBtnText, { color: Colors.red }]}>
                {isSlipped ? `😔  The horse bolted (${slipCount}×)` : '😔  Log — the horse bolted'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Status pill */}
        {todayStatus && (
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>
              {isDone     && '✅  The dharma is fulfilled for today'}
              {isResisted && '✊  The rein held — your streak grows'}
              {isSkipped  && '⏭  Skipped — no impact on the streak'}
              {isMissed   && '❌  The battle was missed — begin again tomorrow'}
              {isSlipped  && `😔  The horse bolted ${slipCount}× today`}
            </Text>
          </View>
        )}

        {/* Krishna speaks — punishment */}
        {punishLevel > 0 && punishShloka && (
          <View style={[styles.krishnaCard, { borderColor: accentColor + '30' }]}>
            <Text style={[styles.krishnaLabel, { color: accentColor }]}>
              ☸  KRISHNA SPEAKS
            </Text>
            <Text style={styles.krishnaText}>
              "{KRISHNA_SPEAKS[punishLevel]}"
            </Text>
            <ShlokaDisplay shloka={punishShloka} variant="inline" />
          </View>
        )}

        {/* Badges */}
        {milestones.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: Spacing.xl }]}>
              VICTORIES EARNED
            </Text>
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
          </>
        )}

        {/* 30-day battlefield heatmap */}
        <Text style={[styles.sectionLabel, { marginTop: Spacing.xl }]}>
          30-DAY BATTLEFIELD
        </Text>
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
                  slip ? Colors.red + '77'  :
                  miss ? Colors.red + '30'  :
                  Colors.backgroundCard,
                borderWidth: isT ? 1.5 : 0,
                borderColor: Colors.gold,
              }]} />
            );
          })}
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
  loadText:  { ...Typography.body, color: Colors.textMuted },
  errText:   { ...Typography.body, color: Colors.red, textAlign: 'center' },
  retryBtn:  { backgroundColor: Colors.gold, paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.lg },
  retryText: { ...Typography.headline, color: '#000' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.separator,
  },
  backBtn:     { padding: Spacing.xs },
  backText:    { ...Typography.body, color: Colors.gold },
  headerTitle: { ...Typography.headline, color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  editBtn:     { padding: Spacing.xs },
  editText:    { ...Typography.body, color: Colors.textMuted },

  scroll:  { flex: 1 },
  content: { padding: Spacing.xl, gap: 0 },

  hero: {
    alignItems:     'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius:   Radius.xl,
    borderWidth:     1,
    padding:        Spacing.xxl,
    marginBottom:   Spacing.lg,
    gap:            Spacing.md,
  },
  heroIcon: {
    width: 72, height: 72, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  heroName:    { ...Typography.title2, color: Colors.textPrimary, textAlign: 'center' },
  typePill:    { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full },
  typePillText:{ ...Typography.caption1, fontWeight: '700', letterSpacing: 1 },
  punishPill:  { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full },
  punishPillText:{ ...Typography.caption2, fontWeight: '700', letterSpacing: 1 },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  statCard: {
    flex: 1, backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.lg, padding: Spacing.md,
    alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: Colors.separator,
  },
  statVal:   { fontSize: 22, fontWeight: '700' },
  statLabel: { ...Typography.caption2, color: Colors.textDim, letterSpacing: 1, textAlign: 'center' },

  nextMilestone: {
    backgroundColor: Colors.goldAlpha15,
    borderRadius:    Radius.lg, borderWidth: 1,
    borderColor:     Colors.goldAlpha25,
    padding:         Spacing.md, marginBottom: Spacing.lg, alignItems: 'center',
  },
  nextMilestoneText: { ...Typography.subheadline, color: Colors.textSecondary },

  sectionLabel: {
    ...Typography.caption2, color: Colors.textDim,
    letterSpacing: 2, marginBottom: Spacing.md,
  },

  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  weekDay: { alignItems: 'center', gap: 7, flex: 1 },
  weekLabel: { ...Typography.caption2, color: Colors.textDim },
  weekDot: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },

  buildActions: { gap: Spacing.sm, marginBottom: Spacing.md },
  mainBtn: {
    borderRadius: Radius.lg, paddingVertical: 18, alignItems: 'center',
  },
  mainBtnText: { ...Typography.headline },
  secondRow:   { flexDirection: 'row', gap: Spacing.sm },
  secBtn: {
    flex: 1, borderRadius: Radius.lg, borderWidth: 1,
    paddingVertical: 14, alignItems: 'center',
  },
  secBtnText: { ...Typography.subheadline, fontWeight: '600' },
  freezeBtn: {
    borderRadius: Radius.lg, borderWidth: 1,
    borderColor: Colors.greenAlpha25,
    backgroundColor: Colors.greenAlpha15,
    paddingVertical: 13, alignItems: 'center',
  },
  freezeBtnText: { ...Typography.subheadline, color: Colors.green, fontWeight: '600' },

  breakRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  breakBtn: {
    flex: 1, borderRadius: Radius.lg, borderWidth: 1,
    paddingVertical: 18, alignItems: 'center',
  },
  breakBtnText: { ...Typography.subheadline, fontWeight: '600', textAlign: 'center' },

  statusPill: {
    backgroundColor: Colors.backgroundCard, borderRadius: Radius.md,
    padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.md,
  },
  statusText: { ...Typography.subheadline, color: Colors.textMuted },

  // Krishna speaks
  krishnaCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius:    Radius.lg, borderWidth: 1,
    padding:         Spacing.xl, gap: Spacing.md,
    marginBottom:    Spacing.md,
  },
  krishnaLabel: { ...Typography.caption2, letterSpacing: 2, fontWeight: '700' },
  krishnaText: {
    ...Typography.callout, color: Colors.textSecondary,
    lineHeight: 24, fontStyle: 'italic',
  },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  badge: {
    backgroundColor: Colors.goldAlpha15, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.goldAlpha25,
    padding: Spacing.md, alignItems: 'center', gap: 4, minWidth: 64,
  },
  badgeEmoji: { fontSize: 24 },
  badgeDays:  { ...Typography.caption1, color: Colors.gold, fontWeight: '700' },

  heatGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: Spacing.md },
  heatCell:  { width: '6%', aspectRatio: 1, borderRadius: 3 },
});

export default HabitDetailScreen;