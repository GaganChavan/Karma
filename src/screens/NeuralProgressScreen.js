// ─── KARMA APP — NEURAL REWIRING SCREEN (PHASE F-3) ─────────────────
// Phase F-3 changes:
// 1. Calendar pattern: shows WHICH actual days were practiced (mini heatmap)
//    Each cell = a calendar day (not a practice session)
// 2. Better explanation: "X practice sessions (non-consecutive days count)"
//    Clarifies the 66 dots = session counter, not calendar
// 3. Pace prediction: "At current pace, ~X more sessions needed"
// 4. Handles optional habitId param:
//    - From HabitDetailScreen: shows that single habit focused
//    - From Settings: shows all habits
// 5. Route params: { habitId?, habitName?, accentColor? }

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator,
  TouchableOpacity, StatusBar,
} from 'react-native';
import { SafeAreaView }  from 'react-native-safe-area-context';
import { useTheme, Typography, Spacing, Radius } from '../constants/colors';
import { getAllHabits, getCheckinsForHabit } from '../database/habitService';
import { getNeuralProgress }                from '../services/wfoService';
import ShlokaDisplay                        from '../components/ShlokaDisplay';
import { SHLOKAS }                          from '../constants/shlokas';

const APP_BIRTH = '2026-05-01';

// ── Calendar mini-heatmap for a single habit ─────────────────────────
// Shows WHICH days were practiced — the actual calendar pattern.
// This is separate from the 66-dot counter (which counts total sessions).
const PracticeCalendar = ({ checkins, habitCreatedAt, accentColor, colors }) => {
  if (!checkins || checkins.length === 0) return null;

  const today   = new Date();
  today.setHours(0, 0, 0, 0);

  const createdDate = new Date(habitCreatedAt || APP_BIRTH);
  createdDate.setHours(0, 0, 0, 0);
  const appBirth = new Date(APP_BIRTH + 'T00:00:00');
  const ninetyAgo = new Date(today);
  ninetyAgo.setDate(today.getDate() - 89);

  const startDate = [createdDate, appBirth, ninetyAgo].reduce((max, d) => d > max ? d : max);

  const statusMap = {};
  checkins.forEach(c => { statusMap[c.date] = c.status; });

  const days = [];
  const d = new Date(startDate);
  while (d <= today) {
    days.push({ date: d.toISOString().split('T')[0], isToday: d.getTime() === today.getTime() });
    d.setDate(d.getDate() + 1);
  }

  // Pad to Mon start
  const firstDow = (new Date(days[0]?.date).getDay() + 6) % 7;
  const padded   = Array(firstDow).fill(null).concat(days);
  const weeks    = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  const CELL = 9;
  const GAP  = 2;

  const getCellColor = (status) => {
    if (status === 'done' || status === 'resisted') return accentColor;
    if (status === 'missed' || status === 'slip')   return colors.red + '50';
    if (status === 'skipped' || status === 'auto_skipped') return colors.backgroundElevated;
    return colors.backgroundCard;
  };

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 1.5 }}>CALENDAR PATTERN</Text>
      <Text style={{ ...Typography.caption2, color: colors.textDim, lineHeight: 15 }}>
        Each square = one calendar day. Practice days shown in color.
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row' }}>
          {/* Day labels */}
          <View style={{ width: 10, marginRight: 3 }}>
            {['M','T','W','T','F','S','S'].map((l, i) => (
              <Text key={i} style={{ fontSize: 6, color: colors.textDim, height: CELL + GAP, lineHeight: CELL + GAP, textAlign: 'right' }}>
                {l}
              </Text>
            ))}
          </View>
          {/* Grid */}
          <View style={{ flexDirection: 'row' }}>
            {weeks.map((week, wi) => (
              <View key={wi} style={{ flexDirection: 'column', marginRight: GAP }}>
                {week.map((day, di) => {
                  if (!day) return <View key={di} style={{ width: CELL, height: CELL, marginBottom: GAP }} />;
                  const status = statusMap[day.date];
                  return (
                    <View key={di} style={{
                      width: CELL, height: CELL, borderRadius: 2, marginBottom: GAP,
                      backgroundColor: getCellColor(status),
                      borderWidth:  day.isToday ? 1.5 : 0,
                      borderColor:  accentColor,
                    }} />
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      {/* Legend */}
      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        {[
          { color: accentColor, label: 'Practiced' },
          { color: colors.red + '50', label: 'Missed' },
          { color: colors.backgroundElevated, label: 'Skipped', border: true },
        ].map((l, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: l.color, borderWidth: l.border ? 1 : 0, borderColor: colors.separator }} />
            <Text style={{ fontSize: 8, color: colors.textDim }}>{l.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// ── Main Screen ────────────────────────────────────────────────────────
const NeuralProgressScreen = ({ navigation, route }) => {
  const { colors } = useTheme();

  // Optional: focus on a specific habit (from HabitDetailScreen)
  const focusHabitId    = route?.params?.habitId    || null;
  const focusHabitName  = route?.params?.habitName  || null;
  const focusAccentColor = route?.params?.accentColor || null;

  const [habits,   setHabits]   = useState([]);
  const [progress, setProgress] = useState({});
  const [checkins, setCheckins] = useState({});  // habitId → checkin array
  const [loading,  setLoading]  = useState(true);

  useEffect(() => { _loadData(); }, []);

  const _loadData = async () => {
    try {
      const habitsData = focusHabitId
        ? (await getAllHabits()).filter(h => h.id === focusHabitId)
        : await getAllHabits();

      const [progressResults, checkinResults] = await Promise.all([
        Promise.all(habitsData.map(h => getNeuralProgress(h.id).then(p => [h.id, p]))),
        Promise.all(habitsData.map(h => getCheckinsForHabit(h.id, 90).then(cs => [h.id, cs]))),
      ]);

      const progressMap = Object.fromEntries(progressResults);
      const checkinMap  = Object.fromEntries(checkinResults);

      setHabits(habitsData);
      setProgress(progressMap);
      setCheckins(checkinMap);
    } catch (err) {
      console.warn('NeuralProgress load:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Pace prediction: given practice rate, how many more days until 66 sessions?
  const _getPacePrediction = (completedDays, habitCreatedAt) => {
    const today     = new Date();
    const startD    = new Date(Math.max(
      new Date(habitCreatedAt || APP_BIRTH).getTime(),
      new Date(APP_BIRTH + 'T00:00:00').getTime()
    ));
    const daysSince = Math.max(1, Math.floor((today - startD) / 86400000) + 1);
    const rate      = completedDays / daysSince;  // fraction of days practiced

    if (completedDays >= 66) return null;  // complete
    if (rate <= 0) return null;             // no data yet

    const remaining = 66 - completedDays;
    const daysNeeded = Math.ceil(remaining / rate);

    return {
      rate:        Math.round(rate * 100),   // % of days practiced
      daysNeeded,
      daysSince,
    };
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={colors.gold} />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: colors.separator }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ ...Typography.body, color: colors.gold }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ ...Typography.headline, color: colors.textPrimary }}>
          {focusHabitName ? `${focusHabitName}` : 'Neural Rewiring'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.xl, gap: Spacing.xl }} showsVerticalScrollIndicator={false}>

        {/* Science explanation card */}
        <View style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.xl, borderWidth: 1, borderColor: colors.separator, padding: Spacing.xl, gap: Spacing.lg }}>
          <Text style={{ ...Typography.caption2, color: colors.gold, letterSpacing: 2, fontWeight: '700' }}>THE NEUROSCIENCE</Text>

          <Text style={{ ...Typography.callout, color: colors.textMuted, lineHeight: 24 }}>
            A habit repeated for 15 years has built a{' '}
            <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>thick neural highway</Text>
            {' '}— fast, automatic, almost effortless.
          </Text>
          <Text style={{ ...Typography.callout, color: colors.textMuted, lineHeight: 24 }}>
            You cannot demolish it. You can only{' '}
            <Text style={{ color: colors.gold, fontWeight: '600' }}>build a better road alongside it</Text>
            {' '}and stop using the old one.
          </Text>

          {/* HOW TO READ THIS PAGE — added in Phase F-3 */}
          <View style={{ backgroundColor: colors.goldAlpha15, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: colors.goldAlpha25 }}>
            <Text style={{ ...Typography.caption2, color: colors.gold, letterSpacing: 1.5, fontWeight: '700' }}>HOW TO READ THIS PAGE</Text>
            <Text style={{ ...Typography.caption1, color: colors.textMuted, lineHeight: 18 }}>
              <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>The 66 dots</Text>
              {' '}= a counter of your total practice sessions. Each time you log Done/Resisted, one dot fills. The dots are NOT calendar days — they count total repetitions regardless of when.{'\n\n'}
              <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>The calendar</Text>
              {' '}below each habit shows your actual daily pattern — which calendar days you practiced, missed, or skipped. Gaps in the calendar don't reset your dot count.{'\n\n'}
              <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>Key insight</Text>
              {': Lally (UCL, 2010) found that missing occasional days did NOT derail the habit formation process. What matters is total repetitions, not perfect consecutive streaks.'}
            </Text>
          </View>

          {/* 4-phase timeline */}
          <View style={{ gap: Spacing.md }}>
            {[
              { days: '0–21',  label: 'Forming',      desc: 'Neural connections being made. Willpower required. Hardest period.',        color: colors.red },
              { days: '21–45', label: 'Strengthening', desc: 'Pathway widens. Habit starts feeling more natural. Resistance decreases.',  color: colors.orange },
              { days: '45–66', label: 'Deepening',     desc: 'Myelin sheath forming around new pathways. Near-automatic response.',       color: colors.gold },
              { days: '66+',   label: 'Automatic',     desc: 'The new road is built. Old road begins to fade. This is who you are now.',  color: colors.green },
            ].map((phase, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: Spacing.md }}>
                <View style={{ width: 3, backgroundColor: phase.color, borderRadius: 2 }} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ ...Typography.subheadline, color: colors.textPrimary, fontWeight: '600' }}>{phase.label}</Text>
                    <Text style={{ ...Typography.caption1, color: phase.color }}>Session {phase.days}</Text>
                  </View>
                  <Text style={{ ...Typography.caption1, color: colors.textDim, lineHeight: 17 }}>{phase.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={{ backgroundColor: colors.backgroundElevated, borderRadius: Radius.md, padding: Spacing.md }}>
            <Text style={{ ...Typography.caption1, color: colors.textDim, textAlign: 'center', fontStyle: 'italic' }}>
              Research: Phillippa Lally, University College London (2010){'\n'}
              Average practice sessions for automatic behavior: 66 (range: 18–254)
            </Text>
          </View>
        </View>

        {/* Per-habit progress */}
        <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2 }}>
          {focusHabitId ? 'YOUR HABIT — NEURAL PROGRESS' : 'YOUR HABITS — NEURAL PROGRESS'}
        </Text>

        {habits.length === 0 && (
          <View style={{ alignItems: 'center', padding: 40, gap: Spacing.md }}>
            <Text style={{ fontSize: 48 }}>🧠</Text>
            <Text style={{ ...Typography.body, color: colors.textDim, textAlign: 'center' }}>
              Add habits to see neural rewiring progress
            </Text>
          </View>
        )}

        {habits.map(habit => {
          const p           = progress[habit.id];
          const habitCkins  = checkins[habit.id] || [];
          if (!p) return null;

          const phaseColor  = p.phaseInfo?.color || colors.textDim;
          const isComplete  = p.phase === 'automatic';
          const accentColor = focusAccentColor || habit.color || colors.gold;
          const prediction  = _getPacePrediction(p.completedDays, habit.created_at);

          return (
            <View key={habit.id} style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.xl, borderWidth: 1, borderColor: isComplete ? colors.greenAlpha25 : colors.separator, padding: Spacing.xl, gap: Spacing.lg }}>

              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                <View style={{ width: 48, height: 48, borderRadius: Radius.md, backgroundColor: accentColor + '20', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 24 }}>{habit.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...Typography.headline, color: colors.textPrimary }}>{habit.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 3 }}>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, backgroundColor: phaseColor + '20' }}>
                      <Text style={{ ...Typography.caption2, color: phaseColor, fontWeight: '700' }}>
                        {p.phaseInfo?.label}
                      </Text>
                    </View>
                    {isComplete && (
                      <Text style={{ ...Typography.caption1, color: colors.green }}>✓ Automatic behavior</Text>
                    )}
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: phaseColor }}>{p.percentage}%</Text>
                  <Text style={{ ...Typography.caption2, color: colors.textDim }}>rewired</Text>
                </View>
              </View>

              {/* Session counter explanation */}
              <View style={{ backgroundColor: colors.backgroundElevated, borderRadius: Radius.md, padding: Spacing.md }}>
                <Text style={{ ...Typography.caption1, color: colors.textMuted, textAlign: 'center', lineHeight: 18 }}>
                  <Text style={{ fontWeight: '700', color: phaseColor }}>{p.completedDays} practice sessions</Text>
                  {' '}completed (non-consecutive days count){'\n'}
                  {isComplete
                    ? 'This habit is now automatic — the pathway is built 🔱'
                    : `${66 - p.completedDays} more sessions needed to reach automatic`}
                </Text>
              </View>

              {/* Pace prediction — Phase F-3 */}
              {prediction && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: accentColor + '12', borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: accentColor + '30' }}>
                  <Text style={{ fontSize: 20 }}>⚡</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...Typography.caption1, color: colors.textMuted, lineHeight: 18 }}>
                      Practicing{' '}
                      <Text style={{ fontWeight: '700', color: accentColor }}>{prediction.rate}% of days</Text>
                      {' '}({p.completedDays} done in {prediction.daysSince} days tracked){'\n'}
                      At this pace:{' '}
                      <Text style={{ fontWeight: '700', color: accentColor }}>
                        ~{prediction.daysNeeded} more calendar days
                      </Text>
                      {' '}to reach automatic
                    </Text>
                  </View>
                </View>
              )}

              {/* Progress bar with phase markers */}
              <View>
                <View style={{ height: 12, backgroundColor: colors.backgroundElevated, borderRadius: Radius.full, overflow: 'hidden', position: 'relative' }}>
                  <View style={{ height: '100%', width: `${p.percentage}%`, backgroundColor: phaseColor, borderRadius: Radius.full }} />
                  {[21, 45].map(session => (
                    <View key={session} style={{ position: 'absolute', left: `${(session / 66) * 100}%`, top: 0, bottom: 0, width: 2, backgroundColor: colors.background, opacity: 0.5 }} />
                  ))}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                  <Text style={{ ...Typography.caption2, color: colors.textDim }}>Session 0</Text>
                  <Text style={{ ...Typography.caption2, color: colors.textDim }}>21</Text>
                  <Text style={{ ...Typography.caption2, color: colors.textDim }}>45</Text>
                  <Text style={{ ...Typography.caption2, color: colors.textDim }}>66</Text>
                </View>
              </View>

              {/* Stats row */}
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <View style={{ flex: 1, backgroundColor: colors.backgroundElevated, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: phaseColor }}>{p.completedDays}</Text>
                  <Text style={{ ...Typography.caption2, color: colors.textDim }}>SESSIONS</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: colors.backgroundElevated, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: isComplete ? colors.green : colors.textMuted }}>
                    {isComplete ? '✓' : p.daysLeft}
                  </Text>
                  <Text style={{ ...Typography.caption2, color: colors.textDim }}>
                    {isComplete ? 'COMPLETE' : 'REMAINING'}
                  </Text>
                </View>
              </View>

              {/* Phase description */}
              <Text style={{ ...Typography.footnote, color: colors.textDim, fontStyle: 'italic', lineHeight: 18 }}>
                {p.phaseInfo?.desc}
              </Text>

              {/* Phase-specific shloka */}
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

              {/* 66-dot session counter */}
              <View style={{ gap: 6 }}>
                <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 1.5 }}>SESSION COUNTER (66 TOTAL)</Text>
                <Text style={{ ...Typography.caption2, color: colors.textDim, lineHeight: 15 }}>
                  Each dot = one practice session. Filled left-to-right as you practice.
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                  {Array.from({ length: 66 }).map((_, i) => (
                    <View key={i} style={{
                      width: 10, height: 10, borderRadius: 2,
                      backgroundColor: i < p.completedDays ? phaseColor + 'CC' : colors.backgroundElevated,
                    }} />
                  ))}
                </View>
                <Text style={{ ...Typography.caption2, color: colors.textDim, textAlign: 'right' }}>
                  {p.completedDays}/66 practice sessions
                </Text>
              </View>

              {/* Phase F-3: Calendar pattern */}
              <PracticeCalendar
                checkins={habitCkins}
                habitCreatedAt={habit.created_at}
                accentColor={accentColor}
                colors={colors}
              />
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