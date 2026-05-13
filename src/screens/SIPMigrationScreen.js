// ─── KARMA APP — SIP MIGRATION SCREEN (PHASE F-1) ────────────────────
// One-time screen shown on first open after Phase F-1 update.
// User taps a category for each existing habit.
// After completion, sip_migration_done = 'true' — never shown again.
// New habits added via AddHabitScreen will ask for category in the form.

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView }  from 'react-native-safe-area-context';
import { useTheme, Typography, Spacing, Radius } from '../constants/colors';
import { getDatabase }   from '../database/database';
import { setSetting }    from '../database/habitService';

export const SIP_CATEGORIES = [
  {
    key:   'spiritual',
    label: 'Spiritual',
    icon:  '🕉️',
    desc:  'Soul practices — meditation, prayer, gratitude, Gita',
    color: '#BF5AF2',
    chariot: 'Krishna — the guide',
  },
  {
    key:   'intellectual',
    label: 'Intellectual',
    icon:  '📚',
    desc:  'Mind — learning, reading, writing, focus',
    color: '#0A84FF',
    chariot: 'The Reins — the mind',
  },
  {
    key:   'physical',
    label: 'Physical',
    icon:  '💪',
    desc:  'Body — exercise, diet, sleep, health',
    color: '#30D158',
    chariot: 'The Horses — the body',
  },
  {
    key:   'conscious',
    label: 'Conscious',
    icon:  '🔥',
    desc:  'Habits to overcome — things you are consciously resisting',
    color: '#FF453A',
    chariot: 'The Battlefield — every moment of choice',
  },
];

const SIPMigrationScreen = ({ onComplete }) => {
  const { colors } = useTheme();
  const [habits,     setHabits]     = useState([]);
  const [categories, setCategories] = useState({});  // habitId → category key
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);

  useEffect(() => { _loadHabits(); }, []);

  const _loadHabits = async () => {
    try {
      const db = await getDatabase();
      // All active habits (including paused) that have no category yet
      const all = await db.getAllAsync(
        "SELECT * FROM habits WHERE is_active = 1 ORDER BY type ASC, sort_order ASC"
      ) || [];
      setHabits(all);

      // Pre-fill any already-categorised habits
      const prefill = {};
      all.forEach(h => { if (h.category) prefill[h.id] = h.category; });
      setCategories(prefill);
    } catch (e) {
      console.warn('SIPMigration load:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const _setCategory = (habitId, category) => {
    setCategories(prev => ({ ...prev, [habitId]: category }));
  };

  const _canSave = () => {
    // All habits must have a category assigned
    return habits.every(h => !!categories[h.id]);
  };

  const _save = async () => {
    if (!_canSave()) {
      Alert.alert(
        'Assign All Categories',
        'Please tap a category for every habit before continuing.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSaving(true);
    try {
      const db = await getDatabase();

      // Save category for each habit
      for (const [habitId, category] of Object.entries(categories)) {
        await db.runAsync(
          "UPDATE habits SET category = ?, updated_at = datetime('now','localtime') WHERE id = ?",
          [category, parseInt(habitId)]
        );
      }

      // Mark migration done
      await setSetting('sip_migration_done', 'true');

      console.log('✅ SIP Migration complete');
      onComplete();
    } catch (e) {
      Alert.alert('Error', `Could not save: ${e.message}`);
      setSaving(false);
    }
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <StatusBar barStyle="light-content" />
      <ActivityIndicator size="large" color={colors.gold} />
    </View>
  );

  const assigned   = habits.filter(h => !!categories[h.id]).length;
  const total      = habits.length;
  const progress   = total > 0 ? assigned / total : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.lg }}>
        <Text style={{ ...Typography.caption2, color: colors.gold, letterSpacing: 2, marginBottom: Spacing.sm }}>
          ONE-TIME SETUP · PHASE F
        </Text>
        <Text style={{ ...Typography.title2, color: colors.textPrimary, marginBottom: Spacing.sm }}>
          Classify Your Habits
        </Text>
        <Text style={{ ...Typography.body, color: colors.textMuted, lineHeight: 22 }}>
          Tap a category for each habit. This organises your battlefield by{'\n'}
          <Text style={{ color: colors.gold }}>S</Text>piritual ·{' '}
          <Text style={{ color: colors.blue }}>I</Text>ntellectual ·{' '}
          <Text style={{ color: colors.green }}>P</Text>hysical ·{' '}
          <Text style={{ color: colors.red }}>C</Text>onscious
        </Text>

        {/* Progress */}
        <View style={{ marginTop: Spacing.lg, gap: Spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ ...Typography.caption1, color: colors.textMuted }}>{assigned}/{total} classified</Text>
            {assigned === total && (
              <Text style={{ ...Typography.caption1, color: colors.green, fontWeight: '700' }}>All done ✓</Text>
            )}
          </View>
          <View style={{ height: 4, backgroundColor: colors.backgroundCard, borderRadius: 2, overflow: 'hidden' }}>
            <View style={{
              height: '100%',
              width: `${progress * 100}%`,
              backgroundColor: progress === 1 ? colors.green : colors.gold,
              borderRadius: 2,
            }} />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Category legend */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl }}>
          {SIP_CATEGORIES.map(cat => (
            <View
              key={cat.key}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 5,
                backgroundColor: cat.color + '20',
                borderRadius: Radius.full,
                paddingHorizontal: 10, paddingVertical: 5,
                borderWidth: 1, borderColor: cat.color + '40',
              }}
            >
              <Text style={{ fontSize: 14 }}>{cat.icon}</Text>
              <Text style={{ ...Typography.caption1, color: cat.color, fontWeight: '600' }}>{cat.label}</Text>
            </View>
          ))}
        </View>

        {/* Group habits by type */}
        {['build', 'break'].map(type => {
          const group = habits.filter(h => h.type === type);
          if (group.length === 0) return null;
          return (
            <View key={type} style={{ marginBottom: Spacing.xl }}>
              <Text style={{
                ...Typography.caption2, color: colors.textDim,
                letterSpacing: 1.5, marginBottom: Spacing.md,
              }}>
                {type === 'build' ? '🟢 BUILD HABITS' : '🔴 BREAK HABITS'}
              </Text>
              {group.map(habit => (
                <View
                  key={habit.id}
                  style={{
                    backgroundColor: colors.backgroundCard,
                    borderRadius: Radius.lg,
                    borderWidth: 1,
                    borderColor: categories[habit.id]
                      ? (SIP_CATEGORIES.find(c => c.key === categories[habit.id])?.color + '50' || colors.separator)
                      : colors.separator,
                    marginBottom: Spacing.md,
                    overflow: 'hidden',
                  }}
                >
                  {/* Habit info */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md }}>
                    <View style={{
                      width: 44, height: 44, borderRadius: Radius.md,
                      backgroundColor: (habit.color || '#F5A623') + '20',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 22 }}>{habit.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...Typography.callout, color: colors.textPrimary, fontWeight: '600' }}>
                        {habit.name}
                      </Text>
                      {categories[habit.id] ? (
                        <Text style={{
                          ...Typography.caption1,
                          color: SIP_CATEGORIES.find(c => c.key === categories[habit.id])?.color,
                          fontWeight: '600', marginTop: 2,
                        }}>
                          {SIP_CATEGORIES.find(c => c.key === categories[habit.id])?.icon}{' '}
                          {SIP_CATEGORIES.find(c => c.key === categories[habit.id])?.label}
                        </Text>
                      ) : (
                        <Text style={{ ...Typography.caption1, color: colors.textDim, marginTop: 2 }}>
                          Tap a category below ↓
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Category buttons */}
                  <View style={{
                    flexDirection: 'row',
                    borderTopWidth: 1,
                    borderTopColor: colors.separator,
                  }}>
                    {SIP_CATEGORIES.map((cat, i) => {
                      const selected = categories[habit.id] === cat.key;
                      return (
                        <TouchableOpacity
                          key={cat.key}
                          style={{
                            flex: 1,
                            paddingVertical: Spacing.md,
                            alignItems: 'center',
                            gap: 3,
                            backgroundColor: selected ? cat.color + '25' : 'transparent',
                            borderRightWidth: i < SIP_CATEGORIES.length - 1 ? 1 : 0,
                            borderRightColor: colors.separator,
                          }}
                          onPress={() => _setCategory(habit.id, cat.key)}
                          activeOpacity={0.7}
                        >
                          <Text style={{ fontSize: 18 }}>{cat.icon}</Text>
                          <Text style={{
                            fontSize: 9,
                            color: selected ? cat.color : colors.textDim,
                            fontWeight: selected ? '700' : '400',
                          }}>
                            {cat.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>

      {/* Save button — fixed at bottom */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: Spacing.xl,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.separator,
      }}>
        <TouchableOpacity
          style={{
            backgroundColor: _canSave() ? colors.gold : colors.backgroundElevated,
            borderRadius: Radius.lg,
            paddingVertical: 18,
            alignItems: 'center',
            opacity: saving ? 0.7 : 1,
          }}
          onPress={_save}
          disabled={saving || !_canSave()}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator size="small" color="#000" />
            : <Text style={{
                ...Typography.headline,
                color: _canSave() ? '#000' : colors.textDim,
              }}>
                {_canSave() ? 'Save & Enter the Battlefield ☸' : `${total - assigned} habits remaining`}
              </Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default SIPMigrationScreen;