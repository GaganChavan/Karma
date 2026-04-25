// ─── KARMA APP — WFO MODE SCREEN (PHASE D) ───────────────────────────
// The Hassan vs Bangalore context switch.
// Mark which habits to skip during WFO.
// Define your non-negotiables.

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Switch, StyleSheet, StatusBar, Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Typography, Spacing, Radius } from '../constants/colors';
import { getAllHabits, getSetting, setSetting } from '../database/habitService';
import {
  isWFOMode, enableWFOMode, disableWFOMode,
  toggleHabitWFOSkip, getWFOStats,
} from '../services/wfoService';

const WFOModeScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [habits,    setHabits]    = useState([]);
  const [wfoActive, setWfoActive] = useState(false);
  const [wfoStats,  setWfoStats]  = useState(null);
  const [homeCity,  setHomeCity]  = useState('Hassan');
  const [wfoCity,   setWfoCity]   = useState('Bangalore');
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [alterEgo,  setAlterEgo]  = useState('Neel');

  useEffect(() => { _loadData(); }, []);

  const _loadData = async () => {
    try {
      setLoading(true);
      const [habitsData, wfo, stats, home, city, ego] = await Promise.all([
        getAllHabits(),
        isWFOMode(),
        getWFOStats(),
        getSetting('home_city'),
        getSetting('wfo_city'),
        getSetting('alter_ego'),
      ]);
      setHabits(habitsData);
      setWfoActive(wfo);
      setWfoStats(stats);
      setHomeCity(home || 'Hassan');
      setWfoCity(city || 'Bangalore');
      setAlterEgo(ego || 'Neel');
    } catch (err) {
      console.warn('WFOMode load:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const _toggleWFOMode = async (value) => {
    setSaving(true);
    try {
      if (value) {
        Alert.alert(
          `🏙️ Switch to ${wfoCity} Mode?`,
          `Habits marked "Skip during WFO" will be auto-skipped.\nNon-negotiables remain active.\n\nYour streak on skipped habits is protected.`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setSaving(false) },
            {
              text: `Enter ${wfoCity} Mode`,
              onPress: async () => {
                try {
                  await enableWFOMode();
                  setWfoActive(true);
                  await _loadData();
                  Alert.alert(
                    `☸ ${wfoCity} Mode Active`,
                    `The battlefield has changed, ${alterEgo}.\nYour non-negotiables remain. The rest can wait.`
                  );
                } catch (err) {
                  Alert.alert('Error', err.message);
                } finally {
                  setSaving(false);
                }
              },
            },
          ]
        );
      } else {
        Alert.alert(
          `🏡 Return to ${homeCity}?`,
          `Welcome back. Full habit stack resumes.\nLet's rebuild the momentum.`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setSaving(false) },
            {
              text: `Return to ${homeCity}`,
              onPress: async () => {
                try {
                  await disableWFOMode();
                  setWfoActive(false);
                  setWfoStats(null);
                  await _loadData();
                  Alert.alert(
                    `🏡 ${homeCity} Mode Active`,
                    `The full chariot is back, ${alterEgo}.\nFull stack. Full discipline. Begin.`
                  );
                } catch (err) {
                  Alert.alert('Error', err.message);
                } finally {
                  setSaving(false);
                }
              },
            },
          ]
        );
      }
    } catch (err) {
      Alert.alert('Error', err.message);
      setSaving(false);
    }
  };

  const _toggleHabitSkip = async (habit) => {
    try {
      const newVal = await toggleHabitWFOSkip(habit.id);
      setHabits(prev =>
        prev.map(h => h.id === habit.id ? { ...h, is_wfo_skip: newVal ? 1 : 0 } : h)
      );
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={colors.gold} />
    </View>
  );

  const buildHabits = habits.filter(h => h.type === 'build');
  const breakHabits = habits.filter(h => h.type === 'break');
  const skippedCount = habits.filter(h => h.is_wfo_skip).length;
  const nonNegCount  = habits.length - skippedCount;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle="light-content" />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: colors.separator }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ ...Typography.body, color: colors.gold }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ ...Typography.headline, color: colors.textPrimary }}>Travel Mode</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView 
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: Spacing.xl, gap: Spacing.lg }} 
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
      >

        {/* Master toggle */}
        <View style={{ backgroundColor: wfoActive ? colors.blueAlpha15 : colors.backgroundCard, borderRadius: Radius.xl, borderWidth: 2, borderColor: wfoActive ? colors.blue : colors.separator, padding: Spacing.xl, gap: Spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, gap: Spacing.xs }}>
              <Text style={{ ...Typography.title3, color: colors.textPrimary }}>
                {wfoActive ? `🏙️ ${wfoCity} Mode` : `🏡 ${homeCity} Mode`}
              </Text>
              <Text style={{ ...Typography.callout, color: colors.textMuted }}>
                {wfoActive
                  ? `${nonNegCount} non-negotiables active · ${skippedCount} auto-skipped`
                  : 'Full habit stack — all habits active'
                }
              </Text>
            </View>
            <Switch
              value={wfoActive}
              onValueChange={_toggleWFOMode}
              disabled={saving}
              trackColor={{ false: colors.separator, true: colors.blue + '80' }}
              thumbColor={wfoActive ? colors.blue : colors.textMuted}
            />
          </View>

          {/* WFO trip stats */}
          {wfoActive && wfoStats && (
            <View style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.sm }}>
              <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2 }}>CURRENT TRIP</Text>
              <View style={{ flexDirection: 'row', gap: Spacing.lg }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: '700', color: colors.blue }}>{wfoStats.wfoDays}</Text>
                  <Text style={{ ...Typography.caption2, color: colors.textDim }}>DAYS</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: '700', color: wfoStats.nnRate >= 80 ? colors.green : colors.gold }}>{wfoStats.nnRate}%</Text>
                  <Text style={{ ...Typography.caption2, color: colors.textDim }}>NON-NEG RATE</Text>
                </View>
              </View>
              <Text style={{ ...Typography.caption1, color: wfoStats.nnRate >= 80 ? colors.green : colors.textMuted, fontStyle: 'italic' }}>
                {wfoStats.nnRate >= 80
                  ? '✅ The warrior holds. Non-negotiables maintained.'
                  : '⚠️ Non-negotiables slipping. Tighten the rein.'
                }
              </Text>
            </View>
          )}
        </View>

        {/* Explanation */}
        <View style={{ backgroundColor: colors.goldAlpha15, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.goldAlpha25, padding: Spacing.lg, gap: Spacing.sm }}>
          <Text style={{ ...Typography.caption2, color: colors.gold, letterSpacing: 2, fontWeight: '700' }}>HOW IT WORKS</Text>
          <Text style={{ ...Typography.callout, color: colors.textMuted, lineHeight: 22 }}>
            Mark which habits to <Text style={{ color: colors.red }}>skip during {wfoCity}</Text>. These are auto-skipped and won't break your streak.
          </Text>
          <Text style={{ ...Typography.callout, color: colors.textMuted, lineHeight: 22 }}>
            Habits you <Text style={{ color: colors.green }}>don't mark</Text> are your <Text style={{ color: colors.gold, fontWeight: '700' }}>non-negotiables</Text> — they must be done no matter where you are.
          </Text>
          <Text style={{ ...Typography.caption1, color: colors.textDim, fontStyle: 'italic' }}>
            "The battlefield changes. The warrior does not." — Gita
          </Text>
        </View>

        {/* Commute habits suggestion */}
        <View style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.separator, padding: Spacing.lg, gap: Spacing.sm }}>
          <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2 }}>THE COMMUTE IS YOUR SADHANA</Text>
          <Text style={{ ...Typography.callout, color: colors.textMuted, lineHeight: 22 }}>
            3 hours daily commute to {wfoCity} = your flexible habit window.
          </Text>
          {[
            { icon: '📖', tip: 'Reading — 20 pages per journey' },
            { icon: '🚫', tip: 'No social media — phone in pocket' },
            { icon: '🎧', tip: 'Learning — podcast or course audio' },
            { icon: '🧘', tip: 'Breathwork — 10 min before boarding' },
          ].map((tip, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <Text style={{ fontSize: 18 }}>{tip.icon}</Text>
              <Text style={{ ...Typography.footnote, color: colors.textMuted, flex: 1 }}>{tip.tip}</Text>
            </View>
          ))}
        </View>

        {/* Build habits */}
        {buildHabits.length > 0 && (
          <>
            <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2 }}>BUILD HABITS — SKIP DURING WFO?</Text>
            <View style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.separator, overflow: 'hidden' }}>
              {buildHabits.map((h, i) => (
                <View key={h.id}>
                  {i > 0 && <View style={{ height: 1, backgroundColor: colors.separator, marginHorizontal: Spacing.lg }} />}
                  <View style={{ flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md }}>
                    <View style={{ width: 40, height: 40, borderRadius: Radius.md, backgroundColor: (h.color || colors.gold) + '20', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 20 }}>{h.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...Typography.subheadline, color: colors.textPrimary, fontWeight: '600' }}>{h.name}</Text>
                      <Text style={{ ...Typography.caption1, color: h.is_wfo_skip ? colors.textDim : colors.green, marginTop: 2 }}>
                        {h.is_wfo_skip
                          ? `⏭ Skip in ${wfoCity}`
                          : `✅ Non-negotiable — always done`
                        }
                      </Text>
                    </View>
                    <Switch
                      value={!!h.is_wfo_skip}
                      onValueChange={() => _toggleHabitSkip(h)}
                      trackColor={{ false: colors.greenAlpha25, true: colors.separator }}
                      thumbColor={h.is_wfo_skip ? colors.textMuted : colors.green}
                    />
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Break habits */}
        {breakHabits.length > 0 && (
          <>
            <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2 }}>
              BREAK HABITS — {wfoCity} IS HIGH RISK
            </Text>
            <View style={{ backgroundColor: colors.redAlpha15, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.redAlpha25, padding: Spacing.lg, gap: Spacing.sm }}>
              <Text style={{ ...Typography.callout, color: colors.textMuted, lineHeight: 22 }}>
                ⚠️  Tired + alone + phone at 9 PM = maximum vulnerability.
              </Text>
              <Text style={{ ...Typography.footnote, color: colors.textDim, lineHeight: 18 }}>
                The Atomic Habits solution: make the response difficult. Phone charges in a different room by 9:30 PM. Not willpower. Friction.
              </Text>
            </View>
            <View style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.separator, overflow: 'hidden' }}>
              {breakHabits.map((h, i) => (
                <View key={h.id}>
                  {i > 0 && <View style={{ height: 1, backgroundColor: colors.separator, marginHorizontal: Spacing.lg }} />}
                  <View style={{ flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md }}>
                    <View style={{ width: 40, height: 40, borderRadius: Radius.md, backgroundColor: colors.redAlpha15, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 20 }}>{h.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...Typography.subheadline, color: colors.textPrimary, fontWeight: '600' }}>{h.name}</Text>
                      <Text style={{ ...Typography.caption1, color: colors.red, marginTop: 2 }}>
                        Always active — {wfoCity} makes this harder
                      </Text>
                    </View>
                    <Text style={{ ...Typography.caption2, color: colors.red, fontWeight: '700' }}>HOLD</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* 9 PM rule */}
        <View style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.separator, padding: Spacing.lg, gap: Spacing.md }}>
          <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2 }}>THE 9 PM RULE — {wfoCity.toUpperCase()}</Text>
          {[
            { icon: '🍽️', text: 'Eat dinner', color: colors.green },
            { icon: '📱', text: '5-min Karma check-in — mark today', color: colors.gold },
            { icon: '📖', text: '10 pages — in bed, winds you down', color: colors.blue },
            { icon: '🌙', text: 'Sleep by 10 PM — non-negotiable', color: colors.textMuted },
            { icon: '🔌', text: 'Phone charges in another room by 9:30', color: colors.green },
          ].map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <Text style={{ fontSize: 20 }}>{item.icon}</Text>
              <Text style={{ ...Typography.callout, color: item.color, flex: 1 }}>{item.text}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default WFOModeScreen;