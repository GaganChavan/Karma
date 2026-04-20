// ─── KARMA APP — ADD / EDIT HABIT SCREEN ────────────────────────────
// Full form: name, type (build/break), icon, color, frequency,
// reminder time, reminder type, goal days, punishment sensitivity.
// Complete validation with inline error messages.

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, Alert, KeyboardAvoidingView,
  Platform, Animated, Switch, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, HabitColors, HabitIcons } from '../constants/colors';
import { validateHabitForm } from '../utils/validation';
import { createHabit, updateHabit, getHabitById } from '../database/habitService';

const DAYS = [
  { key: '1', label: 'M' },
  { key: '2', label: 'T' },
  { key: '3', label: 'W' },
  { key: '4', label: 'T' },
  { key: '5', label: 'F' },
  { key: '6', label: 'S' },
  { key: '7', label: 'S' },
];

const PUNISHMENT_OPTIONS = [
  { key: 'soft',     label: '🟢 Soft',     desc: 'Gentle nudges only' },
  { key: 'balanced', label: '🟡 Balanced',  desc: 'Default — escalates respectfully' },
  { key: 'harsh',    label: '🔴 Harsh',     desc: 'No mercy mode' },
];

const REMINDER_TYPES = [
  { key: 'none', label: 'None' },
  { key: 'soft', label: '🔔 Notification' },
  { key: 'hard', label: '⏰ Alarm' },
];

const defaultForm = {
  name:                   '',
  type:                   'build',
  icon:                   '⭐',
  color:                  '#1E7FFF',
  frequency:              'daily',
  days:                   '1,2,3,4,5,6,7',
  reminder_time:          '',
  reminder_type:          'none',
  goal_days:              '',
  punishment_sensitivity: 'balanced',
};

const AddHabitScreen = ({ navigation, route }) => {
  const editId = route?.params?.habitId || null;
  const isEdit = !!editId;

  const [form,         setForm]         = useState(defaultForm);
  const [errors,       setErrors]       = useState({});
  const [saving,       setSaving]       = useState(false);
  const [loading,      setLoading]      = useState(isEdit);
  const [iconModal,    setIconModal]    = useState(false);
  const [colorModal,   setColorModal]   = useState(false);
  const [selectedDays, setSelectedDays] = useState(new Set(['1','2','3','4','5','6','7']));

  // Animations
  const buildAnim = useRef(new Animated.Value(1)).current;
  const breakAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isEdit) _loadHabit();
  }, [editId]);

  const _loadHabit = async () => {
    try {
      const habit = await getHabitById(editId);
      const days  = new Set(habit.days.split(','));
      setForm({
        name:                   habit.name,
        type:                   habit.type,
        icon:                   habit.icon,
        color:                  habit.color,
        frequency:              habit.frequency,
        days:                   habit.days,
        reminder_time:          habit.reminder_time || '',
        reminder_type:          habit.reminder_type,
        goal_days:              habit.goal_days ? String(habit.goal_days) : '',
        punishment_sensitivity: habit.punishment_sensitivity,
      });
      setSelectedDays(days);
      _animateType(habit.type);
    } catch (err) {
      Alert.alert('Error', `Couldn't load habit: ${err.message}`);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const _animateType = (type) => {
    Animated.parallel([
      Animated.timing(buildAnim, {
        toValue:         type === 'build' ? 1 : 0,
        duration:        250,
        useNativeDriver: false,
      }),
      Animated.timing(breakAnim, {
        toValue:         type === 'break' ? 1 : 0,
        duration:        250,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const _setType = (type) => {
    _updateForm('type', type);
    _animateType(type);
    // Reset punishment sensitivity default for break habits
    if (type === 'break' && form.punishment_sensitivity === 'soft') {
      _updateForm('punishment_sensitivity', 'balanced');
    }
  };

  const _updateForm = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    // Clear error on change
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: null }));
    }
  };

  const _toggleDay = (dayKey) => {
    const newDays = new Set(selectedDays);
    if (newDays.has(dayKey)) {
      if (newDays.size === 1) {
        // Must have at least one day
        _shakeError();
        setErrors(prev => ({ ...prev, days: 'Select at least one day' }));
        return;
      }
      newDays.delete(dayKey);
    } else {
      newDays.add(dayKey);
    }
    setSelectedDays(newDays);
    const sorted = ['1','2','3','4','5','6','7'].filter(d => newDays.has(d));
    _updateForm('days', sorted.join(','));
    setErrors(prev => ({ ...prev, days: null }));
  };

  const _shakeError = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue:  8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const _handleSave = async () => {
    // Validate
    const formErrors = validateHabitForm({
      ...form,
      days: form.frequency === 'specific_days' ? form.days : '1,2,3,4,5,6,7',
    });

    if (formErrors.length > 0) {
      // Map errors to fields
      const errorMap = {};
      formErrors.forEach(msg => {
        if (msg.includes('name'))       errorMap.name = msg;
        else if (msg.includes('type'))  errorMap.type = msg;
        else if (msg.includes('time'))  errorMap.reminder_time = msg;
        else if (msg.includes('Goal'))  errorMap.goal_days = msg;
        else                            errorMap.general = msg;
      });
      setErrors(errorMap);
      _shakeError();
      return;
    }

    setSaving(true);
    try {
      const habitData = {
        ...form,
        goal_days: form.goal_days ? parseInt(form.goal_days) : 0,
        days: form.frequency === 'daily' ? '1,2,3,4,5,6,7' : form.days,
      };

      if (isEdit) {
        await updateHabit(editId, habitData);
        Alert.alert('✅ Updated', `"${form.name}" has been updated.`);
      } else {
        await createHabit(habitData);
        Alert.alert(
          '🔱 Karma Created',
          `"${form.name}" has been added. Day 1 starts now, Neel.`,
          [{ text: 'Let\'s Go', onPress: () => navigation.goBack() }]
        );
        return;
      }
      navigation.goBack();
    } catch (err) {
      // Show specific validation errors inline
      if (err.message.includes('name')) {
        setErrors(prev => ({ ...prev, name: err.message }));
      } else if (err.message.includes('already exists')) {
        setErrors(prev => ({ ...prev, name: err.message }));
      } else {
        Alert.alert('Error', err.message);
      }
      _shakeError();
    } finally {
      setSaving(false);
    }
  };

  const _handleDelete = () => {
    Alert.alert(
      'Archive Habit',
      `Archive "${form.name}"? Your history will be preserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text:  'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              const { archiveHabit } = require('../database/habitService');
              await archiveHabit(editId);
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  // ── Render helpers ────────────────────────────────────────────────

  const buildBg = buildAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [Colors.backgroundCard, Colors.blueAlpha20],
  });
  const breakBg = breakAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [Colors.backgroundCard, 'rgba(255,59,48,0.15)'],
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading habit...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEdit ? 'Edit Habit' : 'New Habit'}
        </Text>
        {isEdit && (
          <TouchableOpacity onPress={_handleDelete} style={styles.archiveBtn}>
            <Text style={styles.archiveText}>Archive</Text>
          </TouchableOpacity>
        )}
        {!isEdit && <View style={{ width: 60 }} />}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* General error */}
          {errors.general && (
            <View style={styles.generalError}>
              <Text style={styles.generalErrorText}>⚠️ {errors.general}</Text>
            </View>
          )}

          {/* Habit Type Toggle */}
          <Text style={styles.sectionLabel}>HABIT TYPE</Text>
          <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={styles.typeOption}
                onPress={() => _setType('build')}
                activeOpacity={0.8}
              >
                <Animated.View style={[styles.typeCard, { backgroundColor: buildBg,
                  borderColor: form.type === 'build' ? Colors.blue : Colors.border,
                }]}>
                  <Text style={styles.typeEmoji}>🟢</Text>
                  <Text style={[styles.typeLabel,
                    { color: form.type === 'build' ? Colors.blue : Colors.textMuted }
                  ]}>BUILD</Text>
                  <Text style={styles.typeDesc}>Do this daily</Text>
                </Animated.View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.typeOption}
                onPress={() => _setType('break')}
                activeOpacity={0.8}
              >
                <Animated.View style={[styles.typeCard, { backgroundColor: breakBg,
                  borderColor: form.type === 'break' ? Colors.red : Colors.border,
                }]}>
                  <Text style={styles.typeEmoji}>🔴</Text>
                  <Text style={[styles.typeLabel,
                    { color: form.type === 'break' ? Colors.red : Colors.textMuted }
                  ]}>BREAK</Text>
                  <Text style={styles.typeDesc}>Stop this habit</Text>
                </Animated.View>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Name */}
          <Text style={styles.sectionLabel}>HABIT NAME</Text>
          <View style={[styles.inputWrapper,
            errors.name && { borderColor: Colors.red }
          ]}>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(v) => _updateForm('name', v)}
              placeholder={
                form.type === 'build'
                  ? 'e.g. Morning Meditation'
                  : 'e.g. No Social Media'
              }
              placeholderTextColor={Colors.textDim}
              maxLength={50}
              returnKeyType="done"
            />
            <Text style={styles.charCount}>{form.name.length}/50</Text>
          </View>
          {errors.name && (
            <Text style={styles.errorText}>⚠️ {errors.name}</Text>
          )}

          {/* Icon + Color Row */}
          <Text style={styles.sectionLabel}>ICON & COLOR</Text>
          <View style={styles.iconColorRow}>
            <TouchableOpacity
              style={[styles.iconPicker, { borderColor: form.color }]}
              onPress={() => setIconModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.iconPreview}>{form.icon}</Text>
              <Text style={styles.iconPickerLabel}>Icon</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.colorPicker, { borderColor: form.color }]}
              onPress={() => setColorModal(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.colorSwatch, { backgroundColor: form.color }]} />
              <Text style={styles.colorPickerLabel}>Color</Text>
            </TouchableOpacity>

            {/* Preview */}
            <View style={[styles.habitPreview, {
              backgroundColor: form.color + '20',
              borderColor:     form.color + '60',
            }]}>
              <Text style={{ fontSize: 22 }}>{form.icon}</Text>
              <Text style={[styles.previewName, { color: form.color }]} numberOfLines={1}>
                {form.name || 'Preview'}
              </Text>
            </View>
          </View>

          {/* Frequency */}
          <Text style={styles.sectionLabel}>FREQUENCY</Text>
          <View style={styles.freqRow}>
            {[
              { key: 'daily',         label: 'Every Day' },
              { key: 'specific_days', label: 'Specific Days' },
            ].map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.freqOption, {
                  backgroundColor: form.frequency === f.key
                    ? Colors.blueAlpha20 : Colors.backgroundCard,
                  borderColor: form.frequency === f.key
                    ? Colors.blue : Colors.border,
                }]}
                onPress={() => _updateForm('frequency', f.key)}
              >
                <Text style={[styles.freqLabel, {
                  color: form.frequency === f.key
                    ? Colors.blue : Colors.textMuted,
                }]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Day picker — shown when specific days */}
          {form.frequency === 'specific_days' && (
            <>
              <View style={styles.daysRow}>
                {DAYS.map((d, i) => (
                  <TouchableOpacity
                    key={d.key}
                    style={[styles.dayCircle, {
                      backgroundColor: selectedDays.has(d.key)
                        ? form.color : Colors.backgroundCard,
                      borderColor: selectedDays.has(d.key)
                        ? form.color : Colors.border,
                    }]}
                    onPress={() => _toggleDay(d.key)}
                  >
                    <Text style={[styles.dayLabel, {
                      color: selectedDays.has(d.key)
                        ? Colors.white : Colors.textMuted,
                    }]}>{d.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.days && (
                <Text style={styles.errorText}>⚠️ {errors.days}</Text>
              )}
            </>
          )}

          {/* Reminder */}
          <Text style={styles.sectionLabel}>REMINDER</Text>
          <View style={styles.reminderRow}>
            {REMINDER_TYPES.map(r => (
              <TouchableOpacity
                key={r.key}
                style={[styles.reminderOption, {
                  backgroundColor: form.reminder_type === r.key
                    ? Colors.blueAlpha20 : Colors.backgroundCard,
                  borderColor: form.reminder_type === r.key
                    ? Colors.blue : Colors.border,
                }]}
                onPress={() => _updateForm('reminder_type', r.key)}
              >
                <Text style={[styles.reminderLabel, {
                  color: form.reminder_type === r.key
                    ? Colors.blue : Colors.textMuted,
                }]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {form.reminder_type !== 'none' && (
            <>
              <View style={[styles.inputWrapper,
                errors.reminder_time && { borderColor: Colors.red }
              ]}>
                <TextInput
                  style={styles.input}
                  value={form.reminder_time}
                  onChangeText={(v) => _updateForm('reminder_time', v)}
                  placeholder="e.g. 06:00 or 21:30"
                  placeholderTextColor={Colors.textDim}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  returnKeyType="done"
                />
              </View>
              {errors.reminder_time && (
                <Text style={styles.errorText}>⚠️ {errors.reminder_time}</Text>
              )}
              {form.reminder_type === 'hard' && (
                <View style={styles.alarmInfo}>
                  <Text style={styles.alarmInfoText}>
                    ⏰ A real alarm will be set in your clock app — rings even on silent.
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Goal */}
          <Text style={styles.sectionLabel}>GOAL (OPTIONAL)</Text>
          <View style={[styles.inputWrapper,
            errors.goal_days && { borderColor: Colors.red }
          ]}>
            <TextInput
              style={styles.input}
              value={form.goal_days}
              onChangeText={(v) => _updateForm('goal_days', v.replace(/[^0-9]/g, ''))}
              placeholder="e.g. 21 (days) — leave empty for forever"
              placeholderTextColor={Colors.textDim}
              keyboardType="number-pad"
              maxLength={4}
              returnKeyType="done"
            />
          </View>
          {errors.goal_days && (
            <Text style={styles.errorText}>⚠️ {errors.goal_days}</Text>
          )}

          {/* Punishment — only for break habits */}
          {form.type === 'break' && (
            <>
              <Text style={styles.sectionLabel}>PUNISHMENT LEVEL</Text>
              <View style={styles.punishColumn}>
                {PUNISHMENT_OPTIONS.map(p => (
                  <TouchableOpacity
                    key={p.key}
                    style={[styles.punishOption, {
                      backgroundColor: form.punishment_sensitivity === p.key
                        ? Colors.blueAlpha20 : Colors.backgroundCard,
                      borderColor: form.punishment_sensitivity === p.key
                        ? Colors.blue : Colors.border,
                    }]}
                    onPress={() => _updateForm('punishment_sensitivity', p.key)}
                  >
                    <Text style={[styles.punishLabel, {
                      color: form.punishment_sensitivity === p.key
                        ? Colors.textPrimary : Colors.textMuted,
                    }]}>{p.label}</Text>
                    <Text style={styles.punishDesc}>{p.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, {
              backgroundColor: form.type === 'build' ? Colors.blue : Colors.red,
              opacity: saving ? 0.7 : 1,
            }]}
            onPress={_handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={styles.saveButtonText}>
              {saving
                ? 'Saving...'
                : isEdit
                ? '✓ Save Changes'
                : `✚ Create ${form.type === 'build' ? 'Build' : 'Break'} Habit`
              }
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Icon Picker Modal */}
      <Modal
        visible={iconModal}
        transparent
        animationType="slide"
        onRequestClose={() => setIconModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIconModal(false)}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Choose Icon</Text>
            <FlatList
              data={HabitIcons}
              numColumns={8}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.iconOption, {
                    backgroundColor: item === form.icon
                      ? form.color + '30' : 'transparent',
                    borderColor: item === form.icon
                      ? form.color : 'transparent',
                  }]}
                  onPress={() => {
                    _updateForm('icon', item);
                    setIconModal(false);
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Color Picker Modal */}
      <Modal
        visible={colorModal}
        transparent
        animationType="slide"
        onRequestClose={() => setColorModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setColorModal(false)}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Choose Color</Text>
            <View style={styles.colorGrid}>
              {HabitColors.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorOption, {
                    backgroundColor: color,
                    borderWidth: color === form.color ? 3 : 0,
                    borderColor: Colors.white,
                    transform: [{ scale: color === form.color ? 1.15 : 1 }],
                  }]}
                  onPress={() => {
                    _updateForm('color', color);
                    setColorModal(false);
                  }}
                />
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex:            1,
    backgroundColor: Colors.background,
    alignItems:      'center',
    justifyContent:  'center',
  },
  loadingText: { color: Colors.textMuted },

  // Header
  header: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    paddingHorizontal: 16,
    paddingVertical:   14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn:      { padding: 4, minWidth: 60 },
  backText:     { color: Colors.blue, fontSize: 14 },
  headerTitle:  { fontSize: 16, color: Colors.textPrimary, fontWeight: 'bold' },
  archiveBtn:   { padding: 4, minWidth: 60, alignItems: 'flex-end' },
  archiveText:  { color: Colors.red, fontSize: 13 },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16 },

  // General error
  generalError: {
    backgroundColor: Colors.redAlpha,
    borderRadius:    10,
    padding:         12,
    marginBottom:    14,
    borderWidth:      1,
    borderColor:     Colors.red + '44',
  },
  generalErrorText: { color: Colors.red, fontSize: 13 },

  // Section label
  sectionLabel: {
    fontSize:      9,
    color:         Colors.textDim,
    letterSpacing: 3,
    marginBottom:  8,
    marginTop:     16,
  },

  // Type toggle
  typeRow:    { flexDirection: 'row', gap: 10, marginBottom: 4 },
  typeOption: { flex: 1 },
  typeCard: {
    borderRadius:  14,
    borderWidth:    1,
    padding:       14,
    alignItems:    'center',
    gap:            4,
  },
  typeEmoji: { fontSize: 24 },
  typeLabel: { fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
  typeDesc:  { fontSize: 10, color: Colors.textDim },

  // Input
  inputWrapper: {
    backgroundColor: Colors.backgroundCard,
    borderRadius:    12,
    borderWidth:      1,
    borderColor:     Colors.border,
    flexDirection:   'row',
    alignItems:      'center',
    paddingHorizontal: 14,
    height:          50,
  },
  input: {
    flex:      1,
    color:     Colors.textPrimary,
    fontSize:  14,
  },
  charCount: {
    fontSize: 10,
    color:    Colors.textDim,
  },
  errorText: {
    color:     Colors.red,
    fontSize:  11,
    marginTop:  5,
    marginLeft: 4,
  },

  // Icon + Color
  iconColorRow: {
    flexDirection: 'row',
    gap:           10,
    alignItems:    'center',
  },
  iconPicker: {
    width:          64,
    height:         64,
    borderRadius:   14,
    borderWidth:     1,
    backgroundColor: Colors.backgroundCard,
    alignItems:     'center',
    justifyContent: 'center',
    gap:             3,
  },
  iconPreview:      { fontSize: 26 },
  iconPickerLabel:  { fontSize: 9, color: Colors.textDim },
  colorPicker: {
    width:          64,
    height:         64,
    borderRadius:   14,
    borderWidth:     1,
    backgroundColor: Colors.backgroundCard,
    alignItems:     'center',
    justifyContent: 'center',
    gap:             6,
  },
  colorSwatch:      { width: 28, height: 28, borderRadius: 14 },
  colorPickerLabel: { fontSize: 9, color: Colors.textDim },
  habitPreview: {
    flex:           1,
    height:         64,
    borderRadius:   14,
    borderWidth:     1,
    alignItems:     'center',
    justifyContent: 'center',
    flexDirection:  'row',
    gap:             8,
    paddingHorizontal: 10,
  },
  previewName: { fontSize: 12, fontWeight: '600', flex: 1 },

  // Frequency
  freqRow: { flexDirection: 'row', gap: 10 },
  freqOption: {
    flex:           1,
    borderRadius:   12,
    borderWidth:     1,
    padding:        12,
    alignItems:     'center',
  },
  freqLabel: { fontSize: 13, fontWeight: '600' },

  // Days
  daysRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    marginTop:       10,
  },
  dayCircle: {
    width:          36,
    height:         36,
    borderRadius:   18,
    borderWidth:     1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  dayLabel: { fontSize: 11, fontWeight: 'bold' },

  // Reminder
  reminderRow: {
    flexDirection: 'row',
    gap:            8,
    flexWrap:      'wrap',
  },
  reminderOption: {
    borderRadius: 10,
    borderWidth:   1,
    paddingVertical:   9,
    paddingHorizontal: 14,
  },
  reminderLabel: { fontSize: 12, fontWeight: '600' },
  alarmInfo: {
    backgroundColor: Colors.goldAlpha,
    borderRadius:    10,
    padding:         10,
    marginTop:        6,
    borderWidth:      1,
    borderColor:     Colors.borderGold,
  },
  alarmInfoText: { fontSize: 11, color: Colors.gold, lineHeight: 16 },

  // Punishment
  punishColumn: { gap: 8 },
  punishOption: {
    borderRadius: 12,
    borderWidth:   1,
    padding:      12,
    flexDirection: 'row',
    alignItems:   'center',
    justifyContent: 'space-between',
  },
  punishLabel: { fontSize: 13, fontWeight: '600' },
  punishDesc:  { fontSize: 11, color: Colors.textDim },

  // Save
  saveButton: {
    borderRadius:   16,
    paddingVertical: 16,
    alignItems:     'center',
    marginTop:       24,
    shadowColor:    Colors.blue,
    shadowOffset:   { width: 0, height: 4 },
    shadowOpacity:  0.4,
    shadowRadius:   12,
    elevation:       6,
  },
  saveButtonText: {
    color:      Colors.white,
    fontSize:   16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  // Modals
  modalOverlay: {
    flex:            1,
    backgroundColor: Colors.overlay,
    justifyContent:  'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.backgroundSecondary,
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    borderTopWidth:        1,
    borderTopColor:        Colors.borderBlue,
    padding:              20,
    maxHeight:            '60%',
  },
  modalTitle: {
    fontSize:     16,
    color:        Colors.textPrimary,
    fontWeight:   'bold',
    marginBottom:  16,
    textAlign:    'center',
    letterSpacing: 1,
  },
  iconOption: {
    width:          40,
    height:         40,
    borderRadius:    8,
    borderWidth:     1,
    alignItems:     'center',
    justifyContent: 'center',
    margin:          3,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    justifyContent: 'center',
    gap:            14,
    paddingVertical: 10,
  },
  colorOption: {
    width:        44,
    height:       44,
    borderRadius: 22,
  },
});

export default AddHabitScreen;