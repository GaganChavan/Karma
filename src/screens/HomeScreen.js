// ─── KARMA APP — HOME SCREEN (PHASE 6 — APPLE QUALITY) ──────────────
// Inspired by Apple Fitness + Zerodha's data clarity.
// True black base. Gold accents. Large readable text. No noise.

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
import { getTodaySlogan }   from '../constants/slogans';
import {
  getAllHabits, getTodayCheckins, checkIn,
  getStreak, getSetting, getOverallStats, getPunishmentLevel,
} from '../database/habitService';
import {
  getFullStats, awardPerfectDayIfEligible,
  checkAndAwardStreakFreeze, checkMilestone,
} from '../services/gamificationService';

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

  const slogan = getTodaySlogan();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      _loadData();
    }, [])
  );

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

      // Animate in
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 400, useNativeDriver: true,
      }).start();

      try { await checkAndAwardStreakFreeze(); } catch {}
    } catch (err) {
      setError(err.message || 'Failed to load');
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
      Alert.alert(habit.name, 'Quick check-in', [
        {
          text: '✊ Resisted',
          onPress: async () => {
            try { await checkIn(habit.id, 'resisted'); await _afterCheckIn(habit.id); }
            catch (err) { Alert.alert('Error', err.message); }
          },
        },
        {
          text: '😔 Slipped', style: 'destructive',
          onPress: async () => {
            try {
              const slips = c?.slip_count || 0;
              await checkIn(habit.id, 'slip', null, slips + 1);
              await _loadData();
            } catch (err) { Alert.alert('Error', err.message); }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const _afterCheckIn = async (habitId) => {
    await _loadData();
    try {
      const s   = await getStreak(habitId);
      const hit = await checkMilestone(habitId, s.current);
      if (hit) {
        Alert.alert(`${hit.badge} ${hit.title}`, `${hit.desc}\n\n+${hit.xp} Karma XP`, [{ text: '🔱 Amazing' }]);
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

    // All habits done?
    const all    = await getAllHabits();
    const today  = await getTodayCheckins();
    const done   = today.filter(c => c.status === 'done' || c.status === 'resisted').length;
    if (done === all.length && all.length > 0) {
      const gam = await getFullStats();
      navigation.navigate('Celebration', { xpEarned: gam.totalXP, perfectDay: false, alterEgo });
    }
  };

  // ── Computed ──────────────────────────────────────────────────────

  const buildHabits = habits.filter(h => h.type === 'build');
  const breakHabits = habits.filter(h => h.type === 'break');
  const doneToday   = habits.filter(h => {
    const c = checkins[h.id];
    return c?.status === 'done' || c?.status === 'resisted';
  }).length;
  const overallStreak = buildHabits.reduce((max, h) => {
    const s = streaks[h.id]?.current || 0;
    return s > max ? s : max;
  }, 0);
  const progressPct = habits.length > 0 ? doneToday / habits.length : 0;
  const allDone     = habits.length > 0 && doneToday === habits.length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : hour < 21 ? 'Good Evening' : 'Good Night';
  const greetEmoji = hour < 12 ? '🌅' : hour < 17 ? '☀️' : hour < 21 ? '🌙' : '🌌';

  // ── Habit Card ────────────────────────────────────────────────────

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
        {/* Icon */}
        <View style={[styles.habitIconWrap, { backgroundColor: accentColor + '20' }]}>
          <Text style={styles.habitEmoji}>{habit.icon}</Text>
        </View>

        {/* Info */}
        <View style={styles.habitInfo}>
          <Text style={[styles.habitName,
            (isMissed || isSkipped) && { color: Colors.textMuted }
          ]}>
            {habit.name}
          </Text>
          <Text style={[styles.habitMeta, { color: isDone ? accentColor : Colors.textDim }]}>
            {habit.type === 'build'
              ? streak.current > 0 ? `${streak.current} day streak 🔥` : 'Start your streak'
              : streak.current > 0 ? `${streak.current} days clean ✊` : 'Start clean today'
            }
            {isSkipped && '  ·  Skipped today'}
            {isMissed  && '  ·  Missed today'}
          </Text>
        </View>

        {/* Check mark */}
        <View style={[styles.checkWrap,
          isDone && { backgroundColor: accentColor, borderColor: accentColor },
        ]}>
          {isDone && <Text style={styles.checkIcon}>✓</Text>}
        </View>

        {/* Arrow */}
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    );
  };

  // ── Loading / Error ───────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.loadScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="large" color={Colors.gold} />
        <Text style={styles.loadText}>Loading karma...</Text>
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
          <Text style={styles.retryText}>Try Again</Text>
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
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerDate}>
              {DateUtils.getDayOfWeek().toUpperCase()} · {DateUtils.formatDate(DateUtils.today())}
            </Text>
            <Text style={styles.headerGreeting}>
              {greeting}, <Text style={{ color: Colors.gold }}>{alterEgo}</Text> {greetEmoji}
            </Text>
            <Text style={styles.headerSanskrit}>कर्म ही पूजा है</Text>
          </View>

          {/* Level pill */}
          {gamStats?.levelInfo && (
            <View style={[styles.levelPill, { borderColor: gamStats.levelInfo.color + '50' }]}>
              <Text style={styles.levelPillIcon}>{gamStats.levelInfo.icon}</Text>
              <Text style={[styles.levelPillText, { color: gamStats.levelInfo.color }]}>
                {gamStats.levelInfo.title}
              </Text>
            </View>
          )}
        </View>

        {/* ── Hero Stats Card ── */}
        <View style={styles.heroCard}>
          {/* Streak */}
          <View style={styles.heroLeft}>
            <Text style={styles.heroLabel}>STREAK</Text>
            <Text style={styles.heroStreak}>
              {overallStreak}
              {overallStreak > 0 && <Text style={styles.heroFlame}> 🔥</Text>}
            </Text>
            <Text style={styles.heroSub}>
              {overallStreak > 0 ? `${overallStreak} days unbroken` : 'Start today'}
            </Text>
          </View>

          {/* Divider */}
          <View style={styles.heroDivider} />

          {/* Progress */}
          <View style={styles.heroRight}>
            <Text style={styles.heroLabel}>TODAY</Text>
            {/* Progress ring — clean Apple style */}
            <View style={styles.ringOuter}>
              <View style={[styles.ringInner, {
                borderColor: allDone ? Colors.green : Colors.gold,
              }]} />
              <View style={styles.ringCenter}>
                <Text style={[styles.ringNum, {
                  color: allDone ? Colors.green : Colors.gold,
                }]}>
                  {doneToday}
                </Text>
                <Text style={styles.ringDen}>/{habits.length}</Text>
              </View>
            </View>
            <Text style={[styles.heroSub, { textAlign: 'center' }]}>
              {allDone ? '✓ All done!' : 'habits done'}
            </Text>
          </View>

          {/* Karma score */}
          {gamStats && (
            <>
              <View style={styles.heroDivider} />
              <View style={styles.heroKarma}>
                <Text style={styles.heroLabel}>KARMA</Text>
                <Text style={styles.heroKarmaNum}>{gamStats.karmaScore}</Text>
                <Text style={styles.heroSub}>/1000</Text>
              </View>
            </>
          )}
        </View>

        {/* ── XP Bar ── */}
        {gamStats?.levelInfo && (
          <View style={styles.xpSection}>
            <View style={styles.xpRow}>
              <Text style={styles.xpText}>⚡ {gamStats.totalXP} XP</Text>
              {gamStats.levelInfo.nextLevel && (
                <Text style={styles.xpNext}>
                  Next: {gamStats.levelInfo.nextLevel.icon} {gamStats.levelInfo.nextLevel.title}
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

        {/* ── Slogan ── */}
        <View style={styles.sloganRow}>
          <Text style={styles.sloganWheel}>☸</Text>
          <Text style={styles.sloganText}>"{slogan}"</Text>
        </View>

        {/* ── Build Habits ── */}
        {buildHabits.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>BUILD</Text>
            {buildHabits.map(_card)}
          </>
        )}

        {/* ── Break Habits ── */}
        {breakHabits.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: Colors.red }]}>BREAK</Text>
            {breakHabits.map(_card)}
          </>
        )}

        {/* ── Empty State ── */}
        {habits.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🌌</Text>
            <Text style={styles.emptyTitle}>No habits yet, {alterEgo}</Text>
            <Text style={styles.emptySub}>
              Tap + to begin building your karma.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('AddHabit')}
            >
              <Text style={styles.emptyBtnText}>Add First Habit</Text>
            </TouchableOpacity>
          </View>
        )}

        {habits.length > 0 && (
          <Text style={styles.hint}>Tap to view details · Hold to quick check-in</Text>
        )}

        <View style={{ height: 120 }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: Colors.background },
  scrollContent:{ paddingBottom: 20 },
  loadScreen: {
    flex: 1, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center', gap: 16,
  },
  loadText: { ...Typography.subheadline, color: Colors.textMuted },
  errIcon:  { fontSize: 44 },
  errText:  { ...Typography.body, color: Colors.red, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: {
    backgroundColor: Colors.gold, paddingHorizontal: 28,
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
  headerDate:     { ...Typography.caption2, color: Colors.textDim, letterSpacing: 1.5, marginBottom: 6 },
  headerGreeting: { ...Typography.title2, color: Colors.textPrimary, marginBottom: 5 },
  headerSanskrit: { ...Typography.footnote, color: Colors.gold, opacity: 0.8 },
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
  levelPillIcon: { fontSize: 16 },
  levelPillText: { ...Typography.caption1, fontWeight: '600' },

  // Hero Card
  heroCard: {
    flexDirection:   'row',
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.backgroundCard,
    borderRadius:    Radius.xl,
    padding:         Spacing.xl,
    alignItems:      'center',
    marginBottom:    Spacing.lg,
  },
  heroLeft:   { flex: 1, alignItems: 'center' },
  heroRight:  { flex: 1, alignItems: 'center', gap: 8 },
  heroKarma:  { flex: 0.8, alignItems: 'center' },
  heroDivider:{ width: 1, height: 60, backgroundColor: Colors.separator, marginHorizontal: 8 },
  heroLabel: {
    ...Typography.caption2, color: Colors.textDim,
    letterSpacing: 2, marginBottom: 6,
  },
  heroStreak: {
    fontSize: 48, fontWeight: '700', color: Colors.gold, lineHeight: 54,
  },
  heroFlame:  { fontSize: 36 },
  heroSub:    { ...Typography.caption1, color: Colors.textDim, marginTop: 4 },
  heroKarmaNum:{ fontSize: 28, fontWeight: '700', color: Colors.blue },

  // Progress ring
  ringOuter: {
    width:          60,
    height:         60,
    borderRadius:   30,
    backgroundColor: Colors.backgroundElevated,
    alignItems:     'center',
    justifyContent: 'center',
    position:       'relative',
  },
  ringInner: {
    position:     'absolute',
    width:         60,
    height:        60,
    borderRadius:  30,
    borderWidth:    5,
    borderTopColor:    'transparent',
    borderRightColor:  'transparent',
    transform:    [{ rotate: '-45deg' }],
  },
  ringCenter: {
    flexDirection: 'row',
    alignItems:    'baseline',
    gap:            1,
  },
  ringNum: { fontSize: 17, fontWeight: '700' },
  ringDen: { fontSize: 11, color: Colors.textDim },

  // XP bar
  xpSection: {
    marginHorizontal: Spacing.xl,
    marginBottom:     Spacing.lg,
    gap:               8,
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
  xpFill:  { height: '100%', borderRadius: Radius.full },

  // Slogan
  sloganRow: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    gap:              12,
    marginHorizontal: Spacing.xl,
    marginBottom:    Spacing.xl,
    paddingVertical:  Spacing.lg,
    borderTopWidth:   1,
    borderBottomWidth: 1,
    borderColor:     Colors.separator,
  },
  sloganWheel:{ fontSize: 18, color: Colors.gold, opacity: 0.6, marginTop: 2 },
  sloganText: { ...Typography.callout, color: Colors.textMuted, fontStyle: 'italic', flex: 1, lineHeight: 22 },

  // Section title
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
    flexDirection:   'row',
    alignItems:      'center',
    marginHorizontal: Spacing.xl,
    marginBottom:    Spacing.sm + 2,
    backgroundColor: Colors.backgroundCard,
    borderRadius:    Radius.lg,
    borderWidth:      1,
    borderColor:     Colors.separator,
    padding:         Spacing.lg,
    gap:             Spacing.md,
  },
  habitIconWrap: {
    width:          48,
    height:         48,
    borderRadius:   Radius.md,
    alignItems:     'center',
    justifyContent: 'center',
  },
  habitEmoji:  { fontSize: 24 },
  habitInfo:   { flex: 1, gap: 5 },
  habitName:   { ...Typography.headline, color: Colors.textPrimary },
  habitMeta:   { ...Typography.caption1, lineHeight: 16 },
  checkWrap: {
    width:          26,
    height:         26,
    borderRadius:   13,
    borderWidth:     2,
    borderColor:    Colors.separator,
    alignItems:     'center',
    justifyContent: 'center',
  },
  checkIcon: { color: '#000', fontSize: 13, fontWeight: '700' },
  arrow:     { color: Colors.textDim, fontSize: 22, fontWeight: '300' },

  // Empty
  empty: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical:   60,
    gap: 14,
  },
  emptyIcon:  { fontSize: 64 },
  emptyTitle: { ...Typography.title3, color: Colors.textSecondary, textAlign: 'center' },
  emptySub:   { ...Typography.body, color: Colors.textDim, textAlign: 'center', lineHeight: 24 },
  emptyBtn: {
    backgroundColor:  Colors.gold,
    paddingHorizontal: 28,
    paddingVertical:   14,
    borderRadius:     Radius.lg,
    marginTop:         4,
  },
  emptyBtnText: { ...Typography.headline, color: '#000' },

  hint: {
    ...Typography.caption2,
    color:     Colors.textDim,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});

export default HomeScreen;