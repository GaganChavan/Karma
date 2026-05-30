// ─── KARMA APP — MOOD & TRIGGER SERVICE (TIMEZONE FIX) ───────────────
// TIMEZONE FIX: all toISOString() replaced with _localDate()
// Affected: getTodayDate, getWeekMoodAverage, getTriggersForHabit,
//   getOverallTriggerPattern, saveWeeklyReflection, getThisWeekReflection

import { getDatabase } from './database';

// ── Timezone-safe helpers ─────────────────────────────────────────────
const _localDate = (d) => {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};
const getTodayDate = () => _localDate(new Date());  // FIX: was toISOString()

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
  } catch (error) {
    if (error.message.includes('must be')) throw error;
    throw new Error(`Mood log failed: ${error.message}`);
  }
};

export const getTodayMood = async () => {
  try {
    const db    = await getDatabase();
    const today = getTodayDate();
    const rows  = await db.getAllAsync('SELECT * FROM mood_logs WHERE date = ?', [today]);
    const result = { morning: null, evening: null };
    rows.forEach(r => { result[r.time_of_day] = r; });
    return result;
  } catch { return { morning: null, evening: null }; }
};

export const getMoodForDateRange = async (fromDate, toDate) => {
  try {
    const db = await getDatabase();
    return await db.getAllAsync(
      'SELECT * FROM mood_logs WHERE date >= ? AND date <= ? ORDER BY date ASC',
      [fromDate, toDate]
    ) || [];
  } catch { return []; }
};

export const getWeekMoodAverage = async () => {
  try {
    const db           = await getDatabase();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fromDate = _localDate(sevenDaysAgo);  // FIX: was toISOString()
    const result   = await db.getFirstAsync(
      `SELECT AVG(mood) as avgMood, AVG(energy) as avgEnergy FROM mood_logs WHERE date >= ?`,
      [fromDate]
    );
    return {
      avgMood:   Math.round((result?.avgMood   || 0) * 10) / 10,
      avgEnergy: Math.round((result?.avgEnergy || 0) * 10) / 10,
    };
  } catch { return { avgMood: 0, avgEnergy: 0 }; }
};

// ── SLIP TRIGGERS ─────────────────────────────────────────────────────
export const MISS_REASONS = [
  { key: 'forgot',      label: 'Forgot',       icon: '🤔' },
  { key: 'no_time',     label: 'No time',      icon: '⏰' },
  { key: 'too_tired',   label: 'Too tired',    icon: '😴' },
  { key: 'sick',        label: 'Sick',         icon: '🤒' },
  { key: 'distracted',  label: 'Distracted',   icon: '📱' },
  { key: 'overwhelmed', label: 'Overwhelmed',  icon: '😵' },
  { key: 'just_didnt',  label: "Just didn't",  icon: '🤷' },
];

export const SKIP_REASONS = [
  { key: 'rest_day',  label: 'Rest day',     icon: '💤' },
  { key: 'sick',      label: 'Sick',         icon: '🤒' },
  { key: 'traveling', label: 'Traveling',    icon: '✈️' },
  { key: 'emergency', label: 'Emergency',    icon: '🚨' },
  { key: 'planned',   label: 'Planned',      icon: '✅' },
];

export const logMissReason = async ({ habitId, status, reason }) => {
  if (!habitId || !reason) return;
  try {
    const db    = await getDatabase();
    const today = getTodayDate();
    await db.runAsync(
      'INSERT INTO miss_logs (habit_id, date, status, reason) VALUES (?, ?, ?, ?)',
      [habitId, today, status, reason]
    );
  } catch (err) {
    console.warn('logMissReason:', err.message);
  }
};

export const getMissPattern = async (habitId) => {
  if (!habitId) return null;
  try {
    const db      = await getDatabase();
    const fromDay = new Date();
    fromDay.setDate(fromDay.getDate() - 30);
    const rows = await db.getAllAsync(
      `SELECT status, reason FROM miss_logs WHERE habit_id = ? AND date >= ? ORDER BY date DESC`,
      [habitId, _localDate(fromDay)]
    ) || [];
    if (rows.length === 0) return null;

    const missRows = rows.filter(r => r.status === 'missed');
    const skipRows = rows.filter(r => r.status === 'skipped');

    const topReason = (list) => {
      if (list.length === 0) return null;
      const counts = {};
      list.forEach(r => { counts[r.reason] = (counts[r.reason] || 0) + 1; });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      const pct = Math.round((top[1] / list.length) * 100);
      return { key: top[0], count: top[1], pct, total: list.length };
    };

    return {
      missTop:  topReason(missRows),
      skipTop:  topReason(skipRows),
      allReasons: MISS_REASONS.concat(SKIP_REASONS),
    };
  } catch { return null; }
};

export const TRIGGER_OPTIONS = [
  { key: 'stress',      label: 'Stress',       icon: '😤', color: '#FF453A' },
  { key: 'boredom',     label: 'Boredom',      icon: '😑', color: '#FF9F0A' },
  { key: 'social',      label: 'Social',       icon: '👥', color: '#BF5AF2' },
  { key: 'tired',       label: 'Tired',        icon: '😴', color: '#5AC8FA' },
  { key: 'emotional',   label: 'Emotional',    icon: '💔', color: '#FF2D55' },
  { key: 'automatic',   label: 'Automatic',    icon: '🔄', color: '#8E8E93' },
  { key: 'night',       label: 'Late Night',   icon: '🌙', color: '#0A84FF' },
  { key: 'hunger',      label: 'Hungry',       icon: '🍕', color: '#FF9F0A' },
  { key: 'lonely',      label: 'Lonely',       icon: '🫂', color: '#5AC8FA' },
  { key: 'procrastin',  label: 'Avoiding',     icon: '📵', color: '#FF9F0A' },
  { key: 'restless',    label: 'Restless',     icon: '🌀', color: '#BF5AF2' },
  { key: 'reward',      label: 'Reward',       icon: '🎯', color: '#30D158' },
  { key: 'alone',       label: 'Alone',        icon: '🚪', color: '#8E8E93' },
  { key: 'conflict',    label: 'After Fight',  icon: '💢', color: '#FF453A' },
];

export const logSlipTrigger = async ({
  habitId, trigger, note = null,
  timeOfDay = null, hoursSslept = null, missedAlarm = null, moodBefore = null,
}) => {
  if (!habitId) throw new Error('Habit ID required');
  const validTriggers = TRIGGER_OPTIONS.map(t => t.key);
  if (!validTriggers.includes(trigger)) {
    throw new Error(`Invalid trigger. Choose from: ${validTriggers.join(', ')}`);
  }
  try {
    const db    = await getDatabase();
    const today = getTodayDate();
    await db.runAsync(
      `INSERT INTO slip_triggers
        (habit_id, date, trigger, note, time_of_day, hours_slept, missed_alarm, mood_before)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [habitId, today, trigger, note, timeOfDay, hoursSslept,
       missedAlarm !== null ? (missedAlarm ? 1 : 0) : null, moodBefore]
    );
  } catch (error) {
    throw new Error(`Trigger log failed: ${error.message}`);
  }
};

export const getDeepSlipPattern = async (habitId) => {
  if (!habitId) return null;
  try {
    const db      = await getDatabase();
    const fromDay = new Date();
    fromDay.setDate(fromDay.getDate() - 30);
    const fromDate = _localDate(fromDay);
    const rows = await db.getAllAsync(
      `SELECT time_of_day, hours_slept, missed_alarm, mood_before
       FROM slip_triggers
       WHERE habit_id = ? AND date >= ?
         AND (time_of_day IS NOT NULL OR hours_slept IS NOT NULL
              OR missed_alarm IS NOT NULL OR mood_before IS NOT NULL)
       ORDER BY date DESC`,
      [habitId, fromDate]
    ) || [];
    if (rows.length === 0) return null;

    // Most common time of day
    const timeCounts = {};
    rows.forEach(r => { if (r.time_of_day) timeCounts[r.time_of_day] = (timeCounts[r.time_of_day] || 0) + 1; });
    const topTime = Object.entries(timeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Most common mood
    const moodCounts = {};
    rows.forEach(r => { if (r.mood_before) moodCounts[r.mood_before] = (moodCounts[r.mood_before] || 0) + 1; });
    const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Low sleep correlation (<= 6 hours)
    const sleepRows    = rows.filter(r => r.hours_slept);
    const lowSleepRows = sleepRows.filter(r => ['<4','5','6'].includes(r.hours_slept));
    const lowSleepPct  = sleepRows.length > 0
      ? Math.round((lowSleepRows.length / sleepRows.length) * 100) : null;

    // Missed alarm correlation
    const alarmRows   = rows.filter(r => r.missed_alarm !== null);
    const missedCount = alarmRows.filter(r => r.missed_alarm === 1).length;
    const alarmPct    = alarmRows.length > 0
      ? Math.round((missedCount / alarmRows.length) * 100) : null;

    return { topTime, topMood, lowSleepPct, alarmPct, totalDeepLogs: rows.length };
  } catch { return null; }
};

export const getTriggersForHabit = async (habitId, days = 30) => {
  if (!habitId) return [];
  try {
    const db      = await getDatabase();
    const fromDay = new Date();
    fromDay.setDate(fromDay.getDate() - days);
    const fromDate = _localDate(fromDay);  // FIX: was toISOString()
    return await db.getAllAsync(
      `SELECT * FROM slip_triggers WHERE habit_id = ? AND date >= ? ORDER BY date DESC`,
      [habitId, fromDate]
    ) || [];
  } catch { return []; }
};

export const getTriggerPattern = async (habitId) => {
  if (!habitId) return null;
  try {
    const triggers = await getTriggersForHabit(habitId, 30);
    if (triggers.length === 0) return null;

    const counts = {};
    triggers.forEach(t => { counts[t.trigger] = (counts[t.trigger] || 0) + 1; });

    const sorted   = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const topKey   = sorted[0]?.[0];
    const topCount = sorted[0]?.[1];
    const topInfo  = TRIGGER_OPTIONS.find(t => t.key === topKey);
    const pct      = Math.round((topCount / triggers.length) * 100);

    return {
      topTrigger:  topKey,
      topInfo,
      topCount,
      percentage:  pct,
      totalSlips:  triggers.length,
      allCounts:   counts,
      label: topInfo ? `${topInfo.icon} ${topInfo.label} (${pct}% of slips)` : null,
    };
  } catch { return null; }
};

export const getOverallTriggerPattern = async () => {
  try {
    const db           = await getDatabase();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fromDate = _localDate(sevenDaysAgo);  // FIX: was toISOString()

    const triggers = await db.getAllAsync(
      'SELECT trigger FROM slip_triggers WHERE date >= ?', [fromDate]
    ) || [];
    if (triggers.length === 0) return null;

    const counts = {};
    triggers.forEach(t => { counts[t.trigger] = (counts[t.trigger] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const topKey = sorted[0]?.[0];
    return TRIGGER_OPTIONS.find(t => t.key === topKey) || null;
  } catch { return null; }
};

// ── WEEKLY REFLECTIONS ────────────────────────────────────────────────
export const saveWeeklyReflection = async ({ wentWell, struggled, commitment }) => {
  if (!wentWell?.trim())    throw new Error('Please share what went well this week');
  if (!commitment?.trim())  throw new Error('Please write your commitment for next week');
  try {
    const db    = await getDatabase();
    const today = new Date();
    const day   = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    const weekStart = _localDate(monday);  // FIX: was toISOString()

    const { avgMood, avgEnergy } = await getWeekMoodAverage();
    await db.runAsync(
      `INSERT INTO weekly_reflections (week_start, went_well, struggled, commitment, mood_avg, energy_avg)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(week_start) DO UPDATE SET
         went_well  = excluded.went_well,
         struggled  = excluded.struggled,
         commitment = excluded.commitment,
         mood_avg   = excluded.mood_avg,
         energy_avg = excluded.energy_avg`,
      [weekStart, wentWell.trim(), struggled?.trim() || '', commitment.trim(), avgMood, avgEnergy]
    );
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
      'SELECT * FROM weekly_reflections ORDER BY week_start DESC LIMIT ?', [limit]
    ) || [];
  } catch { return []; }
};

export const getThisWeekReflection = async () => {
  try {
    const db    = await getDatabase();
    const today = new Date();
    const day   = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    const weekStart = _localDate(monday);  // FIX: was toISOString()
    return await db.getFirstAsync(
      'SELECT * FROM weekly_reflections WHERE week_start = ?', [weekStart]
    ) || null;
  } catch { return null; }
};

// Should weekly reflection prompt be shown? Sunday after 7 PM only.
export const shouldShowWeeklyReflection = async () => {
  const today = new Date();
  if (today.getDay() !== 0 || today.getHours() < 19) return false;
  const existing = await getThisWeekReflection();
  return !existing;
};