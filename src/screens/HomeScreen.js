// ─── KARMA APP — HOME SCREEN ─────────────────────────────────────────
// Main dashboard. Greeting, overall streak, today's habits, slogan.
// Full error handling. Pull-to-refresh. Empty state.

import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, RefreshControl,
  ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { DateUtils }   from '../utils/dateUtils';
import { getTodaySlogan } from '../constants/slogans';
import {
  getAllHabits,
  getTodayCheckins,
  checkIn,
  getStreak,
  getSetting,
  getOverallStats,
  getPunishmentLevel,
} from '../database/habitService';

const { width } = Dimensions.get('window');

const PUNISHMENT_LABELS = ['', 'MILD ⚠️', 'MODERATE 🔶', 'HARSH 🔴', 'MAXIMUM ⛔'];
const PUNISHMENT_COLORS = [
  Colors.blue,
  Colors.punishLevel1,
  Colors.punishLevel2,
  Colors.punishLevel3,
  Colors.punishLevel4,
];

const HomeScreen = ({ navigation }) => {
  const [habits,      setHabits]      = useState([]);
  const [checkins,    setCheckins]    = useState({});
  const [streaks,     setStreaks]     = useState({});
  const [punishment,  setPunishment]  = useState({});
  const [stats,       setStats]       = useState({ totalHabits: 0, todayDone: 0, totalXP: 0 });
  const [alterEgo,    setAlterEgo]    = useState('Neel');
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState(null);
  const slogan = getTodaySlogan();

  // Reload every time screen is focused
  useFocusEffect(
    useCallback(() => {
      _loadData();
    }, [])
  );

  const _loadData = async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);

      const [
        habitsData,
        checkinsData,
        statsData,
        ego,
      ] = await Promise.all([
        getAllHabits(),
        getTodayCheckins(),
        getOverallStats(),
        getSetting('alter_ego'),
      ]);

      // Map checkins by habit_id for quick lookup
      const checkinMap = {};
      checkinsData.forEach(c => { checkinMap[c.habit_id] = c; });

      // Load streaks and punishment levels in parallel
      const streakMap     = {};
      const punishmentMap = {};
      await Promise.all(
        habitsData.map(async (h) => {
          try {
            const s = await getStreak(h.id);
            streakMap[h.id] = s;
            if (h.type === 'break') {
              punishmentMap[h.id] = await getPunishmentLevel(h.id);
            }
          } catch {
            streakMap[h.id]     = { current: 0, longest: 0 };
            punishmentMap[h.id] = 0;
          }
        })
      );

      setHabits(habitsData);
      setCheckins(checkinMap);
      setStreaks(streakMap);
      setPunishment(punishmentMap);
      setStats(statsData);
      setAlterEgo(ego || 'Neel');

    } catch (err) {
      console.error('HomeScreen load error:', err);
      setError(err.message || 'Failed to load your habits');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const _handleCheckIn = async (habit) => {
    const currentCheckin = checkins[habit.id];

    if (habit.type === 'build') {
      // Toggle done/undone
      const newStatus = currentCheckin?.status === 'done' ? 'missed' : 'done';
      try {
        await checkIn(habit.id, newStatus);
        await _loadData();
      } catch (err) {
        Alert.alert('Check-in Failed', err.message);
      }
    } else {
      // Break habit — show options
      Alert.alert(
        habit.name,
        'How did you do today, ' + alterEgo + '?',
        [
          {
            text: '✊ I Resisted',
            onPress: async () => {
              try {
                await checkIn(habit.id, 'resisted');
                await _loadData();
              } catch (err) {
                Alert.alert('Error', err.message);
              }
            },
          },
          {
            text: '😔 I Slipped',
            style: 'destructive',
            onPress: async () => {
              try {
                const currentSlips = currentCheckin?.slip_count || 0;
                await checkIn(habit.id, 'slip', null, currentSlips + 1);
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

  // ── Computed values ──────────────────────────────────────────────

  const buildHabits  = habits.filter(h => h.type === 'build');
  const breakHabits  = habits.filter(h => h.type === 'break');
  const doneToday    = habits.filter(h => {
    const c = checkins[h.id];
    return c?.status === 'done' || c?.status === 'resisted';
  }).length;
  const totalToday   = habits.length;
  const progressPct  = totalToday > 0 ? doneToday / totalToday : 0;

  // Overall streak = longest active build habit streak
  const overallStreak = buildHabits.reduce((max, h) => {
    const s = streaks[h.id]?.current || 0;
    return s > max ? s : max;
  }, 0);

  // ── Render helpers ───────────────────────────────────────────────

  const _renderHabitCard = (habit) => {
    const checkin       = checkins[habit.id];
    const streak        = streaks[habit.id] || { current: 0, longest: 0 };
    const isDone        = checkin?.status === 'done' || checkin?.status === 'resisted';
    const punishLevel   = habit.type === 'break' ? (punishment[habit.id] || 0) : 0;
    const accentColor   = punishLevel > 0
      ? PUNISHMENT_COLORS[punishLevel]
      : habit.color || Colors.blue;

    return (
      <TouchableOpacity
        key={habit.id}
        style={[
          styles.habitCard,
          isDone && { borderColor: accentColor + '66', backgroundColor: accentColor + '10' },
          !isDone && { borderColor: Colors.border },
        ]}
        onPress={() => _handleCheckIn(habit)}
        activeOpacity={0.75}
      >
        {/* Icon */}
        <View style={[styles.habitIcon, { backgroundColor: accentColor + '25' }]}>
          <Text style={styles.habitIconText}>{habit.icon}</Text>
        </View>

        {/* Info */}
        <View style={styles.habitInfo}>
          <Text style={[styles.habitName, { color: isDone ? Colors.textPrimary : Colors.textMuted }]}>
            {habit.name}
          </Text>
          <View style={styles.habitMeta}>
            {habit.type === 'build' ? (
              <Text style={[styles.habitStreak, { color: isDone ? accentColor : Colors.textDim }]}>
                {streak.current > 0 ? `🔥 ${streak.current}d streak` : 'Start your streak'}
              </Text>
            ) : (
              <Text style={[styles.habitStreak, { color: isDone ? Colors.green : Colors.textDim }]}>
                {streak.current > 0 ? `✊ ${streak.current}d clean` : 'Start clean today'}
              </Text>
            )}
            {punishLevel > 0 && (
              <Text style={[styles.punishBadge, { color: accentColor }]}>
                {PUNISHMENT_LABELS[punishLevel]}
              </Text>
            )}
          </View>
        </View>

        {/* Check circle */}
        <View style={[
          styles.checkCircle,
          isDone && { backgroundColor: accentColor, borderColor: accentColor },
        ]}>
          {isDone && <Text style={styles.checkMark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  const _renderProgressRing = () => {
    const radius  = 28;
    const circ    = 2 * Math.PI * radius;
    const filled  = circ * progressPct;
    return (
      <View style={styles.ringContainer}>
        {/* Simple progress ring using border trick */}
        <View style={[styles.ringOuter, {
          borderColor: Colors.blueAlpha20,
        }]}>
          <View style={[styles.ringInner, {
            borderColor: progressPct > 0 ? Colors.blue : Colors.blueAlpha10,
          }]} />
        </View>
        <View style={styles.ringTextContainer}>
          <Text style={styles.ringText}>{doneToday}/{totalToday}</Text>
        </View>
      </View>
    );
  };

  // ── Loading / Error states ────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <ActivityIndicator size="large" color={Colors.blue} />
        <Text style={styles.loadingText}>Loading your karma...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => _loadData()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main render ───────────────────────────────────────────────────

  return (
    <View style={styles.screen}>
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
        <View style={styles.container}> 
          <View>
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
        </View>

        {/* Streak + Progress card */}
        <View style={styles.streakCard}>
          <View>
            <Text style={styles.streakLabel}>OVERALL STREAK</Text>
            <Text style={styles.streakValue}>
              {overallStreak} {overallStreak > 0 ? '🔥' : '💫'}
            </Text>
            <Text style={styles.streakSub}>
              {overallStreak > 0 ? `${overallStreak} days unbroken` : 'Start your streak today'}
            </Text>
          </View>
          <View style={styles.progressSection}>
            <Text style={styles.streakLabel}>TODAY</Text>
            {_renderProgressRing()}
          </View>
        </View>

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

        {/* Empty state */}
        {habits.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🌌</Text>
            <Text style={styles.emptyTitle}>No habits yet, {alterEgo}</Text>
            <Text style={styles.emptySubtitle}>
              Tap the + button below to begin building your karma.
            </Text>
          </View>
        )}

        {/* XP row */}
        {stats.totalXP > 0 && (
          <View style={styles.xpRow}>
            <Text style={styles.xpText}>⚡ {stats.totalXP} Karma XP earned</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: Colors.background,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  centerContainer: {
    flex:            1,
    backgroundColor: Colors.background,
    alignItems:      'center',
    justifyContent:  'center',
    gap:             12,
    padding:         24,
  },
  loadingText: { color: Colors.textMuted, fontSize: 13 },
  errorIcon:   { fontSize: 40 },
  errorText:   { color: Colors.red, textAlign: 'center', fontSize: 13, lineHeight: 20 },
  retryButton: {
    marginTop:       8,
    backgroundColor: Colors.blue,
    paddingHorizontal: 24,
    paddingVertical:   10,
    borderRadius:    12,
  },
  retryText: { color: Colors.white, fontWeight: 'bold' },

  // Header
  header: {
    paddingTop:        56,
    paddingBottom:     20,
    paddingHorizontal: 20,
    borderBottomWidth:  1,
    borderBottomColor:  Colors.borderBlue,
  },
  dateText: {
    fontSize:     10,
    color:        Colors.textDim,
    letterSpacing: 3,
    marginBottom:  4,
  },
  greetingText: {
    fontSize:    22,
    color:       Colors.textPrimary,
    fontWeight:  'bold',
    marginBottom: 4,
  },
  sansText: {
    fontSize:  12,
    color:     Colors.gold,
    opacity:   0.8,
  },

  // Streak Card
  streakCard: {
    margin:           16,
    backgroundColor:  Colors.backgroundTertiary,
    borderRadius:     16,
    borderWidth:       1,
    borderColor:       Colors.borderBlue,
    padding:          16,
    flexDirection:    'row',
    justifyContent:   'space-between',
    alignItems:       'center',
  },
  streakLabel: {
    fontSize:     9,
    color:        Colors.textDim,
    letterSpacing: 3,
    marginBottom:  4,
  },
  streakValue: {
    fontSize:    34,
    fontWeight:  'bold',
    color:       Colors.gold,
  },
  streakSub: {
    fontSize: 10,
    color:    Colors.textDim,
    marginTop: 2,
  },
  progressSection: { alignItems: 'center' },
  ringContainer: {
    width:          64,
    height:         64,
    position:       'relative',
    alignItems:     'center',
    justifyContent: 'center',
    marginTop:       6,
  },
  ringOuter: {
    position:     'absolute',
    width:         64,
    height:        64,
    borderRadius:  32,
    borderWidth:    5,
  },
  ringInner: {
    position:     'absolute',
    width:         64,
    height:        64,
    borderRadius:  32,
    borderWidth:    5,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    transform:    [{ rotate: '-45deg' }],
  },
  ringTextContainer: {
    position:       'absolute',
    alignItems:     'center',
    justifyContent: 'center',
  },
  ringText: {
    fontSize:   13,
    color:      Colors.textPrimary,
    fontWeight: 'bold',
  },

  // Slogan
  sloganCard: {
    marginHorizontal: 16,
    marginBottom:     16,
    backgroundColor:  Colors.backgroundCard,
    borderRadius:     14,
    borderWidth:       1,
    borderColor:       Colors.border,
    padding:          16,
    flexDirection:    'row',
    alignItems:       'flex-start',
    gap:               10,
  },
  sloganIcon: { fontSize: 18, marginTop: 2 },
  sloganText: {
    flex:       1,
    fontSize:   12,
    color:      Colors.textMuted,
    lineHeight: 18,
    fontStyle:  'italic',
  },

  // Section
  sectionLabel: {
    fontSize:         9,
    color:            Colors.textDim,
    letterSpacing:    3,
    marginHorizontal: 20,
    marginBottom:     10,
    marginTop:        4,
  },

  // Habit Card
  habitCard: {
    marginHorizontal: 16,
    marginBottom:      8,
    borderRadius:     14,
    borderWidth:       1,
    padding:          14,
    flexDirection:    'row',
    alignItems:       'center',
    gap:              12,
    backgroundColor:  Colors.backgroundCard,
  },
  habitIcon: {
    width:          40,
    height:         40,
    borderRadius:   11,
    alignItems:     'center',
    justifyContent: 'center',
  },
  habitIconText: { fontSize: 20 },
  habitInfo:     { flex: 1 },
  habitName: {
    fontSize:    13,
    fontWeight:  '600',
    marginBottom: 3,
  },
  habitMeta: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
    flexWrap:      'wrap',
  },
  habitStreak: {
    fontSize: 10,
  },
  punishBadge: {
    fontSize:  9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  checkCircle: {
    width:          28,
    height:         28,
    borderRadius:   14,
    borderWidth:     2,
    borderColor:    Colors.border,
    alignItems:     'center',
    justifyContent: 'center',
  },
  checkMark: { color: Colors.white, fontSize: 13, fontWeight: 'bold' },

  // Empty state
  emptyState: {
    alignItems: 'center',
    padding:    40,
    gap:        12,
  },
  emptyIcon:     { fontSize: 56 },
  emptyTitle:    { fontSize: 18, color: Colors.textSecondary, fontWeight: 'bold' },
  emptySubtitle: { fontSize: 13, color: Colors.textDim, textAlign: 'center', lineHeight: 20 },

  // XP
  xpRow: {
    alignItems:    'center',
    marginTop:      8,
    marginBottom:   4,
  },
  xpText: {
    fontSize:  12,
    color:     Colors.gold,
    opacity:   0.7,
    letterSpacing: 0.5,
  },
});

export default HomeScreen;