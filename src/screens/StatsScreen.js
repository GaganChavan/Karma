// ─── KARMA APP — STATS SCREEN (PHASE D) ─────────────────────────────
// FIX #8: 90-day heatmap — self-explanatory
//   - Month labels above columns (Jan, Feb, etc.)
//   - Day-of-week labels (M T W T F S S)
//   - Color legend at bottom
//   - Consistency % shown
//   - Summary: done / missed / tracked numbers
//   - Starts from first app use date (not fake 90 days of empty)
//   - Today highlighted with gold border
//   - Days before app existed are transparent (not shown as missed)

import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, Typography, Spacing, Radius } from '../constants/colors';
import { DateUtils } from '../utils/dateUtils';
import { getAllHabits, getStreak, getSetting } from '../database/habitService';
import { getFullStats, MILESTONE_INFO, LEVELS } from '../services/gamificationService';
import { getDatabase } from '../database/database';
import { generateInsights } from '../services/insightsService';

const { width } = Dimensions.get('window');

// ── Heatmap constants ─────────────────────────────────────────────────
const CELL = 11;
const GAP  = 2;

// ── Self-explanatory heatmap with month picker ────────────────────────
const OverviewHeatmap = ({ heatmapData, appStartDate, colors }) => {
  if (!heatmapData || heatmapData.length === 0) return null;

  const today = new Date().toISOString().split('T')[0];

  // Month picker state — null = show all
  const [selectedMonth, setSelectedMonth] = useState(null);

  // Build available months from appStartDate to today
  const availableMonths = useMemo(() => {
    const months = [];
    const start = new Date(appStartDate + 'T00:00:00');
    const end = new Date(today + 'T00:00:00');
    const d = new Date(start.getFullYear(), start.getMonth(), 1);
    while (d <= end) {
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
        label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
      });
      d.setMonth(d.getMonth() + 1);
    }
    return months;
  // eslint-disable-next-line
  }, [appStartDate, today]);

  // Filter heatmap data by selected month
  const filteredData = useMemo(() => {
    if (!selectedMonth) return heatmapData;
    return heatmapData.filter(d => d.date.startsWith(selectedMonth));
  }, [heatmapData, selectedMonth]);

  // Pad to Mon alignment (use filteredData for display)
  const displayData = filteredData.length > 0 ? filteredData : heatmapData;
  const firstDow = (new Date(displayData[0].date).getDay() + 6) % 7;
  const padded = Array(firstDow).fill(null).concat(displayData);

  const weeks = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  // Month labels
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

  // Summary stats
  const tracked = displayData;
  const perfect = tracked.filter(d => d.level === 'all');
  const partial = tracked.filter(d => d.level === 'partial');
  const missed  = tracked.filter(d => d.level === 'missed');
  const consistency = tracked.length > 0
    ? Math.round(((perfect.length + partial.length) / tracked.length) * 100) : 0;

  const getColor = (cell) => {
    if (!cell || cell.date < appStartDate) return 'transparent';
    if (cell.rate === 0) return colors.backgroundCard;
    if (cell.rate <= 0.33) return colors.gold + '33';
    if (cell.rate <= 0.66) return colors.gold + '77';
    if (cell.rate < 1)    return colors.gold + 'BB';
    return colors.gold;
  };

  return (
    <View style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.separator, padding: Spacing.lg, marginBottom: Spacing.lg }}>
      {/* Title + consistency */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ ...Typography.subheadline, color: colors.textPrimary, fontWeight: '700' }}>90-Day Journey</Text>
        <View style={{ backgroundColor: colors.gold + '20', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 }}>
          <Text style={{ fontSize: 11, color: colors.gold, fontWeight: '700' }}>{consistency}% consistent</Text>
        </View>
      </View>

      {/* Summary numbers */}
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

      {/* Month picker */}
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

      {/* Grid */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Month labels */}
          <View style={{ height: 14, position: 'relative', marginLeft: 16, width: weeks.length * (CELL + GAP), marginBottom: 2 }}>
            {monthLabels.map((ml, i) => (
              <Text key={i} style={{ position: 'absolute', left: ml.col * (CELL + GAP), fontSize: 9, color: colors.textDim }}>{ml.label}</Text>
            ))}
          </View>
          {/* Day labels + week columns */}
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: 12, marginRight: 4 }}>
              {['M','','W','','F','','S'].map((l, i) => (
                <Text key={i} style={{ fontSize: 8, color: colors.textDim, height: CELL + GAP, lineHeight: CELL + GAP, textAlign: 'right' }}>{l}</Text>
              ))}
            </View>
            <View style={{ flexDirection: 'row' }}>
              {weeks.map((week, wi) => (
                <View key={wi} style={{ flexDirection: 'column', marginRight: GAP }}>
                  {week.map((cell, di) => {
                    if (!cell) return <View key={di} style={{ width: CELL, height: CELL, marginBottom: GAP }} />;
                    const isToday = cell.date === today;
                    const bg = getColor(cell);
                    return (
                      <View key={di} style={{
                        width: CELL, height: CELL, borderRadius: 2, marginBottom: GAP,
                        backgroundColor: bg,
                        borderWidth: isToday ? 1.5 : 0,
                        borderColor: colors.gold,
                      }} />
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 10 }}>
        <Text style={{ fontSize: 9, color: colors.textDim }}>Legend:</Text>
        {[
          { color: colors.gold,         label: 'All done' },
          { color: colors.gold + 'BB',  label: 'Most done' },
          { color: colors.gold + '55',  label: 'Some done' },
          { color: colors.backgroundCard, label: 'None', border: true },
        ].map((l, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: l.color, borderWidth: l.border ? 1 : 0, borderColor: colors.separator }} />
            <Text style={{ fontSize: 9, color: colors.textDim }}>{l.label}</Text>
          </View>
        ))}
        <Text style={{ fontSize: 9, color: colors.gold }}>bordered = today</Text>
      </View>

      {/* Start date */}
      <Text style={{ fontSize: 9, color: colors.textDim, textAlign: 'right', marginTop: 6 }}>
        Tracking since {new Date(appStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
      </Text>
    </View>
  );
};

// ── Main Screen ────────────────────────────────────────────────────────
const StatsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [data, setData]       = useState(null);
  const [gamStats, setGamStats] = useState(null);
  const [insights, setInsights] = useState([]);
  const [alterEgo, setAlterEgo] = useState('Neel');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [tab, setTab]         = useState('overview');

  useFocusEffect(useCallback(() => { _loadData(); }, []));

  const _loadData = async () => {
    try {
      setLoading(true);
      const db = await getDatabase();
      const today = new Date();

      // Build date range from app start to today (not 90 days back blindly)
      const APP_BIRTH_STR = '2026-05-01';
      const todayStr = today.toISOString().split('T')[0];
      // dates90 = still used for other queries — we keep it for checkins fetch range
      const dates90 = [];
      for (let i = 89; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates90.push(d.toISOString().split('T')[0]);
      }

      const habits = await getAllHabits();
      const checkins = await db.getAllAsync(
        `SELECT date, status, habit_id FROM checkins WHERE date >= ?`,
        [dates90[0]]
      ) || [];

      const checkinMap = {};
      checkins.forEach(c => {
        if (!checkinMap[c.date]) checkinMap[c.date] = [];
        checkinMap[c.date].push(c);
      });

      const milestones = await db.getAllAsync('SELECT * FROM milestones ORDER BY achieved_at DESC') || [];
      const totalDone = await db.getFirstAsync("SELECT COUNT(*) as count FROM checkins WHERE status IN ('done','resisted')");
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const monthDone = await db.getFirstAsync("SELECT COUNT(*) as count FROM checkins WHERE date >= ? AND status IN ('done','resisted')", [monthStart]);
      const allStreaks = await Promise.all(habits.map(h => getStreak(h.id)));
      const bestStreak = allStreaks.reduce((max, s) => s.longest > max ? s.longest : max, 0);

      const habitStats = await Promise.all(habits.map(async (h, i) => {
        const streak = allStreaks[i] || { current: 0, longest: 0 };
        const done = await db.getFirstAsync("SELECT COUNT(*) as count FROM checkins WHERE habit_id = ? AND status IN ('done','resisted')", [h.id]);
        const total = await db.getFirstAsync('SELECT COUNT(*) as count FROM checkins WHERE habit_id = ?', [h.id]);
        const rate = total?.count > 0 ? Math.round(((done?.count || 0) / total.count) * 100) : 0;
        return { ...h, streak, doneCount: done?.count || 0, rate };
      }));

      const weeks = [];
      for (let w = 7; w >= 0; w--) {
        const weekDates = [];
        for (let d = 6; d >= 0; d--) {
          const date = new Date(today);
          date.setDate(date.getDate() - (w * 7 + d));
          weekDates.push(date.toISOString().split('T')[0]);
        }
        weeks.push(weekDates);
      }

      const weeklyRates = weeks.slice(2).map(weekDates => {
        if (habits.length === 0) return 0;
        const done = weekDates.reduce((acc, date) => {
          return acc + (checkinMap[date] || []).filter(c => c.status === 'done' || c.status === 'resisted').length;
        }, 0);
        return Math.round((done / (habits.length * 7)) * 100);
      });

      // FIX: Find first checkin date (app start date)
      const firstCheckin = await db.getFirstAsync('SELECT MIN(date) as first_date FROM checkins');
      const APP_BIRTH = '2026-05-01';
      const rawStart = firstCheckin?.first_date || APP_BIRTH;
      const appStartDate = rawStart < APP_BIRTH ? APP_BIRTH : rawStart;

      // Build heatmap only from appStartDate to today
      const heatmapDates = [];
      const hd = new Date(appStartDate + 'T00:00:00');
      const hEnd = new Date(todayStr + 'T00:00:00');
      while (hd <= hEnd) {
        heatmapDates.push(hd.toISOString().split('T')[0]);
        hd.setDate(hd.getDate() + 1);
      }
      const heatmapData = heatmapDates.map(date => {
        const dayC = checkinMap[date] || [];
        const done = dayC.filter(c => c.status === 'done' || c.status === 'resisted').length;
        const rate = habits.length > 0 ? done / habits.length : 0;
        let level = 'empty';
        if (dayC.length > 0 && rate === 1)  level = 'all';
        else if (dayC.length > 0 && rate > 0) level = 'partial';
        else if (dayC.length > 0)            level = 'missed';
        return { date, rate, level };
      });

      const [gam, ego, ins] = await Promise.all([
        getFullStats(),
        getSetting('alter_ego'),
        generateInsights(),
      ]);

      setData({
        habits, habitStats, heatmapData, weeklyRates, milestones,
        totalDone: totalDone?.count || 0, bestStreak,
        monthDone: monthDone?.count || 0, appStartDate,
      });
      setGamStats(gam);
      setAlterEgo(ego || 'Neel');
      setInsights(ins);
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

  const levelInfo = gamStats?.levelInfo;

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
          { key: 'overview',  label: '📊 Overview' },
          { key: 'habits',    label: '✅ Habits' },
          { key: 'badges',    label: '🏆 Badges' },
          { key: 'insights',  label: '🧠 Insights' },
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
            {/* Level card */}
            {levelInfo && (
              <View style={[styles.levelCard, { backgroundColor: colors.backgroundCard, borderColor: colors.separator }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                  <Text style={{ fontSize: 36 }}>{levelInfo.icon}</Text>
                  <View>
                    <Text style={{ ...Typography.headline, color: levelInfo.color }}>Level {levelInfo.level} — {levelInfo.title}</Text>
                    <Text style={{ ...Typography.caption1, color: colors.textMuted }}>{levelInfo.totalXP} XP earned</Text>
                  </View>
                  <View style={{ marginLeft: 'auto', alignItems: 'center' }}>
                    <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 1 }}>KARMA</Text>
                    <Text style={{ fontSize: 24, fontWeight: '700', color: colors.blue }}>{gamStats?.karmaScore}</Text>
                    <Text style={{ ...Typography.caption2, color: colors.textDim }}>/1000</Text>
                  </View>
                </View>
                {levelInfo.nextLevel && (
                  <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
                    <View style={{ height: 6, backgroundColor: colors.backgroundElevated, borderRadius: Radius.full, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${Math.round(levelInfo.progress * 100)}%`, backgroundColor: levelInfo.color, borderRadius: Radius.full }} />
                    </View>
                    <Text style={{ ...Typography.caption2, color: colors.textDim, textAlign: 'right' }}>
                      {Math.round(levelInfo.progress * 100)}% to {levelInfo.nextLevel.icon} {levelInfo.nextLevel.title}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Stats grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg }}>
              {[
                { label: 'TOTAL DONE',    value: String(data?.totalDone || 0),          icon: '✅' },
                { label: 'BEST STREAK',   value: `${data?.bestStreak || 0}d`,            icon: '🪔' },
                { label: 'THIS MONTH',    value: String(data?.monthDone || 0),           icon: '🗓' },
                { label: 'ACTIVE HABITS', value: String(data?.habits?.length || 0),      icon: '☸'  },
                { label: 'FREEZE LEFT',   value: String(gamStats?.freezeCount || 0),     icon: '🧊' },
                { label: 'BADGES',        value: String(data?.milestones?.length || 0),  icon: '🏆' },
              ].map((s, i) => (
                <View key={i} style={{ width: '30.5%', backgroundColor: colors.backgroundCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.separator, padding: Spacing.md, alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 20 }}>{s.icon}</Text>
                  <Text style={{ fontSize: 18, color: colors.textPrimary, fontWeight: '700' }}>{s.value}</Text>
                  <Text style={{ fontSize: 8, color: colors.textDim, letterSpacing: 1, textAlign: 'center' }}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Freeze explanation */}
            {(gamStats?.freezeCount || 0) > 0 && (
              <View style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.md, borderWidth: 1, borderColor: colors.separator, padding: Spacing.md, marginBottom: Spacing.lg, flexDirection: 'row', gap: Spacing.sm }}>
                <Text style={{ fontSize: 20 }}>🧊</Text>
                <Text style={{ ...Typography.caption1, color: colors.textDim, flex: 1, lineHeight: 18 }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{gamStats.freezeCount} streak freeze{gamStats.freezeCount > 1 ? 's' : ''} available.</Text>{' '}
                  Earned when weekly consistency ≥ 80%. Auto-protects your streak for 1 day when missed.
                </Text>
              </View>
            )}

            {/* Weekly bars */}
            <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2, marginBottom: Spacing.md }}>WEEKLY COMPLETION</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: 6, marginBottom: Spacing.xl }}>
              {(data?.weeklyRates || []).map((rate, i) => {
                const isLast = i === (data?.weeklyRates?.length || 0) - 1;
                return (
                  <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                    <Text style={{ fontSize: 9, color: colors.textDim }}>{rate}%</Text>
                    <View style={{ width: '100%', height: 100, justifyContent: 'flex-end', backgroundColor: colors.backgroundCard, borderRadius: 4, overflow: 'hidden' }}>
                      <View style={{ width: '100%', height: Math.max(4, rate), backgroundColor: isLast ? colors.gold : colors.blue, borderRadius: 4, opacity: isLast ? 1 : 0.6 }} />
                    </View>
                    <Text style={{ fontSize: 9, color: isLast ? colors.gold : colors.textDim }}>
                      {['W1','W2','W3','W4','W5','W6'][i] || `W${i+1}`}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* FIX #8: Self-explanatory heatmap */}
            <OverviewHeatmap
              heatmapData={data?.heatmapData || []}
              appStartDate={data?.appStartDate || new Date().toISOString().split('T')[0]}
              colors={colors}
            />
          </>
        )}

        {/* ── HABITS ── */}
        {tab === 'habits' && (
          <>
            <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2, marginBottom: Spacing.md }}>HABIT BREAKDOWN</Text>
            {(data?.habitStats || []).length === 0 && (
              <Text style={{ ...Typography.body, color: colors.textDim, textAlign: 'center', padding: 40 }}>No habits yet.</Text>
            )}
            {(data?.habitStats || []).map(h => (
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
                  <Text style={{ ...Typography.caption2, color: colors.textDim }}>{h.rate}% completion · {h.doneCount} total</Text>
                </View>
                <Text style={{ ...Typography.title3, color: colors.textDim, fontWeight: '300' }}>›</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ── BADGES ── */}
        {tab === 'badges' && (
          <>
            <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2, marginBottom: Spacing.md }}>MILESTONE BADGES</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
              {[3,7,14,21,30,48,60,75,90,180,365].map(days => {
                const info    = MILESTONE_INFO[days] || {};
                const earned  = (data?.milestones || []).some(m => m.milestone_days === days);
                const earnedM = (data?.milestones || []).find(m => m.milestone_days === days);
                return (
                  <View key={days} style={{ width: '30%', borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, alignItems: 'center', gap: 4, backgroundColor: earned ? colors.goldAlpha15 : colors.backgroundCard, borderColor: earned ? colors.goldAlpha40 : colors.separator, opacity: earned ? 1 : 0.4 }}>
                    <Text style={{ fontSize: 26 }}>{info.badge || '🏆'}</Text>
                    <Text style={{ ...Typography.caption1, fontWeight: '700', color: earned ? colors.gold : colors.textDim }}>{days} days</Text>
                    <Text style={{ fontSize: 9, color: colors.textDim, textAlign: 'center' }}>{info.title || ''}</Text>
                    {earned && earnedM && (
                      <Text style={{ fontSize: 8, color: colors.green, textAlign: 'center' }}>✓ {DateUtils.formatDate(earnedM.achieved_at?.split('T')[0] || '')}</Text>
                    )}
                    {!earned && <Text style={{ fontSize: 9, color: colors.textDim }}>🔒 Locked</Text>}
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
                  After 7 days of tracking, Karma will reveal your patterns — your weak days, your triggers, your energy-discipline connection.{'\n\n'}
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
                <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2, marginBottom: Spacing.lg }}>KRISHNA SPEAKS — YOUR PATTERNS</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderBottomWidth: 1 },
  tabBar: { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.sm, borderBottomWidth: 1 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: Spacing.sm, borderWidth: 1, alignItems: 'center' },
  levelCard: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.xl, marginBottom: Spacing.lg },
});

export default StatsScreen;