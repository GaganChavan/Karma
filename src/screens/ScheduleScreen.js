// ─── KARMA PLUGIN — SCHEDULE SCREEN ──────────────────────────────────
// Timeline viewer + inline check-in. Tap a block to log without leaving.

import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StatusBar,
  Modal, Animated, TouchableWithoutFeedback, ActivityIndicator,
} from 'react-native';
import { SafeAreaView }   from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, Typography, Spacing, Radius } from '../constants/colors';
import { getAllHabits, getTodayCheckins, checkIn } from '../database/habitService';

// ── Timeline constants ────────────────────────────────────────────────
const PX_PER_MIN     = 1.5;
const TIMELINE_START = 5 * 60;   // 5 AM in minutes
const TIMELINE_END   = 23 * 60;  // 11 PM in minutes
const HOUR_HEIGHT    = 60 * PX_PER_MIN;
const TOTAL_HEIGHT   = (TIMELINE_END - TIMELINE_START) * PX_PER_MIN;
const TIME_COL_W     = 56;
const MIN_BLOCK_H    = 34;

const _parseMins = (timeStr) => {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};

const _topOf = (totalMins) =>
  Math.max(0, (totalMins - TIMELINE_START) * PX_PER_MIN);

const _fmtHour = (h) => {
  if (h === 0)  return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
};

const _fmtRange = (startMins, dur) => {
  const fmt = (m) => {
    const hh  = Math.floor(m / 60) % 24;
    const mm  = m % 60;
    const ap  = hh < 12 ? 'AM' : 'PM';
    const h12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
    return `${h12}:${String(mm).padStart(2, '0')} ${ap}`;
  };
  return `${fmt(startMins)} – ${fmt(startMins + dur)}`;
};

// ── Check-in actions per habit type ──────────────────────────────────
const BUILD_ACTIONS = [
  { status: 'done',    icon: '✓', label: 'Done',    color: '#30D158' },
  { status: 'missed',  icon: '✗', label: 'Missed',  color: '#FF453A' },
  { status: 'skipped', icon: '⏭', label: 'Skip',    color: '#8E8E93' },
];
const BREAK_ACTIONS = [
  { status: 'resisted', icon: '✊', label: 'Resisted', color: '#30D158' },
  { status: 'slip',     icon: '😔', label: 'Slipped',  color: '#FF453A' },
  { status: 'skipped',  icon: '⏭', label: 'Skip',     color: '#8E8E93' },
];

// ── Main Component ────────────────────────────────────────────────────
const ScheduleScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [habits,        setHabits]        = useState([]);
  const [checkins,      setCheckins]      = useState({});
  const [selectedHabit, setSelectedHabit] = useState(null);
  const [saving,        setSaving]        = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current;

  useFocusEffect(useCallback(() => { _load(); }, []));

  const _load = async () => {
    try {
      const [habitsData, checkinsData] = await Promise.all([
        getAllHabits(),
        getTodayCheckins(),
      ]);
      const map = {};
      checkinsData.forEach(c => { map[c.habit_id] = c; });
      setHabits(habitsData);
      setCheckins(map);
    } catch {}
  };

  const _openSheet = (habit) => {
    setSelectedHabit(habit);
    slideAnim.setValue(300);
    Animated.spring(slideAnim, {
      toValue: 0, useNativeDriver: true,
      tension: 65, friction: 11,
    }).start();
  };

  const _closeSheet = () => {
    Animated.timing(slideAnim, {
      toValue: 300, duration: 220, useNativeDriver: true,
    }).start(() => setSelectedHabit(null));
  };

  const _handleCheckIn = async (status) => {
    if (!selectedHabit || saving) return;
    setSaving(true);
    try {
      await checkIn(selectedHabit.id, status);
      // Optimistic update — no full reload needed
      setCheckins(prev => ({
        ...prev,
        [selectedHabit.id]: { ...prev[selectedHabit.id], habit_id: selectedHabit.id, status },
      }));
      _closeSheet();
    } catch {}
    finally { setSaving(false); }
  };

  const _statusOf = (habitId) => {
    const s = checkins[habitId]?.status;
    if (s === 'done' || s === 'resisted') return 'done';
    if (s === 'missed' || s === 'slip')   return 'missed';
    if (s === 'skipped' || s === 'auto_skipped') return 'skipped';
    return 'pending';
  };

  const _currentStatusLabel = (habitId) => {
    const s = checkins[habitId]?.status;
    if (!s) return null;
    const map = { done: '✓ Done', resisted: '✊ Resisted', missed: '✗ Missed', slip: '😔 Slipped', skipped: '⏭ Skipped', auto_skipped: '⚠️ Auto-skipped' };
    return map[s] || null;
  };

  // Split habits
  const scheduled   = habits.filter(h => {
    const m = _parseMins(h.reminder_time);
    return m !== null && m >= TIMELINE_START && m <= TIMELINE_END;
  });
  const unscheduled = habits.filter(h => {
    const m = _parseMins(h.reminder_time);
    return m === null || m < TIMELINE_START || m > TIMELINE_END;
  });

  // Current time indicator
  const now     = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const nowTop  = (nowMins >= TIMELINE_START && nowMins <= TIMELINE_END)
    ? _topOf(nowMins) : null;

  const hours     = Array.from({ length: 19 }, (_, i) => i + 5);
  const dateLabel = now.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  // Sheet data
  const sheetActions = selectedHabit?.type === 'break' ? BREAK_ACTIONS : BUILD_ACTIONS;
  const sheetStartMins = selectedHabit ? _parseMins(selectedHabit.reminder_time) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
        borderBottomWidth: 1, borderBottomColor: colors.separator,
      }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: Spacing.lg }}>
          <Text style={{ ...Typography.title2, color: colors.gold, lineHeight: 28 }}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ ...Typography.title3, color: colors.textPrimary, fontWeight: '700' }}>
            Today's Schedule
          </Text>
          <Text style={{ ...Typography.caption2, color: colors.textDim, marginTop: 2 }}>
            {dateLabel.toUpperCase()}
          </Text>
        </View>
        <View style={{
          backgroundColor: colors.goldAlpha15, borderRadius: Radius.full,
          paddingHorizontal: 12, paddingVertical: 5,
          borderWidth: 1, borderColor: colors.goldAlpha40,
        }}>
          <Text style={{ ...Typography.caption2, color: colors.gold, fontWeight: '700' }}>
            {scheduled.length} scheduled
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {/* ── Timeline ── */}
        <View style={{ flexDirection: 'row', paddingTop: 16 }}>

          {/* Hour labels */}
          <View style={{ width: TIME_COL_W }}>
            {hours.map((h) => (
              <View key={h} style={{ height: HOUR_HEIGHT, justifyContent: 'flex-start' }}>
                <Text style={{
                  ...Typography.caption2, color: colors.textDim,
                  textAlign: 'right', paddingRight: 10, marginTop: -7, opacity: 0.8,
                }}>
                  {_fmtHour(h)}
                </Text>
              </View>
            ))}
          </View>

          {/* Blocks area */}
          <View style={{ flex: 1, height: TOTAL_HEIGHT, position: 'relative', marginRight: Spacing.xl }}>

            {/* Hour grid lines */}
            {hours.map((h, i) => (
              <View key={`line-${h}`} style={{
                position: 'absolute', top: i * HOUR_HEIGHT,
                left: 0, right: 0, height: 1,
                backgroundColor: colors.separator, opacity: 0.6,
              }} />
            ))}

            {/* Half-hour lines */}
            {hours.map((h, i) => (
              <View key={`half-${h}`} style={{
                position: 'absolute', top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2,
                left: 0, right: 0, height: 1,
                backgroundColor: colors.separator, opacity: 0.2,
              }} />
            ))}

            {/* Current time */}
            {nowTop !== null && (
              <>
                <View style={{
                  position: 'absolute', top: nowTop, left: -6, right: 0,
                  height: 2, backgroundColor: '#FF3B30', zIndex: 20,
                }} />
                <View style={{
                  position: 'absolute', top: nowTop - 5, left: -10,
                  width: 10, height: 10, borderRadius: 5,
                  backgroundColor: '#FF3B30', zIndex: 21,
                }} />
              </>
            )}

            {/* Habit blocks */}
            {scheduled.map((h) => {
              const startMins = _parseMins(h.reminder_time);
              const dur       = h.duration || 15;
              const top       = _topOf(startMins);
              const height    = Math.max(MIN_BLOCK_H, dur * PX_PER_MIN);
              const status    = _statusOf(h.id);
              const isDone    = status === 'done';
              const isMissed  = status === 'missed';
              const isSkipped = status === 'skipped';

              const accentColor = isDone ? h.color : isMissed ? colors.red : h.color;
              const bgColor     = isDone   ? h.color + '28'
                : isMissed      ? colors.red + '18'
                : isSkipped     ? colors.separator + '40'
                : h.color + '18';

              return (
                <TouchableOpacity
                  key={h.id}
                  activeOpacity={0.75}
                  onPress={() => _openSheet(h)}
                  style={{
                    position: 'absolute', top, left: 4, right: 0, height,
                    backgroundColor: bgColor,
                    borderRadius: Radius.md,
                    borderLeftWidth: 3,
                    borderLeftColor: isSkipped ? colors.textDim : accentColor,
                    paddingHorizontal: 10, paddingVertical: 6,
                    justifyContent: 'center', overflow: 'hidden',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: height >= 46 ? 14 : 11, opacity: isSkipped ? 0.4 : 1 }}>
                      {h.icon}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{
                        ...Typography.caption1,
                        color: isDone ? h.color : isMissed ? colors.red : isSkipped ? colors.textDim : colors.textPrimary,
                        fontWeight: '600', lineHeight: 15,
                        opacity: isSkipped ? 0.5 : 1,
                      }}>
                        {isDone ? '✓ ' : isMissed ? '✗ ' : ''}{h.name}
                      </Text>
                      {height >= 46 && (
                        <Text style={{ ...Typography.caption2, color: colors.textDim, marginTop: 1 }}>
                          {_fmtRange(startMins, dur)}
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Unscheduled ── */}
        {unscheduled.length > 0 && (
          <View style={{ marginHorizontal: Spacing.xl, marginTop: Spacing.xxl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.separator }} />
              <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 1.5 }}>UNSCHEDULED</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.separator }} />
            </View>
            <Text style={{
              ...Typography.caption2, color: colors.textDim, opacity: 0.6,
              textAlign: 'center', marginBottom: Spacing.lg, lineHeight: 16,
            }}>
              Set a reminder time on these habits to place them on the timeline
            </Text>
            <View style={{ gap: Spacing.sm }}>
              {unscheduled.map((h) => {
                const status  = _statusOf(h.id);
                const isDone  = status === 'done';
                const isMissed = status === 'missed';
                return (
                  <TouchableOpacity
                    key={h.id} activeOpacity={0.8}
                    onPress={() => _openSheet(h)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
                      backgroundColor: colors.backgroundCard,
                      borderRadius: Radius.md, borderWidth: 1,
                      borderColor: colors.separator,
                      borderLeftWidth: 3,
                      borderLeftColor: isDone ? h.color : isMissed ? colors.red : h.color + '60',
                      padding: Spacing.md,
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>{h.icon}</Text>
                    <Text style={{
                      ...Typography.callout, flex: 1,
                      color: isDone ? colors.textDim : colors.textPrimary,
                      textDecorationLine: isDone ? 'line-through' : 'none',
                    }}>
                      {h.name}
                    </Text>
                    <Text style={{ ...Typography.caption2, color: colors.textDim }}>
                      {h.duration || 15}m
                    </Text>
                    <Text style={{ ...Typography.caption1, color: colors.textDim, opacity: 0.5 }}>›</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Check-in Bottom Sheet ── */}
      <Modal
        visible={!!selectedHabit}
        transparent
        animationType="none"
        onRequestClose={_closeSheet}
      >
        <TouchableWithoutFeedback onPress={_closeSheet}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
            <TouchableWithoutFeedback>
              <Animated.View style={{
                backgroundColor: colors.backgroundCard,
                borderTopLeftRadius: 24, borderTopRightRadius: 24,
                paddingBottom: 34,
                transform: [{ translateY: slideAnim }],
              }}>
                {/* Handle */}
                <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
                  <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.separator }} />
                </View>

                {/* Habit info */}
                {selectedHabit && (
                  <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.lg }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm }}>
                      <View style={{
                        width: 48, height: 48, borderRadius: Radius.md,
                        backgroundColor: selectedHabit.color + '25',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{ fontSize: 26 }}>{selectedHabit.icon}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ ...Typography.headline, color: colors.textPrimary, fontWeight: '700' }}>
                          {selectedHabit.name}
                        </Text>
                        <Text style={{ ...Typography.caption1, color: colors.textDim, marginTop: 2 }}>
                          {sheetStartMins !== null
                            ? `${_fmtRange(sheetStartMins, selectedHabit.duration || 15)} · ${selectedHabit.duration || 15}min`
                            : `${selectedHabit.duration || 15}min · unscheduled`
                          }
                        </Text>
                      </View>
                      {/* Current status badge */}
                      {_currentStatusLabel(selectedHabit.id) && (
                        <View style={{
                          backgroundColor: colors.separator,
                          borderRadius: Radius.full,
                          paddingHorizontal: 10, paddingVertical: 4,
                        }}>
                          <Text style={{ ...Typography.caption2, color: colors.textMuted }}>
                            {_currentStatusLabel(selectedHabit.id)}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Action buttons */}
                    <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md }}>
                      {sheetActions.map(action => (
                        <TouchableOpacity
                          key={action.status}
                          activeOpacity={0.75}
                          disabled={saving}
                          onPress={() => _handleCheckIn(action.status)}
                          style={{
                            flex: 1, alignItems: 'center', gap: 6,
                            paddingVertical: Spacing.lg,
                            backgroundColor: action.color + '18',
                            borderRadius: Radius.lg,
                            borderWidth: 1,
                            borderColor: checkins[selectedHabit.id]?.status === action.status
                              ? action.color
                              : action.color + '40',
                          }}
                        >
                          {saving && checkins[selectedHabit.id]?.status !== action.status ? (
                            <ActivityIndicator size="small" color={action.color} />
                          ) : (
                            <>
                              <Text style={{ fontSize: 22 }}>{action.icon}</Text>
                              <Text style={{
                                ...Typography.caption1, color: action.color, fontWeight: '700',
                              }}>
                                {action.label}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Details link */}
                    <TouchableOpacity
                      onPress={() => { _closeSheet(); setTimeout(() => navigation.navigate('HabitDetail', { habitId: selectedHabit.id }), 250); }}
                      style={{ alignItems: 'center', marginTop: Spacing.lg }}
                    >
                      <Text style={{ ...Typography.caption1, color: colors.textDim }}>
                        View Details →
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

export default ScheduleScreen;
