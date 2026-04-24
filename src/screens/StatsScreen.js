// ─── KARMA APP — STATS SCREEN (PHASE C) ──────────────────────────────
// Added: Pattern Insights tab — Karma speaks after 30 days
// Theme-aware via useTheme()

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView }   from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, Typography, Spacing, Radius } from '../constants/colors';
import { DateUtils }      from '../utils/dateUtils';
import { getAllHabits, getStreak, getSetting } from '../database/habitService';
import { getFullStats, MILESTONE_INFO, LEVELS } from '../services/gamificationService';
import { getDatabase }    from '../database/database';
import { generateInsights } from '../services/insightsService';

const { width } = Dimensions.get('window');
const CELL_SIZE  = Math.floor((width - 48) / 18);

const StatsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [data,     setData]     = useState(null);
  const [gamStats, setGamStats] = useState(null);
  const [insights, setInsights] = useState([]);
  const [alterEgo, setAlterEgo] = useState('Neel');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [tab,      setTab]      = useState('overview');

  useFocusEffect(useCallback(() => { _loadData(); }, []));

  const _loadData = async () => {
    try {
      setLoading(true);
      const db    = await getDatabase();
      const today = new Date();

      const dates90 = [];
      for (let i = 89; i >= 0; i--) {
        const d = new Date(today); d.setDate(d.getDate() - i);
        dates90.push(d.toISOString().split('T')[0]);
      }

      const habits   = await getAllHabits();
      const checkins = await db.getAllAsync(
        `SELECT date, status, habit_id FROM checkins WHERE date >= ?`, [dates90[0]]
      ) || [];

      const checkinMap = {};
      checkins.forEach(c => {
        if (!checkinMap[c.date]) checkinMap[c.date] = [];
        checkinMap[c.date].push(c);
      });

      const milestones = await db.getAllAsync('SELECT * FROM milestones ORDER BY achieved_at DESC') || [];
      const totalDone  = await db.getFirstAsync("SELECT COUNT(*) as count FROM checkins WHERE status IN ('done','resisted')");
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const monthDone  = await db.getFirstAsync("SELECT COUNT(*) as count FROM checkins WHERE date >= ? AND status IN ('done','resisted')", [monthStart]);

      const allStreaks  = await Promise.all(habits.map(h => getStreak(h.id)));
      const bestStreak  = allStreaks.reduce((max, s) => s.longest > max ? s.longest : max, 0);

      const habitStats = await Promise.all(habits.map(async (h, i) => {
        const streak = allStreaks[i] || { current: 0, longest: 0 };
        const done   = await db.getFirstAsync("SELECT COUNT(*) as count FROM checkins WHERE habit_id = ? AND status IN ('done','resisted')", [h.id]);
        const total  = await db.getFirstAsync('SELECT COUNT(*) as count FROM checkins WHERE habit_id = ?', [h.id]);
        const rate   = total?.count > 0 ? Math.round(((done?.count || 0) / total.count) * 100) : 0;
        return { ...h, streak, doneCount: done?.count || 0, rate };
      }));

      const weeks = [];
      for (let w = 7; w >= 0; w--) {
        const weekDates = [];
        for (let d = 6; d >= 0; d--) {
          const date = new Date(today); date.setDate(date.getDate() - (w * 7 + d));
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

      const heatmapData = dates90.map(date => {
        const dayC = checkinMap[date] || [];
        const done  = dayC.filter(c => c.status === 'done' || c.status === 'resisted').length;
        return { date, rate: habits.length > 0 ? done / habits.length : 0 };
      });

      const [gam, ego, ins] = await Promise.all([
        getFullStats(),
        getSetting('alter_ego'),
        generateInsights(),
      ]);

      setData({ habits, habitStats, heatmapData, weeklyRates, milestones, totalDone: totalDone?.count || 0, bestStreak, monthDone: monthDone?.count || 0 });
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
          { key: 'overview', label: '📊 Overview' },
          { key: 'habits',   label: '✅ Habits' },
          { key: 'badges',   label: '🏆 Badges' },
          { key: 'insights', label: '🧠 Insights' },
        ].map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, {
              backgroundColor: tab === t.key ? colors.goldAlpha15 : colors.backgroundCard,
              borderColor:     tab === t.key ? colors.gold : colors.separator,
            }]}
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
                { label: 'TOTAL DONE',    value: String(data?.totalDone || 0), icon: '✅' },
                { label: 'BEST STREAK',   value: `${data?.bestStreak || 0}d`,  icon: '🪔' },
                { label: 'THIS MONTH',    value: String(data?.monthDone || 0), icon: '📅' },
                { label: 'ACTIVE HABITS', value: String(data?.habits?.length || 0), icon: '☸' },
                { label: 'FREEZE LEFT',   value: String(gamStats?.freezeCount || 0), icon: '🧊' },
                { label: 'BADGES',        value: String(data?.milestones?.length || 0), icon: '🏆' },
              ].map((s, i) => (
                <View key={i} style={{ width: '30.5%', backgroundColor: colors.backgroundCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.separator, padding: Spacing.md, alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 20 }}>{s.icon}</Text>
                  <Text style={{ fontSize: 18, color: colors.textPrimary, fontWeight: '700' }}>{s.value}</Text>
                  <Text style={{ fontSize: 8, color: colors.textDim, letterSpacing: 1, textAlign: 'center' }}>{s.label}</Text>
                </View>
              ))}
            </View>

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
                    <Text style={{ fontSize: 9, color: colors.textDim }}>{['W1','W2','W3','W4','W5','W6'][i] || `W${i+1}`}</Text>
                  </View>
                );
              })}
            </View>

            {/* 90-day heatmap */}
            <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2, marginBottom: Spacing.md }}>90-DAY HEATMAP</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2, marginBottom: Spacing.sm }}>
              {(data?.heatmapData || []).map((cell) => {
                const opacity = cell.rate === 0 ? 0.06 : cell.rate <= 0.25 ? 0.25 : cell.rate <= 0.5 ? 0.5 : cell.rate <= 0.75 ? 0.75 : 1;
                const isToday = DateUtils.isToday(cell.date);
                return (
                  <View key={cell.date} style={{
                    width: CELL_SIZE, height: CELL_SIZE, borderRadius: 2,
                    backgroundColor: cell.rate === 0 ? colors.backgroundCard : colors.gold,
                    opacity: isToday ? 1 : opacity,
                    borderWidth: isToday ? 1.5 : 0, borderColor: colors.gold,
                  }} />
                );
              })}
            </View>
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
                const info   = MILESTONE_INFO[days] || {};
                const earned = (data?.milestones || []).some(m => m.milestone_days === days);
                const earnedM = (data?.milestones || []).find(m => m.milestone_days === days);
                return (
                  <View key={days} style={{
                    width: '30%', borderRadius: Radius.lg, borderWidth: 1,
                    padding: Spacing.md, alignItems: 'center', gap: 4,
                    backgroundColor: earned ? colors.goldAlpha15 : colors.backgroundCard,
                    borderColor:     earned ? colors.goldAlpha40 : colors.separator,
                    opacity:         earned ? 1 : 0.4,
                  }}>
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
                <Text style={{ ...Typography.title3, color: colors.textSecondary, textAlign: 'center' }}>
                  Krishna is watching
                </Text>
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
                <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2, marginBottom: Spacing.lg }}>
                  KRISHNA SPEAKS — YOUR PATTERNS
                </Text>
                {insights.map((ins, i) => (
                  <View key={i} style={{
                    backgroundColor: colors.backgroundCard,
                    borderRadius:    Radius.lg,
                    borderWidth:      1,
                    borderColor:     ins.color ? ins.color + '30' : colors.separator,
                    borderLeftWidth:  4,
                    borderLeftColor:  ins.color || colors.gold,
                    padding:         Spacing.xl,
                    marginBottom:    Spacing.md,
                    gap:             Spacing.sm,
                  }}>
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
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderBottomWidth: 1 },
  tabBar:   { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.sm, borderBottomWidth: 1 },
  tabBtn:   { flex: 1, paddingVertical: 8, borderRadius: Spacing.sm, borderWidth: 1, alignItems: 'center' },
  levelCard:{ borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.xl, marginBottom: Spacing.lg },
});

export default StatsScreen;