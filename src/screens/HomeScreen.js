// ─── KARMA APP — HOME SCREEN (GITA PHASE A) ──────────────────────────
// Gita shlokas replace generic quotes.
// Krishna voice throughout.
// WhatsApp share button.
// Chariot metaphor in empty state.

import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, RefreshControl,
  ActivityIndicator, Alert, Animated,
} from 'react-native';
import { useFocusEffect }   from '@react-navigation/native';
import { SafeAreaView }     from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, Typography } from '../constants/colors';
import { DateUtils }        from '../utils/dateUtils';
import { getGreetingShloka } from '../constants/shlokas';
import ShlokaDisplay         from '../components/ShlokaDisplay';
import {
  getAllHabits, getTodayCheckins, checkIn,
  getStreak, getSetting, getPunishmentLevel,
} from '../database/habitService';
import {
  getFullStats, awardPerfectDayIfEligible,
  checkAndAwardStreakFreeze, checkMilestone,
} from '../services/gamificationService';
import {
  sendDailyWhatsApp, shouldShowDailyPrompt,
} from '../services/whatsappService';

const PUNISH_COLORS = [
  Colors.gold, Colors.orange,
  Colors.punishLevel2, Colors.red, Colors.punishLevel4,
];

const HomeScreen = ({ navigation }) => {
  const [habits,     setHabits]     = useState([]);
  const [checkins,   setCheckins]   = useState({});
  const [streaks,    setStreaks]     = useState({});
  const [punishment, setPunishment] = useState({});
  const [gamStats,   setGamStats]   = useState(null);
  const [alterEgo,   setAlterEgo]   = useState('Neel');
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(null);
  const [showWA,     setShowWA]     = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shloka   = getGreetingShloka();

  useFocusEffect(useCallback(() => { _loadData(); }, []));

  const _loadData = async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);

      const [habitsData, checkinsData, ego, gam] = await Promise.all([
        getAllHabits(),
        getTodayCheckins(),
        getSetting('alter_ego'),
        getFullStats(),
      ]);

      const checkinMap = {};
      checkinsData.forEach(c => { checkinMap[c.habit_id] = c; });

      const streakMap = {};
      const punishMap = {};
      await Promise.all(habitsData.map(async (h) => {
        try {
          streakMap[h.id] = await getStreak(h.id);
          if (h.type === 'break') punishMap[h.id] = await getPunishmentLevel(h.id);
        } catch {
          streakMap[h.id] = { current: 0, longest: 0 };
        }
      }));

      setHabits(habitsData);
      setCheckins(checkinMap);
      setStreaks(streakMap);
      setPunishment(punishMap);
      setGamStats(gam);
      setAlterEgo(ego || 'Neel');
      setShowWA(shouldShowDailyPrompt());

      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      try { await checkAndAwardStreakFreeze(); } catch {}

    } catch (err) {
      setError(err.message || 'The chariot could not start. Pull the reins and retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const _quickCheckIn = async (habit) => {
    const c      = checkins[habit.id];
    const isDone = c?.status === 'done' || c?.status === 'resisted';

    if (habit.type === 'build') {
      try {
        await checkIn(habit.id, isDone ? 'missed' : 'done');
        await _afterCheckIn(habit.id);
      } catch (err) {
        Alert.alert('Error', err.message);
      }
    } else {
      Alert.alert(
        habit.name,
        'The horse bolted — or did the rein hold?',
        [
          {
            text: '✊ The rein held',
            onPress: async () => {
              try { await checkIn(habit.id, 'resisted'); await _afterCheckIn(habit.id); }
              catch (err) { Alert.alert('Error', err.message); }
            },
          },
          {
            text: '😔 The horse bolted',
            style: 'destructive',
            onPress: async () => {
              try {
                const slips = c?.slip_count || 0;
                await checkIn(habit.id, 'slip', null, slips + 1);
                await _loadData();
              } catch (err) { Alert.alert('Error', err.message); }
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
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
          `${hit.desc}\n\n+${hit.xp} Karma XP\n\n${ms.sanskrit}\n"${ms.meaning}"\n— ${ms.reference}`,
          [{ text: '🔱 jai ho' }]
        );
      }
    } catch {}

    try {
      const perfect = await awardPerfectDayIfEligible();
      if (perfect) {
        const gam = await getFullStats();
        navigation.navigate('Celebration', {
          xpEarned: gam.totalXP, perfectDay: true, alterEgo,
        });
        return;
      }
    } catch {}

    const all   = await getAllHabits();
    const today = await getTodayCheckins();
    const done  = today.filter(c => c.status === 'done' || c.status === 'resisted').length;
    if (done === all.length && all.length > 0) {
      const gam = await getFullStats();
      navigation.navigate('Celebration', {
        xpEarned: gam.totalXP, perfectDay: false, alterEgo,
      });
    }
  };

  const _shareWhatsApp = async () => {
    try {
      await sendDailyWhatsApp({
        alterEgo,
        habits,
        checkins,
        streaks,
        totalXP:   gamStats?.totalXP || 0,
        todayXP:   10,
        karmaScore: gamStats?.karmaScore || 0,
        levelInfo:  gamStats?.levelInfo,
      });
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  // ── Computed ──────────────────────────────────────────────────────

  const buildHabits   = habits.filter(h => h.type === 'build');
  const breakHabits   = habits.filter(h => h.type === 'break');
  const doneToday     = habits.filter(h => {
    const c = checkins[h.id];
    return c?.status === 'done' || c?.status === 'resisted';
  }).length;
  const overallStreak = buildHabits.reduce((max, h) => {
    const s = streaks[h.id]?.current || 0;
    return s > max ? s : max;
  }, 0);
  const allDone = habits.length > 0 && doneToday === habits.length;

  const hour      = new Date().getHours();
  const greeting  = hour < 5  ? 'Brahma Muhurta' :
                    hour < 12 ? 'Good Morning' :
                    hour < 17 ? 'Good Afternoon' :
                    hour < 21 ? 'Good Evening' : 'Good Night';

  // ── Habit card ────────────────────────────────────────────────────

  const _card = (habit) => {
    const c           = checkins[habit.id];
    const streak      = streaks[habit.id] || { current: 0, longest: 0 };
    const isDone      = c?.status === 'done' || c?.status === 'resisted';
    const isSkipped   = c?.status === 'skipped';
    const isMissed    = c?.status === 'missed';
    const punishLevel = habit.type === 'break' ? (punishment[habit.id] || 0) : 0;
    const accentColor = punishLevel > 0
      ? PUNISH_COLORS[punishLevel]
      : (habit.color || Colors.gold);

    return (
      <TouchableOpacity
        key={habit.id}
        style={[styles.habitCard,
          isDone && { backgroundColor: accentColor + '12', borderColor: accentColor + '30' },
        ]}
        onPress={() => navigation.navigate('HabitDetail', { habitId: habit.id })}
        onLongPress={() => _quickCheckIn(habit)}
        delayLongPress={350}
        activeOpacity={0.7}
      >
        <View style={[styles.habitIconWrap, { backgroundColor: accentColor + '20' }]}>
          <Text style={styles.habitEmoji}>{habit.icon}</Text>
        </View>

        <View style={styles.habitInfo}>
          <Text style={[styles.habitName,
            (isMissed || isSkipped) && { color: Colors.textMuted }
          ]}>
            {habit.name}
          </Text>
          <Text style={[styles.habitMeta, { color: isDone ? accentColor : Colors.textDim }]}>
            {habit.type === 'build'
              ? streak.current > 0
                ? `${streak.current} day streak 🪔`
                : 'The rein is untested — begin'
              : streak.current > 0
                ? `${streak.current} days — the rein held ✊`
                : 'The horse awaits — hold the rein today'
            }
            {isSkipped && '  ·  skipped'}
            {isMissed  && '  ·  missed today'}
          </Text>
        </View>

        <View style={[styles.checkWrap,
          isDone && { backgroundColor: accentColor, borderColor: accentColor },
        ]}>
          {isDone && <Text style={styles.checkIcon}>✓</Text>}
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    );
  };

  // ── Loading / Error ───────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.loadScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Text style={styles.wheel}>☸</Text>
        <ActivityIndicator size="large" color={Colors.gold} />
        <Text style={styles.loadText}>The chariot is readying...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Text style={styles.errIcon}>⚠️</Text>
        <Text style={styles.errText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => _loadData()}>
          <Text style={styles.retryText}>Pull the reins — Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => _loadData(true)}
            tintColor={Colors.gold}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerDate}>
              {DateUtils.getDayOfWeek().toUpperCase()} · {DateUtils.formatDate(DateUtils.today())}
            </Text>
            <Text style={styles.headerGreeting}>
              {greeting},{' '}
              <Text style={{ color: Colors.gold }}>{alterEgo}</Text>
            </Text>
            <Text style={styles.headerSub}>
              The battlefield is ready.
            </Text>
          </View>
          {gamStats?.levelInfo && (
            <View style={[styles.levelPill, { borderColor: gamStats.levelInfo.color + '50' }]}>
              <Text style={styles.levelIcon}>{gamStats.levelInfo.icon}</Text>
              <Text style={[styles.levelText, { color: gamStats.levelInfo.color }]}>
                {gamStats.levelInfo.title}
              </Text>
            </View>
          )}
        </View>

        {/* Hero stats */}
        <View style={styles.heroCard}>
          <View style={styles.heroSection}>
            <Text style={styles.heroLabel}>STREAK</Text>
            <Text style={styles.heroStreak}>
              {overallStreak}
              {overallStreak > 0 && <Text style={{ fontSize: 30 }}> 🪔</Text>}
            </Text>
            <Text style={styles.heroSub}>
              {overallStreak > 0
                ? `${overallStreak} days — the rein holds`
                : 'The rein awaits your grip'
              }
            </Text>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroSection}>
            <Text style={styles.heroLabel}>TODAY</Text>
            <View style={styles.progressRing}>
              <Text style={[styles.progressNum, {
                color: allDone ? Colors.green : Colors.gold,
              }]}>
                {doneToday}
              </Text>
              <Text style={styles.progressDen}>/{habits.length}</Text>
            </View>
            <Text style={[styles.heroSub, { textAlign: 'center' }]}>
              {allDone ? '☸ All battles won' : 'battles won'}
            </Text>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroSection}>
            <Text style={styles.heroLabel}>KARMA</Text>
            <Text style={styles.karmaNum}>{gamStats?.karmaScore || 0}</Text>
            <Text style={styles.heroSub}>/1000</Text>
          </View>
        </View>

        {/* XP bar */}
        {gamStats?.levelInfo && (
          <View style={styles.xpSection}>
            <View style={styles.xpRow}>
              <Text style={styles.xpText}>⚡ {gamStats.totalXP} XP</Text>
              {gamStats.levelInfo.nextLevel && (
                <Text style={styles.xpNext}>
                  → {gamStats.levelInfo.nextLevel.icon} {gamStats.levelInfo.nextLevel.title}
                </Text>
              )}
            </View>
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, {
                width:           `${Math.round(gamStats.levelInfo.progress * 100)}%`,
                backgroundColor:  gamStats.levelInfo.color,
              }]} />
            </View>
          </View>
        )}

        {/* Daily Shloka */}
        <View style={styles.shlokaPad}>
          <ShlokaDisplay shloka={shloka} variant="card" />
        </View>

        {/* Build Habits */}
        {buildHabits.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>BUILD — DHARMA OF THE DAY</Text>
            {buildHabits.map(_card)}
          </>
        )}

        {/* Break Habits */}
        {breakHabits.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: Colors.red + 'CC' }]}>
              BREAK — HOLD THE REIN
            </Text>
            {breakHabits.map(_card)}
          </>
        )}

        {/* Empty state — chariot metaphor */}
        {habits.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyWheel}>☸</Text>
            <Text style={styles.emptyTitle}>
              The chariot is ready, {alterEgo}
            </Text>
            <Text style={styles.emptySub}>
              The horses wait. The reins are in your hands.{'\n'}
              Add your first habit — and the battle begins.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('AddHabit')}
            >
              <Text style={styles.emptyBtnText}>Begin the Sadhana</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Hints */}
        {habits.length > 0 && (
          <Text style={styles.hint}>
            Tap to view · Hold for quick check-in
          </Text>
        )}

        {/* WhatsApp share — appears after 8 PM */}
        {showWA && habits.length > 0 && (
          <TouchableOpacity style={styles.waBtn} onPress={_shareWhatsApp}>
            <Text style={styles.waBtnIcon}>📱</Text>
            <View>
              <Text style={styles.waBtnText}>Send Daily Report</Text>
              <Text style={styles.waBtnSub}>Share today's karma via WhatsApp</Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={{ height: 120 }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 20 },

  loadScreen: {
    flex: 1, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center', gap: 16,
  },
  wheel:    { fontSize: 48, color: Colors.gold },
  loadText: { ...Typography.subheadline, color: Colors.textMuted },
  errIcon:  { fontSize: 44 },
  errText:  { ...Typography.body, color: Colors.red, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: {
    backgroundColor: Colors.gold, paddingHorizontal: 24,
    paddingVertical: 13, borderRadius: Radius.lg,
  },
  retryText: { ...Typography.headline, color: '#000' },

  // Header
  header: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'flex-start',
    paddingHorizontal: Spacing.xl,
    paddingTop:        Spacing.lg,
    paddingBottom:     Spacing.xl,
  },
  headerLeft:    { flex: 1 },
  headerDate:    { ...Typography.caption2, color: Colors.textDim, letterSpacing: 1.5, marginBottom: 6 },
  headerGreeting:{ ...Typography.title2, color: Colors.textPrimary, marginBottom: 4 },
  headerSub:     { ...Typography.footnote, color: Colors.textDim, fontStyle: 'italic' },
  levelPill: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:                6,
    borderWidth:        1,
    borderRadius:      Radius.full,
    paddingHorizontal: 12,
    paddingVertical:    7,
    backgroundColor:   Colors.backgroundCard,
  },
  levelIcon: { fontSize: 16 },
  levelText: { ...Typography.caption1, fontWeight: '600' },

  // Hero card
  heroCard: {
    flexDirection:    'row',
    marginHorizontal: Spacing.xl,
    backgroundColor:  Colors.backgroundCard,
    borderRadius:     Radius.xl,
    padding:          Spacing.xl,
    alignItems:       'center',
    marginBottom:     Spacing.lg,
  },
  heroSection:  { flex: 1, alignItems: 'center', gap: 6 },
  heroDivider:  { width: 1, height: 60, backgroundColor: Colors.separator, marginHorizontal: 8 },
  heroLabel:    { ...Typography.caption2, color: Colors.textDim, letterSpacing: 2 },
  heroStreak:   { fontSize: 40, fontWeight: '700', color: Colors.gold, lineHeight: 48 },
  heroSub:      { ...Typography.caption1, color: Colors.textDim, textAlign: 'center' },
  karmaNum:     { fontSize: 26, fontWeight: '700', color: Colors.blue },
  progressRing: {
    flexDirection: 'row',
    alignItems:    'baseline',
    gap:            2,
  },
  progressNum: { fontSize: 28, fontWeight: '700' },
  progressDen: { ...Typography.callout, color: Colors.textDim },

  // XP bar
  xpSection: {
    marginHorizontal: Spacing.xl,
    marginBottom:     Spacing.lg,
    gap:               6,
  },
  xpRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  xpText:  { ...Typography.caption1, color: Colors.gold, fontWeight: '600' },
  xpNext:  { ...Typography.caption2, color: Colors.textDim },
  xpTrack: {
    height:          6,
    backgroundColor: Colors.backgroundCard,
    borderRadius:    Radius.full,
    overflow:        'hidden',
  },
  xpFill: { height: '100%', borderRadius: Radius.full },

  // Shloka
  shlokaPad: {
    marginHorizontal: Spacing.xl,
    marginBottom:     Spacing.xl,
  },

  // Section
  sectionTitle: {
    ...Typography.caption2,
    color:            Colors.textDim,
    letterSpacing:    2,
    marginHorizontal: Spacing.xl,
    marginBottom:     Spacing.md,
    marginTop:        Spacing.md,
  },

  // Habit card
  habitCard: {
    flexDirection:    'row',
    alignItems:       'center',
    marginHorizontal: Spacing.xl,
    marginBottom:     Spacing.sm + 2,
    backgroundColor:  Colors.backgroundCard,
    borderRadius:     Radius.lg,
    borderWidth:       1,
    borderColor:      Colors.separator,
    padding:          Spacing.lg,
    gap:              Spacing.md,
  },
  habitIconWrap: {
    width: 48, height: 48, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  habitEmoji: { fontSize: 24 },
  habitInfo:  { flex: 1, gap: 5 },
  habitName:  { ...Typography.headline, color: Colors.textPrimary },
  habitMeta:  { ...Typography.caption1, lineHeight: 16 },
  checkWrap: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 2, borderColor: Colors.separator,
    alignItems: 'center', justifyContent: 'center',
  },
  checkIcon: { color: '#000', fontSize: 13, fontWeight: '700' },
  arrow:     { color: Colors.textDim, fontSize: 22, fontWeight: '300' },

  // Empty
  empty: {
    alignItems: 'center',
    paddingHorizontal: 40, paddingVertical: 60, gap: 14,
  },
  emptyWheel:  { fontSize: 64, color: Colors.gold, opacity: 0.4 },
  emptyTitle:  { ...Typography.title3, color: Colors.textSecondary, textAlign: 'center' },
  emptySub: {
    ...Typography.body, color: Colors.textDim,
    textAlign: 'center', lineHeight: 26,
  },
  emptyBtn: {
    backgroundColor:  Colors.gold,
    paddingHorizontal: 28, paddingVertical: 14,
    borderRadius:     Radius.lg, marginTop: 4,
  },
  emptyBtnText: { ...Typography.headline, color: '#000' },

  hint: {
    ...Typography.caption2, color: Colors.textDim,
    textAlign: 'center', marginTop: Spacing.lg,
  },

  // WhatsApp button
  waBtn: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              Spacing.md,
    marginHorizontal: Spacing.xl,
    marginTop:        Spacing.lg,
    backgroundColor:  'rgba(37,211,102,0.10)',
    borderRadius:     Radius.lg,
    borderWidth:       1,
    borderColor:      'rgba(37,211,102,0.25)',
    padding:          Spacing.lg,
  },
  waBtnIcon: { fontSize: 28 },
  waBtnText: { ...Typography.callout, color: '#25D166', fontWeight: '600' },
  waBtnSub:  { ...Typography.caption1, color: Colors.textDim, marginTop: 2 },
});

export default HomeScreen;