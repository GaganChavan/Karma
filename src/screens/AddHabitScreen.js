// ─── KARMA APP — ADD / EDIT HABIT (PHASE 6) ──────────────────────────
// Apple Settings-inspired form. Clean rows. Gold selection state.
// Every element purposeful. No visual noise.

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, Alert, KeyboardAvoidingView,
  Platform, Animated, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, HabitColors, HabitIcons } from '../constants/colors';
import { validateHabitForm } from '../utils/validation';
import { createHabit, updateHabit, getHabitById, archiveHabit } from '../database/habitService';
import {
  scheduleHabitNotification, cancelHabitNotification, requestNotificationPermission,
} from '../services/notificationService';

const DAYS = [
  { key: '1', label: 'Mon' }, { key: '2', label: 'Tue' },
  { key: '3', label: 'Wed' }, { key: '4', label: 'Thu' },
  { key: '5', label: 'Fri' }, { key: '6', label: 'Sat' },
  { key: '7', label: 'Sun' },
];

const defaultForm = {
  name: '', type: 'build', icon: '⭐', color: Colors.gold,
  frequency: 'daily', days: '1,2,3,4,5,6,7',
  reminder_time: '', reminder_type: 'none',
  goal_days: '', punishment_sensitivity: 'balanced',
};

const AddHabitScreen = ({ navigation, route }) => {
  const editId = route?.params?.habitId || null;
  const isEdit = !!editId;

  const [form,        setForm]        = useState(defaultForm);
  const [errors,      setErrors]      = useState({});
  const [saving,      setSaving]      = useState(false);
  const [loading,     setLoading]     = useState(isEdit);
  const [iconModal,   setIconModal]   = useState(false);
  const [colorModal,  setColorModal]  = useState(false);
  const [selDays,     setSelDays]     = useState(new Set(['1','2','3','4','5','6','7']));
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { if (isEdit) _loadHabit(); }, []);

  const _loadHabit = async () => {
    try {
      const h = await getHabitById(editId);
      setForm({
        name: h.name, type: h.type, icon: h.icon, color: h.color,
        frequency: h.frequency, days: h.days,
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
      if (next.size === 1) { _shake(); setErrors(p => ({ ...p, days: 'Select at least one day' })); return; }
      next.delete(key);
    } else { next.add(key); }
    setSelDays(next);
    const sorted = ['1','2','3','4','5','6','7'].filter(d => next.has(d));
    _set('days', sorted.join(','));
    setErrors(p => ({ ...p, days: null }));
  };

  const _shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -5, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 55, useNativeDriver: true }),
    ]).start();
  };

  const _save = async () => {
    const errs = validateHabitForm({ ...form, days: form.frequency === 'specific_days' ? form.days : '1,2,3,4,5,6,7' });
    if (errs.length > 0) {
      const map = {};
      errs.forEach(m => {
        if (m.includes('name'))      map.name = m;
        else if (m.includes('time')) map.reminder_time = m;
        else if (m.includes('Goal')) map.goal_days = m;
        else                         map.general = m;
      });
      setErrors(map); _shake(); return;
    }

    if (form.reminder_type !== 'none' && form.reminder_time) {
      await requestNotificationPermission();
    }

    setSaving(true);
    try {
      const data = {
        ...form,
        goal_days: form.goal_days ? parseInt(form.goal_days) : 0,
        days:      form.frequency === 'daily' ? '1,2,3,4,5,6,7' : form.days,
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
          try {
            await archiveHabit(editId);
            await cancelHabitNotification(editId);
            navigation.goBack();
          } catch (err) { Alert.alert('Error', err.message); }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadText}>Loading...</Text>
      </View>
    );
  }

  const accent = form.type === 'build' ? Colors.gold : Colors.red;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Habit' : 'New Habit'}</Text>
        {isEdit
          ? <TouchableOpacity onPress={_archive} style={styles.headerBtn}>
              <Text style={[styles.headerBtnText, { color: Colors.red }]}>Archive</Text>
            </TouchableOpacity>
          : <View style={{ width: 64 }} />
        }
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* General error */}
          {errors.general && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>⚠️  {errors.general}</Text>
            </View>
          )}

          {/* ── Type ── */}
          <Text style={styles.groupLabel}>HABIT TYPE</Text>
          <Animated.View style={[styles.group, { transform: [{ translateX: shakeAnim }] }]}>
            <View style={styles.typeRow}>
              {[
                { type: 'build', emoji: '🟢', label: 'Build', desc: 'Do this daily' },
                { type: 'break', emoji: '🔴', label: 'Break', desc: 'Stop this habit' },
              ].map(t => (
                <TouchableOpacity
                  key={t.type}
                  style={[styles.typeCard, {
                    backgroundColor: form.type === t.type
                      ? (t.type === 'build' ? Colors.goldAlpha15 : Colors.redAlpha15)
                      : Colors.backgroundCard,
                    borderColor: form.type === t.type
                      ? (t.type === 'build' ? Colors.goldAlpha40 : Colors.redAlpha25)
                      : Colors.separator,
                  }]}
                  onPress={() => _set('type', t.type)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.typeEmoji}>{t.emoji}</Text>
                  <Text style={[styles.typeLabel, {
                    color: form.type === t.type
                      ? (t.type === 'build' ? Colors.gold : Colors.red)
                      : Colors.textMuted,
                  }]}>{t.label}</Text>
                  <Text style={styles.typeDesc}>{t.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* ── Name ── */}
          <Text style={styles.groupLabel}>NAME</Text>
          <View style={[styles.group, errors.name && styles.groupError]}>
            <TextInput
              style={styles.nameInput}
              value={form.name}
              onChangeText={v => _set('name', v)}
              placeholder={form.type === 'build' ? 'e.g. Morning Meditation' : 'e.g. No Social Media'}
              placeholderTextColor={Colors.textPlaceholder}
              maxLength={50}
              returnKeyType="done"
              autoFocus={!isEdit}
            />
            <Text style={styles.charCount}>{form.name.length}/50</Text>
          </View>
          {errors.name && <Text style={styles.fieldError}>{errors.name}</Text>}

          {/* ── Icon & Color ── */}
          <Text style={styles.groupLabel}>APPEARANCE</Text>
          <View style={styles.group}>
            {/* Preview */}
            <View style={styles.previewRow}>
              <View style={[styles.iconPreviewWrap, { backgroundColor: form.color + '25' }]}>
                <Text style={styles.iconPreviewEmoji}>{form.icon}</Text>
              </View>
              <View style={styles.previewInfo}>
                <Text style={styles.previewName} numberOfLines={1}>
                  {form.name || 'Habit Preview'}
                </Text>
                <Text style={[styles.previewType, { color: accent }]}>
                  {form.type === 'build' ? '🟢 BUILD' : '🔴 BREAK'}
                </Text>
              </View>
            </View>
            <View style={styles.separator} />
            <TouchableOpacity style={styles.row} onPress={() => setIconModal(true)}>
              <Text style={styles.rowLabel}>Icon</Text>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{form.icon}</Text>
                <Text style={styles.rowArrow}>›</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.separator} />
            <TouchableOpacity style={styles.row} onPress={() => setColorModal(true)}>
              <Text style={styles.rowLabel}>Color</Text>
              <View style={styles.rowRight}>
                <View style={[styles.colorDot, { backgroundColor: form.color }]} />
                <Text style={styles.rowArrow}>›</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* ── Frequency ── */}
          <Text style={styles.groupLabel}>FREQUENCY</Text>
          <View style={styles.group}>
            {[
              { key: 'daily', label: 'Every Day' },
              { key: 'specific_days', label: 'Specific Days' },
            ].map((f, i) => (
              <View key={f.key}>
                {i > 0 && <View style={styles.separator} />}
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => _set('frequency', f.key)}
                >
                  <Text style={styles.rowLabel}>{f.label}</Text>
                  {form.frequency === f.key && (
                    <Text style={[styles.checkmark, { color: accent }]}>✓</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {form.frequency === 'specific_days' && (
            <>
              <View style={styles.group}>
                <View style={styles.daysRow}>
                  {DAYS.map(d => (
                    <TouchableOpacity
                      key={d.key}
                      style={[styles.dayPill, {
                        backgroundColor: selDays.has(d.key) ? accent : Colors.backgroundCard,
                        borderColor:     selDays.has(d.key) ? accent : Colors.separator,
                      }]}
                      onPress={() => _toggleDay(d.key)}
                    >
                      <Text style={[styles.dayPillText, {
                        color: selDays.has(d.key) ? (form.type === 'build' ? '#000' : Colors.white) : Colors.textMuted,
                      }]}>{d.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {errors.days && <Text style={styles.fieldError}>{errors.days}</Text>}
            </>
          )}

          {/* ── Reminder ── */}
          <Text style={styles.groupLabel}>REMINDER</Text>
          <View style={styles.group}>
            {[
              { key: 'none', label: 'None' },
              { key: 'soft', label: '🔔  Notification' },
              { key: 'hard', label: '⏰  Hard Alarm (rings on silent)' },
            ].map((r, i) => (
              <View key={r.key}>
                {i > 0 && <View style={styles.separator} />}
                <TouchableOpacity style={styles.row} onPress={() => _set('reminder_type', r.key)}>
                  <Text style={styles.rowLabel}>{r.label}</Text>
                  {form.reminder_type === r.key && (
                    <Text style={[styles.checkmark, { color: accent }]}>✓</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {form.reminder_type !== 'none' && (
            <>
              <View style={[styles.group, errors.reminder_time && styles.groupError]}>
                <TextInput
                  style={styles.timeInput}
                  value={form.reminder_time}
                  onChangeText={v => _set('reminder_time', v)}
                  placeholder="Time  e.g.  06:00  or  21:30"
                  placeholderTextColor={Colors.textPlaceholder}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  returnKeyType="done"
                />
              </View>
              {errors.reminder_time && <Text style={styles.fieldError}>{errors.reminder_time}</Text>}
              {form.reminder_type === 'hard' && (
                <Text style={styles.infoText}>
                  ⏰  Opens your OnePlus Clock to create a real alarm. Rings even on silent.
                </Text>
              )}
            </>
          )}

          {/* ── Goal ── */}
          <Text style={styles.groupLabel}>GOAL  (OPTIONAL)</Text>
          <View style={[styles.group, errors.goal_days && styles.groupError]}>
            <View style={styles.row}>
              <TextInput
                style={[styles.nameInput, { flex: 1 }]}
                value={form.goal_days}
                onChangeText={v => _set('goal_days', v.replace(/[^0-9]/g, ''))}
                placeholder="Number of days  e.g. 21  —  leave empty for forever"
                placeholderTextColor={Colors.textPlaceholder}
                keyboardType="number-pad"
                maxLength={4}
                returnKeyType="done"
              />
            </View>
          </View>
          {errors.goal_days && <Text style={styles.fieldError}>{errors.goal_days}</Text>}

          {/* ── Punishment (break only) ── */}
          {form.type === 'break' && (
            <>
              <Text style={styles.groupLabel}>PUNISHMENT LEVEL</Text>
              <View style={styles.group}>
                {[
                  { key: 'soft',     label: '🟢  Soft',     desc: 'Gentle nudges' },
                  { key: 'balanced', label: '🟡  Balanced',  desc: 'Default — respectful escalation' },
                  { key: 'harsh',    label: '🔴  Harsh',     desc: 'No mercy mode' },
                ].map((p, i) => (
                  <View key={p.key}>
                    {i > 0 && <View style={styles.separator} />}
                    <TouchableOpacity style={styles.row} onPress={() => _set('punishment_sensitivity', p.key)}>
                      <View>
                        <Text style={styles.rowLabel}>{p.label}</Text>
                        <Text style={styles.rowDesc}>{p.desc}</Text>
                      </View>
                      {form.punishment_sensitivity === p.key && (
                        <Text style={[styles.checkmark, { color: Colors.red }]}>✓</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* ── Save Button ── */}
          <TouchableOpacity
            style={[styles.saveBtn, {
              backgroundColor: accent,
              opacity: saving ? 0.7 : 1,
            }]}
            onPress={_save}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={[styles.saveBtnText, {
              color: form.type === 'build' ? '#000' : Colors.white,
            }]}>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : `Create ${form.type === 'build' ? 'Build' : 'Break'} Habit`}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Icon Modal */}
      <Modal visible={iconModal} transparent animationType="slide" onRequestClose={() => setIconModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIconModal(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Choose Icon</Text>
            <FlatList
              data={HabitIcons}
              numColumns={8}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.iconOption, item === form.icon && {
                    backgroundColor: form.color + '30', borderColor: form.color,
                  }]}
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
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setColorModal(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Choose Color</Text>
            <View style={styles.colorGrid}>
              {HabitColors.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorOption, { backgroundColor: color },
                    color === form.color && styles.colorOptionSelected,
                  ]}
                  onPress={() => { _set('color', color); setColorModal(false); }}
                >
                  {color === form.color && <Text style={styles.colorCheck}>✓</Text>}
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
  screen:  { flex: 1, backgroundColor: Colors.background },
  center:  { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  loadText:{ ...Typography.body, color: Colors.textMuted },

  header: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical:   Spacing.md,
    borderBottomWidth:  1,
    borderBottomColor:  Colors.separator,
  },
  headerBtn:     { padding: Spacing.xs, minWidth: 64 },
  headerBtnText: { ...Typography.body, color: Colors.gold },
  headerTitle:   { ...Typography.headline, color: Colors.textPrimary },

  scroll:        { flex: 1 },
  scrollContent: { paddingVertical: Spacing.xl, gap: 0 },

  errorBanner: {
    backgroundColor: Colors.redAlpha15,
    borderRadius:    Radius.md,
    padding:         Spacing.md,
    marginHorizontal: Spacing.xl,
    marginBottom:    Spacing.lg,
    borderWidth:      1,
    borderColor:     Colors.redAlpha25,
  },
  errorBannerText: { ...Typography.callout, color: Colors.red },

  groupLabel: {
    ...Typography.caption2,
    color:            Colors.textDim,
    letterSpacing:    1.5,
    marginHorizontal: Spacing.xl,
    marginBottom:     Spacing.xs,
    marginTop:        Spacing.xl,
  },
  group: {
    backgroundColor:  Colors.backgroundCard,
    borderRadius:     Radius.lg,
    marginHorizontal: Spacing.xl,
    overflow:         'hidden',
    borderWidth:       1,
    borderColor:      Colors.separator,
  },
  groupError: { borderColor: Colors.red + '55' },

  fieldError: {
    ...Typography.caption1,
    color:            Colors.red,
    marginHorizontal: Spacing.xl + Spacing.xs,
    marginTop:        Spacing.xs,
  },

  // Type toggle
  typeRow: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.md },
  typeCard: {
    flex:           1,
    borderRadius:   Radius.md,
    borderWidth:     1,
    padding:        Spacing.lg,
    alignItems:     'center',
    gap:             Spacing.xs,
  },
  typeEmoji: { fontSize: 28 },
  typeLabel: { ...Typography.headline },
  typeDesc:  { ...Typography.caption2, color: Colors.textDim },

  // Name input
  nameInput: {
    ...Typography.body,
    color:   Colors.textPrimary,
    padding: Spacing.lg,
  },
  charCount: {
    ...Typography.caption2,
    color:   Colors.textDim,
    padding: Spacing.lg,
    paddingTop: 0,
  },

  // Appearance
  previewRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.md,
    padding:       Spacing.lg,
  },
  iconPreviewWrap: {
    width: 52, height: 52, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  iconPreviewEmoji: { fontSize: 28 },
  previewInfo:      { flex: 1, gap: 4 },
  previewName:      { ...Typography.headline, color: Colors.textPrimary },
  previewType:      { ...Typography.caption1, fontWeight: '700', letterSpacing: 1 },

  // Row
  row: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.lg,
    minHeight:      52,
  },
  rowLabel: { ...Typography.callout, color: Colors.textPrimary },
  rowDesc:  { ...Typography.caption1, color: Colors.textDim, marginTop: 3 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rowValue: { ...Typography.callout, color: Colors.textMuted },
  rowArrow: { ...Typography.title3, color: Colors.textDim, fontWeight: '300' },
  checkmark:{ ...Typography.callout, fontWeight: '700' },

  colorDot: { width: 22, height: 22, borderRadius: 11 },
  separator:{ height: 1, backgroundColor: Colors.separator, marginHorizontal: Spacing.lg },

  // Days
  daysRow: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    gap:             Spacing.sm,
    padding:        Spacing.lg,
  },
  dayPill: {
    borderRadius:      Radius.full,
    borderWidth:        1,
    paddingHorizontal: 14,
    paddingVertical:    8,
  },
  dayPillText: { ...Typography.footnote, fontWeight: '600' },

  // Time input
  timeInput: {
    ...Typography.body,
    color:   Colors.textPrimary,
    padding: Spacing.lg,
    textAlign: 'center',
    letterSpacing: 2,
  },
  infoText: {
    ...Typography.caption1,
    color:            Colors.gold,
    marginHorizontal: Spacing.xl + Spacing.xs,
    marginTop:        Spacing.xs,
    lineHeight:       18,
  },

  // Save
  saveBtn: {
    marginHorizontal: Spacing.xl,
    marginTop:        Spacing.xxl,
    borderRadius:     Radius.lg,
    paddingVertical:   18,
    alignItems:       'center',
  },
  saveBtnText: { ...Typography.headline },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay90, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor:      Colors.backgroundCard,
    borderTopLeftRadius:  Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding:              Spacing.xl,
    paddingBottom:        40,
    maxHeight:            '65%',
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.separator,
    alignSelf: 'center', marginBottom: Spacing.lg,
  },
  modalTitle: {
    ...Typography.title3, color: Colors.textPrimary,
    textAlign: 'center', marginBottom: Spacing.xl,
  },
  iconOption: {
    width: 44, height: 44, borderRadius: Radius.sm,
    alignItems: 'center', justifyContent: 'center',
    margin: 3, borderWidth: 1, borderColor: 'transparent',
  },
  colorGrid: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    gap:             16,
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
  },
  colorOption: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3, borderColor: Colors.white,
    transform: [{ scale: 1.15 }],
  },
  colorCheck: { color: '#000', fontSize: 18, fontWeight: '700' },
});

export default AddHabitScreen;