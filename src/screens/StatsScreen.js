// ─── KARMA APP — STATS SCREEN (PHASE 5) ─────────────────────────────
// Monthly heatmap, weekly bars, per-habit stats, milestones overview.
// Pure React Native — no external chart libraries.

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView }   from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Colors }         from '../constants/colors';
import { DateUtils }      from '../utils/dateUtils';
import {
  getAllHabits, getStreak, getSetting,
} from '../database/habitService';
import {
  getFullStats, getKarmaScore,
  MILESTONE_INFO, LEVELS,
} from '../services/gamificationService';
import { getDatabase } from '../database/database';

const { width } = Dimensions.get('window');
const CELL_SIZE = Math.floor((width - 48) / 18); // heatmap cell size

// ── Data Fetching ─────────────────────────────────────────────────────

const fetchStatsData = async () => {
  const db    = await getDatabase();
  const today = new Date();

  // Last 90 days dates
  const dates90 = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates90.push(d.toISOString().split('T')[0]);
  }

  // Last 12 weeks data
  const weeks = [];
  for (let w = 11; w >= 0; w--) {
    const weekDates = [];
    for (let d = 6; d >= 0; d--) {
      const date = new Date(today);
      date.setDate(date.getDate() - (w * 7 + d));
      weekDates.push(date.toISOString().split('T')[0]);
    }
    weeks.push(weekDates);
  }

  // All checkins in last 90 days
  const checkins = await db.getAllAsync(
    `SELECT date, status, habit_id FROM checkins WHERE date >= ?`,
    [dates90[0]]
  ) || [];

  const checkinMap = {};
  checkins.forEach(c => {
    if (!checkinMap[c.date]) checkinMap[c.date] = [];
    checkinMap[c.date].push(c);
  });

  // All habits
  const habits = await db.getAllAsync(
    'SELECT * FROM habits WHERE is_active = 1 ORDER BY sort_order ASC'
  ) || [];

  // All milestones
  const milestones = await db.getAllAsync(
    'SELECT * FROM milestones ORDER BY achieved_at DESC'
  ) || [];

  // Total checkins ever
  const totalDone = await db.getFirstAsync(
    "SELECT COUNT(*) as count FROM checkins WHERE status IN ('done','resisted')"
  );

  // Best streak across all habits
  const allStreaks = await Promise.all(habits.map(h => getStreak(h.id)));
  const bestStreak = allStreaks.reduce((max, s) => s.longest > max ? s.longest : max, 0);

  // Per habit stats
  const habitStats = await Promise.all(habits.map(async (h, i) => {
    const streak = allStreaks[i] || { current: 0, longest: 0 };
    const done   = await db.getFirstAsync(
      "SELECT COUNT(*) as count FROM checkins WHERE habit_id = ? AND status IN ('done','resisted')",
      [h.id]
    );
    const total = await db.getFirstAsync(
      'SELECT COUNT(*) as count FROM checkins WHERE habit_id = ?',
      [h.id]
    );
    const rate = total?.count > 0
      ? Math.round(((done?.count || 0) / total.count) * 100)
      : 0;
    return { ...h, streak, doneCount: done?.count || 0, rate };
  }));

  // Weekly completion rates (last 8 weeks)
  const weeklyRates = weeks.slice(4).map(weekDates => {
    if (habits.length === 0) return 0;
    const possible = habits.length * 7;
    const done = weekDates.reduce((acc, date) => {
      const dayCheckins = checkinMap[date] || [];
      return acc + dayCheckins.filter(
        c => c.status === 'done' || c.status === 'resisted'
      ).length;
    }, 0);
    return possible > 0 ? Math.round((done / possible) * 100) : 0;
  });

  // Heatmap data — last 90 days
  const heatmapData = dates90.map(date => {
    const dayCheckins = checkinMap[date] || [];
    const done  = dayCheckins.filter(c => c.status === 'done' || c.status === 'resisted').length;
    const total = habits.length;
    const rate  = total > 0 ? done / total : 0;
    return { date, rate, done, total };
  });

  // Best day (highest completion rate)
  const bestDay = heatmapData.reduce((best, d) =>
    d.rate > (best?.rate || 0) ? d : best, null
  );

  // Current month stats
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString().split('T')[0];
  const monthDone = await db.getFirstAsync(
    "SELECT COUNT(*) as count FROM checkins WHERE date >= ? AND status IN ('done','resisted')",
    [monthStart]
  );

  return {
    habits,
    habitStats,
    heatmapData,
    weeklyRates,
    milestones,
    totalDone:   totalDone?.count || 0,
    bestStreak,
    monthDone:   monthDone?.count || 0,
    bestDay,
  };
};

// ── Component ─────────────────────────────────────────────────────────

const StatsScreen = ({ navigation }) => {
  const [data,     setData]     = useState(null);
  const [gamStats, setGamStats] = useState(null);
  const [alterEgo, setAlterEgo] = useState('Neel');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [tab,      setTab]      = useState('overview'); // overview | habits | badges

  useFocusEffect(
    useCallback(() => { _loadData(); }, [])
  );

  const _loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsData, gam, ego] = await Promise.all([
        fetchStatsData(),
        getFullStats(),
        getSetting('alter_ego'),
      ]);
      setData(statsData);
      setGamStats(gam);
      setAlterEgo(ego || 'Neel');
    } catch (err) {
      console.error('StatsScreen load:', err);
      setError(err.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  // ── Heatmap ──────────────────────────────────────────────────────

  const _renderHeatmap = () => {
    if (!data?.heatmapData) return null;
    const cells = data.heatmapData;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>90-DAY HEATMAP</Text>
        <View style={styles.heatmapGrid}>
          {cells.map((cell, i) => {
            const opacity =
              cell.rate === 0    ? 0.06 :
              cell.rate <= 0.25  ? 0.25 :
              cell.rate <= 0.5   ? 0.50 :
              cell.rate <= 0.75  ? 0.75 : 1;
            const isToday = DateUtils.isToday(cell.date);
            return (
              <View
                key={cell.date}
                style={[styles.heatCell, {
                  backgroundColor: cell.rate === 0
                    ? Colors.backgroundCard
                    : Colors.blue,
                  opacity: isToday ? 1 : opacity,
                  borderWidth:  isToday ? 1.5 : 0,
                  borderColor:  Colors.gold,
                }]}
              />
            );
          })}
        </View>
        <View style={styles.heatmapLegend}>
          <Text style={styles.legendLabel}>Less</Text>
          {[0.06, 0.25, 0.5, 0.75, 1].map((o, i) => (
            <View key={i} style={[styles.legendCell, {
              backgroundColor: Colors.blue,
              opacity: o,
            }]} />
          ))}
          <Text style={styles.legendLabel}>More</Text>
        </View>
      </View>
    );
  };

  // ── Weekly Bars ───────────────────────────────────────────────────

  const _renderWeeklyBars = () => {
    if (!data?.weeklyRates) return null;
    const rates = data.weeklyRates;
    const maxRate = Math.max(...rates, 1);
    const weekLabels = ['W5','W6','W7','W8','Last','This'];
    const displayRates = rates.slice(-6);

    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>WEEKLY COMPLETION</Text>
        <View style={styles.barChart}>
          {displayRates.map((rate, i) => {
            const barHeight = Math.max(4, (rate / 100) * 100);
            const isLast    = i === displayRates.length - 1;
            return (
              <View key={i} style={styles.barCol}>
                <Text style={styles.barPct}>{rate}%</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, {
                    height:          barHeight,
                    backgroundColor: isLast ? Colors.gold : Colors.blue,
                    opacity:         isLast ? 1 : 0.6 + (i * 0.06),
                  }]} />
                </View>
                <Text style={styles.barLabel}>
                  {weekLabels[i] || `W${i + 1}`}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // ── Overview Cards ────────────────────────────────────────────────

  const _renderOverview = () => {
    if (!data || !gamStats) return null;
    const levelInfo = gamStats.levelInfo;

    return (
      <>
        {/* Level + XP Card */}
        <View style={styles.levelCard}>
          <View style={styles.levelLeft}>
            <Text style={styles.levelBig}>{levelInfo.icon}</Text>
            <View>
              <Text style={[styles.levelName, { color: levelInfo.color }]}>
                Level {levelInfo.level} — {levelInfo.title}
              </Text>
              <Text style={styles.levelXP}>{levelInfo.totalXP} XP earned</Text>
            </View>
          </View>
          <View style={styles.karmaScoreBox}>
            <Text style={styles.karmaScoreLabel}>KARMA</Text>
            <Text style={styles.karmaScoreValue}>{gamStats.karmaScore}</Text>
            <Text style={styles.karmaScoreMax}>/1000</Text>
          </View>
        </View>

        {/* XP Progress bar */}
        {levelInfo.nextLevel && (
          <View style={styles.xpBarSection}>
            <View style={styles.xpBarTop}>
              <Text style={styles.xpBarLeft}>
                {levelInfo.icon} {levelInfo.title}
              </Text>
              <Text style={styles.xpBarRight}>
                {levelInfo.nextLevel.icon} {levelInfo.nextLevel.title} at {levelInfo.nextLevel.minXP} XP
              </Text>
            </View>
            <View style={styles.xpBarTrack}>
              <View style={[styles.xpBarFill, {
                width:           `${Math.round(levelInfo.progress * 100)}%`,
                backgroundColor:  levelInfo.color,
              }]} />
            </View>
            <Text style={styles.xpBarPct}>
              {Math.round(levelInfo.progress * 100)}% to next level
            </Text>
          </View>
        )}
        {!levelInfo.nextLevel && (
          <View style={styles.legendaryBox}>
            <Text style={styles.legendaryText}>
              👑 You've reached the highest level, {alterEgo}. You are Legend.
            </Text>
          </View>
        )}

        {/* Key stats grid */}
        <View style={styles.statsGrid}>
          {[
            { label: 'TOTAL COMPLETIONS', value: String(data.totalDone), icon: '✅' },
            { label: 'BEST STREAK EVER',  value: `${data.bestStreak}d`,  icon: '🔥' },
            { label: 'THIS MONTH',         value: String(data.monthDone), icon: '📅' },
            { label: 'ACTIVE HABITS',      value: String(data.habits.length), icon: '☸' },
            { label: 'FREEZE AVAILABLE',   value: String(gamStats.freezeCount), icon: '🧊' },
            { label: 'BADGES EARNED',      value: String(data.milestones.length), icon: '🏆' },
          ].map((s, i) => (
            <View key={i} style={styles.statGridCard}>
              <Text style={styles.statGridIcon}>{s.icon}</Text>
              <Text style={styles.statGridValue}>{s.value}</Text>
              <Text style={styles.statGridLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {_renderWeeklyBars()}
        {_renderHeatmap()}
      </>
    );
  };

  // ── Per Habit Stats ───────────────────────────────────────────────

  const _renderHabitStats = () => {
    if (!data?.habitStats) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>HABIT BREAKDOWN</Text>
        {data.habitStats.length === 0 && (
          <Text style={styles.emptyText}>No habits yet. Add habits to see stats.</Text>
        )}
        {data.habitStats.map((h) => (
          <TouchableOpacity
            key={h.id}
            style={styles.habitStatCard}
            onPress={() => navigation.navigate('HabitDetail', { habitId: h.id })}
            activeOpacity={0.8}
          >
            <View style={[styles.habitStatIcon, { backgroundColor: (h.color || Colors.blue) + '25' }]}>
              <Text style={{ fontSize: 22 }}>{h.icon}</Text>
            </View>
            <View style={styles.habitStatInfo}>
              <Text style={styles.habitStatName}>{h.name}</Text>
              <View style={styles.habitStatRow}>
                <Text style={styles.habitStatMeta}>
                  {h.type === 'build'
                    ? `🔥 ${h.streak.current}d current · ${h.streak.longest}d best`
                    : `✊ ${h.streak.current}d clean · ${h.streak.longest}d best`
                  }
                </Text>
              </View>
              {/* Completion rate bar */}
              <View style={styles.rateBarTrack}>
                <View style={[styles.rateBarFill, {
                  width:           `${h.rate}%`,
                  backgroundColor:  h.color || Colors.blue,
                }]} />
              </View>
              <Text style={styles.habitStatRate}>
                {h.rate}% completion · {h.doneCount} total done
              </Text>
            </View>
            <Text style={styles.habitStatArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // ── Badges / Milestones ───────────────────────────────────────────

  const _renderBadges = () => {
    if (!data?.milestones) return null;

    const allMilestoneDays = [3,7,14,21,30,48,60,75,90,180,365];
    const earnedDays       = data.milestones.map(m => m.milestone_days);

    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>MILESTONE BADGES</Text>
        <View style={styles.badgesGrid}>
          {allMilestoneDays.map(days => {
            const info    = MILESTONE_INFO[days] || {};
            const earned  = earnedDays.includes(days);
            const earnedM = data.milestones.find(m => m.milestone_days === days);
            return (
              <View key={days} style={[styles.badgeCard, {
                backgroundColor: earned ? Colors.goldAlpha : Colors.backgroundCard,
                borderColor:     earned ? Colors.borderGold : Colors.border,
                opacity:         earned ? 1 : 0.4,
              }]}>
                <Text style={styles.badgeCardIcon}>{info.badge || '🏆'}</Text>
                <Text style={[styles.badgeCardDays, { color: earned ? Colors.gold : Colors.textDim }]}>
                  {days} days
                </Text>
                <Text style={styles.badgeCardTitle} numberOfLines={2}>
                  {info.title || ''}
                </Text>
                {earned && earnedM && (
                  <Text style={styles.badgeCardDate}>
                    ✓ {DateUtils.formatDate(earnedM.achieved_at?.split('T')[0] || '')}
                  </Text>
                )}
                {!earned && (
                  <Text style={styles.badgeCardLocked}>🔒 Locked</Text>
                )}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // ── Loading / Error ───────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <ActivityIndicator size="large" color={Colors.blue} />
        <Text style={styles.loadingText}>Calculating your karma...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={_loadData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>☸ Your Karma Stats</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('History')}
          style={styles.historyBtn}
        >
          <Text style={styles.historyBtnText}>History →</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {[
          { key: 'overview', label: '📊 Overview' },
          { key: 'habits',   label: '✅ Habits' },
          { key: 'badges',   label: '🏆 Badges' },
        ].map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabBtnText, tab === t.key && styles.tabBtnTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'overview' && _renderOverview()}
        {tab === 'habits'   && _renderHabitStats()}
        {tab === 'badges'   && _renderBadges()}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: Colors.background },
  scroll:        { flex: 1 },
  scrollContent: { padding: 16 },
  center: {
    flex: 1, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  loadingText: { color: Colors.textMuted, fontSize: 14 },
  errorText:   { color: Colors.red, textAlign: 'center', padding: 20 },
  retryBtn:    { backgroundColor: Colors.blue, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText:   { color: Colors.white, fontWeight: 'bold' },

  header: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: 20,
    paddingVertical:   16,
    borderBottomWidth:  1,
    borderBottomColor:  Colors.borderBlue,
  },
  headerTitle:    { fontSize: 18, color: Colors.textPrimary, fontWeight: 'bold' },
  historyBtn:     { padding: 4 },
  historyBtnText: { color: Colors.blue, fontSize: 13 },

  tabBar: {
    flexDirection:     'row',
    paddingHorizontal: 16,
    paddingVertical:    10,
    gap:               8,
    borderBottomWidth:  1,
    borderBottomColor:  Colors.border,
  },
  tabBtn: {
    flex:            1,
    paddingVertical:  8,
    borderRadius:    10,
    borderWidth:      1,
    borderColor:     Colors.border,
    alignItems:      'center',
    backgroundColor: Colors.backgroundCard,
  },
  tabBtnActive: {
    backgroundColor: Colors.blueAlpha20,
    borderColor:     Colors.blue,
  },
  tabBtnText:       { fontSize: 11, color: Colors.textMuted },
  tabBtnTextActive: { color: Colors.blue, fontWeight: 'bold' },

  section:      { marginBottom: 20 },
  sectionLabel: {
    fontSize: 10, color: Colors.textDim,
    letterSpacing: 3, marginBottom: 12,
  },

  // Level card
  levelCard: {
    backgroundColor: Colors.backgroundTertiary,
    borderRadius:    16,
    borderWidth:      1,
    borderColor:     Colors.borderBlue,
    padding:         16,
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    marginBottom:    12,
  },
  levelLeft:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  levelBig:        { fontSize: 36 },
  levelName:       { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  levelXP:         { fontSize: 11, color: Colors.textMuted },
  karmaScoreBox:   { alignItems: 'center' },
  karmaScoreLabel: { fontSize: 9, color: Colors.textDim, letterSpacing: 2 },
  karmaScoreValue: { fontSize: 28, color: Colors.blue, fontWeight: 'bold' },
  karmaScoreMax:   { fontSize: 11, color: Colors.textDim },

  xpBarSection: { marginBottom: 16 },
  xpBarTop: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    marginBottom:    6,
  },
  xpBarLeft:  { fontSize: 11, color: Colors.textMuted },
  xpBarRight: { fontSize: 11, color: Colors.textDim },
  xpBarTrack: {
    height:          8,
    backgroundColor: Colors.backgroundCard,
    borderRadius:    4,
    overflow:        'hidden',
    marginBottom:     4,
  },
  xpBarFill:  { height: '100%', borderRadius: 4 },
  xpBarPct:   { fontSize: 10, color: Colors.textDim, textAlign: 'right' },

  legendaryBox: {
    backgroundColor: Colors.goldAlpha,
    borderRadius:    12,
    borderWidth:      1,
    borderColor:     Colors.borderGold,
    padding:         12,
    marginBottom:    16,
  },
  legendaryText: { fontSize: 13, color: Colors.gold, textAlign: 'center', fontWeight: 'bold' },

  statsGrid: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    gap:             8,
    marginBottom:   16,
  },
  statGridCard: {
    width:           '30.5%',
    backgroundColor: Colors.backgroundCard,
    borderRadius:    12,
    borderWidth:      1,
    borderColor:     Colors.border,
    padding:         12,
    alignItems:      'center',
    gap:              4,
  },
  statGridIcon:  { fontSize: 20 },
  statGridValue: { fontSize: 18, color: Colors.textPrimary, fontWeight: 'bold' },
  statGridLabel: { fontSize: 8, color: Colors.textDim, letterSpacing: 1, textAlign: 'center' },

  // Weekly bars
  barChart: {
    flexDirection:  'row',
    alignItems:     'flex-end',
    height:         130,
    gap:             6,
  },
  barCol: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'flex-end',
    gap:             4,
  },
  barPct:   { fontSize: 9, color: Colors.textDim },
  barTrack: {
    width:           '100%',
    height:          100,
    justifyContent:  'flex-end',
    backgroundColor: Colors.backgroundCard,
    borderRadius:    4,
    overflow:        'hidden',
  },
  barFill:  { width: '100%', borderRadius: 4 },
  barLabel: { fontSize: 9, color: Colors.textDim },

  // Heatmap
  heatmapGrid: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    gap:             2,
  },
  heatCell: {
    width:        CELL_SIZE,
    height:       CELL_SIZE,
    borderRadius:  2,
  },
  heatmapLegend: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:            4,
    marginTop:      8,
    justifyContent: 'flex-end',
  },
  legendLabel: { fontSize: 9, color: Colors.textDim },
  legendCell:  { width: 12, height: 12, borderRadius: 2, backgroundColor: Colors.blue },

  // Habit stats
  habitStatCard: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             12,
    backgroundColor: Colors.backgroundCard,
    borderRadius:    14,
    borderWidth:      1,
    borderColor:     Colors.border,
    padding:         14,
    marginBottom:     8,
  },
  habitStatIcon:   { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  habitStatInfo:   { flex: 1, gap: 4 },
  habitStatName:   { fontSize: 14, color: Colors.textPrimary, fontWeight: '600' },
  habitStatRow:    { flexDirection: 'row', alignItems: 'center' },
  habitStatMeta:   { fontSize: 11, color: Colors.textMuted },
  rateBarTrack:    { height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' },
  rateBarFill:     { height: '100%', borderRadius: 2 },
  habitStatRate:   { fontSize: 10, color: Colors.textDim },
  habitStatArrow:  { color: Colors.textDim, fontSize: 20 },

  // Badges grid
  badgesGrid: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    gap:             8,
  },
  badgeCard: {
    width:         '30%',
    borderRadius:   14,
    borderWidth:     1,
    padding:        10,
    alignItems:    'center',
    gap:            4,
  },
  badgeCardIcon:   { fontSize: 26 },
  badgeCardDays:   { fontSize: 13, fontWeight: 'bold' },
  badgeCardTitle:  { fontSize: 9, color: Colors.textDim, textAlign: 'center' },
  badgeCardDate:   { fontSize: 8, color: Colors.green, textAlign: 'center' },
  badgeCardLocked: { fontSize: 9, color: Colors.textDim },

  emptyText: { color: Colors.textDim, fontSize: 13, textAlign: 'center', padding: 20 },
});

export default StatsScreen;