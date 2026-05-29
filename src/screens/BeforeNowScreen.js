// ─── KARMA APP — BEFORE vs NOW SCREEN (PHASE D) ─────────────────────
// Unlocks at 90 days of data.
// Shows Gagan who he was vs who he is becoming.
// The transformation visualised.

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  StatusBar, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Typography, Spacing, Radius } from '../constants/colors';
import { getBeforeNowData } from '../services/wfoService';
import { getFullStats }     from '../services/gamificationService';
import { TRANSFORMATION_SENTENCE } from '../constants/appConfig';
import ShlokaDisplay        from '../components/ShlokaDisplay';
import { SHLOKAS }          from '../constants/shlokas';

const BeforeNowScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [data,    setData]    = useState(null);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { _loadData(); }, []);

  const _loadData = async () => {
    try {
      const [bn, gam] = await Promise.all([
        getBeforeNowData(),
        getFullStats(),
      ]);
      setData(bn);
      setStats(gam);
    } catch (err) {
      console.warn('BeforeNow load:', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={colors.gold} />
    </View>
  );

  if (!data) return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 32, gap: Spacing.lg }}>
      <Text style={{ fontSize: 64 }}>🌱</Text>
      <Text style={{ ...Typography.title2, color: colors.textPrimary, textAlign: 'center' }}>Keep Going</Text>
      <Text style={{ ...Typography.body, color: colors.textMuted, textAlign: 'center', lineHeight: 26 }}>
        Before vs Now unlocks after 90 days of tracking. The story needs time to be told.
      </Text>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ backgroundColor: colors.gold, paddingHorizontal: 24, paddingVertical: 13, borderRadius: Radius.lg }}>
        <Text style={{ ...Typography.headline, color: '#000' }}>Back to Battlefield</Text>
      </TouchableOpacity>
    </View>
  );

  const improvement = data.recentRate - data.earlyRate;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle="light-content" />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: colors.separator }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ ...Typography.body, color: colors.gold }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ ...Typography.headline, color: colors.textPrimary }}>Before vs Now</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.xl, gap: Spacing.xl }} showsVerticalScrollIndicator={false}>

        {/* Title */}
        <View style={{ alignItems: 'center', gap: Spacing.md }}>
          <Text style={{ fontSize: 56 }}>☸</Text>
          <Text style={{ ...Typography.title1, color: colors.textPrimary, textAlign: 'center' }}>
            90 Days of {data.alterEgo}
          </Text>
          <Text style={{ ...Typography.callout, color: colors.textMuted, textAlign: 'center', lineHeight: 22 }}>
            This is what consistent action looks like.{'\n'}
            This is who you are becoming.
          </Text>
        </View>

        {/* Before vs Now grid */}
        <View style={{ flexDirection: 'row', gap: Spacing.md }}>
          {/* Before */}
          <View style={{ flex: 1, backgroundColor: colors.backgroundCard, borderRadius: Radius.xl, borderWidth: 1, borderColor: colors.separator, padding: Spacing.xl, gap: Spacing.lg, alignItems: 'center' }}>
            <Text style={{ ...Typography.caption2, color: colors.red, letterSpacing: 2, fontWeight: '700' }}>BEFORE</Text>
            <Text style={{ ...Typography.caption1, color: colors.textDim }}>First 30 days</Text>

            <Text style={{ fontSize: 44, fontWeight: '700', color: data.earlyRate >= 60 ? colors.gold : colors.red }}>
              {data.earlyRate}%
            </Text>
            <Text style={{ ...Typography.caption1, color: colors.textDim, textAlign: 'center' }}>completion rate</Text>

            <View style={{ width: '100%', gap: Spacing.xs }}>
              <Text style={{ ...Typography.caption2, color: colors.textDim }}>State</Text>
              <Text style={{ ...Typography.footnote, color: colors.textMuted, fontStyle: 'italic', lineHeight: 18 }}>
                {data.earlyRate < 40
                  ? 'Struggling. The horse ran often.'
                  : data.earlyRate < 70
                  ? 'Building. The rein was finding its grip.'
                  : 'Strong start. Foundation being laid.'
                }
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 24, color: colors.gold }}>→</Text>
          </View>

          {/* Now */}
          <View style={{ flex: 1, backgroundColor: colors.goldAlpha15, borderRadius: Radius.xl, borderWidth: 2, borderColor: colors.goldAlpha40, padding: Spacing.xl, gap: Spacing.lg, alignItems: 'center' }}>
            <Text style={{ ...Typography.caption2, color: colors.gold, letterSpacing: 2, fontWeight: '700' }}>NOW</Text>
            <Text style={{ ...Typography.caption1, color: colors.textDim }}>Last 30 days</Text>

            <Text style={{ fontSize: 44, fontWeight: '700', color: data.recentRate >= 70 ? colors.green : data.recentRate >= 50 ? colors.gold : colors.red }}>
              {data.recentRate}%
            </Text>
            <Text style={{ ...Typography.caption1, color: colors.textDim, textAlign: 'center' }}>completion rate</Text>

            <View style={{ width: '100%', gap: Spacing.xs }}>
              <Text style={{ ...Typography.caption2, color: colors.textDim }}>State</Text>
              <Text style={{ ...Typography.footnote, color: colors.textMuted, fontStyle: 'italic', lineHeight: 18 }}>
                {data.recentRate >= 80
                  ? 'The rein holds firm. This is identity.'
                  : data.recentRate >= 60
                  ? 'Strengthening. The warrior is finding rhythm.'
                  : 'The battle continues. Every day counts.'
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Improvement banner */}
        <View style={{
          backgroundColor: improvement > 0 ? colors.greenAlpha15 : improvement < 0 ? colors.redAlpha15 : colors.backgroundCard,
          borderRadius:    Radius.xl,
          borderWidth:      1,
          borderColor:     improvement > 0 ? colors.greenAlpha25 : improvement < 0 ? colors.redAlpha25 : colors.separator,
          padding:         Spacing.xl,
          alignItems:      'center',
          gap:             Spacing.sm,
        }}>
          <Text style={{ ...Typography.largeTitle, color: improvement > 0 ? colors.green : improvement < 0 ? colors.red : colors.gold, fontWeight: '700' }}>
            {improvement > 0 ? '+' : ''}{improvement}%
          </Text>
          <Text style={{ ...Typography.headline, color: colors.textPrimary }}>
            {improvement > 0 ? 'Improvement' : improvement < 0 ? 'Regression' : 'Steady'}
          </Text>
          <Text style={{ ...Typography.callout, color: colors.textMuted, textAlign: 'center' }}>
            {improvement > 15
              ? `The transformation is real, ${data.alterEgo}. The data doesn't lie.`
              : improvement > 0
              ? 'Progress. The new road is being built.'
              : improvement < 0
              ? 'The horse gained ground. The rein tightens from today.'
              : 'Consistent. The warrior holds the same ground.'
            }
          </Text>
        </View>

        {/* Stats card */}
        <View style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.xl, borderWidth: 1, borderColor: colors.separator, padding: Spacing.xl, gap: Spacing.lg }}>
          <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2 }}>90 DAYS IN NUMBERS</Text>

          {[
            {
              label: 'Total Habits Completed',
              value: String(data.totalDone),
              icon:  '✅',
              color: colors.green,
              desc:  `${data.totalDone} times you chose discipline over comfort`,
            },
            {
              label: 'Best Current Streak',
              value: `${data.bestCurrent} days`,
              icon:  '🪔',
              color: colors.gold,
              desc:  `${data.bestCurrent} consecutive days — the rein held`,
            },
            {
              label: 'Personal Best Ever',
              value: `${data.bestEver} days`,
              icon:  '🏆',
              color: colors.gold,
              desc:  `The longest unbroken chain you\'ve built`,
            },
            {
              label: 'Total Karma XP',
              value: String(data.totalXP),
              icon:  '⚡',
              color: colors.blue,
              desc:  `Every XP point is a real decision made`,
            },
            ...(data.totalSlips90 > 0 ? [{
              label: 'Break Habit Slips (90d)',
              value: String(data.totalSlips90),
              icon:  '😔',
              color: data.totalSlips90 < 10 ? colors.gold : colors.red,
              desc:  data.recentSlips < data.totalSlips90 / 3
                ? 'Slips reducing. The horse is learning.'
                : 'Still fighting. The awareness is the weapon.',
            }] : []),
          ].map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' }}>
              <View style={{ width: 48, height: 48, borderRadius: Radius.md, backgroundColor: s.color + '20', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22 }}>{s.icon}</Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ ...Typography.subheadline, color: colors.textMuted }}>{s.label}</Text>
                  <Text style={{ ...Typography.headline, color: s.color, fontWeight: '700' }}>{s.value}</Text>
                </View>
                <Text style={{ ...Typography.caption1, color: colors.textDim, lineHeight: 16, fontStyle: 'italic' }}>{s.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Level */}
        {stats?.levelInfo && (
          <View style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.xl, borderWidth: 1, borderColor: stats.levelInfo.color + '30', padding: Spacing.xl, flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
            <Text style={{ fontSize: 44 }}>{stats.levelInfo.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2, marginBottom: 4 }}>YOU ARE NOW</Text>
              <Text style={{ ...Typography.title2, color: stats.levelInfo.color }}>{stats.levelInfo.title}</Text>
              <Text style={{ ...Typography.callout, color: colors.textMuted }}>Level {stats.levelInfo.level} · {data.totalXP} XP</Text>
            </View>
          </View>
        )}

        {/* Closing shloka */}
        <ShlokaDisplay shloka={SHLOKAS.milestone90} variant="card" />

        {/* Identity declaration */}
        <View style={{ backgroundColor: colors.goldAlpha15, borderRadius: Radius.xl, borderWidth: 1, borderColor: colors.goldAlpha40, padding: Spacing.xl, alignItems: 'center', gap: Spacing.md }}>
          <Text style={{ ...Typography.caption2, color: colors.gold, letterSpacing: 3 }}>THE DECLARATION HOLDS</Text>
          <Text style={{ ...Typography.title3, color: colors.gold, textAlign: 'center', fontStyle: 'italic' }}>
            {TRANSFORMATION_SENTENCE}
          </Text>
          <Text style={{ ...Typography.callout, color: colors.textMuted, textAlign: 'center', fontStyle: 'italic', lineHeight: 22 }}>
            The sky does not become still by accident. 90 days of choosing made this real.
          </Text>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default BeforeNowScreen;