// ─── KARMA APP — TO-DO SCREEN (Hourly Planner) ───────────────────────
// Phase 2: Daily view — 24 hourly rows, N tasks per hour, inline add/
// toggle/delete.
// Phase 3: Weekly view — 7-day strip + Daily/Weekly/Monthly tab switcher.
// Phase 4: Monthly view — calendar grid + month navigation.
// See TODO_PLANNER_PLAN.md at the repo root for the full plan.

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StatusBar, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView }   from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, Typography, Spacing, Radius } from '../constants/colors';
import { DateUtils } from '../utils/dateUtils';
import {
  getTodosForDate, addTodo, toggleTodoDone, deleteTodo, getTodayDate,
  getCountsForDateRange,
} from '../database/todoService';

const _fmtHour = (h) => {
  if (h === 0)  return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
};

// planned===0 → 'empty' (neutral, never counted as a miss — see TODO_PLANNER_PLAN.md)
const _levelOf = (planned, done) => {
  if (planned === 0) return 'empty';
  if (done === 0)    return 'missed';
  if (done === planned) return 'all';
  return 'partial';
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const VIEWS = [
  { key: 'daily',   label: '📅 Daily' },
  { key: 'weekly',  label: '📆 Weekly' },
  { key: 'monthly', label: '🗓️ Monthly' },
];

// Planner launched July 2026 — there's no real history before this, so the
// Monthly calendar shouldn't let you page back into months that can only
// ever show empty grids.
const LAUNCH_MONTH = { y: 2026, m: 6 };

// "At or before" rather than exact-equality — if monthCursor is ever already
// past the floor (e.g. a misconfigured device clock), this still catches it
// instead of only engaging on an exact match.
const _isAtOrBeforeLaunchMonth = (y, m) =>
  y < LAUNCH_MONTH.y || (y === LAUNCH_MONTH.y && m <= LAUNCH_MONTH.m);

const _shiftDate = (dateStr, deltaDays) => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + deltaDays);
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const ToDoScreen = () => {
  const { colors } = useTheme();
  const [view,        setView]        = useState('daily');
  const [todos,       setTodos]       = useState([]);
  const [weekCounts,  setWeekCounts]  = useState({});
  const [monthCounts, setMonthCounts] = useState({});
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(() => getTodayDate());
  const [addingHour, setAddingHour] = useState(null);
  const [inputText,  setInputText]  = useState('');

  const scrollRef        = useRef(null);
  const inputRef         = useRef(null);
  const rowOffsets       = useRef({});
  const hasAutoScrolled  = useRef(false);
  const hasNavigatedMonth = useRef(false); // true once the user taps ‹ / › on Monthly — stops auto-resync below
  const hasNavigatedDay   = useRef(false); // true once the user taps ‹ / › on Daily — stops auto-resync below
  const pendingToggles    = useRef(new Set()); // ids with an in-flight toggle — blocks a rapid re-tap race
  const isSubmittingRef   = useRef(false); // blocks a rapid double-tap on the add-task ✓ button

  const todayStr      = getTodayDate();
  const isViewingToday = selectedDate === todayStr;
  const currentHour   = new Date().getHours();
  const weekDates     = DateUtils.getWeekDates(); // Mon-Sun, recomputed each render — cheap

  // useCallback(..., []) freezes this exact _load reference for the life of
  // the screen — react-navigation's useFocusEffect only re-registers when the
  // callback identity changes, so every later focus event still invokes THIS
  // render's closure, not a fresh one. That's fine as long as _load computes
  // "today" itself at call time (below) instead of reading the outer `date`/
  // `weekDates` consts, which were frozen at whatever render created this
  // closure — otherwise the app would keep fetching yesterday's todos after
  // being left open across midnight, the same class of bug this codebase's
  // IST local-date fixes elsewhere already exist to prevent.
  //
  // Keeping deps=[] (rather than depending on selectedDate) is deliberate:
  // _prevDay/_nextDay/_goToToday call _load(explicitDate) directly instead of
  // relying on a focus-effect re-run, since a `[selectedDate]` dep here would
  // make the resync branch's own `setSelectedDate` call retrigger a second,
  // redundant fetch of the exact same day on every midnight resync.
  useFocusEffect(useCallback(() => { _load(); }, []));

  const _load = async (dateOverride) => {
    // Same staleness class as above: if the Monthly tab was left open across a
    // month boundary (e.g. mounted overnight on the 31st), monthCursor never
    // moves on its own since it only changes via _prevMonth/_nextMonth. Snap
    // it back to the real current month on every focus — but only if the user
    // hasn't deliberately paged away from "current", so we don't yank them
    // back to today while they're browsing a past month.
    if (!hasNavigatedMonth.current) {
      const now = new Date();
      setMonthCursor(prev => (prev.y === now.getFullYear() && prev.m === now.getMonth())
        ? prev
        : { y: now.getFullYear(), m: now.getMonth() });
    }
    // Same idea for Daily: selectedDate defaults to "today" and only ever
    // changes via _prevDay/_nextDay/_goToToday. Left open across midnight
    // without the user touching it, resync to the real today on every focus —
    // compute the resynced value locally so this same call fetches the right
    // day instead of the stale one and waiting for a second focus. This
    // resync branch only runs when called with no explicit dateOverride (i.e.
    // from the focus effect above, not from a direct day-nav tap).
    const today = getTodayDate();
    let effectiveDate = dateOverride;
    if (effectiveDate == null) {
      effectiveDate = selectedDate;
      if (!hasNavigatedDay.current && effectiveDate !== today) {
        effectiveDate = today;
        setSelectedDate(today);
      }
    }
    try {
      const currentWeek = DateUtils.getWeekDates();
      const [dayData, weekRows] = await Promise.all([
        getTodosForDate(effectiveDate),
        getCountsForDateRange(currentWeek[0].dateStr, currentWeek[6].dateStr),
      ]);
      setTodos(dayData);
      const map = {};
      weekRows.forEach(r => { map[r.date] = r; });
      setWeekCounts(map);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      if (effectiveDate === today && !hasAutoScrolled.current) {
        hasAutoScrolled.current = true;
        setTimeout(() => {
          const y = rowOffsets.current[new Date().getHours()];
          if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 40), animated: true });
        }, 0);
      }
    }
  };

  // Month data is keyed off monthCursor, not the focus-triggered _load() above —
  // prev/next needs a fresh fetch immediately, not on the next screen focus.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { y, m } = monthCursor;
        const start   = `${y}-${String(m + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(y, m + 1, 0).getDate();
        const end     = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        const rows = await getCountsForDateRange(start, end);
        if (cancelled) return;
        const map = {};
        rows.forEach(r => { map[r.date] = r; });
        setMonthCounts(map);
      } catch (err) {
        if (!cancelled) Alert.alert('Error', err.message);
      }
    })();
    return () => { cancelled = true; };
  }, [monthCursor.y, monthCursor.m]);

  const _prevMonth = () => {
    if (_isAtOrBeforeLaunchMonth(monthCursor.y, monthCursor.m)) return;
    hasNavigatedMonth.current = true;
    setMonthCursor(c => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }));
  };
  const _nextMonth = () => {
    hasNavigatedMonth.current = true;
    setMonthCursor(c => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }));
  };

  // Switching days abandons any open "+ Add task" row — otherwise its text
  // would silently get saved under whichever day you land on next instead of
  // the one you were typing it for. hasNavigatedDay is set based on whether
  // the destination IS today, not unconditionally true — otherwise even
  // "Jump to today" would permanently disable _load's midnight resync above,
  // since nothing ever set it back to false.
  const _prevDay = () => {
    const next = _shiftDate(selectedDate, -1);
    hasNavigatedDay.current = next !== getTodayDate();
    setAddingHour(null);
    setSelectedDate(next);
    _load(next);
  };
  const _nextDay = () => {
    const next = _shiftDate(selectedDate, 1);
    hasNavigatedDay.current = next !== getTodayDate();
    setAddingHour(null);
    setSelectedDate(next);
    _load(next);
  };
  const _goToToday = () => {
    const next = getTodayDate();
    hasNavigatedDay.current = false;
    setAddingHour(null);
    setSelectedDate(next);
    _load(next);
  };

  // Mutations can now target any date via day-nav, not just today — dateStr
  // is whatever date the todo actually belongs to. Bumping weekCounts/
  // monthCounts by dateStr keeps both rollup views live without a refetch
  // whenever dateStr falls inside the currently displayed week/month (which
  // is the common case — today's own week/month); a dateStr outside those
  // ranges just sits as an unread key until the next real refetch replaces
  // the whole map (monthCounts reloads when monthCursor itself changes).
  const _applyDelta = (dateStr, plannedDelta, doneDelta) => {
    const bump = (prev) => {
      const row = prev[dateStr] || { date: dateStr, planned: 0, done: 0 };
      return { ...prev, [dateStr]: { ...row, planned: row.planned + plannedDelta, done: row.done + doneDelta } };
    };
    setWeekCounts(bump);
    setMonthCounts(bump);
  };

  const _startAdd = (hour) => {
    setInputText('');
    setAddingHour(hour);
  };

  const _submitAdd = async (hour) => {
    const title = inputText.trim();
    if (!title) { setAddingHour(null); return; }
    // Same rapid-double-tap race as _toggle below — the ✓ button and the
    // keyboard's return key both call this, and a fast double-tap can fire
    // both before the first addTodo() await resolves and clears inputText.
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    try {
      const id = await addTodo(selectedDate, hour, title);
      setTodos(prev => [...prev, { id, date: selectedDate, hour, title, is_done: 0, sort_order: prev.length }]);
      _applyDelta(selectedDate, 1, 0);
      setInputText('');
      inputRef.current?.focus(); // keep the row open for rapid multi-add
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const _toggle = (todo) => {
    // Without this guard, two taps fired before React re-renders both read the
    // same (stale) todo.is_done snapshot off this closure and both push the
    // rollup delta in the same direction instead of canceling out — the task
    // list itself stays correct (setTodos uses the live functional form below),
    // but weekCounts/monthCounts drift to done > planned for the day. A ref is
    // mutated synchronously (unlike state), so it can't itself be raced by a
    // second tap arriving before a commit.
    if (pendingToggles.current.has(todo.id)) return;
    pendingToggles.current.add(todo.id);

    const wasDone = !!todo.is_done;
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, is_done: t.is_done ? 0 : 1 } : t));
    _applyDelta(todo.date, 0, wasDone ? -1 : 1);
    toggleTodoDone(todo.id)
      .catch(err => {
        setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, is_done: todo.is_done } : t));
        _applyDelta(todo.date, 0, wasDone ? 1 : -1);
        Alert.alert('Error', err.message);
      })
      .finally(() => { pendingToggles.current.delete(todo.id); });
  };

  const _confirmDelete = (todo) => {
    Alert.alert('Delete Task', `Remove "${todo.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => _delete(todo) },
    ]);
  };

  const _delete = (todo) => {
    let removedIndex = -1;
    setTodos(prev => {
      removedIndex = prev.findIndex(t => t.id === todo.id);
      return prev.filter(t => t.id !== todo.id);
    });
    _applyDelta(todo.date, -1, todo.is_done ? -1 : 0);
    deleteTodo(todo.id).catch(err => {
      // Reinsert at its original index instead of the end of the array, so a
      // failed delete doesn't visibly reorder the rest of that hour's tasks.
      setTodos(prev => {
        const next = [...prev];
        const idx = removedIndex < 0 ? next.length : Math.min(removedIndex, next.length);
        next.splice(idx, 0, todo);
        return next;
      });
      _applyDelta(todo.date, 1, todo.is_done ? 1 : 0);
      Alert.alert('Error', err.message);
    });
  };

  const planned = todos.length;
  const done    = todos.filter(t => t.is_done).length;

  const weekDays = weekDates.map(d => {
    const row     = weekCounts[d.dateStr];
    const wPlanned = row?.planned || 0;
    const wDone    = row?.done || 0;
    return { ...d, planned: wPlanned, done: wDone, level: _levelOf(wPlanned, wDone) };
  });
  const weekPlannedTotal = weekDays.reduce((a, d) => a + d.planned, 0);
  const weekDoneTotal    = weekDays.reduce((a, d) => a + d.done, 0);
  const weekPct = weekPlannedTotal === 0 ? null : Math.round((weekDoneTotal / weekPlannedTotal) * 100);

  // Monthly calendar grid for monthCursor
  const { y: monthYear, m: monthIdx } = monthCursor;
  const daysInMonth   = new Date(monthYear, monthIdx + 1, 0).getDate();
  const monthDateStrs = Array.from({ length: daysInMonth }, (_, i) =>
    `${monthYear}-${String(monthIdx + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
  );
  const monthFirstDow = (new Date(monthYear, monthIdx, 1).getDay() + 6) % 7; // Monday = 0
  const monthCells = Array(monthFirstDow).fill(null).concat(
    monthDateStrs.map(ds => {
      const row = monthCounts[ds];
      const mPlanned = row?.planned || 0;
      const mDone    = row?.done || 0;
      return {
        dateStr: ds, day: Number(ds.slice(-2)),
        planned: mPlanned, done: mDone,
        level: _levelOf(mPlanned, mDone), isToday: ds === todayStr,
      };
    })
  );
  while (monthCells.length % 7 !== 0) monthCells.push(null);
  const monthWeeks = [];
  for (let i = 0; i < monthCells.length; i += 7) monthWeeks.push(monthCells.slice(i, i + 7));

  const monthPlannedTotal = monthDateStrs.reduce((a, ds) => a + (monthCounts[ds]?.planned || 0), 0);
  const monthDoneTotal    = monthDateStrs.reduce((a, ds) => a + (monthCounts[ds]?.done || 0), 0);
  const monthPct = monthPlannedTotal === 0 ? null : Math.round((monthDoneTotal / monthPlannedTotal) * 100);
  const monthLabel = new Date(monthYear, monthIdx, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const now = new Date();
  const isCurrentMonth = monthYear === now.getFullYear() && monthIdx === now.getMonth();
  const isLaunchMonth  = _isAtOrBeforeLaunchMonth(monthYear, monthIdx);

  const dateLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const relativeDayLabel = isViewingToday ? 'Today'
    : selectedDate === _shiftDate(todayStr, 1)  ? 'Tomorrow'
    : selectedDate === _shiftDate(todayStr, -1) ? 'Yesterday'
    : dateLabel;

  const _levelColors = (level) => {
    if (level === 'all')     return { bg: colors.goldAlpha25, border: colors.gold,       text: colors.gold };
    if (level === 'partial') return { bg: colors.goldAlpha15, border: colors.goldAlpha40, text: colors.gold };
    if (level === 'missed')  return { bg: colors.redAlpha15,  border: colors.red,         text: colors.red };
    return { bg: colors.backgroundCard, border: colors.separator, text: colors.textDim }; // empty
  };

  const _renderLegend = () => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.xl, justifyContent: 'center' }}>
      {[
        { level: 'all',     label: 'All done' },
        { level: 'partial', label: 'Some done' },
        { level: 'missed',  label: 'Missed' },
        { level: 'empty',   label: 'Not planned' },
      ].map(l => {
        const lc = _levelColors(l.level);
        return (
          <View key={l.level} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: lc.bg, borderWidth: 1, borderColor: lc.border }} />
            <Text style={{ ...Typography.caption2, color: colors.textDim }}>{l.label}</Text>
          </View>
        );
      })}
    </View>
  );

  let headerSubtitle, headerChip;
  if (view === 'daily') {
    headerSubtitle = relativeDayLabel.toUpperCase();
    headerChip     = planned === 0 ? 'Nothing planned yet' : `${done}/${planned} done`;
  } else if (view === 'weekly') {
    headerSubtitle = 'THIS WEEK';
    headerChip     = weekPlannedTotal === 0 ? 'Nothing planned yet' : `${weekPct}% · ${weekDoneTotal}/${weekPlannedTotal} done`;
  } else {
    headerSubtitle = monthLabel.toUpperCase();
    headerChip     = monthPlannedTotal === 0 ? 'Nothing planned yet' : `${monthPct}% · ${monthDoneTotal}/${monthPlannedTotal} done`;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
        borderBottomWidth: 1, borderBottomColor: colors.separator,
      }}>
        <View style={{ flex: 1 }}>
          <Text style={{ ...Typography.title3, color: colors.textPrimary, fontWeight: '700' }}>
            Planner
          </Text>
          <Text style={{ ...Typography.caption2, color: colors.textDim, marginTop: 2 }}>
            {headerSubtitle}
          </Text>
        </View>
        <View style={{
          backgroundColor: colors.goldAlpha15, borderRadius: Radius.full,
          paddingHorizontal: 12, paddingVertical: 5,
          borderWidth: 1, borderColor: colors.goldAlpha40,
        }}>
          <Text style={{ ...Typography.caption2, color: colors.gold, fontWeight: '700' }}>
            {headerChip}
          </Text>
        </View>
      </View>

      {/* ── View switcher ── */}
      <View style={{
        flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
        gap: Spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.separator,
      }}>
        {VIEWS.map(v => (
          <TouchableOpacity
            key={v.key}
            style={{
              flex: 1, paddingVertical: 8, borderRadius: Spacing.sm, borderWidth: 1, alignItems: 'center',
              backgroundColor: view === v.key ? colors.goldAlpha15 : colors.backgroundCard,
              borderColor:     view === v.key ? colors.gold        : colors.separator,
            }}
            onPress={() => setView(v.key)}
          >
            <Text style={{
              fontSize: 10,
              color:      view === v.key ? colors.gold : colors.textMuted,
              fontWeight: view === v.key ? '700' : '400',
            }}>
              {v.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Daily ── */}
      {view === 'daily' && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Day nav — plan ahead or look back a day at a time */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm,
            borderBottomWidth: 1, borderBottomColor: colors.separator,
          }}>
            <TouchableOpacity onPress={_prevDay} hitSlop={8} style={{ padding: Spacing.sm }}>
              <Text style={{ ...Typography.title3, color: colors.gold, lineHeight: 24 }}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={_goToToday} disabled={isViewingToday} style={{ alignItems: 'center' }}>
              <Text style={{ ...Typography.callout, color: colors.textPrimary, fontWeight: '700' }}>
                {relativeDayLabel}
              </Text>
              {!isViewingToday && (
                <Text style={{ ...Typography.caption2, color: colors.gold, marginTop: 2 }}>
                  Jump to today
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={_nextDay} hitSlop={8} style={{ padding: Spacing.sm }}>
              <Text style={{ ...Typography.title3, color: colors.gold, lineHeight: 24 }}>›</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 48 }}
          >
            {HOURS.map((h) => {
              const tasks     = todos.filter(t => t.hour === h);
              const isCurrent = isViewingToday && h === currentHour;
              const isAdding  = addingHour === h;

              return (
                <View
                  key={h}
                  onLayout={(e) => { rowOffsets.current[h] = e.nativeEvent.layout.y; }}
                  style={{
                    flexDirection: 'row',
                    paddingHorizontal: Spacing.xl,
                    paddingVertical: Spacing.sm,
                    backgroundColor: isCurrent ? colors.goldAlpha15 : 'transparent',
                    borderLeftWidth: isCurrent ? 3 : 0,
                    borderLeftColor: colors.gold,
                  }}
                >
                  {/* Hour label */}
                  <View style={{ width: 56, paddingTop: 8 }}>
                    <Text style={{
                      ...Typography.caption2,
                      color: isCurrent ? colors.gold : colors.textDim,
                      fontWeight: isCurrent ? '700' : '400',
                    }}>
                      {_fmtHour(h)}
                    </Text>
                  </View>

                  {/* Tasks + add */}
                  <View style={{ flex: 1, gap: Spacing.xs }}>
                    {tasks.map((t) => (
                      <View key={t.id} style={{
                        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
                        backgroundColor: colors.backgroundCard,
                        borderRadius: Radius.md, borderWidth: 1, borderColor: colors.separator,
                        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
                      }}>
                        <TouchableOpacity
                          onPress={() => _toggle(t)}
                          style={{
                            width: 20, height: 20, borderRadius: Radius.sm,
                            borderWidth: 1.5,
                            borderColor: t.is_done ? colors.green : colors.textDim,
                            backgroundColor: t.is_done ? colors.greenAlpha15 : 'transparent',
                            alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          {!!t.is_done && (
                            <Text style={{ color: colors.green, fontSize: 13, fontWeight: '700' }}>✓</Text>
                          )}
                        </TouchableOpacity>
                        <Text
                          numberOfLines={2}
                          style={{
                            ...Typography.callout, flex: 1,
                            color: t.is_done ? colors.textDim : colors.textPrimary,
                            textDecorationLine: t.is_done ? 'line-through' : 'none',
                          }}
                        >
                          {t.title}
                        </Text>
                        <TouchableOpacity onPress={() => _confirmDelete(t)} hitSlop={8}>
                          <Text style={{ color: colors.textDim, fontSize: 16 }}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}

                    {isAdding ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                        <TextInput
                          ref={inputRef}
                          autoFocus
                          value={inputText}
                          onChangeText={setInputText}
                          onSubmitEditing={() => _submitAdd(h)}
                          onBlur={() => { if (!inputText.trim()) setAddingHour(null); }}
                          returnKeyType="done"
                          placeholder="Add a task…"
                          placeholderTextColor={colors.textDim}
                          style={{
                            flex: 1,
                            ...Typography.callout, color: colors.textPrimary,
                            borderRadius: Radius.md, borderWidth: 1, borderColor: colors.goldAlpha40,
                            paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
                          }}
                        />
                        <TouchableOpacity
                          onPress={() => _submitAdd(h)}
                          hitSlop={8}
                          style={{
                            width: 32, height: 32, borderRadius: Radius.md,
                            backgroundColor: colors.goldAlpha15,
                            borderWidth: 1, borderColor: colors.gold,
                            alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Text style={{ color: colors.gold, fontSize: 16, fontWeight: '700' }}>✓</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity onPress={() => _startAdd(h)} style={{ paddingVertical: 4 }}>
                        <Text style={{ ...Typography.caption1, color: colors.textDim }}>
                          + Add task
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ── Weekly ── */}
      {view === 'weekly' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.xl }}>
          <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
            {weekDays.map((d) => {
              const lc = _levelColors(d.level);
              return (
                <View key={d.dateStr} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{
                    ...Typography.caption2, color: d.isToday ? colors.gold : colors.textDim,
                    fontWeight: d.isToday ? '700' : '400', marginBottom: Spacing.xs,
                  }}>
                    {d.label}
                  </Text>
                  <View style={{
                    width: '100%', aspectRatio: 1, borderRadius: Radius.md,
                    backgroundColor: lc.bg, borderWidth: d.isToday ? 2 : 1,
                    borderColor: d.isToday ? colors.gold : lc.border,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ ...Typography.caption2, color: lc.text, fontWeight: '700' }}>
                      {d.planned === 0 ? '–' : `${d.done}/${d.planned}`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {_renderLegend()}

          {weekPlannedTotal === 0 && (
            <Text style={{
              ...Typography.caption1, color: colors.textDim, opacity: 0.7,
              textAlign: 'center', marginTop: Spacing.xxl,
            }}>
              Plan a few tasks on the Daily tab and your week will show up here.
            </Text>
          )}
        </ScrollView>
      )}

      {/* ── Monthly ── */}
      {view === 'monthly' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.xl }}>
          {/* Month nav */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg }}>
            <TouchableOpacity
              onPress={_prevMonth}
              disabled={isLaunchMonth}
              hitSlop={8}
              style={{ padding: Spacing.sm, opacity: isLaunchMonth ? 0.3 : 1 }}
            >
              <Text style={{ ...Typography.title3, color: colors.gold, lineHeight: 24 }}>‹</Text>
            </TouchableOpacity>
            <Text style={{ ...Typography.headline, color: colors.textPrimary, fontWeight: '700' }}>
              {monthLabel}
            </Text>
            <TouchableOpacity
              onPress={_nextMonth}
              disabled={isCurrentMonth}
              hitSlop={8}
              style={{ padding: Spacing.sm, opacity: isCurrentMonth ? 0.3 : 1 }}
            >
              <Text style={{ ...Typography.title3, color: colors.gold, lineHeight: 24 }}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Weekday labels */}
          <View style={{ flexDirection: 'row', marginBottom: Spacing.xs }}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => (
              <Text key={i} style={{ flex: 1, textAlign: 'center', ...Typography.caption2, color: colors.textDim }}>
                {l}
              </Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={{ gap: 4 }}>
            {monthWeeks.map((week, wi) => (
              <View key={wi} style={{ flexDirection: 'row', gap: 4 }}>
                {week.map((cell, di) => {
                  if (!cell) return <View key={di} style={{ flex: 1, aspectRatio: 1 }} />;
                  const lc = _levelColors(cell.level);
                  return (
                    <View
                      key={di}
                      style={{
                        flex: 1, aspectRatio: 1, borderRadius: Radius.sm,
                        backgroundColor: lc.bg,
                        borderWidth: cell.isToday ? 2 : 1,
                        borderColor: cell.isToday ? colors.gold : lc.border,
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 10, color: lc.text, fontWeight: cell.isToday ? '700' : '400' }}>
                        {cell.day}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          {_renderLegend()}

          {monthPlannedTotal === 0 && (
            <Text style={{
              ...Typography.caption1, color: colors.textDim, opacity: 0.7,
              textAlign: 'center', marginTop: Spacing.xxl,
            }}>
              Plan a few tasks and this month will fill in.
            </Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default ToDoScreen;
