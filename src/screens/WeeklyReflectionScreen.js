// ─── KARMA APP — WEEKLY REFLECTION SCREEN (PHASE B) ─────────────────
// Three questions. Every Sunday evening.
// "Reflect on this fully. Then do as you choose." — Gita 18.63
// Saved to database. Viewable as history.

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  TextInput, KeyboardAvoidingView, Platform, ScrollView,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '../constants/colors';
import {
  saveWeeklyReflection, getWeeklyReflections,
  getThisWeekReflection, getWeekMoodAverage,
} from '../database/moodService';
import { SHLOKAS } from '../constants/shlokas';
import ShlokaDisplay from '../components/ShlokaDisplay';
import { DateUtils } from '../utils/dateUtils';

const WeeklyReflectionScreen = ({ navigation }) => {
  const [wentWell,   setWentWell]   = useState('');
  const [struggled,  setStruggled]  = useState('');
  const [commitment, setCommitment] = useState('');
  const [saving,     setSaving]     = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [history,    setHistory]    = useState([]);
  const [moodAvg,    setMoodAvg]    = useState(null);
  const [showHistory,setShowHistory]= useState(false);
  const [existing,   setExisting]   = useState(null);

  useEffect(() => {
    _loadData();
  }, []);

  const _loadData = async () => {
    try {
      setLoading(true);
      const [existing, past, mood] = await Promise.all([
        getThisWeekReflection(),
        getWeeklyReflections(8),
        getWeekMoodAverage(),
      ]);

      if (existing) {
        setWentWell(existing.went_well || '');
        setStruggled(existing.struggled || '');
        setCommitment(existing.commitment || '');
        setExisting(existing);
      }
      setHistory(past);
      setMoodAvg(mood);
    } catch (err) {
      console.warn('WeeklyReflection load:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const _save = async () => {
    if (!wentWell.trim() || !commitment.trim()) {
      Alert.alert('Incomplete', 'Please answer at least what went well and your commitment.');
      return;
    }
    setSaving(true);
    try {
      await saveWeeklyReflection({ wentWell, struggled, commitment });
      Alert.alert(
        '☸ Reflection Saved',
        '"Reflect on this fully. Then do as you choose — with clarity."\n— Bhagavad Gita 18.63',
        [{ text: 'Return to Battlefield', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.gold} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weekly Reflection</Text>
        <TouchableOpacity
          onPress={() => setShowHistory(!showHistory)}
          style={styles.historyBtn}
        >
          <Text style={styles.historyBtnText}>{showHistory ? 'Write' : 'History'}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!showHistory ? (
            <>
              {/* Shloka */}
              <ShlokaDisplay shloka={SHLOKAS.weeklyReflection} variant="card" />

              {/* Week stats */}
              {moodAvg && (moodAvg.avgMood > 0 || moodAvg.avgEnergy > 0) && (
                <View style={styles.weekStatsRow}>
                  <View style={styles.weekStat}>
                    <Text style={styles.weekStatNum}>{moodAvg.avgMood || '—'}</Text>
                    <Text style={styles.weekStatLabel}>AVG MOOD</Text>
                  </View>
                  <View style={styles.weekStat}>
                    <Text style={styles.weekStatNum}>{moodAvg.avgEnergy || '—'}</Text>
                    <Text style={styles.weekStatLabel}>AVG ENERGY</Text>
                  </View>
                  <View style={[styles.weekStat, { flex: 2 }]}>
                    <Text style={[styles.weekStatNum, { fontSize: 14 }]}>
                      {existing ? '✓ Reflected' : 'Reflect now'}
                    </Text>
                    <Text style={styles.weekStatLabel}>THIS WEEK</Text>
                  </View>
                </View>
              )}

              {/* Question 1 */}
              <View style={styles.questionCard}>
                <Text style={styles.questionNum}>01</Text>
                <Text style={styles.questionText}>
                  What went well this week, Neel?
                </Text>
                <Text style={styles.questionHint}>
                  Name the victories. The rein held somewhere.
                </Text>
                <TextInput
                  style={styles.answerInput}
                  value={wentWell}
                  onChangeText={setWentWell}
                  placeholder="I held the rein on... I completed... I felt..."
                  placeholderTextColor={Colors.textPlaceholder}
                  multiline
                  maxLength={300}
                />
                <Text style={styles.charCount}>{wentWell.length}/300</Text>
              </View>

              {/* Question 2 */}
              <View style={styles.questionCard}>
                <Text style={styles.questionNum}>02</Text>
                <Text style={styles.questionText}>
                  Where did the horse bolt this week?
                </Text>
                <Text style={styles.questionHint}>
                  No shame. Be precise. The battlefield requires honesty.
                </Text>
                <TextInput
                  style={styles.answerInput}
                  value={struggled}
                  onChangeText={setStruggled}
                  placeholder="I struggled with... The trigger was... I noticed..."
                  placeholderTextColor={Colors.textPlaceholder}
                  multiline
                  maxLength={300}
                />
                <Text style={styles.charCount}>{struggled.length}/300</Text>
              </View>

              {/* Question 3 */}
              <View style={[styles.questionCard, { borderColor: Colors.goldAlpha40 }]}>
                <Text style={[styles.questionNum, { color: Colors.gold }]}>03</Text>
                <Text style={styles.questionText}>
                  What does Neel commit to next week?
                </Text>
                <Text style={styles.questionHint}>
                  One specific change. Not a wish. A declaration.
                </Text>
                <TextInput
                  style={styles.answerInput}
                  value={commitment}
                  onChangeText={setCommitment}
                  placeholder="Next week I will... I commit to... I declare..."
                  placeholderTextColor={Colors.textPlaceholder}
                  multiline
                  maxLength={200}
                />
                <Text style={styles.charCount}>{commitment.length}/200</Text>
              </View>

              {/* Save */}
              <TouchableOpacity
                style={[styles.saveBtn, { opacity: saving ? 0.7 : 1 }]}
                onPress={_save}
                disabled={saving}
                activeOpacity={0.85}
              >
                <Text style={styles.saveBtnText}>
                  {saving ? 'Saving reflection...' : existing ? 'Update Reflection' : 'Save Reflection'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.historyTitle}>Past Reflections</Text>
              {history.length === 0 && (
                <View style={styles.emptyHistory}>
                  <Text style={styles.emptyIcon}>📖</Text>
                  <Text style={styles.emptyText}>
                    No reflections yet. Write your first one today.
                  </Text>
                </View>
              )}
              {history.map((r, i) => (
                <View key={r.id} style={styles.historyCard}>
                  <Text style={styles.historyWeek}>
                    Week of {DateUtils.formatDate(r.week_start)}
                  </Text>
                  {r.went_well && (
                    <View style={styles.historySection}>
                      <Text style={styles.historySectionLabel}>WENT WELL</Text>
                      <Text style={styles.historyAnswer}>{r.went_well}</Text>
                    </View>
                  )}
                  {r.struggled && (
                    <View style={styles.historySection}>
                      <Text style={[styles.historySectionLabel, { color: Colors.red }]}>
                        STRUGGLED
                      </Text>
                      <Text style={styles.historyAnswer}>{r.struggled}</Text>
                    </View>
                  )}
                  {r.commitment && (
                    <View style={[styles.historySection, { borderColor: Colors.goldAlpha25 }]}>
                      <Text style={[styles.historySectionLabel, { color: Colors.gold }]}>
                        COMMITMENT
                      </Text>
                      <Text style={[styles.historyAnswer, { color: Colors.textSecondary }]}>
                        {r.commitment}
                      </Text>
                    </View>
                  )}
                  {(r.mood_avg > 0 || r.energy_avg > 0) && (
                    <Text style={styles.historyMood}>
                      Mood: {r.mood_avg}/5 · Energy: {r.energy_avg}/5
                    </Text>
                  )}
                </View>
              ))}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical:   Spacing.md,
    borderBottomWidth:  1,
    borderBottomColor:  Colors.separator,
  },
  backBtn:       { padding: Spacing.xs, minWidth: 60 },
  backText:      { ...Typography.body, color: Colors.gold },
  headerTitle:   { ...Typography.headline, color: Colors.textPrimary },
  historyBtn:    { padding: Spacing.xs, minWidth: 60, alignItems: 'flex-end' },
  historyBtnText:{ ...Typography.body, color: Colors.textMuted },

  content: { padding: Spacing.xl, gap: Spacing.lg },

  weekStatsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  weekStat: {
    flex:           1,
    backgroundColor: Colors.backgroundCard,
    borderRadius:   Radius.lg,
    borderWidth:     1,
    borderColor:    Colors.separator,
    padding:        Spacing.md,
    alignItems:     'center',
    gap:             4,
  },
  weekStatNum:   { fontSize: 22, fontWeight: '700', color: Colors.gold },
  weekStatLabel: { ...Typography.caption2, color: Colors.textDim, letterSpacing: 1 },

  questionCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius:    Radius.lg,
    borderWidth:      1,
    borderColor:     Colors.separator,
    padding:         Spacing.xl,
    gap:             Spacing.sm,
  },
  questionNum: {
    ...Typography.caption2,
    color:         Colors.gold,
    letterSpacing:  3,
    fontWeight:    '700',
  },
  questionText: { ...Typography.title3, color: Colors.textPrimary },
  questionHint: { ...Typography.footnote, color: Colors.textDim, fontStyle: 'italic' },
  answerInput: {
    ...Typography.callout,
    color:            Colors.textPrimary,
    minHeight:        80,
    textAlignVertical: 'top',
    borderTopWidth:    1,
    borderTopColor:   Colors.separator,
    paddingTop:       Spacing.md,
    marginTop:        Spacing.xs,
  },
  charCount: { ...Typography.caption2, color: Colors.textDim, textAlign: 'right' },

  saveBtn: {
    backgroundColor:  Colors.gold,
    borderRadius:     Radius.lg,
    paddingVertical:   18,
    alignItems:       'center',
  },
  saveBtnText: { ...Typography.headline, color: '#000' },

  historyTitle: { ...Typography.title2, color: Colors.textPrimary },
  emptyHistory: { alignItems: 'center', paddingVertical: 40, gap: Spacing.md },
  emptyIcon:    { fontSize: 48 },
  emptyText:    { ...Typography.body, color: Colors.textDim, textAlign: 'center' },

  historyCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius:    Radius.lg,
    borderWidth:      1,
    borderColor:     Colors.separator,
    padding:         Spacing.xl,
    gap:             Spacing.md,
  },
  historyWeek: { ...Typography.subheadline, color: Colors.gold, fontWeight: '600' },
  historySection: {
    borderLeftWidth:  2,
    borderLeftColor:  Colors.separator,
    paddingLeft:      Spacing.md,
    gap:              4,
  },
  historySectionLabel: { ...Typography.caption2, color: Colors.textDim, letterSpacing: 1.5 },
  historyAnswer:       { ...Typography.callout, color: Colors.textMuted, lineHeight: 22 },
  historyMood:         { ...Typography.caption1, color: Colors.textDim },
});

export default WeeklyReflectionScreen;