// ─── KARMA APP — MOOD LOG SCREEN (PHASE B) ───────────────────────────
// Simple 1-5 scale for mood and energy.
// Morning and evening logs separately.
// Over time — reveals your energy-discipline pattern.

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, TextInput, KeyboardAvoidingView,
  Platform, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '../constants/colors';
import { logMood, getTodayMood } from '../database/moodService';
import { getShloka } from '../constants/shlokas';
import ShlokaDisplay from '../components/ShlokaDisplay';

const MOOD_LABELS = ['', 'Struggling', 'Low', 'Okay', 'Good', 'Excellent'];
const ENERGY_LABELS = ['', 'Drained', 'Tired', 'Moderate', 'Energised', 'Peak'];
const MOOD_COLORS  = ['', Colors.red, Colors.orange, Colors.gold, Colors.green, '#00E676'];

const ScaleSelector = ({ value, onChange, labels, colors }) => (
  <View style={styles.scale}>
    {[1, 2, 3, 4, 5].map(n => (
      <TouchableOpacity
        key={n}
        style={[styles.scaleDot, {
          backgroundColor: value === n ? (colors[n] || Colors.gold) : Colors.backgroundCard,
          borderColor:     value === n ? (colors[n] || Colors.gold) : Colors.separator,
          transform:       [{ scale: value === n ? 1.15 : 1 }],
        }]}
        onPress={() => onChange(n)}
        activeOpacity={0.8}
      >
        <Text style={[styles.scaleNum, { color: value === n ? '#000' : Colors.textDim }]}>
          {n}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const MoodLogScreen = ({ navigation, route }) => {
  const timeOfDay = route?.params?.timeOfDay || (new Date().getHours() < 14 ? 'morning' : 'evening');

  const [mood,    setMood]    = useState(0);
  const [energy,  setEnergy]  = useState(0);
  const [note,    setNote]    = useState('');
  const [saving,  setSaving]  = useState(false);
  const [existing,setExisting]= useState(null);

  const shloka = getShloka(timeOfDay === 'morning' ? 'morning' : 'evening');

  useEffect(() => {
    _loadExisting();
  }, []);

  const _loadExisting = async () => {
    try {
      const today = await getTodayMood();
      const entry = today[timeOfDay];
      if (entry) {
        setMood(entry.mood);
        setEnergy(entry.energy);
        setNote(entry.note || '');
        setExisting(entry);
      }
    } catch {}
  };

  const _save = async () => {
    if (mood === 0 || energy === 0) {
      Alert.alert('Incomplete', 'Set both mood and energy before saving.');
      return;
    }
    setSaving(true);
    try {
      await logMood({ timeOfDay, mood, energy, note: note.trim() || null });
      Alert.alert(
        '✅ Logged',
        `${timeOfDay === 'morning' ? 'Morning' : 'Evening'} check-in saved.\n\nMood: ${MOOD_LABELS[mood]} · Energy: ${ENERGY_LABELS[energy]}`,
        [{ text: 'Continue', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const isMorning = timeOfDay === 'morning';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isMorning ? '🌅 Morning Check-in' : '🌙 Evening Check-in'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
        >
          {/* Context shloka */}
          <ShlokaDisplay shloka={shloka} variant="card" />

          {/* Why this matters */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>
              {isMorning
                ? 'How you begin shapes how you act.'
                : 'How you end reveals what you need.'}
            </Text>
            <Text style={styles.infoText}>
              After 30 days, Karma will show you exactly when your senses are strongest and when your rein is weakest. That is battlefield intelligence.
            </Text>
          </View>

          {/* Mood */}
          <Text style={styles.sectionLabel}>HOW IS YOUR MIND TODAY?</Text>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Mood</Text>
              {mood > 0 && (
                <Text style={[styles.cardValue, { color: MOOD_COLORS[mood] }]}>
                  {MOOD_LABELS[mood]}
                </Text>
              )}
            </View>
            <ScaleSelector
              value={mood}
              onChange={setMood}
              labels={MOOD_LABELS}
              colors={MOOD_COLORS}
            />
            <View style={styles.scaleHints}>
              <Text style={styles.scaleHint}>Struggling</Text>
              <Text style={styles.scaleHint}>Excellent</Text>
            </View>
          </View>

          {/* Energy */}
          <Text style={styles.sectionLabel}>HOW IS YOUR ENERGY?</Text>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Energy</Text>
              {energy > 0 && (
                <Text style={[styles.cardValue, { color: MOOD_COLORS[energy] }]}>
                  {ENERGY_LABELS[energy]}
                </Text>
              )}
            </View>
            <ScaleSelector
              value={energy}
              onChange={setEnergy}
              labels={ENERGY_LABELS}
              colors={MOOD_COLORS}
            />
            <View style={styles.scaleHints}>
              <Text style={styles.scaleHint}>Drained</Text>
              <Text style={styles.scaleHint}>Peak</Text>
            </View>
          </View>

          {/* Optional note */}
          <Text style={styles.sectionLabel}>ANYTHING TO NOTE? (OPTIONAL)</Text>
          <View style={styles.noteCard}>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder={isMorning
                ? 'What sets the tone for today?'
                : 'What challenged you today?'
              }
              placeholderTextColor={Colors.textPlaceholder}
              multiline
              maxLength={200}
              returnKeyType="done"
            />
            <Text style={styles.charCount}>{note.length}/200</Text>
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveBtn, { opacity: saving || (mood === 0 || energy === 0) ? 0.6 : 1 }]}
            onPress={_save}
            disabled={saving || mood === 0 || energy === 0}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'Saving...' : existing ? 'Update Check-in' : 'Save Check-in'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical:   Spacing.md,
    borderBottomWidth:  1,
    borderBottomColor:  Colors.separator,
  },
  backBtn:     { padding: Spacing.xs },
  backText:    { ...Typography.body, color: Colors.gold },
  headerTitle: { ...Typography.headline, color: Colors.textPrimary, flex: 1, textAlign: 'center' },

  content: {
    padding:  Spacing.xl,
    gap:      Spacing.lg,
  },

  infoCard: {
    backgroundColor: Colors.goldAlpha15,
    borderRadius:    Radius.lg,
    borderWidth:      1,
    borderColor:     Colors.goldAlpha25,
    padding:         Spacing.lg,
    gap:             Spacing.sm,
  },
  infoTitle: { ...Typography.subheadline, color: Colors.gold, fontWeight: '600' },
  infoText:  { ...Typography.footnote, color: Colors.textMuted, lineHeight: 18 },

  sectionLabel: {
    ...Typography.caption2,
    color:         Colors.textDim,
    letterSpacing: 2,
  },

  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius:    Radius.lg,
    borderWidth:      1,
    borderColor:     Colors.separator,
    padding:         Spacing.xl,
    gap:             Spacing.lg,
  },
  cardHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  cardTitle:  { ...Typography.headline, color: Colors.textPrimary },
  cardValue:  { ...Typography.headline, fontWeight: '700' },

  scale: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    gap:             Spacing.sm,
  },
  scaleDot: {
    flex:           1,
    aspectRatio:     1,
    borderRadius:   Radius.full,
    borderWidth:     2,
    alignItems:     'center',
    justifyContent: 'center',
    maxWidth:       52,
  },
  scaleNum: { ...Typography.headline },
  scaleHints: {
    flexDirection:  'row',
    justifyContent: 'space-between',
  },
  scaleHint: { ...Typography.caption2, color: Colors.textDim },

  noteCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius:    Radius.lg,
    borderWidth:      1,
    borderColor:     Colors.separator,
    padding:         Spacing.lg,
    gap:             Spacing.sm,
  },
  noteInput: {
    ...Typography.callout,
    color:            Colors.textPrimary,
    minHeight:        80,
    textAlignVertical: 'top',
  },
  charCount: { ...Typography.caption2, color: Colors.textDim, textAlign: 'right' },

  saveBtn: {
    backgroundColor:  Colors.gold,
    borderRadius:     Radius.lg,
    paddingVertical:   18,
    alignItems:       'center',
  },
  saveBtnText: { ...Typography.headline, color: '#000' },
});

export default MoodLogScreen;