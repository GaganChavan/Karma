// ─── KARMA APP — MOOD & TRIGGER SERVICE (PHASE B) ────────────────────
// Mood/energy logging, slip trigger recording, pattern analysis.
// Weekly reflection CRUD.

import { getDatabase } from './database';

const getTodayDate = () => new Date().toISOString().split('T')[0];

// ── MOOD LOGGING ──────────────────────────────────────────────────────

export const logMood = async ({ timeOfDay, mood, energy, note = null }) => {
  if (!['morning', 'evening'].includes(timeOfDay)) {
    throw new Error('timeOfDay must be morning or evening');
  }
  if (mood < 1 || mood > 5 || energy < 1 || energy > 5) {
    throw new Error('Mood and energy must be between 1 and 5');
  }

  try {
    const db    = await getDatabase();
    const today = getTodayDate();

    await db.runAsync(
      `INSERT INTO mood_logs (date, time_of_day, mood, energy, note)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(date, time_of_day) DO UPDATE SET
         mood   = excluded.mood,
         energy = excluded.energy,
         note   = excluded.note`,
      [today, timeOfDay, mood, energy, note]
    );

    console.log(`✅ Mood logged: ${timeOfDay} — mood:${mood} energy:${energy}`);
  } catch (error) {
    if (error.message.includes('must be')) throw error;
    throw new Error(`Mood log failed: ${error.message}`);
  }
};

export const getTodayMood = async () => {
  try {
    const db    = await getDatabase();
    const today = getTodayDate();
    const rows  = await db.getAllAsync(
      'SELECT * FROM mood_logs WHERE date = ?',
      [today]
    );
    const result = { morning: null, evening: null };
    rows.forEach(r => { result[r.time_of_day] = r; });
    return result;
  } catch (error) {
    return { morning: null, evening: null };
  }
};

export const getMoodForDateRange = async (fromDate, toDate) => {
  try {
    const db = await getDatabase();
    return await db.getAllAsync(
      'SELECT * FROM mood_logs WHERE date >= ? AND date <= ? ORDER BY date ASC',
      [fromDate, toDate]
    ) || [];
  } catch (error) {
    return [];
  }
};

export const getWeekMoodAverage = async () => {
  try {
    const db = await getDatabase();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fromDate = sevenDaysAgo.toISOString().split('T')[0];

    const result = await db.getFirstAsync(
      `SELECT AVG(mood) as avgMood, AVG(energy) as avgEnergy
       FROM mood_logs WHERE date >= ?`,
      [fromDate]
    );
    return {
      avgMood:   Math.round((result?.avgMood   || 0) * 10) / 10,
      avgEnergy: Math.round((result?.avgEnergy || 0) * 10) / 10,
    };
  } catch (error) {
    return { avgMood: 0, avgEnergy: 0 };
  }
};

// ── SLIP TRIGGERS ─────────────────────────────────────────────────────

export const TRIGGER_OPTIONS = [
  { key: 'stress',    label: 'Stress',      icon: '😤', color: '#FF453A' },
  { key: 'boredom',   label: 'Boredom',     icon: '😑', color: '#FF9F0A' },
  { key: 'social',    label: 'Social',      icon: '👥', color: '#BF5AF2' },
  { key: 'tired',     label: 'Tired',       icon: '😴', color: '#5AC8FA' },
  { key: 'emotional', label: 'Emotional',   icon: '💔', color: '#FF2D55' },
  { key: 'automatic', label: 'Automatic',   icon: '🔄', color: '#8E8E93' },
  { key: 'night',     label: 'Late Night',  icon: '🌙', color: '#0A84FF' },
  { key: 'hunger',    label: 'Hungry',      icon: '🍕', color: '#FF9F0A' },
];

export const logSlipTrigger = async ({ habitId, trigger, note = null }) => {
  if (!habitId) throw new Error('Habit ID required');
  const validTriggers = TRIGGER_OPTIONS.map(t => t.key);
  if (!validTriggers.includes(trigger)) {
    throw new Error(`Invalid trigger. Choose from: ${validTriggers.join(', ')}`);
  }

  try {
    const db    = await getDatabase();
    const today = getTodayDate();

    await db.runAsync(
      'INSERT INTO slip_triggers (habit_id, date, trigger, note) VALUES (?, ?, ?, ?)',
      [habitId, today, trigger, note]
    );

    console.log(`✅ Trigger logged: habit ${habitId} — ${trigger}`);
  } catch (error) {
    throw new Error(`Trigger log failed: ${error.message}`);
  }
};

export const getTriggersForHabit = async (habitId, days = 30) => {
  if (!habitId) return [];
  try {
    const db = await getDatabase();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    return await db.getAllAsync(
      `SELECT * FROM slip_triggers
       WHERE habit_id = ? AND date >= ?
       ORDER BY date DESC`,
      [habitId, fromDate.toISOString().split('T')[0]]
    ) || [];
  } catch {
    return [];
  }
};

export const getTriggerPattern = async (habitId) => {
  if (!habitId) return null;
  try {
    const triggers = await getTriggersForHabit(habitId, 30);
    if (triggers.length === 0) return null;

    // Count each trigger type
    const counts = {};
    triggers.forEach(t => {
      counts[t.trigger] = (counts[t.trigger] || 0) + 1;
    });

    // Find top trigger
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const topKey = sorted[0]?.[0];
    const topCount = sorted[0]?.[1];
    const topInfo = TRIGGER_OPTIONS.find(t => t.key === topKey);

    // Percentage
    const pct = Math.round((topCount / triggers.length) * 100);

    return {
      topTrigger: topKey,
      topInfo,
      topCount,
      percentage: pct,
      totalSlips: triggers.length,
      allCounts:  counts,
      label:      topInfo ? `${topInfo.icon} ${topInfo.label} (${pct}% of slips)` : null,
    };
  } catch {
    return null;
  }
};

// Get top trigger across all break habits
export const getOverallTriggerPattern = async () => {
  try {
    const db = await getDatabase();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fromDate = sevenDaysAgo.toISOString().split('T')[0];

    const triggers = await db.getAllAsync(
      'SELECT trigger FROM slip_triggers WHERE date >= ?',
      [fromDate]
    ) || [];

    if (triggers.length === 0) return null;

    const counts = {};
    triggers.forEach(t => { counts[t.trigger] = (counts[t.trigger] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const topKey = sorted[0]?.[0];
    return TRIGGER_OPTIONS.find(t => t.key === topKey) || null;
  } catch {
    return null;
  }
};

// ── WEEKLY REFLECTIONS ────────────────────────────────────────────────

export const saveWeeklyReflection = async ({ wentWell, struggled, commitment }) => {
  if (!wentWell?.trim())   throw new Error('Please share what went well this week');
  if (!commitment?.trim()) throw new Error('Please write your commitment for next week');

  try {
    const db         = await getDatabase();
    const today      = new Date();
    const monday     = new Date(today);
    const day        = today.getDay();
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    const weekStart  = monday.toISOString().split('T')[0];

    const { avgMood, avgEnergy } = await getWeekMoodAverage();

    await db.runAsync(
      `INSERT INTO weekly_reflections
        (week_start, went_well, struggled, commitment, mood_avg, energy_avg)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(week_start) DO UPDATE SET
         went_well  = excluded.went_well,
         struggled  = excluded.struggled,
         commitment = excluded.commitment,
         mood_avg   = excluded.mood_avg,
         energy_avg = excluded.energy_avg`,
      [weekStart, wentWell.trim(), struggled?.trim() || '', commitment.trim(), avgMood, avgEnergy]
    );

    console.log(`✅ Weekly reflection saved for week of ${weekStart}`);
    return weekStart;
  } catch (error) {
    if (error.message.includes('Please')) throw error;
    throw new Error(`Could not save reflection: ${error.message}`);
  }
};

export const getWeeklyReflections = async (limit = 12) => {
  try {
    const db = await getDatabase();
    return await db.getAllAsync(
      'SELECT * FROM weekly_reflections ORDER BY week_start DESC LIMIT ?',
      [limit]
    ) || [];
  } catch {
    return [];
  }
};

export const getThisWeekReflection = async () => {
  try {
    const db     = await getDatabase();
    const today  = new Date();
    const day    = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    const weekStart = monday.toISOString().split('T')[0];

    return await db.getFirstAsync(
      'SELECT * FROM weekly_reflections WHERE week_start = ?',
      [weekStart]
    ) || null;
  } catch {
    return null;
  }
};

// Should weekly reflection prompt be shown?
export const shouldShowWeeklyReflection = async () => {
  const today = new Date();
  // Sunday only, after 7 PM
  if (today.getDay() !== 0 || today.getHours() < 19) return false;

  const existing = await getThisWeekReflection();
  return !existing;
};