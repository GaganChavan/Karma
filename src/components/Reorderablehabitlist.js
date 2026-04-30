// ============================================================
// KARMA — ReorderableHabitList.js
// Save as: src/components/ReorderableHabitList.js
//
// USAGE in HomeScreen.js:
//   Replace your habit list rendering with this component.
//   It handles:
//     - Long press → enters reorder mode
//     - Up/down arrows to change order within a time group
//     - "Done Reordering" button saves order to DB
//     - Normal tap → navigates to HabitDetailScreen
//
// INTEGRATION:
//   import ReorderableHabitList from '../components/ReorderableHabitList';
//   import { updateSortOrders } from '../database/habitService';
//
//   <ReorderableHabitList
//     habits={habits}                       // all habits array
//     onHabitPress={(habit) => navigation.navigate('HabitDetail', { habitId: habit.id })}
//     onOrderSaved={(reorderedHabits) => setHabits(reorderedHabits)}
//     renderHabitCard={(habit, reorderMode, extraProps) => (
//       <YourExistingHabitCard habit={habit} {...extraProps} />
//     )}
//   />
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { useTheme } from '../constants/ThemeContext';
import { updateSortOrders } from '../database/habitService';

const TIME_GROUPS = ['morning', 'afternoon', 'evening', 'anytime'];
const GROUP_LABELS = {
  morning:   '🌅 Morning',
  afternoon: '☀️ Afternoon',
  evening:   '🌙 Evening',
  anytime:   '⭐ Anytime',
};

const ReorderableHabitList = ({
  habits,
  onHabitPress,
  onOrderSaved,
  renderHabitCard,
}) => {
  const { colors } = useTheme();
  const [reorderMode, setReorderMode] = useState(false);
  const [localHabits, setLocalHabits] = useState(habits);
  const [saving, setSaving] = useState(false);

  // Sync with parent if habits change from outside
  React.useEffect(() => {
    if (!reorderMode) setLocalHabits(habits);
  }, [habits, reorderMode]);

  // Group habits by time_of_day
  const grouped = TIME_GROUPS.reduce((acc, group) => {
    acc[group] = localHabits.filter((h) => h.time_of_day === group);
    return acc;
  }, {});

  const handleLongPress = () => {
    setReorderMode(true);
  };

  const moveHabit = (group, fromIndex, direction) => {
    const toIndex = fromIndex + direction;
    const groupHabits = [...grouped[group]];
    if (toIndex < 0 || toIndex >= groupHabits.length) return;

    // Swap
    [groupHabits[fromIndex], groupHabits[toIndex]] = [groupHabits[toIndex], groupHabits[fromIndex]];

    // Rebuild full habits list preserving other groups
    const newAll = [];
    TIME_GROUPS.forEach((g) => {
      if (g === group) {
        newAll.push(...groupHabits);
      } else {
        newAll.push(...localHabits.filter((h) => h.time_of_day === g));
      }
    });
    setLocalHabits(newAll);
  };

  const saveOrder = async () => {
    setSaving(true);
    try {
      // Assign sort_order based on current position
      const updates = localHabits.map((h, i) => ({ id: h.id, sort_order: i }));
      await updateSortOrders(updates);
      onOrderSaved?.(localHabits);
      setReorderMode(false);
    } catch (e) {
      console.error('Failed to save order:', e);
    } finally {
      setSaving(false);
    }
  };

  const cancelReorder = () => {
    setLocalHabits(habits); // Reset to original
    setReorderMode(false);
  };

  return (
    <View>
      {/* Reorder mode banner */}
      {reorderMode && (
        <View style={[styles.reorderBanner, { backgroundColor: 'rgba(255,215,0,0.08)', borderColor: 'rgba(255,215,0,0.3)' }]}>
          <Text style={styles.reorderBannerText}>↕ Drag mode — use arrows to reorder</Text>
          <View style={styles.reorderActions}>
            <TouchableOpacity onPress={cancelReorder} style={styles.cancelBtn}>
              <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={saveOrder}
              style={[styles.saveBtn, { backgroundColor: '#FFD700' }]}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Order'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Grouped habit list */}
      {TIME_GROUPS.map((group) => {
        const groupHabits = grouped[group];
        if (!groupHabits || groupHabits.length === 0) return null;

        return (
          <View key={group} style={styles.group}>
            {/* Group header */}
            <Text style={[styles.groupLabel, { color: colors.textMuted }]}>
              {GROUP_LABELS[group]}
            </Text>

            {groupHabits.map((habit, index) => (
              <View key={habit.id} style={styles.habitRow}>
                {/* The existing card — wrapped in long-press + tap */}
                <TouchableOpacity
                  style={styles.habitCardWrapper}
                  onPress={() => {
                    if (!reorderMode) onHabitPress(habit);
                  }}
                  onLongPress={handleLongPress}
                  delayLongPress={350}
                  activeOpacity={reorderMode ? 1 : 0.7}
                >
                  {renderHabitCard(habit, reorderMode)}
                </TouchableOpacity>

                {/* Reorder arrows */}
                {reorderMode && (
                  <View style={styles.arrowCol}>
                    <TouchableOpacity
                      onPress={() => moveHabit(group, index, -1)}
                      style={[
                        styles.arrowBtn,
                        { opacity: index === 0 ? 0.2 : 1 },
                      ]}
                      disabled={index === 0}
                    >
                      <Text style={styles.arrowText}>▲</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => moveHabit(group, index, 1)}
                      style={[
                        styles.arrowBtn,
                        { opacity: index === groupHabits.length - 1 ? 0.2 : 1 },
                      ]}
                      disabled={index === groupHabits.length - 1}
                    >
                      <Text style={styles.arrowText}>▼</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  reorderBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reorderBannerText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  reorderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  cancelBtnText: {
    fontSize: 13,
  },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
  },
  group: {
    marginBottom: 8,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  habitCardWrapper: {
    flex: 1,
  },
  arrowCol: {
    width: 36,
    marginLeft: 8,
    gap: 4,
  },
  arrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(255,215,0,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    color: '#FFD700',
    fontSize: 14,
  },
});

export default ReorderableHabitList;