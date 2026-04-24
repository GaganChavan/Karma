// ─── KARMA APP — ADD HABIT (PHASE C) ─────────────────────────────────
// Added: Quantifiable toggle — track numbers
// Added: Flexible streak — X times per week

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, Alert, KeyboardAvoidingView,
  Platform, Animated, Modal, FlatList, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Typography, Spacing, Radius, HabitColors, HabitIcons } from '../constants/colors';
import { validateHabitForm } from '../utils/validation';
import { createHabit, updateHabit, getHabitById, archiveHabit } from '../database/habitService';
import { scheduleHabitNotification, cancelHabitNotification, requestNotificationPermission } from '../services/notificationService';

const DAYS = [
  { key: '1', label: 'Mon' }, { key: '2', label: 'Tue' },
  { key: '3', label: 'Wed' }, { key: '4', label: 'Thu' },
  { key: '5', label: 'Fri' }, { key: '6', label: 'Sat' },
  { key: '7', label: 'Sun' },
];

const TIME_OF_DAY_OPTIONS = [
  { key: 'morning',   label: '🌅 Morning',   desc: 'Before noon' },
  { key: 'afternoon', label: '☀️ Afternoon',  desc: 'Noon to 6 PM' },
  { key: 'evening',   label: '🌙 Evening',    desc: 'After 6 PM' },
  { key: 'anytime',   label: '☸ Anytime',    desc: 'No specific time' },
];

const COMMON_UNITS = ['pages', 'minutes', 'glasses', 'reps', 'km', 'hours', 'steps', 'sets'];

const defaultForm = {
  name: '', type: 'build', icon: '⭐', color: '#F5A623',
  frequency: 'daily', days: '1,2,3,4,5,6,7',
  time_of_day: 'anytime',
  is_quantifiable: 0, daily_target: '1', unit: '',
  frequency_type: 'daily', weekly_target: '5',
  reminder_time: '', reminder_type: 'none',
  goal_days: '', punishment_sensitivity: 'balanced',
};

const AddHabitScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const editId = route?.params?.habitId || null;
  const isEdit = !!editId;

  const [form,       setForm]       = useState(defaultForm);
  const [errors,     setErrors]     = useState({});
  const [saving,     setSaving]     = useState(false);
  const [loading,    setLoading]    = useState(isEdit);
  const [iconModal,  setIconModal]  = useState(false);
  const [colorModal, setColorModal] = useState(false);
  const [selDays,    setSelDays]    = useState(new Set(['1','2','3','4','5','6','7']));
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { if (isEdit) _loadHabit(); }, []);

  const _loadHabit = async () => {
    try {
      const h = await getHabitById(editId);
      setForm({
        name: h.name, type: h.type, icon: h.icon, color: h.color,
        frequency: h.frequency, days: h.days,
        time_of_day: h.time_of_day || 'anytime',
        is_quantifiable: h.is_quantifiable || 0,
        daily_target: h.daily_target ? String(h.daily_target) : '1',
        unit: h.unit || '',
        frequency_type: h.frequency_type || 'daily',
        weekly_target: h.weekly_target ? String(h.weekly_target) : '5',
        reminder_time: h.reminder_time || '', reminder_type: h.reminder_type,
        goal_days: h.goal_days ? String(h.goal_days) : '',
        punishment_sensitivity: h.punishment_sensitivity,
      });
      setSelDays(new Set(h.days.split(',')));
    } catch (err) {
      Alert.alert('Error', err.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const _set = (key, val) => {
    setForm(p => ({ ...p, [key]: val }));
    if (errors[key]) setErrors(p => ({ ...p, [key]: null }));
  };

  const _toggleDay = (key) => {
    const next = new Set(selDays);
    if (next.has(key)) {
      if (next.size === 1) { _shake(); return; }
      next.delete(key);
    } else { next.add(key); }
    setSelDays(next);
    _set('days', ['1','2','3','4','5','6','7'].filter(d => next.has(d)).join(','));
  };

  const _shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 55, useNativeDriver: true }),
    ]).start();
  };

  const _save = async () => {
    if (!form.name?.trim() || form.name.trim().length < 3) {
      setErrors({ name: "Habit name must be at least 3 characters" });
      _shake(); return;
    }
    if (form.reminder_type !== 'none' && form.reminder_time) {
      await requestNotificationPermission();
    }

    setSaving(true);
    try {
      const data = {
        ...form,
        goal_days:      form.goal_days ? parseInt(form.goal_days) : 0,
        days:           form.frequency === 'daily' ? '1,2,3,4,5,6,7' : form.days,
        is_quantifiable: form.is_quantifiable ? 1 : 0,
        daily_target:   parseFloat(form.daily_target) || 1,
        weekly_target:  parseInt(form.weekly_target) || 5,
      };

      let habitId = editId;
      if (isEdit) { await updateHabit(editId, data); }
      else        { habitId = await createHabit(data); }

      if (form.reminder_type !== 'none' && form.reminder_time && habitId) {
        await scheduleHabitNotification({ ...data, id: habitId, is_active: 1 });
      } else if (isEdit && form.reminder_type === 'none') {
        await cancelHabitNotification(editId);
      }

      if (!isEdit) {
        Alert.alert('🔱 Created', `"${form.name}" added. Day 1 starts now, Neel.`, [
          { text: "Let's Go", onPress: () => navigation.goBack() }
        ]);
        return;
      }
      navigation.goBack();
    } catch (err) {
      if (err.message.includes('name') || err.message.includes('already exists')) {
        setErrors(p => ({ ...p, name: err.message }));
      } else {
        Alert.alert('Error', err.message);
      }
      _shake();
    } finally {
      setSaving(false);
    }
  };

  const _archive = () => {
    Alert.alert('Archive', `Archive "${form.name}"? History preserved.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive', style: 'destructive',
        onPress: async () => {
          try { await archiveHabit(editId); await cancelHabitNotification(editId); navigation.goBack(); }
          catch (err) { Alert.alert('Error', err.message); }
        },
      },
    ]);
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ ...Typography.body, color: colors.textMuted }}>Loading...</Text>
    </View>
  );

  const accent = form.type === 'build' ? colors.gold : colors.red;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={{ ...Typography.body, color: colors.gold }}>Cancel</Text>
        </TouchableOpacity>
        <Text style={{ ...Typography.headline, color: colors.textPrimary }}>
          {isEdit ? 'Edit Habit' : 'New Habit'}
        </Text>
        {isEdit
          ? <TouchableOpacity onPress={_archive} style={[styles.headerBtn, { alignItems: 'flex-end' }]}>
              <Text style={{ ...Typography.body, color: colors.red }}>Archive</Text>
            </TouchableOpacity>
          : <View style={{ width: 64 }} />
        }
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingVertical: Spacing.xl }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {errors.general && (
            <View style={[styles.errorBanner, { backgroundColor: colors.redAlpha15, borderColor: colors.redAlpha25 }]}>
              <Text style={{ ...Typography.callout, color: colors.red }}>⚠️  {errors.general}</Text>
            </View>
          )}

          {/* Type */}
          <Text style={[styles.groupLabel, { color: colors.textDim }]}>HABIT TYPE</Text>
          <Animated.View style={[styles.group, { backgroundColor: colors.backgroundCard, borderColor: colors.separator, transform: [{ translateX: shakeAnim }] }]}>
            <View style={{ flexDirection: 'row', gap: Spacing.md, padding: Spacing.md }}>
              {[
                { type: 'build', emoji: '🟢', label: 'Build', desc: 'Do this daily' },
                { type: 'break', emoji: '🔴', label: 'Break', desc: 'Stop this habit' },
              ].map(t => (
                <TouchableOpacity
                  key={t.type}
                  style={[styles.typeCard, {
                    backgroundColor: form.type === t.type
                      ? (t.type === 'build' ? colors.goldAlpha15 : colors.redAlpha15)
                      : colors.backgroundElevated,
                    borderColor: form.type === t.type
                      ? (t.type === 'build' ? colors.goldAlpha40 : colors.redAlpha25)
                      : colors.separator,
                  }]}
                  onPress={() => _set('type', t.type)}
                >
                  <Text style={{ fontSize: 28 }}>{t.emoji}</Text>
                  <Text style={{ ...Typography.headline, color: form.type === t.type ? (t.type === 'build' ? colors.gold : colors.red) : colors.textMuted }}>{t.label}</Text>
                  <Text style={{ ...Typography.caption2, color: colors.textDim }}>{t.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Name */}
          <Text style={[styles.groupLabel, { color: colors.textDim }]}>NAME</Text>
          <View style={[styles.group, { backgroundColor: colors.backgroundCard, borderColor: errors.name ? colors.red + '55' : colors.separator }]}>
            <TextInput
              style={[styles.nameInput, { color: colors.textPrimary }]}
              value={form.name}
              onChangeText={v => _set('name', v)}
              placeholder={form.type === 'build' ? 'e.g. Morning Meditation' : 'e.g. No Social Media'}
              placeholderTextColor={colors.textPlaceholder}
              maxLength={50} returnKeyType="done" autoFocus={!isEdit}
            />
            <Text style={{ ...Typography.caption2, color: colors.textDim, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md }}>{form.name.length}/50</Text>
          </View>
          {errors.name && <Text style={[styles.fieldError, { color: colors.red }]}>{errors.name}</Text>}

          {/* ── QUANTIFIABLE — PHASE C NEW ── */}
          <Text style={[styles.groupLabel, { color: colors.textDim }]}>TRACKING TYPE</Text>
          <View style={[styles.group, { backgroundColor: colors.backgroundCard, borderColor: colors.separator }]}>
            <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: colors.separator }]}>
              <View>
                <Text style={{ ...Typography.callout, color: colors.textPrimary }}>Track a Number</Text>
                <Text style={{ ...Typography.caption1, color: colors.textDim, marginTop: 3 }}>
                  e.g. 20 pages, 8 glasses, 30 minutes
                </Text>
              </View>
              <Switch
                value={!!form.is_quantifiable}
                onValueChange={v => _set('is_quantifiable', v ? 1 : 0)}
                trackColor={{ false: colors.separator, true: colors.goldAlpha40 }}
                thumbColor={form.is_quantifiable ? colors.gold : colors.textMuted}
              />
            </View>

            {!!form.is_quantifiable && (
              <View style={{ padding: Spacing.lg, gap: Spacing.md }}>
                <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...Typography.caption2, color: colors.textDim, marginBottom: Spacing.xs }}>DAILY TARGET</Text>
                    <TextInput
                      style={[styles.numInput, { color: colors.textPrimary, backgroundColor: colors.backgroundElevated, borderColor: colors.separator }]}
                      value={form.daily_target}
                      onChangeText={v => _set('daily_target', v.replace(/[^0-9.]/g, ''))}
                      keyboardType="decimal-pad"
                      placeholder="20"
                      placeholderTextColor={colors.textPlaceholder}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...Typography.caption2, color: colors.textDim, marginBottom: Spacing.xs }}>UNIT</Text>
                    <TextInput
                      style={[styles.numInput, { color: colors.textPrimary, backgroundColor: colors.backgroundElevated, borderColor: colors.separator }]}
                      value={form.unit}
                      onChangeText={v => _set('unit', v)}
                      placeholder="pages"
                      placeholderTextColor={colors.textPlaceholder}
                      maxLength={15}
                    />
                  </View>
                </View>
                {/* Quick unit buttons */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
                  {COMMON_UNITS.map(u => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.unitPill, {
                        backgroundColor: form.unit === u ? colors.goldAlpha15 : colors.backgroundElevated,
                        borderColor:     form.unit === u ? colors.goldAlpha40 : colors.separator,
                      }]}
                      onPress={() => _set('unit', u)}
                    >
                      <Text style={{ ...Typography.caption1, color: form.unit === u ? colors.gold : colors.textMuted }}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* ── FLEXIBLE STREAK — PHASE C NEW ── */}
          <Text style={[styles.groupLabel, { color: colors.textDim }]}>STREAK MODE</Text>
          <View style={[styles.group, { backgroundColor: colors.backgroundCard, borderColor: colors.separator }]}>
            {[
              { key: 'daily',  label: 'Every Day', desc: 'Must complete daily to maintain streak' },
              { key: 'weekly', label: 'X Times Per Week', desc: 'Streak maintained if weekly target met' },
            ].map((f, i) => (
              <View key={f.key}>
                {i > 0 && <View style={[styles.separator, { backgroundColor: colors.separator }]} />}
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => _set('frequency_type', f.key)}
                >
                  <View>
                    <Text style={{ ...Typography.callout, color: colors.textPrimary }}>{f.label}</Text>
                    <Text style={{ ...Typography.caption1, color: colors.textDim, marginTop: 3 }}>{f.desc}</Text>
                  </View>
                  {form.frequency_type === f.key && (
                    <Text style={{ ...Typography.callout, fontWeight: '700', color: accent }}>✓</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}

            {form.frequency_type === 'weekly' && (
              <View style={{ borderTopWidth: 1, borderTopColor: colors.separator, padding: Spacing.lg, gap: Spacing.sm }}>
                <Text style={{ ...Typography.caption2, color: colors.textDim }}>TIMES PER WEEK TARGET</Text>
                <View style={{ flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' }}>
                  {[2,3,4,5,6].map(n => (
                    <TouchableOpacity
                      key={n}
                      style={[styles.numPill, {
                        backgroundColor: form.weekly_target === String(n) ? colors.goldAlpha15 : colors.backgroundElevated,
                        borderColor:     form.weekly_target === String(n) ? colors.goldAlpha40 : colors.separator,
                      }]}
                      onPress={() => _set('weekly_target', String(n))}
                    >
                      <Text style={{ ...Typography.callout, fontWeight: '700', color: form.weekly_target === String(n) ? colors.gold : colors.textMuted }}>{n}×</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={{ ...Typography.caption2, color: colors.textDim }}>
                  Perfect for gym, runs, or anything you don't do every single day.
                </Text>
              </View>
            )}
          </View>

          {/* Time of day */}
          <Text style={[styles.groupLabel, { color: colors.textDim }]}>TIME OF DAY</Text>
          <View style={[styles.group, { backgroundColor: colors.backgroundCard, borderColor: colors.separator }]}>
            {TIME_OF_DAY_OPTIONS.map((t, i) => (
              <View key={t.key}>
                {i > 0 && <View style={[styles.separator, { backgroundColor: colors.separator }]} />}
                <TouchableOpacity style={styles.row} onPress={() => _set('time_of_day', t.key)}>
                  <View>
                    <Text style={{ ...Typography.callout, color: colors.textPrimary }}>{t.label}</Text>
                    <Text style={{ ...Typography.caption1, color: colors.textDim, marginTop: 3 }}>{t.desc}</Text>
                  </View>
                  {form.time_of_day === t.key && (
                    <Text style={{ ...Typography.callout, fontWeight: '700', color: accent }}>✓</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Appearance */}
          <Text style={[styles.groupLabel, { color: colors.textDim }]}>APPEARANCE</Text>
          <View style={[styles.group, { backgroundColor: colors.backgroundCard, borderColor: colors.separator }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg }}>
              <View style={{ width: 52, height: 52, borderRadius: Radius.md, backgroundColor: form.color + '25', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 28 }}>{form.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...Typography.headline, color: colors.textPrimary }} numberOfLines={1}>{form.name || 'Preview'}</Text>
                <Text style={{ ...Typography.caption1, color: accent, marginTop: 3, fontWeight: '700' }}>{form.type === 'build' ? '🟢 BUILD' : '🔴 BREAK'}</Text>
              </View>
            </View>
            <View style={[styles.separator, { backgroundColor: colors.separator }]} />
            <TouchableOpacity style={styles.row} onPress={() => setIconModal(true)}>
              <Text style={{ ...Typography.callout, color: colors.textPrimary }}>Icon</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <Text style={{ fontSize: 22 }}>{form.icon}</Text>
                <Text style={{ ...Typography.title3, color: colors.textDim, fontWeight: '300' }}>›</Text>
              </View>
            </TouchableOpacity>
            <View style={[styles.separator, { backgroundColor: colors.separator }]} />
            <TouchableOpacity style={styles.row} onPress={() => setColorModal(true)}>
              <Text style={{ ...Typography.callout, color: colors.textPrimary }}>Color</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: form.color }} />
                <Text style={{ ...Typography.title3, color: colors.textDim, fontWeight: '300' }}>›</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Reminder */}
          <Text style={[styles.groupLabel, { color: colors.textDim }]}>REMINDER</Text>
          <View style={[styles.group, { backgroundColor: colors.backgroundCard, borderColor: colors.separator }]}>
            {[
              { key: 'none', label: 'None' },
              { key: 'soft', label: '🔔  Notification' },
              { key: 'hard', label: '⏰  Hard Alarm (rings on silent)' },
            ].map((r, i) => (
              <View key={r.key}>
                {i > 0 && <View style={[styles.separator, { backgroundColor: colors.separator }]} />}
                <TouchableOpacity style={styles.row} onPress={() => _set('reminder_type', r.key)}>
                  <Text style={{ ...Typography.callout, color: colors.textPrimary }}>{r.label}</Text>
                  {form.reminder_type === r.key && <Text style={{ ...Typography.callout, fontWeight: '700', color: accent }}>✓</Text>}
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {form.reminder_type !== 'none' && (
            <View style={[styles.group, { backgroundColor: colors.backgroundCard, borderColor: errors.reminder_time ? colors.red + '55' : colors.separator, marginTop: Spacing.xs }]}>
              <TextInput
                style={[styles.nameInput, { color: colors.textPrimary, textAlign: 'center', letterSpacing: 2 }]}
                value={form.reminder_time}
                onChangeText={v => _set('reminder_time', v)}
                placeholder="e.g.  06:00  or  21:30"
                placeholderTextColor={colors.textPlaceholder}
                keyboardType="numbers-and-punctuation" maxLength={5}
              />
            </View>
          )}

          {/* Punishment (break only) */}
          {form.type === 'break' && (
            <>
              <Text style={[styles.groupLabel, { color: colors.textDim }]}>PUNISHMENT LEVEL</Text>
              <View style={[styles.group, { backgroundColor: colors.backgroundCard, borderColor: colors.separator }]}>
                {[
                  { key: 'soft',     label: '🟢  Soft',    desc: 'Gentle nudges' },
                  { key: 'balanced', label: '🟡  Balanced', desc: 'Respectful escalation' },
                  { key: 'harsh',    label: '🔴  Harsh',    desc: 'No mercy mode' },
                ].map((p, i) => (
                  <View key={p.key}>
                    {i > 0 && <View style={[styles.separator, { backgroundColor: colors.separator }]} />}
                    <TouchableOpacity style={styles.row} onPress={() => _set('punishment_sensitivity', p.key)}>
                      <View>
                        <Text style={{ ...Typography.callout, color: colors.textPrimary }}>{p.label}</Text>
                        <Text style={{ ...Typography.caption1, color: colors.textDim, marginTop: 3 }}>{p.desc}</Text>
                      </View>
                      {form.punishment_sensitivity === p.key && <Text style={{ ...Typography.callout, fontWeight: '700', color: colors.red }}>✓</Text>}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: accent, marginHorizontal: Spacing.xl, opacity: saving ? 0.7 : 1 }]}
            onPress={_save} disabled={saving} activeOpacity={0.85}
          >
            <Text style={{ ...Typography.headline, color: form.type === 'build' ? '#000' : '#fff' }}>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : `Create ${form.type === 'build' ? 'Build' : 'Break'} Habit`}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Icon Modal */}
      <Modal visible={iconModal} transparent animationType="slide" onRequestClose={() => setIconModal(false)}>
        <TouchableOpacity style={[styles.modalOverlay, { backgroundColor: colors.overlay90 }]} activeOpacity={1} onPress={() => setIconModal(false)}>
          <View style={[styles.modalSheet, { backgroundColor: colors.backgroundCard }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.separator }]} />
            <Text style={{ ...Typography.title3, color: colors.textPrimary, textAlign: 'center', marginBottom: Spacing.xl }}>Choose Icon</Text>
            <FlatList
              data={HabitIcons} numColumns={8} keyExtractor={i => i}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.iconOption, item === form.icon && { backgroundColor: form.color + '30', borderColor: form.color }]}
                  onPress={() => { _set('icon', item); setIconModal(false); }}
                >
                  <Text style={{ fontSize: 26 }}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Color Modal */}
      <Modal visible={colorModal} transparent animationType="slide" onRequestClose={() => setColorModal(false)}>
        <TouchableOpacity style={[styles.modalOverlay, { backgroundColor: colors.overlay90 }]} activeOpacity={1} onPress={() => setColorModal(false)}>
          <View style={[styles.modalSheet, { backgroundColor: colors.backgroundCard }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.separator }]} />
            <Text style={{ ...Typography.title3, color: colors.textPrimary, textAlign: 'center', marginBottom: Spacing.xl }}>Choose Color</Text>
            <View style={styles.colorGrid}>
              {HabitColors.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorOption, { backgroundColor: color },
                    color === form.color && { borderWidth: 3, borderColor: '#fff', transform: [{ scale: 1.15 }] },
                  ]}
                  onPress={() => { _set('color', color); setColorModal(false); }}
                >
                  {color === form.color && <Text style={{ color: '#000', fontSize: 18, fontWeight: '700' }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  headerBtn:   { padding: Spacing.xs, minWidth: 64 },
  errorBanner: { borderRadius: Radius.md, padding: Spacing.md, marginHorizontal: Spacing.xl, marginBottom: Spacing.lg, borderWidth: 1 },
  groupLabel:  { ...Typography.caption2, letterSpacing: 1.5, marginHorizontal: Spacing.xl, marginBottom: Spacing.xs, marginTop: Spacing.xl },
  group:       { borderRadius: Radius.lg, marginHorizontal: Spacing.xl, overflow: 'hidden', borderWidth: 1 },
  fieldError:  { ...Typography.caption1, marginHorizontal: Spacing.xl + Spacing.xs, marginTop: Spacing.xs },
  typeCard:    { flex: 1, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.lg, alignItems: 'center', gap: Spacing.xs },
  nameInput:   { ...Typography.body, padding: Spacing.lg },
  row:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, minHeight: 52 },
  separator:   { height: 1, marginHorizontal: Spacing.lg },
  numInput:    { borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, ...Typography.callout, textAlign: 'center' },
  unitPill:    { borderRadius: Radius.full, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  numPill:     { borderRadius: Radius.full, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, minWidth: 52, alignItems: 'center' },
  saveBtn:     { borderRadius: Radius.lg, paddingVertical: 18, alignItems: 'center', marginTop: Spacing.xxl },
  modalOverlay:{ flex: 1, justifyContent: 'flex-end' },
  modalSheet:  { borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl, padding: Spacing.xl, paddingBottom: 40, maxHeight: '65%' },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg },
  iconOption:  { width: 44, height: 44, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', margin: 3, borderWidth: 1, borderColor: 'transparent' },
  colorGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center', paddingVertical: Spacing.lg },
  colorOption: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});

export default AddHabitScreen;