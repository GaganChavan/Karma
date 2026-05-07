// ─── KARMA APP — HOME SCREEN (PHASE D) ──────────────────────────────
// FIXES:
//   #5: Long press → reorder mode (NOT quick check-in)
//       - Long press habit to enter ↕ reorder mode
//       - Arrow buttons appear (▲▼) to move habits up/down
//       - "Save Order" writes to DB, persists across opens
//       - "Cancel" reverts to original order
//   Hint text updated: "Tap to view · Hold to reorder"

import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, RefreshControl, ActivityIndicator, Alert, Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Spacing, Radius, Typography } from '../constants/colors';
import { DateUtils } from '../utils/dateUtils';
import { getGreetingShloka } from '../constants/shlokas';
import ShlokaDisplay from '../components/ShlokaDisplay';
import {
  getAllHabits, getTodayCheckins, checkIn, getStreak, getSetting,
  getPunishmentLevel, reorderHabits,
} from '../database/habitService';
import {
  getFullStats, awardPerfectDayIfEligible, checkAndAwardStreakFreeze, checkMilestone,
} from '../services/gamificationService';
import { sendDailyWhatsApp, shouldShowDailyPrompt } from '../services/whatsappService';
import { getTodayMood, shouldShowWeeklyReflection } from '../database/moodService';
import {
  isWFOMode, applyWFOSkipsForToday, getActiveRecovery,
  offerStreakRecovery, progressRecovery,
} from '../services/wfoService';

const TIME_GROUPS = {
  morning:   { label: 'MORNING — BRAHMA MUHURTA',  icon: '🌅', order: 0 },
  afternoon: { label: 'AFTERNOON — MIDDAY KARMA',  icon: '☀️', order: 1 },
  evening:   { label: 'EVENING — TWILIGHT SADHANA',icon: '🌙', order: 2 },
  anytime:   { label: 'DAILY DHARMA',              icon: '☸',  order: 3 },
};

const HomeScreen = ({ navigation }) => {
  const { colors } = useTheme();

  const [habits, setHabits]               = useState([]);
  const [checkins, setCheckins]           = useState({});
  const [streaks, setStreaks]             = useState({});
  const [punishment, setPunishment]       = useState({});
  const [gamStats, setGamStats]           = useState(null);
  const [alterEgo, setAlterEgo]           = useState('Neel');
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [error, setError]                 = useState(null);
  const [showWA, setShowWA]               = useState(false);
  const [showMoodPrompt, setShowMoodPrompt] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [wfoMode, setWfoMode]             = useState(false);
  const [wfoCity, setWfoCity]             = useState('Bangalore');

  // ── Reorder state ──────────────────────────────────────────────────
  const [reorderMode, setReorderMode]     = useState(false);
  const [reorderHabitList, setReorderHabitList] = useState([]);
  const [savingOrder, setSavingOrder]     = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shloka = getGreetingShloka();

  useFocusEffect(useCallback(() => {
    _loadData();
  }, []));

  const _loadData = async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);

      const [habitsData, checkinsData, ego, gam, todayMood, wfo, city] = await Promise.all([
        getAllHabits(),
        getTodayCheckins(),
        getSetting('alter_ego'),
        getFullStats(),
        getTodayMood(),
        isWFOMode(),
        getSetting('wfo_city'),
      ]);

      if (wfo) await applyWFOSkipsForToday();

      const checkinMap = {};
      checkinsData.forEach(c => { checkinMap[c.habit_id] = c; });

      const streakMap  = {};
      const punishMap  = {};
      await Promise.all(habitsData.map(async (h) => {
        try {
          streakMap[h.id] = await getStreak(h.id);
          if (h.type === 'break') punishMap[h.id] = await getPunishmentLevel(h.id);
        } catch {
          streakMap[h.id] = { current: 0, longest: 0 };
        }
      }));

      setHabits(habitsData);
      setReorderHabitList(habitsData); // keep a copy for reordering
      setCheckins(checkinMap);
      setStreaks(streakMap);
      setPunishment(punishMap);
      setGamStats(gam);
      setAlterEgo(ego || 'Neel');
      setWfoMode(wfo);
      setWfoCity(city || 'Bangalore');
      setShowWA(shouldShowDailyPrompt());

      const hour = new Date().getHours();
      if ((hour >= 5 && hour < 10 && !todayMood.morning) || (hour >= 20 && !todayMood.evening)) {
        setShowMoodPrompt(true);
      }
      const needsReflection = await shouldShowWeeklyReflection();
      setShowReflection(needsReflection);

      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      try { await checkAndAwardStreakFreeze(); } catch {}
    } catch (err) {
      setError(err.message || 'The chariot could not start');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const _afterCheckIn = async (habitId) => {
    await _loadData();
    try {
      const s = await getStreak(habitId);
      const hit = await checkMilestone(habitId, s.current);
      if (hit) {
        const { getShloka, getMilestoneContext } = require('../constants/shlokas');
        const ms = getShloka(getMilestoneContext(hit.days));
        Alert.alert(
          `${hit.badge} ${hit.title}`,
          `${hit.desc}\n\n+${hit.xp} XP\n\n${ms.sanskrit}\n"${ms.meaning}"\n— ${ms.reference}`,
          [{ text: '🔱 Jai ho' }]
        );
      }
    } catch {}
    try {
      const perfect = await awardPerfectDayIfEligible();
      if (perfect) {
        const gam = await getFullStats();
        navigation.navigate('Celebration', { xpEarned: gam.totalXP, perfectDay: true, alterEgo });
        return;
      }
    } catch {}
    const all = await getAllHabits();
    const today = await getTodayCheckins();
    const done = today.filter(c => c.status === 'done' || c.status === 'resisted').length;
    if (done === all.length && all.length > 0) {
      const gam = await getFullStats();
      navigation.navigate('Celebration', { xpEarned: gam.totalXP, perfectDay: false, alterEgo });
    }
  };

  // ── Reorder helpers ────────────────────────────────────────────────
  const _enterReorderMode = () => {
    setReorderHabitList([...habits]);
    setReorderMode(true);
  };

  const _cancelReorder = () => {
    setReorderHabitList([...habits]);
    setReorderMode(false);
  };

  const _moveHabit = (habitId, direction) => {
    setReorderHabitList(prev => {
      const idx = prev.findIndex(h => h.id === habitId);
      if (idx < 0) return prev;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  };

  const _saveOrder = async () => {
    setSavingOrder(true);
    try {
      const orderedIds = reorderHabitList.map(h => h.id);
      await reorderHabits(orderedIds);
      setHabits(reorderHabitList);
      setReorderMode(false);
    } catch (err) {
      Alert.alert('Error', `Couldn't save order: ${err.message}`);
    } finally {
      setSavingOrder(false);
    }
  };

  // ── Group habits by time_of_day ────────────────────────────────────
  const _groupHabits = (habitsList) => {
    const groups = {};
    habitsList.forEach(h => {
      const tod = h.time_of_day || 'anytime';
      if (!groups[tod]) groups[tod] = [];
      groups[tod].push(h);
    });
    return Object.entries(groups).sort(
      ([a], [b]) => (TIME_GROUPS[a]?.order || 99) - (TIME_GROUPS[b]?.order || 99)
    );
  };

  // ── Computed ───────────────────────────────────────────────────────
  const buildHabits = habits.filter(h => h.type === 'build');
  const breakHabits = habits.filter(h => h.type === 'break');
  const doneToday = habits.filter(h => {
    const c = checkins[h.id];
    return c?.status === 'done' || c?.status === 'resisted';
  }).length;
  const overallStreak = buildHabits.reduce((max, h) => {
    const s = streaks[h.id]?.current || 0;
    return s > max ? s : max;
  }, 0);
  const allDone = habits.length > 0 && doneToday === habits.length;
  const hour = new Date().getHours();
  const greeting = hour < 5 ? 'Brahma Muhurta' : hour < 12 ? 'Good Morning' :
                   hour < 17 ? 'Good Afternoon' : hour < 21 ? 'Good Evening' : 'Good Night';

  // ── Habit card ─────────────────────────────────────────────────────
  // FIX #5: onLongPress now enters reorder mode, NOT quick check-in
  const _card = (habit, showArrows = false, listIndex = 0, listLength = 0) => {
    const c = checkins[habit.id];
    const streak = streaks[habit.id] || { current: 0, longest: 0 };
    const isDone = c?.status === 'done' || c?.status === 'resisted';
    const isSkipped = c?.status === 'skipped';
    const isMissed = c?.status === 'missed';
    const isWFOSkip = habit.is_wfo_skip && wfoMode;
    const punishLevel = habit.type === 'break' ? (punishment[habit.id] || 0) : 0;
    const accentColor = punishLevel > 0
      ? [colors.gold, colors.orange, colors.punishLevel2, colors.red, colors.punishLevel4][punishLevel]
      : (habit.color || colors.gold);

    return (
      <View key={habit.id} style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.xl, marginBottom: Spacing.sm + 2 }}>
        <TouchableOpacity
          style={{
            flex: 1,
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: reorderMode
              ? colors.backgroundCard
              : isDone ? accentColor + '12' : isWFOSkip ? colors.backgroundCard : colors.backgroundCard,
            borderRadius: Radius.lg,
            borderWidth: 1,
            borderColor: reorderMode
              ? colors.gold + '40'
              : isDone ? accentColor + '30' : isWFOSkip ? colors.separator + '60' : colors.separator,
            padding: Spacing.lg,
            gap: Spacing.md,
            opacity: isWFOSkip ? 0.55 : 1,
          }}
          onPress={() => {
            if (!reorderMode) navigation.navigate('HabitDetail', { habitId: habit.id });
          }}
          onLongPress={_enterReorderMode}
          delayLongPress={350}
          activeOpacity={0.7}
        >
          <View style={{
            width: 48, height: 48, borderRadius: Radius.md,
            backgroundColor: accentColor + '20', alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 24 }}>{habit.icon}</Text>
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={{ ...Typography.headline, color: isMissed || isWFOSkip ? colors.textMuted : colors.textPrimary }}>
              {habit.name}
            </Text>
            <Text style={{
              ...Typography.caption1,
              color: isDone ? accentColor : isWFOSkip ? colors.textDim : colors.textDim,
              lineHeight: 16,
            }}>
              {isWFOSkip
                ? `⏭ Auto-skipped in ${wfoCity} mode`
                : habit.type === 'build'
                  ? streak.current > 0 ? `${streak.current} day streak 🪔` : 'Begin today'
                  : streak.current > 0 ? `${streak.current} days clean ✊` : 'Hold the rein'
              }
              {!isWFOSkip && isMissed && ' · missed'}
              {!isWFOSkip && punishLevel > 0 && ` · ⚠️ ${['','Mild','Mod','Harsh','Max'][punishLevel]}`}
            </Text>
          </View>
          {!reorderMode && (
            <>
              <View style={{
                width: 26, height: 26, borderRadius: 13, borderWidth: 2,
                borderColor: isDone ? accentColor : colors.separator,
                backgroundColor: isDone ? accentColor : 'transparent',
                alignItems: 'center', justifyContent: 'center',
              }}>
                {isDone && <Text style={{ color: '#000', fontSize: 13, fontWeight: '700' }}>✓</Text>}
              </View>
              <Text style={{ color: colors.textDim, fontSize: 22, fontWeight: '300' }}>›</Text>
            </>
          )}
          {reorderMode && (
            <Text style={{ color: colors.gold, fontSize: 18, opacity: 0.6 }}>☰</Text>
          )}
        </TouchableOpacity>

        {/* Reorder arrows — only visible in reorder mode */}
        {reorderMode && (
          <View style={styles.arrowCol}>
            <TouchableOpacity
              style={[styles.arrowBtn, { opacity: listIndex === 0 ? 0.2 : 1 }]}
              onPress={() => _moveHabit(habit.id, -1)}
              disabled={listIndex === 0}
            >
              <Text style={[styles.arrowText, { color: colors.gold }]}>▲</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.arrowBtn, { opacity: listIndex === listLength - 1 ? 0.2 : 1 }]}
              onPress={() => _moveHabit(habit.id, 1)}
              disabled={listIndex === listLength - 1}
            >
              <Text style={[styles.arrowText, { color: colors.gold }]}>▼</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <StatusBar barStyle="light-content" />
      <Text style={{ fontSize: 48, color: colors.gold }}>☸</Text>
      <ActivityIndicator size="large" color={colors.gold} />
      <Text style={{ ...Typography.subheadline, color: colors.textMuted }}>The chariot is readying...</Text>
    </View>
  );

  if (error) return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
      <StatusBar barStyle="light-content" />
      <Text style={{ ...Typography.body, color: colors.red, textAlign: 'center' }}>{error}</Text>
      <TouchableOpacity onPress={() => _loadData()} style={{ backgroundColor: colors.gold, paddingHorizontal: 24, paddingVertical: 13, borderRadius: Radius.lg }}>
        <Text style={{ ...Typography.headline, color: '#000' }}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  // Use reorderHabitList when in reorder mode so UI reflects drag order
  const displayHabits = reorderMode ? reorderHabitList : habits;
  const displayBuildHabits = displayHabits.filter(h => h.type === 'build');
  const displayBreakHabits = displayHabits.filter(h => h.type === 'break');
  const buildGroups = _groupHabits(displayBuildHabits);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => _loadData(true)} tintColor={colors.gold} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.xl }}>
          <View style={{ flex: 1 }}>
            <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 1.5, marginBottom: 6 }}>
              {DateUtils.getDayOfWeek().toUpperCase()} · {DateUtils.formatDate(DateUtils.today())}
            </Text>
            <Text style={{ ...Typography.title2, color: colors.textPrimary, marginBottom: 4 }}>
              {greeting}, <Text style={{ color: colors.gold }}>{alterEgo}</Text>
            </Text>
            <Text style={{ ...Typography.footnote, color: colors.textDim, fontStyle: 'italic' }}>
              {wfoMode ? `🏙️ ${wfoCity} mode — non-negotiables active` : 'The battlefield is ready.'}
            </Text>
          </View>
          {gamStats?.levelInfo && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1,
              borderRadius: Radius.full, borderColor: gamStats.levelInfo.color + '50',
              paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.backgroundCard,
            }}>
              <Text style={{ fontSize: 16 }}>{gamStats.levelInfo.icon}</Text>
              <Text style={{ ...Typography.caption1, fontWeight: '600', color: gamStats.levelInfo.color }}>{gamStats.levelInfo.title}</Text>
            </View>
          )}
        </View>

        {/* ── Reorder mode banner ── */}
        {reorderMode && (
          <View style={[styles.reorderBanner, { backgroundColor: colors.goldAlpha15, borderColor: colors.gold + '40' }]}>
            <Text style={{ ...Typography.caption1, color: colors.gold, flex: 1 }}>
              ↕ Reorder mode — use ▲▼ arrows
            </Text>
            <TouchableOpacity onPress={_cancelReorder} style={[styles.reorderBtn, { borderColor: colors.separator }]}>
              <Text style={{ ...Typography.caption1, color: colors.textMuted }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={_saveOrder}
              style={[styles.reorderBtn, { backgroundColor: colors.gold, borderColor: colors.gold }]}
              disabled={savingOrder}
            >
              <Text style={{ ...Typography.caption1, color: '#000', fontWeight: '700' }}>
                {savingOrder ? 'Saving…' : 'Save Order'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* WFO Mode Banner */}
        {wfoMode && !reorderMode && (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginHorizontal: Spacing.xl, marginBottom: Spacing.md, backgroundColor: colors.blueAlpha15, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.blue + '40', padding: Spacing.lg }}
            onPress={() => navigation.navigate('WFOMode')}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 24 }}>🏙️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ ...Typography.subheadline, color: colors.blue, fontWeight: '700' }}>{wfoCity} Mode Active</Text>
              <Text style={{ ...Typography.caption1, color: colors.textDim, marginTop: 2 }}>
                {habits.filter(h => h.is_wfo_skip).length} habits auto-skipped · Tap to manage
              </Text>
            </View>
            <Text style={{ ...Typography.title3, color: colors.blue, fontWeight: '300' }}>›</Text>
          </TouchableOpacity>
        )}

        {/* Hero stats */}
        {!reorderMode && (
          <View style={{ flexDirection: 'row', marginHorizontal: Spacing.xl, backgroundColor: colors.backgroundCard, borderRadius: Radius.xl, padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.lg }}>
            <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2 }}>STREAK</Text>
              <Text style={{ fontSize: 38, fontWeight: '700', color: colors.gold, lineHeight: 46 }}>
                {overallStreak}{overallStreak > 0 && <Text style={{ fontSize: 28 }}> 🪔</Text>}
              </Text>
              <Text style={{ ...Typography.caption1, color: colors.textDim }}>
                {overallStreak > 0 ? 'rein holds' : 'begin today'}
              </Text>
            </View>
            <View style={{ width: 1, height: 60, backgroundColor: colors.separator, marginHorizontal: 8 }} />
            <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2 }}>TODAY</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                <Text style={{ fontSize: 26, fontWeight: '700', color: allDone ? colors.green : colors.gold }}>{doneToday}</Text>
                <Text style={{ ...Typography.callout, color: colors.textDim }}>/{habits.length}</Text>
              </View>
              <Text style={{ ...Typography.caption1, color: colors.textDim, textAlign: 'center' }}>
                {allDone ? '☸ All won' : 'battles won'}
              </Text>
            </View>
            <View style={{ width: 1, height: 60, backgroundColor: colors.separator, marginHorizontal: 8 }} />
            <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2 }}>KARMA</Text>
              <Text style={{ fontSize: 24, fontWeight: '700', color: colors.blue }}>{gamStats?.karmaScore || 0}</Text>
              <Text style={{ ...Typography.caption1, color: colors.textDim }}>/1000</Text>
            </View>
          </View>
        )}

        {/* XP bar */}
        {gamStats?.levelInfo && !reorderMode && (
          <View style={{ marginHorizontal: Spacing.xl, marginBottom: Spacing.lg, gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ ...Typography.caption1, color: colors.gold, fontWeight: '600' }}>⚡ {gamStats.totalXP} XP</Text>
              {gamStats.levelInfo.nextLevel && (
                <Text style={{ ...Typography.caption2, color: colors.textDim }}>→ {gamStats.levelInfo.nextLevel.icon} {gamStats.levelInfo.nextLevel.title}</Text>
              )}
            </View>
            <View style={{ height: 6, backgroundColor: colors.backgroundCard, borderRadius: Radius.full, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${Math.round(gamStats.levelInfo.progress * 100)}%`, backgroundColor: gamStats.levelInfo.color, borderRadius: Radius.full }} />
            </View>
          </View>
        )}

        {/* Prompts — hide during reorder */}
        {showMoodPrompt && !reorderMode && (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginHorizontal: Spacing.xl, marginBottom: Spacing.md, backgroundColor: colors.backgroundCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.separator, padding: Spacing.lg }}
            onPress={() => navigation.navigate('MoodLog', { timeOfDay: hour < 14 ? 'morning' : 'evening' })}
          >
            <Text style={{ fontSize: 28 }}>{hour < 14 ? '🌅' : '🌙'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ ...Typography.subheadline, color: colors.textPrimary, fontWeight: '600' }}>
                {hour < 14 ? 'Morning check-in' : 'Evening check-in'}
              </Text>
              <Text style={{ ...Typography.caption1, color: colors.textDim, marginTop: 2 }}>Log mood & energy</Text>
            </View>
            <Text style={{ ...Typography.title3, color: colors.textDim, fontWeight: '300' }}>›</Text>
          </TouchableOpacity>
        )}

        {showReflection && !reorderMode && (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginHorizontal: Spacing.xl, marginBottom: Spacing.md, backgroundColor: colors.goldAlpha15, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.goldAlpha40, padding: Spacing.lg }}
            onPress={() => navigation.navigate('WeeklyReflection')}
          >
            <Text style={{ fontSize: 28 }}>📖</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ ...Typography.subheadline, color: colors.gold, fontWeight: '600' }}>Weekly Reflection</Text>
              <Text style={{ ...Typography.caption1, color: colors.textDim, marginTop: 2 }}>"Reflect fully. Then act with clarity." — Gita 18.63</Text>
            </View>
            <Text style={{ ...Typography.title3, color: colors.gold, fontWeight: '300' }}>›</Text>
          </TouchableOpacity>
        )}

        {/* Shloka */}
        {!reorderMode && (
          <View style={{ marginHorizontal: Spacing.xl, marginBottom: Spacing.xl }}>
            <ShlokaDisplay shloka={shloka} variant="card" />
          </View>
        )}

        {/* Build habits — grouped by time of day */}
        {buildGroups.map(([timeKey, groupHabits]) => {
          const group = TIME_GROUPS[timeKey] || TIME_GROUPS.anytime;
          return (
            <View key={timeKey}>
              <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2, marginHorizontal: Spacing.xl, marginBottom: Spacing.md, marginTop: Spacing.md }}>
                {group.icon} {group.label}
              </Text>
              {groupHabits.map((habit, idx) => _card(habit, reorderMode, idx, groupHabits.length))}
            </View>
          );
        })}

        {/* Break habits */}
        {displayBreakHabits.length > 0 && (
          <>
            <Text style={{ ...Typography.caption2, color: colors.red + 'CC', letterSpacing: 2, marginHorizontal: Spacing.xl, marginBottom: Spacing.md, marginTop: Spacing.md }}>
              ⚔️ BREAK — HOLD THE REIN
            </Text>
            {displayBreakHabits.map((habit, idx) => _card(habit, reorderMode, idx, displayBreakHabits.length))}
          </>
        )}

        {/* Empty state */}
        {habits.length === 0 && (
          <View style={{ alignItems: 'center', paddingHorizontal: 40, paddingVertical: 60, gap: 14 }}>
            <Text style={{ fontSize: 64, color: colors.gold, opacity: 0.4 }}>☸</Text>
            <Text style={{ ...Typography.title3, color: colors.textSecondary, textAlign: 'center' }}>The chariot is ready, {alterEgo}</Text>
            <Text style={{ ...Typography.body, color: colors.textDim, textAlign: 'center', lineHeight: 26 }}>
              The horses wait. The reins are in your hands.{'\n'}Add your first habit — and the battle begins.
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: colors.gold, paddingHorizontal: 28, paddingVertical: 14, borderRadius: Radius.lg }}
              onPress={() => navigation.navigate('AddHabit')}
            >
              <Text style={{ ...Typography.headline, color: '#000' }}>Begin the Sadhana</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Hint text — FIX #5: updated from "Hold for quick check-in" */}
        {habits.length > 0 && !reorderMode && (
          <Text style={{ ...Typography.caption2, color: colors.textDim, textAlign: 'center', marginTop: Spacing.lg }}>
            Tap to view · Hold to reorder
          </Text>
        )}

        {/* WhatsApp share */}
        {showWA && habits.length > 0 && !reorderMode && (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginHorizontal: Spacing.xl, marginTop: Spacing.lg, backgroundColor: 'rgba(37,211,102,0.10)', borderRadius: Radius.lg, borderWidth: 1, borderColor: 'rgba(37,211,102,0.25)', padding: Spacing.lg }}
            onPress={async () => {
              try {
                await sendDailyWhatsApp({ alterEgo, habits, checkins, streaks, totalXP: gamStats?.totalXP || 0, todayXP: 0, karmaScore: gamStats?.karmaScore || 0, levelInfo: gamStats?.levelInfo });
              } catch (err) {
                Alert.alert('Error', err.message);
              }
            }}
          >
            <Text style={{ fontSize: 28 }}>📱</Text>
            <View>
              <Text style={{ ...Typography.callout, color: '#25D166', fontWeight: '600' }}>Send Daily Report</Text>
              <Text style={{ ...Typography.caption1, color: colors.textDim, marginTop: 2 }}>Share today's karma via WhatsApp</Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={{ height: 120 }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  reorderBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginHorizontal: Spacing.xl, marginBottom: Spacing.md,
    borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md,
  },
  reorderBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: Radius.md, borderWidth: 1,
  },
  arrowCol: {
    width: 38, marginLeft: 8, gap: 4,
  },
  arrowBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: 'rgba(255,215,0,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  arrowText: {
    fontSize: 14, fontWeight: '700',
  },
});

export default HomeScreen;