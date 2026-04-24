// ─── KARMA APP — NEURAL REWIRING SCREEN (PHASE D) ────────────────────
// 66-day science (Phillippa Lally, UCL 2010) visualised per habit.
// Shows Neel exactly where each habit is on the neural pathway.

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator,
  TouchableOpacity, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Typography, Spacing, Radius } from '../constants/colors';
import { getAllHabits } from '../database/habitService';
import { getNeuralProgress } from '../services/wfoService';
import ShlokaDisplay  from '../components/ShlokaDisplay';
import { SHLOKAS }    from '../constants/shlokas';

const PHASE_MILESTONES = [
  { day: 0,  label: 'Start',         icon: '🌱' },
  { day: 7,  label: '1 Week',        icon: '✊' },
  { day: 21, label: '21 Days',       icon: '🔥' },
  { day: 45, label: 'Halfway',       icon: '⭐' },
  { day: 66, label: 'Automatic',     icon: '🔱' },
];

const NeuralProgressScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [habits,  setHabits]  = useState([]);
  const [progress,setProgress]= useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { _loadData(); }, []);

  const _loadData = async () => {
    try {
      const habitsData = await getAllHabits();
      const progressMap = {};
      await Promise.all(habitsData.map(async h => {
        progressMap[h.id] = await getNeuralProgress(h.id);
      }));
      setHabits(habitsData);
      setProgress(progressMap);
    } catch (err) {
      console.warn('NeuralProgress load:', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={colors.gold} />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle="light-content" />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: colors.separator }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ ...Typography.body, color: colors.gold }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ ...Typography.headline, color: colors.textPrimary }}>Neural Rewiring</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.xl, gap: Spacing.xl }} showsVerticalScrollIndicator={false}>

        {/* Science card */}
        <View style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.xl, borderWidth: 1, borderColor: colors.separator, padding: Spacing.xl, gap: Spacing.lg }}>
          <Text style={{ ...Typography.caption2, color: colors.gold, letterSpacing: 2, fontWeight: '700' }}>THE NEUROSCIENCE</Text>

          <Text style={{ ...Typography.callout, color: colors.textMuted, lineHeight: 24 }}>
            A habit repeated for 15 years has built a <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>thick neural highway</Text> — fast, automatic, almost effortless.
          </Text>
          <Text style={{ ...Typography.callout, color: colors.textMuted, lineHeight: 24 }}>
            You cannot demolish it. You can only <Text style={{ color: colors.gold, fontWeight: '600' }}>build a better road alongside it</Text> and stop using the old one.
          </Text>

          {/* Timeline */}
          <View style={{ gap: Spacing.md }}>
            {[
              { days: '0–21', label: 'Forming',       desc: 'Neural connections being made. Willpower required. This is the hardest period.' },
              { days: '21–45', label: 'Strengthening', desc: 'Pathway widens. Habit starts feeling more natural. Resistance decreases.' },
              { days: '45–66', label: 'Deepening',     desc: 'Myelin sheath forming around new pathways. Near-automatic response.' },
              { days: '66+',   label: 'Automatic',     desc: 'The new road is built. Old road begins to fade. This is who you are now.' },
            ].map((phase, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: Spacing.md }}>
                <View style={{ width: 3, backgroundColor: colors.gold, borderRadius: 2, opacity: 0.3 + i * 0.15 }} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ ...Typography.subheadline, color: colors.textPrimary, fontWeight: '600' }}>{phase.label}</Text>
                    <Text style={{ ...Typography.caption1, color: colors.gold }}>Day {phase.days}</Text>
                  </View>
                  <Text style={{ ...Typography.caption1, color: colors.textDim, lineHeight: 17 }}>{phase.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={{ backgroundColor: colors.goldAlpha15, borderRadius: Radius.md, padding: Spacing.md }}>
            <Text style={{ ...Typography.caption1, color: colors.gold, textAlign: 'center', fontStyle: 'italic' }}>
              Research: Phillippa Lally, University College London (2010){'\n'}
              Average time for a behavior to become automatic: 66 days.
            </Text>
          </View>
        </View>

        {/* Per habit progress */}
        <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2 }}>YOUR HABITS — NEURAL PROGRESS</Text>

        {habits.length === 0 && (
          <View style={{ alignItems: 'center', padding: 40, gap: Spacing.md }}>
            <Text style={{ fontSize: 48 }}>🧠</Text>
            <Text style={{ ...Typography.body, color: colors.textDim, textAlign: 'center' }}>Add habits to see neural rewiring progress</Text>
          </View>
        )}

        {habits.map(habit => {
          const p = progress[habit.id];
          if (!p) return null;

          const phaseColor = p.phaseInfo?.color || colors.textDim;
          const isComplete = p.phase === 'automatic';

          return (
            <View key={habit.id} style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.xl, borderWidth: 1, borderColor: isComplete ? colors.greenAlpha25 : colors.separator, padding: Spacing.xl, gap: Spacing.lg }}>

              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                <View style={{ width: 48, height: 48, borderRadius: Radius.md, backgroundColor: (habit.color || colors.gold) + '20', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 24 }}>{habit.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...Typography.headline, color: colors.textPrimary }}>{habit.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 3 }}>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, backgroundColor: phaseColor + '20' }}>
                      <Text style={{ ...Typography.caption2, color: phaseColor, fontWeight: '700' }}>{p.phaseInfo?.label}</Text>
                    </View>
                    {isComplete && <Text style={{ ...Typography.caption1, color: colors.green }}>✓ Automatic behavior</Text>}
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: phaseColor }}>{p.percentage}%</Text>
                  <Text style={{ ...Typography.caption2, color: colors.textDim }}>rewired</Text>
                </View>
              </View>

              {/* Progress bar with phase markers */}
              <View>
                <View style={{ height: 12, backgroundColor: colors.backgroundElevated, borderRadius: Radius.full, overflow: 'hidden', position: 'relative' }}>
                  <View style={{
                    height: '100%',
                    width: `${p.percentage}%`,
                    backgroundColor: phaseColor,
                    borderRadius: Radius.full,
                  }} />
                  {/* Phase markers */}
                  {[21, 45, 66].map(day => (
                    <View key={day} style={{
                      position: 'absolute',
                      left: `${(day / 66) * 100}%`,
                      top: 0, bottom: 0,
                      width: 2,
                      backgroundColor: colors.background,
                      opacity: 0.5,
                    }} />
                  ))}
                </View>

                {/* Day labels */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                  <Text style={{ ...Typography.caption2, color: colors.textDim }}>Day 0</Text>
                  <Text style={{ ...Typography.caption2, color: colors.textDim }}>21</Text>
                  <Text style={{ ...Typography.caption2, color: colors.textDim }}>45</Text>
                  <Text style={{ ...Typography.caption2, color: colors.textDim }}>66</Text>
                </View>
              </View>

              {/* Stats */}
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <View style={{ flex: 1, backgroundColor: colors.backgroundElevated, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: phaseColor }}>{p.completedDays}</Text>
                  <Text style={{ ...Typography.caption2, color: colors.textDim }}>DAYS DONE</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: colors.backgroundElevated, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: isComplete ? colors.green : colors.textMuted }}>
                    {isComplete ? '✓' : p.daysLeft}
                  </Text>
                  <Text style={{ ...Typography.caption2, color: colors.textDim }}>
                    {isComplete ? 'COMPLETE' : 'DAYS LEFT'}
                  </Text>
                </View>
              </View>

              {/* Phase description */}
              <Text style={{ ...Typography.footnote, color: colors.textDim, fontStyle: 'italic', lineHeight: 18 }}>
                {p.phaseInfo?.desc}
              </Text>

              {/* Phase-specific shloka hint */}
              {p.phase === 'forming' && p.completedDays > 0 && (
                <View style={{ backgroundColor: colors.goldAlpha15, borderRadius: Radius.md, padding: Spacing.md }}>
                  <Text style={{ ...Typography.caption1, color: colors.gold, fontStyle: 'italic', textAlign: 'center' }}>
                    "अभ्यासेन तु कौन्तेय" — By practice, the mind is steadied. — Gita 6.35
                  </Text>
                </View>
              )}
              {p.phase === 'automatic' && (
                <View style={{ backgroundColor: colors.greenAlpha15, borderRadius: Radius.md, padding: Spacing.md }}>
                  <Text style={{ ...Typography.caption1, color: colors.green, fontStyle: 'italic', textAlign: 'center' }}>
                    This is no longer discipline. This is identity. You are this person. 🔱
                  </Text>
                </View>
              )}

              {/* 66-dot visual */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                {Array.from({ length: 66 }).map((_, i) => (
                  <View key={i} style={{
                    width: 10, height: 10, borderRadius: 2,
                    backgroundColor: i < p.completedDays
                      ? phaseColor + 'CC'
                      : colors.backgroundElevated,
                  }} />
                ))}
              </View>
              <Text style={{ ...Typography.caption2, color: colors.textDim, textAlign: 'right' }}>
                {p.completedDays} of 66 days
              </Text>
            </View>
          );
        })}

        {/* Closing shloka */}
        <ShlokaDisplay shloka={SHLOKAS.milestone21} variant="card" />

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default NeuralProgressScreen;