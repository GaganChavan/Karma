// ─── KARMA APP — HOME SCREEN (PHASE F-2) ─────────────────────────────
// Phase F-2 changes:
// - SIP category grouping (Spiritual/Intellectual/Physical/Conscious)
//   replaces time-of-day grouping
// - Each category shows completion count: "🕉️ SPIRITUAL — 2/3"
// - Status icons on habit cards: ✓ done · ✗ missed · ⏭ skipped · ⚠️ auto-skipped · ○ not yet
// - Homescreen badge shows Karma Title (from Score) not XP level
// - Null category → "UNCATEGORISED" fallback (for pre-migration open)
// - Reorder mode: still works (flat list when reordering)

import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, RefreshControl, ActivityIndicator, Alert, Animated,
} from 'react-native';
import { useFocusEffect }  from '@react-navigation/native';
import { SafeAreaView }    from 'react-native-safe-area-context';
import { useTheme, Spacing, Radius, Typography } from '../constants/colors';
import { DateUtils }       from '../utils/dateUtils';
import { getGreetingShloka } from '../constants/shlokas';
import { VEDANTIC_PARA }     from '../constants/appConfig';
import ShlokaDisplay       from '../components/ShlokaDisplay';
import {
  getAllHabits, getTodayCheckins, checkIn,
  getStreak, getSetting, getPunishmentLevel, reorderHabits,
} from '../database/habitService';
import {
  getFullStats, awardPerfectDayIfEligible,
  checkAndAwardStreakFreeze, checkMilestone,
} from '../services/gamificationService';
import { sendDailyWhatsApp, shouldShowDailyPrompt } from '../services/whatsappService';
import { getTodayMood, shouldShowWeeklyReflection } from '../database/moodService';
import { isWFOMode, applyWFOSkipsForToday, getActiveRecovery, offerStreakRecovery, progressRecovery } from '../services/wfoService';

// ── SIP Category Definitions ──────────────────────────────────────────
const CATEGORY_CONFIG = {
  spiritual: {
    label:   'SPIRITUAL',
    icon:    '🕉️',
    color:   '#BF5AF2',
    order:   0,
    chariot: 'Krishna — the guide',
  },
  intellectual: {
    label:   'INTELLECTUAL',
    icon:    '📚',
    color:   '#0A84FF',
    order:   1,
    chariot: 'The Reins — the mind',
  },
  physical: {
    label:   'PHYSICAL',
    icon:    '💪',
    color:   '#30D158',
    order:   2,
    chariot: 'The Horses — the body',
  },
  conscious: {
    label:   'CONSCIOUS',
    icon:    '🔥',
    color:   '#FF453A',
    order:   3,
    chariot: 'The Battlefield — every choice',
  },
  uncategorised: {
    label:   'UNCATEGORISED',
    icon:    '☸',
    color:   '#8E8E93',
    order:   4,
    chariot: '',
  },
};

// ── Status indicator helper ───────────────────────────────────────────
const getStatusIndicator = (checkin, accentColor, colors) => {
  const status = checkin?.status;
  switch (status) {
    case 'done':
    case 'resisted':
      return { icon: '✓',  bg: accentColor,  border: accentColor,  textColor: '#000', fontSize: 13 };
    case 'missed':
    case 'slip':
      return { icon: '✗',  bg: 'transparent', border: colors.red,      textColor: colors.red,   fontSize: 14 };
    case 'skipped':
      return { icon: '⏭', bg: 'transparent', border: colors.textDim, textColor: colors.textDim, fontSize: 11 };
    case 'auto_skipped':
      return { icon: '⚠️', bg: 'transparent', border: '#F5A623',    textColor: '#F5A623',  fontSize: 11 };
    default:
      return { icon: '',   bg: 'transparent', border: colors.separator, textColor: colors.textDim, fontSize: 13 };
  }
};

const HomeScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [habits,         setHabits]         = useState([]);
  const [checkins,       setCheckins]       = useState({});
  const [streaks,        setStreaks]         = useState({});
  const [punishment,     setPunishment]     = useState({});
  const [gamStats,       setGamStats]       = useState(null);
  const [alterEgo,       setAlterEgo]       = useState('Gagan');
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [error,          setError]          = useState(null);
  const [showWA,         setShowWA]         = useState(false);
  const [showMoodPrompt, setShowMoodPrompt] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [wfoMode,        setWfoMode]        = useState(false);
  const [wfoCity,        setWfoCity]        = useState('Bangalore');

  // Reorder mode
  const [reorderMode,      setReorderMode]      = useState(false);
  const [reorderHabitList, setReorderHabitList] = useState([]);
  const [savingOrder,      setSavingOrder]      = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shloka   = getGreetingShloka();

  useFocusEffect(useCallback(() => { _loadData(); }, []));

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
      setReorderHabitList(habitsData);
      setCheckins(checkinMap);
      setStreaks(streakMap);
      setPunishment(punishMap);
      setGamStats(gam);
      setAlterEgo(ego || 'Gagan');
      setWfoMode(wfo);
      setWfoCity(city || 'Bangalore');
      setShowWA(shouldShowDailyPrompt());

      const hour = new Date().getHours();
      if ((hour >= 5 && hour < 10 && !todayMood.morning) ||
          (hour >= 20 && !todayMood.evening)) {
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
      const s   = await getStreak(habitId);
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
    const all   = await getAllHabits();
    const today = await getTodayCheckins();
    const done  = today.filter(c => c.status === 'done' || c.status === 'resisted').length;
    if (done === all.length && all.length > 0) {
      const gam = await getFullStats();
      navigation.navigate('Celebration', { xpEarned: gam.totalXP, perfectDay: false, alterEgo });
    }
  };

  // ── Reorder helpers ───────────────────────────────────────────────
  const _enterReorderMode = () => { setReorderHabitList([...habits]); setReorderMode(true); };
  const _cancelReorder    = () => { setReorderHabitList([...habits]); setReorderMode(false); };

  const _moveHabit = (habitId, direction) => {
    setReorderHabitList(prev => {
      const idx    = prev.findIndex(h => h.id === habitId);
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
      await reorderHabits(reorderHabitList.map(h => h.id));
      setHabits(reorderHabitList);
      setReorderMode(false);
    } catch (err) {
      Alert.alert('Error', `Couldn't save order: ${err.message}`);
    } finally {
      setSavingOrder(false);
    }
  };

  // ── SIP Category grouping ─────────────────────────────────────────
  const _groupByCategory = (habitsList) => {
    const groups = {};
    habitsList.forEach(h => {
      const cat = h.category || 'uncategorised';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(h);
    });
    return Object.entries(groups).sort(([a], [b]) => {
      const oa = CATEGORY_CONFIG[a]?.order ?? 4;
      const ob = CATEGORY_CONFIG[b]?.order ?? 4;
      return oa - ob;
    });
  };

  // ── Habit card ────────────────────────────────────────────────────
  const _card = (habit, listIndex = 0, listLength = 0) => {
    const c           = checkins[habit.id];
    const streak      = streaks[habit.id] || { current: 0, longest: 0 };
    const isDone      = c?.status === 'done' || c?.status === 'resisted';
    const isSkipped   = c?.status === 'skipped';
    const isMissed    = c?.status === 'missed' || c?.status === 'slip';
    const isAutoSkip  = c?.status === 'auto_skipped';
    const isWFOSkip   = habit.is_wfo_skip && wfoMode;
    const punishLevel = habit.type === 'break' ? (punishment[habit.id] || 0) : 0;

    const accentColor = punishLevel > 0
      ? [colors.gold, colors.orange, colors.punishLevel2, colors.red, colors.punishLevel4][punishLevel]
      : (habit.color || colors.gold);

    // Phase F-2: status indicator
    const si = getStatusIndicator(c, accentColor, colors);

    // Card border color reflects status
    const cardBorderColor = isDone     ? accentColor + '40'
                          : isMissed   ? colors.red + '30'
                          : isAutoSkip ? '#F5A62330'
                          : isSkipped  ? colors.separator + '60'
                          : colors.separator;

    const cardBg = reorderMode
      ? colors.backgroundCard
      : isDone
      ? accentColor + '10'
      : colors.backgroundCard;

    return (
      <View key={habit.id} style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.xl, marginBottom: Spacing.sm + 2 }}>
        <TouchableOpacity
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: cardBg,
            borderRadius: Radius.lg,
            borderWidth: 1,
            borderColor: reorderMode ? colors.gold + '40' : cardBorderColor,
            padding: Spacing.lg,
            gap: Spacing.md,
            opacity: isWFOSkip ? 0.5 : 1,
          }}
          onPress={() => {
            if (!reorderMode) navigation.navigate('HabitDetail', { habitId: habit.id });
          }}
          onLongPress={_enterReorderMode}
          delayLongPress={350}
          activeOpacity={0.7}
        >
          {/* Icon */}
          <View style={{
            width: 48, height: 48, borderRadius: Radius.md,
            backgroundColor: accentColor + '20',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 24 }}>{habit.icon}</Text>
          </View>

          {/* Name + streak */}
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={{
              ...Typography.headline,
              color: isMissed || isWFOSkip ? colors.textMuted : colors.textPrimary,
            }}>
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
              {!isWFOSkip && isMissed && '  · missed'}
              {!isWFOSkip && punishLevel > 0 && ` · ⚠️ ${['','Mild','Mod','Harsh','Max'][punishLevel]}`}
            </Text>
          </View>

          {/* Phase F-2: Status indicator — shows logged state */}
          {!reorderMode && (
            <>
              <View style={{
                width: 28, height: 28, borderRadius: 14,
                borderWidth: 2,
                borderColor: si.border,
                backgroundColor: si.bg,
                alignItems: 'center', justifyContent: 'center',
              }}>
                {si.icon ? (
                  <Text style={{ color: si.textColor, fontSize: si.fontSize, fontWeight: '700' }}>
                    {si.icon}
                  </Text>
                ) : null}
              </View>
              <Text style={{ color: colors.textDim, fontSize: 22, fontWeight: '300' }}>›</Text>
            </>
          )}

          {reorderMode && (
            <Text style={{ color: colors.gold, fontSize: 18, opacity: 0.6 }}>☰</Text>
          )}
        </TouchableOpacity>

        {/* Reorder arrows */}
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

  // ── Loading / Error ───────────────────────────────────────────────

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

  // ── Computed ──────────────────────────────────────────────────────
  const displayHabits = reorderMode ? reorderHabitList : habits;
  const doneToday     = habits.filter(h => {
    const c = checkins[h.id];
    return c?.status === 'done' || c?.status === 'resisted';
  }).length;
  const overallStreak = habits.reduce((max, h) => {
    const s = streaks[h.id]?.current || 0;
    return s > max ? s : max;
  }, 0);
  const allDone = habits.length > 0 && doneToday === habits.length;
  const hour    = new Date().getHours();
  const greeting = hour < 5 ? 'Brahma Muhurta' : hour < 12 ? 'Good Morning'
    : hour < 17 ? 'Good Afternoon' : hour < 21 ? 'Good Evening' : 'Good Night';

  // Phase F-2: group by category (not time-of-day)
  const categoryGroups = _groupByCategory(displayHabits);

  // ── Karma Title (Phase F-1) ────────────────────────────────────────
  const kt = gamStats?.karmaTitle;

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
      >
        {/* ── Header ── */}
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

          {/* Phase F-2: Karma Title badge (not XP level) */}
          {kt && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              borderWidth: 1, borderRadius: Radius.full,
              borderColor: kt.color + '50',
              paddingHorizontal: 12, paddingVertical: 7,
              backgroundColor: colors.backgroundCard,
            }}>
              <Text style={{ fontSize: 16 }}>{kt.icon}</Text>
              <Text style={{ ...Typography.caption1, fontWeight: '600', color: kt.color }}>{kt.title}</Text>
            </View>
          )}
        </View>

        {/* ── Reorder banner ── */}
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

        {/* ── WFO Banner ── */}
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

        {/* ── Hero stats ── */}
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

        {/* ── XP + Karma Score bars ── */}
        {gamStats?.karmaTitle && !reorderMode && (
          <View style={{ marginHorizontal: Spacing.xl, marginBottom: Spacing.lg, gap: 10 }}>

            {/* XP level bar */}
            <View style={{ gap: 5 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ ...Typography.caption1, color: colors.gold, fontWeight: '600' }}>
                  ⚡ {gamStats.totalXP} XP · {gamStats.levelInfo?.icon} {gamStats.levelInfo?.title}
                </Text>
                {gamStats.levelInfo?.nextLevel && (
                  <Text style={{ ...Typography.caption2, color: colors.textDim }}>
                    → {gamStats.levelInfo.nextLevel.icon} {gamStats.levelInfo.nextLevel.minXP} XP
                  </Text>
                )}
              </View>
              <View style={{ height: 6, backgroundColor: colors.separator, borderRadius: Radius.full, overflow: 'hidden' }}>
                <View style={{
                  height: '100%',
                  width: `${Math.round((gamStats.levelInfo?.progress || 0) * 100)}%`,
                  backgroundColor: gamStats.levelInfo?.color || colors.gold,
                  borderRadius: Radius.full,
                }} />
              </View>
            </View>

            {/* Karma Score bar */}
            <View style={{ gap: 5 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ ...Typography.caption1, color: kt?.color || colors.blue, fontWeight: '600' }}>
                  ☸ {gamStats.karmaScore} · {kt?.icon} {kt?.title}
                </Text>
                {kt?.nextTitle && (
                  <Text style={{ ...Typography.caption2, color: colors.textDim }}>
                    → {kt.nextTitle.icon} {kt.nextTitle.minScore}
                  </Text>
                )}
              </View>
              <View style={{ height: 6, backgroundColor: colors.separator, borderRadius: Radius.full, overflow: 'hidden' }}>
                <View style={{
                  height: '100%',
                  width: `${Math.round((kt?.progress || 0) * 100)}%`,
                  backgroundColor: kt?.color || colors.blue,
                  borderRadius: Radius.full,
                }} />
              </View>
            </View>

          </View>
        )}

        {/* ── Prompts ── */}
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

        {/* ── Shloka ── */}
        {!reorderMode && (
          <View style={{ marginHorizontal: Spacing.xl, marginBottom: Spacing.xl }}>
            <ShlokaDisplay shloka={shloka} variant="card" />
          </View>
        )}

        {/* ── Phase F-2: SIP Category Groups ── */}
        {categoryGroups.map(([categoryKey, categoryHabits]) => {
          const catConfig  = CATEGORY_CONFIG[categoryKey] || CATEGORY_CONFIG.uncategorised;
          const catDone    = categoryHabits.filter(h => {
            const c = checkins[h.id];
            return c?.status === 'done' || c?.status === 'resisted';
          }).length;
          const catTotal   = categoryHabits.length;
          const catAllDone = catDone === catTotal && catTotal > 0;

          return (
            <View key={categoryKey}>
              {/* Category header */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: Spacing.xl,
                marginBottom: Spacing.sm,
                marginTop: Spacing.lg,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <Text style={{ fontSize: 16 }}>{catConfig.icon}</Text>
                  <Text style={{
                    ...Typography.caption2,
                    color: catAllDone ? catConfig.color : colors.textDim,
                    letterSpacing: 1.5,
                    fontWeight: catAllDone ? '700' : '400',
                  }}>
                    {catConfig.label}
                  </Text>
                  {catConfig.chariot ? (
                    <Text style={{ ...Typography.caption2, color: colors.textDim, fontStyle: 'italic' }}>
                      · {catConfig.chariot}
                    </Text>
                  ) : null}
                </View>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  backgroundColor: catAllDone ? catConfig.color + '25' : colors.backgroundCard,
                  borderRadius: Radius.full,
                  paddingHorizontal: 8, paddingVertical: 3,
                  borderWidth: 1,
                  borderColor: catAllDone ? catConfig.color + '50' : colors.separator,
                }}>
                  <Text style={{
                    ...Typography.caption2,
                    fontWeight: '700',
                    color: catAllDone ? catConfig.color : colors.textMuted,
                  }}>
                    {catDone}/{catTotal}
                  </Text>
                  {catAllDone && <Text style={{ fontSize: 10 }}>✓</Text>}
                </View>
              </View>

              {/* Habits in this category */}
              {categoryHabits.map((habit, idx) =>
                _card(habit, idx, categoryHabits.length)
              )}
            </View>
          );
        })}

        {/* ── Empty state ── */}
        {habits.length === 0 && (
          <View style={{ alignItems: 'center', paddingHorizontal: 40, paddingVertical: 60, gap: 14 }}>
            <Text style={{ fontSize: 64, color: colors.gold, opacity: 0.4 }}>☸</Text>
            <Text style={{ ...Typography.title3, color: colors.textSecondary, textAlign: 'center' }}>
              The chariot is ready, {alterEgo}
            </Text>
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

        {/* Hint text */}
        {habits.length > 0 && !reorderMode && (
          <Text style={{ ...Typography.caption2, color: colors.textDim, textAlign: 'center', marginTop: Spacing.lg }}>
            Tap to view · Hold to reorder
          </Text>
        )}

        {/* ── WhatsApp share ── */}
        {showWA && habits.length > 0 && !reorderMode && (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginHorizontal: Spacing.xl, marginTop: Spacing.lg, backgroundColor: 'rgba(37,211,102,0.10)', borderRadius: Radius.lg, borderWidth: 1, borderColor: 'rgba(37,211,102,0.25)', padding: Spacing.lg }}
            onPress={async () => {
              try {
                await sendDailyWhatsApp({
                  alterEgo, habits, checkins, streaks,
                  totalXP:    gamStats?.totalXP    || 0,
                  todayXP:    0,
                  karmaScore: gamStats?.karmaScore || 0,
                  levelInfo:  gamStats?.levelInfo,
                });
              } catch (err) { Alert.alert('Error', err.message); }
            }}
          >
            <Text style={{ fontSize: 28 }}>📱</Text>
            <View>
              <Text style={{ ...Typography.callout, color: '#25D166', fontWeight: '600' }}>Send Daily Report</Text>
              <Text style={{ ...Typography.caption1, color: colors.textDim, marginTop: 2 }}>Share today's karma via WhatsApp</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Vedantic footer */}
        <View style={{ marginHorizontal: Spacing.xl, marginTop: Spacing.xl, padding: Spacing.xl, borderTopWidth: 1, borderTopColor: colors.separator, gap: Spacing.md }}>
          {VEDANTIC_PARA.split('\n\n').map((para, i) => (
            <Text key={i} style={{ ...Typography.caption1, color: colors.textDim, textAlign: 'center', lineHeight: 18, fontStyle: i === 3 ? 'italic' : 'normal', color: i === 3 ? colors.gold : colors.textDim }}>
              {para}
            </Text>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  reorderBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginHorizontal: Spacing.xl, marginBottom: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md },
  reorderBtn:    { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.md, borderWidth: 1 },
  arrowCol:      { width: 38, marginLeft: 8, gap: 4 },
  arrowBtn:      { width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(255,215,0,0.10)', alignItems: 'center', justifyContent: 'center' },
  arrowText:     { fontSize: 14, fontWeight: '700' },
});

export default HomeScreen;