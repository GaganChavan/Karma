// ─── KARMA APP — HOME SCREEN (PHASE 4) ───────────────────────────────
// Added: Level display, Karma score, celebration trigger on perfect day
// Added: Streak freeze count display
// Fixed: All imports verified

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, RefreshControl,
  ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect }   from '@react-navigation/native';
import { SafeAreaView }     from 'react-native-safe-area-context';
import { Colors }           from '../constants/colors';
import { DateUtils }        from '../utils/dateUtils';
import { getTodaySlogan }   from '../constants/slogans';
import {
  getAllHabits, getTodayCheckins, checkIn,
  getStreak, getSetting, getOverallStats, getPunishmentLevel,
} from '../database/habitService';
import {
  getFullStats,
  awardPerfectDayIfEligible,
  checkAndAwardStreakFreeze,
  checkMilestone,
} from '../services/gamificationService';

const PUNISHMENT_COLORS = [
  Colors.blue,
  Colors.punishLevel1,
  Colors.punishLevel2,
  Colors.punishLevel3,
  Colors.punishLevel4,
];

const HomeScreen = ({ navigation }) => {
  const [habits,     setHabits]     = useState([]);
  const [checkins,   setCheckins]   = useState({});
  const [streaks,    setStreaks]     = useState({});
  const [punishment, setPunishment] = useState({});
  const [stats,      setStats]      = useState({ totalHabits: 0, todayDone: 0, totalXP: 0 });
  const [gamStats,   setGamStats]   = useState(null);
  const [alterEgo,   setAlterEgo]   = useState('Neel');
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(null);

  const slogan = getTodaySlogan();

  useFocusEffect(
    useCallback(() => { _loadData(); }, [])
  );

  const _loadData = async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);

      const [habitsData, checkinsData, statsData, ego, gamData] = await Promise.all([
        getAllHabits(),
        getTodayCheckins(),
        getOverallStats(),
        getSetting('alter_ego'),
        getFullStats(),
      ]);

      const checkinMap = {};
      checkinsData.forEach(c => { checkinMap[c.habit_id] = c; });

      const streakMap = {};
      const punishMap = {};
      await Promise.all(
        habitsData.map(async (h) => {
          try {
            streakMap[h.id] = await getStreak(h.id);
            if (h.type === 'break') {
              punishMap[h.id] = await getPunishmentLevel(h.id);
            }
          } catch {
            streakMap[h.id] = { current: 0, longest: 0 };
          }
        })
      );

      setHabits(habitsData);
      setCheckins(checkinMap);
      setStreaks(streakMap);
      setPunishment(punishMap);
      setStats(statsData);
      setGamStats(gamData);
      setAlterEgo(ego || 'Neel');

      // Weekly streak freeze check
      try { await checkAndAwardStreakFreeze(); } catch {}

    } catch (err) {
      setError(err.message || 'Failed to load your habits');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const _handleQuickCheckIn = async (habit) => {
    const checkin = checkins[habit.id];
    const isDone  = checkin?.status === 'done' || checkin?.status === 'resisted';

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
        `Quick check-in — how did you do?`,
        [
          {
            text: '✊ Resisted',
            onPress: async () => {
              try {
                await checkIn(habit.id, 'resisted');
                await _afterCheckIn(habit.id);
              } catch (err) {
                Alert.alert('Error', err.message);
              }
            },
          },
          {
            text:  '😔 Slipped',
            style: 'destructive',
            onPress: async () => {
              try {
                const slips = checkin?.slip_count || 0;
                await checkIn(habit.id, 'slip', null, slips + 1);
                await _loadData();
              } catch (err) {
                Alert.alert('Error', err.message);
              }
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const _afterCheckIn = async (habitId) => {
    await _loadData();

    // Check milestone
    try {
      const streak    = await getStreak(habitId);
      const milestone = await checkMilestone(habitId, streak.current);
      if (milestone) {
        Alert.alert(
          `${milestone.badge} ${milestone.title}`,
          `${milestone.desc}\n\n+${milestone.xp} Karma XP earned!`,
          [{ text: '🔱 Let\'s Go' }]
        );
      }
    } catch {}

    // Check perfect day → show celebration
    try {
      const isPerfect = await awardPerfectDayIfEligible();
      if (isPerfect) {
        const gamData = await getFullStats();
        navigation.navigate('Celebration', {
          xpEarned:  gamData.totalXP,
          perfectDay: true,
          alterEgo,
        });
        return;
      }
    } catch {}

    // Check if all done today (not necessarily perfect day)
    const allCheckins = await getTodayCheckins();
    const allHabits   = await getAllHabits();
    const doneCount   = allCheckins.filter(
      c => c.status === 'done' || c.status === 'resisted'
    ).length;

    if (doneCount === allHabits.length && allHabits.length > 0) {
      const gamData = await getFullStats();
      navigation.navigate('Celebration', {
        xpEarned:  gamData.totalXP,
        perfectDay: false,
        alterEgo,
      });
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

  const levelInfo = gamStats?.levelInfo;

  // ── Habit Card ────────────────────────────────────────────────────

  const _renderHabitCard = (habit) => {
    const checkin     = checkins[habit.id];
    const streak      = streaks[habit.id] || { current: 0, longest: 0 };
    const isDone      = checkin?.status === 'done' || checkin?.status === 'resisted';
    const isSkipped   = checkin?.status === 'skipped';
    const isMissed    = checkin?.status === 'missed';
    const punishLevel = habit.type === 'break' ? (punishment[habit.id] || 0) : 0;
    const accentColor = punishLevel > 0
      ? PUNISHMENT_COLORS[punishLevel]
      : (habit.color || Colors.blue);

    return (
      <TouchableOpacity
        key={habit.id}
        style={[styles.habitCard,
          isDone    ? { borderColor: accentColor + '66', backgroundColor: accentColor + '10' }
          : isMissed || isSkipped ? { borderColor: Colors.border, opacity: 0.7 }
          : { borderColor: Colors.border },
        ]}
        onPress={() => navigation.navigate('HabitDetail', { habitId: habit.id })}
        onLongPress={() => _handleQuickCheckIn(habit)}
        delayLongPress={400}
        activeOpacity={0.8}
      >
        <View style={[styles.habitIcon, { backgroundColor: accentColor + '25' }]}>
          <Text style={styles.habitIconText}>{habit.icon}</Text>
        </View>

        <View style={styles.habitInfo}>
          <Text style={[styles.habitName, {
            color:          isDone ? Colors.textPrimary : Colors.textSecondary,
            textDecorationLine: (isMissed || isSkipped) ? 'none' : 'none',
          }]}>
            {habit.name}
          </Text>
          <View style={styles.habitMetaRow}>
            <Text style={[styles.habitStreak, { color: isDone ? accentColor : Colors.textDim }]}>
              {habit.type === 'build'
                ? streak.current > 0 ? `🔥 ${streak.current}d` : 'Start streak'
                : streak.current > 0 ? `✊ ${streak.current}d clean` : 'Start clean'
              }
            </Text>
            {isSkipped && <Text style={styles.statusTag}>⏭ Skipped</Text>}
            {isMissed  && <Text style={[styles.statusTag, { color: Colors.red + 'AA' }]}>✗ Missed</Text>}
            {punishLevel > 0 && (
              <Text style={[styles.statusTag, { color: accentColor }]}>
                ⚠️ {['','Mild','Mod','Harsh','Max'][punishLevel]}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.habitRight}>
          <View style={[styles.checkCircle,
            isDone && { backgroundColor: accentColor, borderColor: accentColor }
          ]}>
            {isDone && <Text style={styles.checkMark}>✓</Text>}
          </View>
          <Text style={styles.arrowText}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Loading / Error ───────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <ActivityIndicator size="large" color={Colors.blue} />
        <Text style={styles.loadingText}>Loading your karma...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => _loadData()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => _loadData(true)}
            tintColor={Colors.blue}
            colors={[Colors.blue]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.dateText}>
              {DateUtils.getDayOfWeek().toUpperCase()} • {DateUtils.formatDate(DateUtils.today())}
            </Text>
            <Text style={styles.greetingText}>
              {DateUtils.getGreeting()},{' '}
              <Text style={{ color: Colors.blue }}>{alterEgo}</Text>{' '}
              {new Date().getHours() < 12 ? '🌅' :
               new Date().getHours() < 17 ? '☀️' :
               new Date().getHours() < 21 ? '🌙' : '🌌'}
            </Text>
            <Text style={styles.sansText}>कर्म ही पूजा है</Text>
          </View>
          {/* Level badge */}
          {levelInfo && (
            <View style={[styles.levelBadge, { borderColor: levelInfo.color + '66' }]}>
              <Text style={styles.levelIcon}>{levelInfo.icon}</Text>
              <Text style={[styles.levelTitle, { color: levelInfo.color }]}>
                {levelInfo.title}
              </Text>
            </View>
          )}
        </View>

        {/* Streak + Progress Card */}
        <View style={styles.streakCard}>
          <View>
            <Text style={styles.streakLabel}>OVERALL STREAK</Text>
            <Text style={styles.streakValue}>
              {overallStreak} {overallStreak > 0 ? '🔥' : '💫'}
            </Text>
            <Text style={styles.streakSub}>
              {overallStreak > 0 ? `${overallStreak} days unbroken` : 'Start today'}
            </Text>
          </View>

          <View style={styles.rightStats}>
            {/* Progress ring */}
            <View style={styles.progressSection}>
              <Text style={styles.streakLabel}>TODAY</Text>
              <View style={styles.progressRing}>
                <Text style={styles.progressText}>{doneToday}/{habits.length}</Text>
              </View>
              <Text style={[styles.streakSub, { textAlign: 'center' }]}>
                {doneToday === habits.length && habits.length > 0 ? '✓ All done!' : 'habits done'}
              </Text>
            </View>

            {/* Karma score */}
            {gamStats && (
              <View style={styles.karmaScoreSection}>
                <Text style={styles.streakLabel}>KARMA</Text>
                <Text style={styles.karmaScoreValue}>{gamStats.karmaScore}</Text>
                <Text style={styles.streakSub}>/1000</Text>
              </View>
            )}
          </View>
        </View>

        {/* XP Progress bar */}
        {levelInfo && (
          <View style={styles.xpBar}>
            <View style={styles.xpBarTop}>
              <Text style={styles.xpBarLabel}>⚡ {levelInfo.totalXP} XP</Text>
              {levelInfo.nextLevel && (
                <Text style={styles.xpBarNext}>
                  Next: {levelInfo.nextLevel.icon} {levelInfo.nextLevel.title} at {levelInfo.nextLevel.minXP} XP
                </Text>
              )}
            </View>
            <View style={styles.xpBarTrack}>
              <View style={[styles.xpBarFill, {
                width:           `${Math.round(levelInfo.progress * 100)}%`,
                backgroundColor: levelInfo.color,
              }]} />
            </View>
          </View>
        )}

        {/* Streak freeze */}
        {gamStats?.freezeCount > 0 && (
          <View style={styles.freezeRow}>
            <Text style={styles.freezeText}>
              🧊 {gamStats.freezeCount} streak freeze{gamStats.freezeCount > 1 ? 's' : ''} available
            </Text>
          </View>
        )}

        {/* Slogan */}
        <View style={styles.sloganCard}>
          <Text style={styles.sloganIcon}>☸</Text>
          <Text style={styles.sloganText}>"{slogan}"</Text>
        </View>

        {/* Build Habits */}
        {buildHabits.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>BUILD ▸ TODAY'S KARMA</Text>
            {buildHabits.map(_renderHabitCard)}
          </>
        )}

        {/* Break Habits */}
        {breakHabits.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: Colors.red + 'CC' }]}>
              BREAK ▸ RESIST TODAY
            </Text>
            {breakHabits.map(_renderHabitCard)}
          </>
        )}

        {/* Empty State */}
        {habits.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🌌</Text>
            <Text style={styles.emptyTitle}>No habits yet, {alterEgo}</Text>
            <Text style={styles.emptySubtitle}>
              Tap the + button below to begin building your karma.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('AddHabit')}
            >
              <Text style={styles.emptyButtonText}>✚ Add First Habit</Text>
            </TouchableOpacity>
          </View>
        )}

        {habits.length > 0 && (
          <Text style={styles.hintText}>
            Tap for details · Long press to quick check-in
          </Text>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: Colors.background },
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  center: {
    flex: 1, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24,
  },
  loadingText:  { color: Colors.textMuted, fontSize: 13 },
  errorIcon:    { fontSize: 40 },
  errorText:    { color: Colors.red, textAlign: 'center', fontSize: 13 },
  retryButton:  { backgroundColor: Colors.blue, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  retryText:    { color: Colors.white, fontWeight: 'bold' },

  header: {
    paddingTop:        16,
    paddingBottom:     16,
    paddingHorizontal: 20,
    borderBottomWidth:  1,
    borderBottomColor:  Colors.borderBlue,
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'flex-start',
  },
  headerLeft:   { flex: 1 },
  dateText:     { fontSize: 10, color: Colors.textDim, letterSpacing: 3, marginBottom: 4 },
  greetingText: { fontSize: 20, color: Colors.textPrimary, fontWeight: 'bold', marginBottom: 4 },
  sansText:     { fontSize: 12, color: Colors.gold, opacity: 0.8 },
  levelBadge: {
    borderRadius:      12,
    borderWidth:        1,
    paddingHorizontal: 10,
    paddingVertical:    6,
    alignItems:        'center',
    backgroundColor:   Colors.backgroundCard,
    gap:               2,
  },
  levelIcon:  { fontSize: 18 },
  levelTitle: { fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },

  streakCard: {
    margin:           16,
    backgroundColor:  Colors.backgroundTertiary,
    borderRadius:     16,
    borderWidth:       1,
    borderColor:      Colors.borderBlue,
    padding:          16,
    flexDirection:    'row',
    justifyContent:   'space-between',
    alignItems:       'center',
  },
  streakLabel:    { fontSize: 9, color: Colors.textDim, letterSpacing: 3, marginBottom: 4 },
  streakValue:    { fontSize: 32, fontWeight: 'bold', color: Colors.gold },
  streakSub:      { fontSize: 10, color: Colors.textDim, marginTop: 2 },
  rightStats:     { flexDirection: 'row', gap: 16, alignItems: 'center' },
  progressSection:{ alignItems: 'center', gap: 4 },
  progressRing: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 4, borderColor: Colors.blue,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.blueAlpha10,
  },
  progressText:       { fontSize: 13, color: Colors.textPrimary, fontWeight: 'bold' },
  karmaScoreSection:  { alignItems: 'center', gap: 2 },
  karmaScoreValue:    { fontSize: 22, fontWeight: 'bold', color: Colors.blue },

  xpBar: {
    marginHorizontal: 16,
    marginBottom:     12,
    gap:               6,
  },
  xpBarTop: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  xpBarLabel: { fontSize: 10, color: Colors.gold, fontWeight: 'bold' },
  xpBarNext:  { fontSize: 9, color: Colors.textDim },
  xpBarTrack: {
    height:          6,
    backgroundColor: Colors.backgroundCard,
    borderRadius:    3,
    overflow:        'hidden',
  },
  xpBarFill: { height: '100%', borderRadius: 3 },

  freezeRow: {
    alignItems:       'center',
    marginHorizontal: 16,
    marginBottom:     10,
    backgroundColor:  Colors.backgroundCard,
    borderRadius:     10,
    borderWidth:       1,
    borderColor:      'rgba(0,212,170,0.2)',
    paddingVertical:   8,
  },
  freezeText: { fontSize: 11, color: Colors.green, opacity: 0.8 },

  sloganCard: {
    marginHorizontal: 16,
    marginBottom:     14,
    backgroundColor:  Colors.backgroundCard,
    borderRadius:     14,
    borderWidth:       1,
    borderColor:      Colors.border,
    padding:          14,
    flexDirection:    'row',
    alignItems:       'flex-start',
    gap:              10,
  },
  sloganIcon: { fontSize: 16, marginTop: 2, opacity: 0.7 },
  sloganText: { flex: 1, fontSize: 12, color: Colors.textMuted, lineHeight: 18, fontStyle: 'italic' },

  sectionLabel: {
    fontSize: 9, color: Colors.textDim, letterSpacing: 3,
    marginHorizontal: 20, marginBottom: 8, marginTop: 4,
  },

  habitCard: {
    marginHorizontal: 16, marginBottom: 8, borderRadius: 14,
    borderWidth: 1, padding: 12, flexDirection: 'row',
    alignItems: 'center', gap: 12, backgroundColor: Colors.backgroundCard,
  },
  habitIcon:    { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  habitIconText:{ fontSize: 20 },
  habitInfo:    { flex: 1 },
  habitName:    { fontSize: 13, fontWeight: '600', marginBottom: 3 },
  habitMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  habitStreak:  { fontSize: 10 },
  statusTag:    { fontSize: 9, color: Colors.textDim },
  habitRight:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkCircle: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkMark: { color: Colors.white, fontSize: 13, fontWeight: 'bold' },
  arrowText: { color: Colors.textDim, fontSize: 18 },

  emptyState:      { alignItems: 'center', padding: 40, gap: 12 },
  emptyIcon:       { fontSize: 56 },
  emptyTitle:      { fontSize: 18, color: Colors.textSecondary, fontWeight: 'bold' },
  emptySubtitle:   { fontSize: 13, color: Colors.textDim, textAlign: 'center', lineHeight: 20 },
  emptyButton:     { backgroundColor: Colors.blue, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14, marginTop: 4 },
  emptyButtonText: { color: Colors.white, fontWeight: 'bold', fontSize: 14 },
  hintText:        { fontSize: 10, color: Colors.textDim, textAlign: 'center', marginTop: 8, letterSpacing: 0.3 },
});

export default HomeScreen;