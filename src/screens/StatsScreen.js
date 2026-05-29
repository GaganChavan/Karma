// ─── KARMA APP — STATS SCREEN (PHASE F-3) ────────────────────────────
// Phase F-3 changes:
// 1. Habit completion rate: denominator = expected days (not checkins.length)
//    Skipped days excluded from denominator too
// 2. Overview: Karma Title shown as primary (Score-based), XP Level secondary
// 3. Badges tab split:
//    - HABIT MILESTONES: habit picker → see that habit's 11 milestone slots
//    - JOURNEY BADGES: overall achievement badges (from journey_milestones table)
// 4. Day labels fixed: ['M','','W','','F','','S'] → ['M','T','W','T','F','S','S']
// 5. Imports updated: JOURNEY_BADGES, getEarnedJourneyBadges, getKarmaTitle added

import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView }    from 'react-native-safe-area-context';
import { useFocusEffect }  from '@react-navigation/native';
import { useTheme, Typography, Spacing, Radius } from '../constants/colors';
import { DateUtils }       from '../utils/dateUtils';
import { getAllHabits, getStreak, getSetting } from '../database/habitService';
import {
  getFullStats, MILESTONE_INFO, JOURNEY_BADGES,
  getEarnedJourneyBadges, getKarmaTitle,
} from '../services/gamificationService';
import { getDatabase }     from '../database/database';
import { generateInsights } from '../services/insightsService';
import { APP_BIRTH }        from '../constants/appConfig';

const { width } = Dimensions.get('window');

const CELL = 11;
const GAP  = 2;
const MILESTONE_DAYS = [3, 7, 14, 21, 30, 48, 60, 75, 90, 180, 365];

const CATEGORY_ORDER = [
  { key: 'spiritual',    label: 'SPIRITUAL',     icon: '🕉️', color: '#BF5AF2' },
  { key: 'intellectual', label: 'INTELLECTUAL',  icon: '📚', color: '#0A84FF' },
  { key: 'physical',     label: 'PHYSICAL',      icon: '💪', color: '#30D158' },
  { key: 'conscious',    label: 'CONSCIOUS',     icon: '🔥', color: '#FF453A' },
  { key: 'uncategorised',label: 'UNCATEGORISED', icon: '☸',  color: '#8E8E93' },
];

// ── Overview Heatmap ──────────────────────────────────────────────────
const OverviewHeatmap = ({ heatmapData, appStartDate, colors }) => {
  if (!heatmapData || heatmapData.length === 0) return null;

  const today = DateUtils.today();
  const [selectedMonth, setSelectedMonth] = useState(null);

  const availableMonths = useMemo(() => {
    const months = [];
    const start = new Date(appStartDate + 'T00:00:00');
    const end   = new Date(today + 'T00:00:00');
    const d     = new Date(start.getFullYear(), start.getMonth(), 1);
    while (d <= end) {
      months.push({
        key:   `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
        label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
      });
      d.setMonth(d.getMonth() + 1);
    }
    return months;
  }, [appStartDate, today]);

  const filteredData  = useMemo(() =>
    selectedMonth ? heatmapData.filter(d => d.date.startsWith(selectedMonth)) : heatmapData,
    [heatmapData, selectedMonth]
  );

  const displayData  = filteredData.length > 0 ? filteredData : heatmapData;
  const firstDow     = (new Date(displayData[0].date).getDay() + 6) % 7;
  const padded       = Array(firstDow).fill(null).concat(displayData);
  const weeks        = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  const monthLabels = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const first = week.find(d => d !== null);
    if (!first) return;
    const m = new Date(first.date).getMonth();
    if (m !== lastMonth) {
      monthLabels.push({ col: wi, label: new Date(first.date).toLocaleString('default', { month: 'short' }) });
      lastMonth = m;
    }
  });

  const tracked     = displayData;
  const perfect     = tracked.filter(d => d.level === 'all');
  const partial     = tracked.filter(d => d.level === 'partial');
  const missed      = tracked.filter(d => d.level === 'missed');
  const consistency = tracked.length > 0
    ? Math.round(((perfect.length + partial.length) / tracked.length) * 100)
    : 0;

  const getColor = (cell) => {
    if (!cell || cell.date < appStartDate) return 'transparent';
    if (cell.rate === 0)   return colors.backgroundCard;
    if (cell.rate <= 0.33) return colors.gold + '33';
    if (cell.rate <= 0.66) return colors.gold + '77';
    if (cell.rate < 1)     return colors.gold + 'BB';
    return colors.gold;
  };

  return (
    <View style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.separator, padding: Spacing.lg, marginBottom: Spacing.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ ...Typography.subheadline, color: colors.textPrimary, fontWeight: '700' }}>90-Day Journey</Text>
        <View style={{ backgroundColor: colors.gold + '20', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 }}>
          <Text style={{ fontSize: 11, color: colors.gold, fontWeight: '700' }}>{consistency}% consistent</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.separator }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.gold }}>{perfect.length + partial.length}</Text>
          <Text style={{ fontSize: 10, color: colors.textDim }}>days done</Text>
        </View>
        <View style={{ width: 1, backgroundColor: colors.separator }} />
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.red }}>{missed.length}</Text>
          <Text style={{ fontSize: 10, color: colors.textDim }}>days missed</Text>
        </View>
        <View style={{ width: 1, backgroundColor: colors.separator }} />
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary }}>{tracked.length}</Text>
          <Text style={{ fontSize: 10, color: colors.textDim }}>days tracked</Text>
        </View>
      </View>

      {availableMonths.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity
              style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: !selectedMonth ? colors.gold : colors.separator, backgroundColor: !selectedMonth ? colors.goldAlpha15 : 'transparent' }}
              onPress={() => setSelectedMonth(null)}
            >
              <Text style={{ fontSize: 11, color: !selectedMonth ? colors.gold : colors.textDim, fontWeight: !selectedMonth ? '700' : '400' }}>All</Text>
            </TouchableOpacity>
            {availableMonths.map(m => (
              <TouchableOpacity
                key={m.key}
                style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: selectedMonth === m.key ? colors.gold : colors.separator, backgroundColor: selectedMonth === m.key ? colors.goldAlpha15 : 'transparent' }}
                onPress={() => setSelectedMonth(selectedMonth === m.key ? null : m.key)}
              >
                <Text style={{ fontSize: 11, color: selectedMonth === m.key ? colors.gold : colors.textDim, fontWeight: selectedMonth === m.key ? '700' : '400' }}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={{ height: 14, position: 'relative', marginLeft: 16, width: weeks.length * (CELL + GAP), marginBottom: 2 }}>
            {monthLabels.map((ml, i) => (
              <Text key={i} style={{ position: 'absolute', left: ml.col * (CELL + GAP), fontSize: 9, color: colors.textDim }}>{ml.label}</Text>
            ))}
          </View>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: 12, marginRight: 4 }}>
              {/* FIX: was ['M','','W','','F','','S'] */}
              {['M','T','W','T','F','S','S'].map((l, i) => (
                <Text key={i} style={{ fontSize: 8, color: colors.textDim, height: CELL + GAP, lineHeight: CELL + GAP, textAlign: 'right' }}>{l}</Text>
              ))}
            </View>
            <View style={{ flexDirection: 'row' }}>
              {weeks.map((week, wi) => (
                <View key={wi} style={{ flexDirection: 'column', marginRight: GAP }}>
                  {week.map((cell, di) => {
                    if (!cell) return <View key={di} style={{ width: CELL, height: CELL, marginBottom: GAP }} />;
                    const isToday = cell.date === today;
                    return (
                      <View key={di} style={{ width: CELL, height: CELL, borderRadius: 2, marginBottom: GAP, backgroundColor: getColor(cell), borderWidth: isToday ? 1.5 : 0, borderColor: colors.gold }} />
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 10 }}>
        <Text style={{ fontSize: 9, color: colors.textDim }}>Legend:</Text>
        {[
          { color: colors.gold,              label: 'All done' },
          { color: colors.gold + 'BB',       label: 'Most done' },
          { color: colors.gold + '55',       label: 'Some done' },
          { color: colors.backgroundCard,    label: 'None', border: true },
        ].map((l, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: l.color, borderWidth: l.border ? 1 : 0, borderColor: colors.separator }} />
            <Text style={{ fontSize: 9, color: colors.textDim }}>{l.label}</Text>
          </View>
        ))}
        <Text style={{ fontSize: 9, color: colors.gold }}>bordered = today</Text>
      </View>

      <Text style={{ fontSize: 9, color: colors.textDim, textAlign: 'right', marginTop: 6 }}>
        Tracking since {new Date(appStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
      </Text>
    </View>
  );
};

// ── Main Screen ────────────────────────────────────────────────────────
const StatsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [data,          setData]          = useState(null);
  const [gamStats,      setGamStats]      = useState(null);
  const [insights,      setInsights]      = useState([]);
  const [alterEgo,      setAlterEgo]      = useState('Gagan');
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [tab,           setTab]           = useState('overview');
  const [earnedJourney, setEarnedJourney] = useState([]);
  // Badges tab: which habit is selected for milestone view
  const [selectedHabitId, setSelectedHabitId] = useState(null);

  useFocusEffect(useCallback(() => { _loadData(); }, []));

  const _loadData = async () => {
    try {
      setLoading(true);
      const db    = await getDatabase();
      const today = new Date();

      const todayStr = DateUtils.today();
      const dates90  = [];
      for (let i = 89; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates90.push(DateUtils.toDateString(d));
      }

      const habits   = await getAllHabits();
      const checkins = await db.getAllAsync(
        `SELECT date, status, habit_id FROM checkins WHERE date >= ?`,
        [dates90[0]]
      ) || [];

      const checkinMap = {};
      checkins.forEach(c => {
        if (!checkinMap[c.date]) checkinMap[c.date] = [];
        checkinMap[c.date].push(c);
      });

      const milestones    = await db.getAllAsync('SELECT * FROM milestones ORDER BY achieved_at DESC') || [];
      const totalDone     = await db.getFirstAsync("SELECT COUNT(*) as count FROM checkins WHERE status IN ('done','resisted')");
      const monthStart    = DateUtils.toDateString(new Date(today.getFullYear(), today.getMonth(), 1));
      const monthDone     = await db.getFirstAsync("SELECT COUNT(*) as count FROM checkins WHERE date >= ? AND status IN ('done','resisted')", [monthStart]);
      const allStreaks     = await Promise.all(habits.map(h => getStreak(h.id)));
      const bestStreak    = allStreaks.reduce((max, s) => s.longest > max ? s.longest : max, 0);

      // FIX: habit completion rate uses expected days as denominator
      const habitStats = await Promise.all(habits.map(async (h, i) => {
        const streak = allStreaks[i] || { current: 0, longest: 0 };

        const done = await db.getFirstAsync(
          "SELECT COUNT(*) as count FROM checkins WHERE habit_id = ? AND status IN ('done','resisted')",
          [h.id]
        );
        const skipped = await db.getFirstAsync(
          "SELECT COUNT(*) as count FROM checkins WHERE habit_id = ? AND status IN ('skipped','auto_skipped')",
          [h.id]
        );

        const habitBirth     = (h.created_at || APP_BIRTH).split('T')[0];
        const effectiveStart = habitBirth > APP_BIRTH ? habitBirth : APP_BIRTH;
        const startD         = new Date(effectiveStart + 'T00:00:00');
        const daysSince      = Math.floor((today - startD) / 86400000) + 1;
        const possibleDays   = Math.max(1, daysSince - (skipped?.count || 0));
        const rate           = Math.min(100, Math.round(((done?.count || 0) / possibleDays) * 100));

        // Per-habit milestones (for badges tab)
        const habitMilestones = milestones.filter(m => m.habit_id === h.id);

        return { ...h, streak, doneCount: done?.count || 0, rate, habitMilestones };
      }));

      const weeks = [];
      for (let w = 7; w >= 0; w--) {
        const weekDates = [];
        for (let d = 6; d >= 0; d--) {
          const date = new Date(today);
          date.setDate(date.getDate() - (w * 7 + d));
          weekDates.push(DateUtils.toDateString(date));
        }
        weeks.push(weekDates);
      }
      const weeklyRates = weeks.slice(2).map(weekDates => {
        if (habits.length === 0) return 0;
        const done = weekDates.reduce((acc, date) =>
          acc + (checkinMap[date] || []).filter(c => c.status === 'done' || c.status === 'resisted').length
        , 0);
        return Math.round((done / (habits.length * 7)) * 100);
      });

      const firstCheckin  = await db.getFirstAsync('SELECT MIN(date) as first_date FROM checkins');
      const rawStart      = firstCheckin?.first_date || APP_BIRTH;
      const appStartDate  = rawStart < APP_BIRTH ? APP_BIRTH : rawStart;

      const heatmapDates = [];
      const hd   = new Date(appStartDate + 'T00:00:00');
      const hEnd = new Date(todayStr   + 'T00:00:00');
      while (hd <= hEnd) {
        heatmapDates.push(DateUtils.toDateString(hd));
        hd.setDate(hd.getDate() + 1);
      }
      const heatmapData = heatmapDates.map(date => {
        const dayC = checkinMap[date] || [];
        const done = dayC.filter(c => c.status === 'done' || c.status === 'resisted').length;
        const rate = habits.length > 0 ? done / habits.length : 0;
        let level  = 'empty';
        if (dayC.length > 0 && rate === 1)  level = 'all';
        else if (dayC.length > 0 && rate > 0) level = 'partial';
        else if (dayC.length > 0)             level = 'missed';
        return { date, rate, level };
      });

      const [gam, ego, ins, journeyEarned] = await Promise.all([
        getFullStats(),
        getSetting('alter_ego'),
        generateInsights(),
        getEarnedJourneyBadges(),
      ]);

      setData({
        habits,
        habitStats,
        heatmapData,
        weeklyRates,
        milestones,
        totalDone: totalDone?.count || 0,
        bestStreak,
        monthDone: monthDone?.count || 0,
        appStartDate,
      });
      setGamStats(gam);
      setAlterEgo(ego || 'Gagan');
      setInsights(ins);
      setEarnedJourney(journeyEarned || []);

      // Reset expanded habit if it no longer exists
      if (selectedHabitId && !habitStats.some(h => h.id === selectedHabitId)) {
        setSelectedHabitId(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <StatusBar barStyle="light-content" />
      <ActivityIndicator size="large" color={colors.gold} />
      <Text style={{ ...Typography.body, color: colors.textMuted }}>Calculating karma...</Text>
    </View>
  );

  if (error) return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 }}>
      <Text style={{ ...Typography.body, color: colors.red, textAlign: 'center' }}>{error}</Text>
      <TouchableOpacity onPress={_loadData} style={{ backgroundColor: colors.gold, paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.lg }}>
        <Text style={{ ...Typography.headline, color: '#000' }}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  // Phase F-3: primary = Karma Title, secondary = XP level
  const kt        = gamStats?.karmaTitle;
  const levelInfo = gamStats?.levelInfo;

  const earnedJourneyIds = new Set(earnedJourney.map(b => b.badge_id));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <Text style={{ ...Typography.title2, color: colors.textPrimary }}>☸ Karma Stats</Text>
        <TouchableOpacity onPress={() => navigation.navigate('History')}>
          <Text style={{ ...Typography.body, color: colors.gold }}>History →</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.separator }]}>
        {[
          { key: 'overview', label: '📊 Overview' },
          { key: 'habits',   label: '✅ Habits' },
          { key: 'badges',   label: '🏆 Badges' },
          { key: 'insights', label: '🧠 Insights' },
        ].map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, { backgroundColor: tab === t.key ? colors.goldAlpha15 : colors.backgroundCard, borderColor: tab === t.key ? colors.gold : colors.separator }]}
            onPress={() => setTab(t.key)}
          >
            <Text style={{ fontSize: 10, color: tab === t.key ? colors.gold : colors.textMuted, fontWeight: tab === t.key ? '700' : '400' }}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg }} showsVerticalScrollIndicator={false}>

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <>
            {/* Phase F-3: Karma Title as PRIMARY card */}
            {kt && (
              <View style={[styles.karmaCard, { backgroundColor: colors.backgroundCard, borderColor: kt.color + '40' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                  <Text style={{ fontSize: 40 }}>{kt.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2, marginBottom: 3 }}>KARMA TITLE</Text>
                    <Text style={{ ...Typography.title3, color: kt.color, fontWeight: '700' }}>{kt.title}</Text>
                    <Text style={{ ...Typography.caption1, color: colors.textMuted, marginTop: 2 }}>
                      Score {gamStats.karmaScore}/1000 · 30-day consistency
                    </Text>
                  </View>
                  <View style={{ alignItems: 'center', gap: 2 }}>
                    <Text style={{ fontSize: 28, fontWeight: '700', color: colors.blue }}>{gamStats.karmaScore}</Text>
                    <Text style={{ ...Typography.caption2, color: colors.textDim }}>/1000</Text>
                  </View>
                </View>
                {kt.nextTitle && (
                  <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
                    <View style={{ height: 6, backgroundColor: colors.backgroundElevated, borderRadius: Radius.full, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${Math.round(kt.progress * 100)}%`, backgroundColor: kt.color, borderRadius: Radius.full }} />
                    </View>
                    <Text style={{ ...Typography.caption2, color: colors.textDim, textAlign: 'right' }}>
                      {Math.round(kt.progress * 100)}% → {kt.nextTitle.icon} {kt.nextTitle.title} (Score {kt.nextTitle.minScore}+)
                    </Text>
                  </View>
                )}

                {/* XP level as secondary */}
                {levelInfo && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: colors.separator }}>
                    <Text style={{ ...Typography.caption1, color: colors.textDim }}>
                      {levelInfo.icon} {levelInfo.title} · {levelInfo.totalXP} XP lifetime
                    </Text>
                    {levelInfo.nextLevel && (
                      <View style={{ flex: 1, height: 3, backgroundColor: colors.backgroundElevated, borderRadius: Radius.full, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${Math.round(levelInfo.progress * 100)}%`, backgroundColor: levelInfo.color, borderRadius: Radius.full }} />
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Stats grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg }}>
              {[
                { label: 'ALL-TIME DONE',    sub: 'total habit check-ins',                                   value: String(data?.totalDone || 0),         icon: '✅' },
                { label: 'BEST STREAK',      sub: 'consecutive days, any habit',                             value: `${data?.bestStreak || 0}d`,           icon: '🪔' },
                { label: 'DONE THIS MONTH',  sub: new Date().toLocaleString('en-IN', { month: 'long' }),     value: String(data?.monthDone || 0),          icon: '🗓' },
                { label: 'ACTIVE HABITS',    sub: 'currently tracking',                                      value: String(data?.habits?.length || 0),     icon: '☸' },
                { label: 'STREAK FREEZES',   sub: 'saves streak for 1 missed day',                          value: String(gamStats?.freezeCount || 0),    icon: '🧊' },
                { label: 'MILESTONES',       sub: 'habit badges earned',                                     value: String(data?.milestones?.length || 0), icon: '🏆' },
              ].map((s, i) => (
                <View key={i} style={{ width: '30.5%', backgroundColor: colors.backgroundCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.separator, padding: Spacing.md, alignItems: 'center', gap: 3 }}>
                  <Text style={{ fontSize: 20 }}>{s.icon}</Text>
                  <Text style={{ fontSize: 18, color: colors.textPrimary, fontWeight: '700' }}>{s.value}</Text>
                  <Text style={{ fontSize: 8, color: colors.textDim, letterSpacing: 1, textAlign: 'center' }}>{s.label}</Text>
                  <Text style={{ fontSize: 7, color: colors.textDim, textAlign: 'center', opacity: 0.7 }}>{s.sub}</Text>
                </View>
              ))}
            </View>

            {/* Freeze explanation — always shown */}
            <View style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.md, borderWidth: 1, borderColor: colors.separator, padding: Spacing.md, marginBottom: Spacing.lg, flexDirection: 'row', gap: Spacing.sm }}>
              <Text style={{ fontSize: 20 }}>🧊</Text>
              <Text style={{ ...Typography.caption1, color: colors.textDim, flex: 1, lineHeight: 18 }}>
                <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
                  {(gamStats?.freezeCount || 0) > 0
                    ? `${gamStats.freezeCount} streak freeze${gamStats.freezeCount > 1 ? 's' : ''} available.`
                    : 'No streak freezes yet.'}
                </Text>{' '}
                A streak freeze protects your streak on a missed day. Earned automatically when your weekly habit completion is 80% or more.
              </Text>
            </View>

            {/* Weekly bars */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: Spacing.sm }}>
              <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2 }}>
                HABIT COMPLETION BY WEEK
              </Text>
              <Text style={{ fontSize: 8, color: colors.textDim }}>% of habits done · current week in gold</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: 6, marginBottom: Spacing.xl }}>
              {(data?.weeklyRates || []).map((rate, i, arr) => {
                const isLast   = i === arr.length - 1;
                const weeksAgo = arr.length - 1 - i;
                const label    = isLast ? 'this week' : weeksAgo === 1 ? 'last week' : `${weeksAgo}w ago`;
                return (
                  <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                    <Text style={{ fontSize: 9, color: colors.textDim }}>{rate}%</Text>
                    <View style={{ width: '100%', height: 100, justifyContent: 'flex-end', backgroundColor: colors.backgroundCard, borderRadius: 4, overflow: 'hidden' }}>
                      <View style={{ width: '100%', height: Math.max(4, rate), backgroundColor: isLast ? colors.gold : colors.blue, borderRadius: 4, opacity: isLast ? 1 : 0.6 }} />
                    </View>
                    <Text style={{ fontSize: 8, color: isLast ? colors.gold : colors.textDim, textAlign: 'center' }}>
                      {label}
                    </Text>
                  </View>
                );
              })}
            </View>

            <OverviewHeatmap
              heatmapData={data?.heatmapData || []}
              appStartDate={data?.appStartDate || DateUtils.today()}
              colors={colors}
            />
          </>
        )}

        {/* ── HABITS ── */}
        {tab === 'habits' && (() => {
          const allStats = data?.habitStats || [];
          const grouped  = CATEGORY_ORDER
            .map(cat => ({ ...cat, items: allStats.filter(h => (h.category || 'uncategorised') === cat.key) }))
            .filter(g => g.items.length > 0);

          const HabitCard = ({ h }) => (
            <TouchableOpacity
              key={h.id}
              style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: colors.backgroundCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.separator, padding: Spacing.lg, marginBottom: Spacing.sm }}
              onPress={() => navigation.navigate('HabitDetail', { habitId: h.id })}
              activeOpacity={0.8}
            >
              <View style={{ width: 44, height: 44, borderRadius: Radius.md, backgroundColor: (h.color || colors.gold) + '25', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22 }}>{h.icon}</Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ ...Typography.subheadline, color: colors.textPrimary, fontWeight: '600' }}>{h.name}</Text>
                <Text style={{ ...Typography.caption1, color: colors.textMuted }}>
                  {h.type === 'build' ? `🪔 ${h.streak.current}d · best ${h.streak.longest}d` : `✊ ${h.streak.current}d clean`}
                  {h.is_quantifiable ? ` · ${h.unit || 'units'}/day` : ''}
                </Text>
                <View style={{ height: 4, backgroundColor: colors.separator, borderRadius: Radius.full, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${h.rate}%`, backgroundColor: h.color || colors.gold, borderRadius: Radius.full }} />
                </View>
                <Text style={{ ...Typography.caption2, color: colors.textDim }}>
                  {h.rate}% · {h.doneCount} done · {h.habitMilestones.length} milestone{h.habitMilestones.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <Text style={{ ...Typography.title3, color: colors.textDim, fontWeight: '300' }}>›</Text>
            </TouchableOpacity>
          );

          return (
            <>
              <Text style={{ ...Typography.caption1, color: colors.textDim, marginBottom: Spacing.lg }}>
                Completion % = done days ÷ expected days (excludes skips)
              </Text>
              {allStats.length === 0 && (
                <Text style={{ ...Typography.body, color: colors.textDim, textAlign: 'center', padding: 40 }}>No habits yet.</Text>
              )}
              {grouped.map(group => (
                <React.Fragment key={group.key}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: Spacing.sm, marginTop: Spacing.md }}>
                    <Text style={{ fontSize: 11 }}>{group.icon}</Text>
                    <Text style={{ ...Typography.caption2, color: group.color, letterSpacing: 1.5, fontWeight: '700' }}>{group.label}</Text>
                    <Text style={{ ...Typography.caption2, color: colors.textDim }}>— {group.items.length}</Text>
                  </View>
                  {group.items.map(h => <HabitCard key={h.id} h={h} />)}
                </React.Fragment>
              ))}
            </>
          );
        })()}


        {/* ── BADGES ── */}
        {tab === 'badges' && (
          <>
            {/* Section 1: Habit Milestones — accordion */}
            <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2, marginBottom: Spacing.xs }}>
              HABIT MILESTONES
            </Text>
            <Text style={{ ...Typography.caption1, color: colors.textDim, marginBottom: Spacing.lg }}>
              Tap any habit to see its milestone progress
            </Text>

            {(data?.habitStats || []).length === 0 ? (
              <Text style={{ ...Typography.body, color: colors.textDim, textAlign: 'center', padding: 20 }}>
                No habits yet. Add habits to unlock milestones.
              </Text>
            ) : (
              (data?.habitStats || []).map(h => {
                const isExpanded  = h.id === selectedHabitId;
                const accent      = h.color || colors.gold;
                const earnedCount = h.habitMilestones.length;
                const progressPct = (earnedCount / MILESTONE_DAYS.length) * 100;
                return (
                  <View key={h.id} style={{ marginBottom: Spacing.sm }}>
                    {/* Habit row */}
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
                        backgroundColor: isExpanded ? accent + '12' : colors.backgroundCard,
                        borderWidth: 1,
                        borderColor: isExpanded ? accent + '60' : colors.separator,
                        borderRadius: Radius.lg,
                        borderBottomLeftRadius:  isExpanded ? 0 : Radius.lg,
                        borderBottomRightRadius: isExpanded ? 0 : Radius.lg,
                        padding: Spacing.lg,
                      }}
                      onPress={() => setSelectedHabitId(isExpanded ? null : h.id)}
                      activeOpacity={0.8}
                    >
                      <View style={{ width: 42, height: 42, borderRadius: Radius.md, backgroundColor: accent + '20', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 22 }}>{h.icon}</Text>
                      </View>
                      <View style={{ flex: 1, gap: 5 }}>
                        <Text style={{ ...Typography.callout, color: colors.textPrimary, fontWeight: '600' }} numberOfLines={1}>{h.name}</Text>
                        <View style={{ height: 3, backgroundColor: colors.backgroundElevated, borderRadius: Radius.full, overflow: 'hidden' }}>
                          <View style={{ height: '100%', width: `${progressPct}%`, backgroundColor: accent, borderRadius: Radius.full }} />
                        </View>
                        <Text style={{ ...Typography.caption2, color: colors.textDim }}>
                          {earnedCount}/{MILESTONE_DAYS.length} milestones{earnedCount === MILESTONE_DAYS.length ? ' · All complete 🔱' : ''}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: isExpanded ? accent : colors.textDim }}>{isExpanded ? '▲' : '▼'}</Text>
                    </TouchableOpacity>

                    {/* Expanded milestone grid */}
                    {isExpanded && (
                      <View style={{
                        backgroundColor: colors.backgroundCard,
                        borderWidth: 1, borderTopWidth: 0,
                        borderColor: accent + '60',
                        borderBottomLeftRadius: Radius.lg,
                        borderBottomRightRadius: Radius.lg,
                        padding: Spacing.lg,
                      }}>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'space-between' }}>
                          {MILESTONE_DAYS.map(days => {
                            const info      = MILESTONE_INFO[days] || {};
                            const milestone = h.habitMilestones.find(m => m.milestone_days === days);
                            const isNext    = !milestone &&
                              !h.habitMilestones.find(m => m.milestone_days > days) &&
                              h.habitMilestones.length === MILESTONE_DAYS.indexOf(days);
                            return (
                              <View key={days} style={{
                                width: '30%', borderRadius: Radius.lg,
                                borderWidth: milestone ? 1.5 : 1, padding: Spacing.md,
                                alignItems: 'center', gap: 4,
                                backgroundColor: milestone ? accent + '15' : colors.backgroundElevated,
                                borderColor:     milestone ? accent : isNext ? accent + '50' : colors.separator,
                                opacity:         milestone ? 1 : isNext ? 0.8 : 0.4,
                              }}>
                                <Text style={{ fontSize: 22 }}>{milestone ? info.badge : isNext ? info.badge : '🔒'}</Text>
                                <Text style={{ ...Typography.caption1, fontWeight: '700', color: milestone ? accent : colors.textDim }}>{days}d</Text>
                                <Text style={{ fontSize: 8, color: milestone ? colors.textSecondary : colors.textDim, textAlign: 'center' }}>{info.title}</Text>
                                {milestone ? (
                                  <Text style={{ fontSize: 8, color: colors.green, fontWeight: '700' }}>
                                    ✓ {new Date(milestone.achieved_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                  </Text>
                                ) : isNext ? (
                                  <Text style={{ fontSize: 8, color: accent }}>next</Text>
                                ) : (
                                  <Text style={{ fontSize: 8, color: colors.textDim }}>🔒</Text>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )}

            {/* Section 2: Journey Badges (overall) */}
            <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2, marginBottom: Spacing.xs, marginTop: Spacing.xl }}>
              JOURNEY BADGES
            </Text>
            <Text style={{ ...Typography.caption1, color: colors.textDim, marginBottom: Spacing.md, lineHeight: 18 }}>
              Overall achievements across your entire journey. Early badges unlock quickly — karma score badges (600+) are the real test.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
              {JOURNEY_BADGES.map(badge => {
                const earned = earnedJourneyIds.has(badge.id);
                const earnedRecord = earnedJourney.find(b => b.badge_id === badge.id);
                return (
                  <View key={badge.id} style={{
                    width: '30%',
                    borderRadius: Radius.lg,
                    borderWidth: earned ? 1.5 : 1,
                    padding: Spacing.md,
                    alignItems: 'center',
                    gap: 5,
                    backgroundColor: earned ? colors.blueAlpha15 : colors.backgroundCard,
                    borderColor:     earned ? colors.blue + '70' : colors.separator,
                    opacity:         earned ? 1 : 0.45,
                  }}>
                    <Text style={{ fontSize: 26 }}>{badge.badge}</Text>
                    <Text style={{ ...Typography.caption2, fontWeight: '700', color: earned ? colors.blue : colors.textDim, textAlign: 'center' }}>
                      {badge.title}
                    </Text>
                    <Text style={{ fontSize: 8, color: colors.textDim, textAlign: 'center', lineHeight: 12 }}>
                      {badge.criteria}
                    </Text>
                    {earned && earnedRecord && (
                      <Text style={{ fontSize: 8, color: colors.green, fontWeight: '700' }}>
                        ✓ {new Date(earnedRecord.achieved_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </Text>
                    )}
                    {!earned && (
                      <Text style={{ fontSize: 8, color: colors.textDim }}>🔒</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* ── INSIGHTS ── */}
        {tab === 'insights' && (
          <>
            {insights.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 60, gap: Spacing.lg }}>
                <Text style={{ fontSize: 56 }}>🧠</Text>
                <Text style={{ ...Typography.title3, color: colors.textSecondary, textAlign: 'center' }}>Krishna is watching</Text>
                <Text style={{ ...Typography.body, color: colors.textDim, textAlign: 'center', lineHeight: 26 }}>
                  After 5 days of tracking, Karma will reveal your patterns — your weak days, your triggers, your energy-discipline connection.{'\n\n'}
                  Log your habits. Let the data build.
                </Text>
                <View style={{ backgroundColor: colors.goldAlpha15, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.goldAlpha25, padding: Spacing.lg, width: '100%' }}>
                  <Text style={{ ...Typography.caption2, color: colors.gold, letterSpacing: 2, marginBottom: Spacing.sm }}>THE PROMISE</Text>
                  <Text style={{ ...Typography.callout, color: colors.textMuted, fontStyle: 'italic', lineHeight: 22 }}>
                    "Know your battlefield. The general who knows the terrain wins before the battle begins."
                  </Text>
                </View>
              </View>
            ) : (
              <>
                <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2, marginBottom: Spacing.lg }}>
                  KRISHNA SPEAKS — YOUR PATTERNS
                </Text>
                {insights.map((ins, i) => (
                  <View key={i} style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: ins.color ? ins.color + '30' : colors.separator, borderLeftWidth: 4, borderLeftColor: ins.color || colors.gold, padding: Spacing.xl, marginBottom: Spacing.md, gap: Spacing.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                      <Text style={{ fontSize: 24 }}>{ins.icon}</Text>
                      <Text style={{ ...Typography.headline, color: colors.textPrimary, flex: 1 }}>{ins.title}</Text>
                    </View>
                    <Text style={{ ...Typography.callout, color: colors.textMuted, lineHeight: 22 }}>{ins.detail}</Text>
                  </View>
                ))}
                <View style={{ backgroundColor: colors.goldAlpha15, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.goldAlpha25, padding: Spacing.lg, marginTop: Spacing.sm }}>
                  <Text style={{ ...Typography.caption1, color: colors.gold, textAlign: 'center', fontStyle: 'italic' }}>
                    Insights update daily as you log more habits.
                  </Text>
                </View>
              </>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderBottomWidth: 1 },
  tabBar:    { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.sm, borderBottomWidth: 1 },
  tabBtn:    { flex: 1, paddingVertical: 8, borderRadius: Spacing.sm, borderWidth: 1, alignItems: 'center' },
  karmaCard: { borderRadius: Radius.lg, borderWidth: 1.5, padding: Spacing.xl, marginBottom: Spacing.lg },
});

export default StatsScreen;