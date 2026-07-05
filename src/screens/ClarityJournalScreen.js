import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, StatusBar, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Typography, Spacing, Radius } from '../constants/colors';
import { getDatabase } from '../database/database';
import { DateUtils } from '../utils/dateUtils';

const QUESTIONS = [
  {
    id: 'hard_thing',
    label: 'What hard thing did I do today?',
    placeholder: 'Cold shower, heavy lift, difficult conversation, hard decision...',
    color: '#30D158',
    emoji: '⚔️',
  },
  {
    id: 'owned_decision',
    label: 'What decision did I make and fully own?',
    placeholder: 'Even a small one. What did I choose without deferring?',
    color: '#0A84FF',
    emoji: '🎯',
  },
  {
    id: 'escape',
    label: 'What did I escape from today — and why?',
    placeholder: 'Be honest. What did you avoid, defer, or run from? What triggered it?',
    color: '#FF9F0A',
    emoji: '🪞',
  },
];

const _ensureTable = async (db) => {
  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS clarity_journal (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      date       TEXT NOT NULL,
      hard_thing TEXT,
      owned_decision TEXT,
      escape     TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);
};

const ClarityJournalScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [answers,   setAnswers]   = useState({ hard_thing: '', owned_decision: '', escape: '' });
  const [history,   setHistory]   = useState([]);
  const [todayEntry,setTodayEntry]= useState(null);
  const [tab,       setTab]       = useState('write');
  const [saving,    setSaving]    = useState(false);

  useEffect(() => { _load(); }, []);

  const _load = async () => {
    try {
      const db = await getDatabase();
      await _ensureTable(db);
      const today = DateUtils.today();
      const entry = await db.getFirstAsync('SELECT * FROM clarity_journal WHERE date = ?', [today]);
      if (entry) {
        setTodayEntry(entry);
        setAnswers({ hard_thing: entry.hard_thing || '', owned_decision: entry.owned_decision || '', escape: entry.escape || '' });
      }
      const hist = await db.getAllAsync('SELECT * FROM clarity_journal ORDER BY date DESC LIMIT 30');
      setHistory(hist);
    } catch (err) {
      console.warn('ClarityJournal load:', err.message);
    }
  };

  const _save = async () => {
    const hasAny = Object.values(answers).some(v => v.trim().length > 0);
    if (!hasAny) { Alert.alert('Nothing to save', 'Write at least one answer before saving.'); return; }
    setSaving(true);
    try {
      const db    = await getDatabase();
      const today = DateUtils.today();
      await _ensureTable(db);
      await db.runAsync(
        `INSERT INTO clarity_journal (date, hard_thing, owned_decision, escape)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(date) DO UPDATE SET
           hard_thing = excluded.hard_thing,
           owned_decision = excluded.owned_decision,
           escape = excluded.escape,
           created_at = datetime('now','localtime')`,
        [today, answers.hard_thing.trim() || null, answers.owned_decision.trim() || null, answers.escape.trim() || null]
      );
      await _load();
      Alert.alert('Saved', 'Mirror checked. Day logged.', [{ text: 'Good' }]);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const _formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const _renderWrite = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 60 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <Text style={[styles.intro, { color: colors.textDim }]}>
          Three questions. Every night. The mirror that builds self-awareness.
        </Text>

        {QUESTIONS.map((q, i) => (
          <View key={q.id} style={[styles.questionBlock, { backgroundColor: colors.backgroundCard, borderColor: answers[q.id].trim() ? q.color + '40' : colors.separator }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md }}>
              <Text style={{ fontSize: 20 }}>{q.emoji}</Text>
              <Text style={[styles.questionLabel, { color: q.color }]}>{i + 1}</Text>
              <Text style={[styles.questionText, { color: colors.textPrimary }]}>{q.label}</Text>
            </View>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.backgroundElevated, borderColor: answers[q.id].trim() ? q.color + '30' : colors.separator }]}
              value={answers[q.id]}
              onChangeText={v => setAnswers(p => ({ ...p, [q.id]: v }))}
              placeholder={q.placeholder}
              placeholderTextColor={colors.textPlaceholder}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        ))}

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.gold, opacity: saving ? 0.7 : 1 }]}
          onPress={_save}
          disabled={saving}
        >
          <Text style={[styles.saveBtnText, { color: '#000' }]}>
            {saving ? 'Saving...' : 'Save Today\'s Mirror'}
          </Text>
        </TouchableOpacity>

        {/* Note */}
        <Text style={[styles.note, { color: colors.textDim }]}>
          Be brutally honest. No one reads this but you.{'\n'}Honesty tonight builds clarity tomorrow.
        </Text>

      </ScrollView>
    </KeyboardAvoidingView>
  );

  const _renderHistory = () => (
    <ScrollView contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      {history.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 60, gap: 14 }}>
          <Text style={{ fontSize: 48 }}>🪞</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No entries yet.</Text>
          <Text style={[styles.emptySubText, { color: colors.textDim }]}>Start tonight. One entry at a time.</Text>
        </View>
      ) : (
        <View style={{ gap: Spacing.lg }}>
          {history.map(entry => (
            <View key={entry.id} style={[styles.historyCard, { backgroundColor: colors.backgroundCard, borderColor: colors.separator }]}>
              <Text style={[styles.historyDate, { color: colors.gold }]}>{_formatDate(entry.date)}</Text>
              {QUESTIONS.map(q => entry[q.id] ? (
                <View key={q.id} style={{ gap: 4 }}>
                  <Text style={[styles.historyQ, { color: q.color }]}>{q.emoji} {q.label}</Text>
                  <Text style={[styles.historyA, { color: colors.textSecondary }]}>{entry[q.id]}</Text>
                </View>
              ) : null)}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: Spacing.xs, minWidth: 60 }}>
          <Text style={{ ...Typography.body, color: colors.gold }}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={{ ...Typography.headline, color: colors.textPrimary }}>Clarity Journal</Text>
        <View style={{ minWidth: 60 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { borderBottomColor: colors.separator }]}>
        {[{ key: 'write', label: 'Tonight' }, { key: 'history', label: 'History' }].map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && { borderBottomColor: colors.gold, borderBottomWidth: 2 }]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabLabel, { color: tab === t.key ? colors.gold : colors.textDim, fontWeight: tab === t.key ? '700' : '400' }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'write'   && _renderWrite()}
      {tab === 'history' && _renderHistory()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  tabRow:         { flexDirection: 'row', borderBottomWidth: 1 },
  tab:            { flex: 1, alignItems: 'center', paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabLabel:       { ...Typography.callout },
  intro:          { ...Typography.callout, lineHeight: 22, fontStyle: 'italic', marginBottom: Spacing.xl },
  questionBlock:  { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.xl, marginBottom: Spacing.lg },
  questionLabel:  { ...Typography.title3, fontWeight: '800' },
  questionText:   { ...Typography.callout, fontWeight: '600', flex: 1, lineHeight: 20 },
  input:          { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.lg, ...Typography.callout, minHeight: 90, lineHeight: 22 },
  saveBtn:        { borderRadius: Radius.lg, paddingVertical: 18, alignItems: 'center', marginTop: Spacing.md },
  saveBtnText:    { ...Typography.headline },
  note:           { ...Typography.caption1, textAlign: 'center', lineHeight: 20, marginTop: Spacing.lg, fontStyle: 'italic' },
  emptyText:      { ...Typography.title3, fontWeight: '600' },
  emptySubText:   { ...Typography.callout },
  historyCard:    { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.xl, gap: Spacing.lg },
  historyDate:    { ...Typography.subheadline, fontWeight: '700', marginBottom: Spacing.xs },
  historyQ:       { ...Typography.caption2, letterSpacing: 0.5, fontWeight: '600' },
  historyA:       { ...Typography.callout, lineHeight: 22 },
});

export default ClarityJournalScreen;
