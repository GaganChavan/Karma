// ─── KARMA APP — HABIT SERVICE (PHASE F — COMPLETE) ──────────────────
// Includes Phase E + F-1 + timezone fix
// TIMEZONE FIX: all toISOString() replaced with local-date helpers (IST safe)
// XP FIX: Math.max(0,...) removed — XP can go negative as intended
// Phase E: is_paused filter, auto_skipped status, pause/resume functions
// Phase F-1: category column, setHabitCategory, getHabitsWithoutCategory

import { getDatabase }        from './database';
import { calculateCheckinXP } from '../services/gamificationService';

// ── Timezone-safe date helpers ────────────────────────────────────────
// toISOString() returns UTC — in IST (UTC+5:30) this gives YESTERDAY before 5:30 AM
// Fix: use getFullYear/getMonth/getDate which use LOCAL time
const _localDate = (d) => {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const getTodayDate  = () => _localDate(new Date());

const getDateString = (date) => {
  if (typeof date === 'string') return date.split('T')[0];
  return _localDate(date);
};

// ── Validation ────────────────────────────────────────────────────────
const validateHabitInput = (habit) => {
  if (!habit) throw new Error('Habit data is required');
  const name = habit.name?.trim() || '';
  if (name.length === 0) throw new Error("Habit name can't be empty");
  if (name.length < 3)   throw new Error('Habit name must be at least 3 characters');
  if (name.length > 50)  throw new Error('Habit name must be under 50 characters');
  if (!['build','break'].includes(habit.type)) throw new Error('Habit type must be build or break');
};

// ── HABITS CRUD ───────────────────────────────────────────────────────

// Phase E: AND is_paused = 0 — paused habits excluded from daily flow
export const getAllHabits = async () => {
  try {
    const db = await getDatabase();
    return await db.getAllAsync(
      `SELECT * FROM habits WHERE is_active = 1 AND is_paused = 0 ORDER BY sort_order ASC, created_at ASC`
    ) || [];
  } catch (error) {
    console.error('getAllHabits:', error.message);
    throw new Error(`Couldn't load your habits: ${error.message}`);
  }
};

export const getHabitById = async (id) => {
  if (!id) throw new Error('Habit ID is required');
  try {
    const db    = await getDatabase();
    const habit = await db.getFirstAsync('SELECT * FROM habits WHERE id = ? AND is_active = 1', [id]);
    if (!habit) throw new Error('Habit not found');
    return habit;
  } catch (error) {
    throw new Error(`Couldn't find habit: ${error.message}`);
  }
};

// Phase F-1: createHabit stores category
export const createHabit = async (habit) => {
  validateHabitInput(habit);
  try {
    const db       = await getDatabase();
    const existing = await db.getFirstAsync(
      'SELECT id FROM habits WHERE lower(trim(name)) = lower(?) AND is_active = 1',
      [habit.name.trim()]
    );
    if (existing) throw new Error(`A habit named "${habit.name.trim()}" already exists`);

    const count  = await db.getFirstAsync('SELECT COUNT(*) as count FROM habits WHERE is_active = 1');
    const now    = new Date().toISOString();

    const result = await db.runAsync(
      `INSERT INTO habits (
        name, icon, color, type, frequency, days,
        time_of_day,
        is_quantifiable, daily_target, unit,
        frequency_type, weekly_target,
        is_wfo_skip,
        reminder_time, reminder_type,
        goal_days, punishment_sensitivity,
        category,
        sort_order, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        habit.name.trim(),
        habit.icon   || '⭐',
        habit.color  || '#1E7FFF',
        habit.type,
        habit.frequency      || 'daily',
        habit.days           || '1,2,3,4,5,6,7',
        habit.time_of_day    || 'anytime',
        habit.is_quantifiable ? 1 : 0,
        parseFloat(habit.daily_target)  || 1,
        habit.unit           || '',
        habit.frequency_type || 'daily',
        parseInt(habit.weekly_target)   || 7,
        habit.is_wfo_skip    ? 1 : 0,
        habit.reminder_time  || null,
        habit.reminder_type  || 'none',
        habit.goal_days      || 0,
        habit.punishment_sensitivity || 'balanced',
        habit.category       || null,
        count?.count         || 0,
        now, now,
      ]
    );
    return result.lastInsertRowId;
  } catch (error) {
    if (
      error.message.includes("can't be empty") ||
      error.message.includes('already exists') ||
      error.message.includes('must be') ||
      error.message.includes('at least') ||
      error.message.includes('under')
    ) { throw error; }
    throw new Error(`Couldn't create habit: ${error.message}`);
  }
};

export const updateHabit = async (id, updates) => {
  if (!id) throw new Error('Habit ID required to update');
  if (updates.name !== undefined) {
    const name = updates.name?.trim() || '';
    if (name.length === 0) throw new Error("Habit name can't be empty");
    if (name.length < 3)   throw new Error('Habit name must be at least 3 characters');
    if (name.length > 50)  throw new Error('Habit name must be under 50 characters');
  }
  try {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE habits SET
        name               = COALESCE(?, name),
        icon               = COALESCE(?, icon),
        color              = COALESCE(?, color),
        time_of_day        = COALESCE(?, time_of_day),
        is_quantifiable    = COALESCE(?, is_quantifiable),
        daily_target       = COALESCE(?, daily_target),
        unit               = COALESCE(?, unit),
        frequency_type     = COALESCE(?, frequency_type),
        weekly_target      = COALESCE(?, weekly_target),
        reminder_time      = ?,
        reminder_type      = COALESCE(?, reminder_type),
        goal_days          = COALESCE(?, goal_days),
        punishment_sensitivity = COALESCE(?, punishment_sensitivity),
        updated_at         = datetime('now','localtime')
      WHERE id = ? AND is_active = 1`,
      [
        updates.name?.trim()      || null,
        updates.icon              || null,
        updates.color             || null,
        updates.time_of_day       || null,
        updates.is_quantifiable != null ? (updates.is_quantifiable ? 1 : 0) : null,
        updates.daily_target      ?? null,
        updates.unit              || null,
        updates.frequency_type    || null,
        updates.weekly_target     ?? null,
        updates.reminder_time     ?? null,
        updates.reminder_type     || null,
        updates.goal_days         ?? null,
        updates.punishment_sensitivity || null,
        id,
      ]
    );
  } catch (error) {
    if (error.message.includes("can't be empty") || error.message.includes('must be')) throw error;
    throw new Error(`Couldn't update habit: ${error.message}`);
  }
};

export const archiveHabit = async (id) => {
  if (!id) throw new Error('Habit ID required to archive');
  try {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE habits SET is_active = 0, updated_at = datetime('now','localtime') WHERE id = ?`, [id]
    );
  } catch (error) { throw new Error(`Couldn't archive habit: ${error.message}`); }
};

export const reorderHabits = async (orderedIds) => {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) return;
  try {
    const db = await getDatabase();
    for (let i = 0; i < orderedIds.length; i++) {
      await db.runAsync('UPDATE habits SET sort_order = ? WHERE id = ?', [i, orderedIds[i]]);
    }
  } catch (error) { throw new Error(`Couldn't reorder habits: ${error.message}`); }
};

// ── CATEGORY (Phase F-1) ──────────────────────────────────────────────
export const setHabitCategory = async (habitId, category) => {
  if (!habitId) throw new Error('Habit ID required');
  const valid = ['spiritual','intellectual','physical','conscious'];
  if (!valid.includes(category)) throw new Error(`Invalid category`);
  try {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE habits SET category = ?, updated_at = datetime('now','localtime') WHERE id = ?`,
      [category, habitId]
    );
  } catch (e) { throw new Error(`Couldn't set category: ${e.message}`); }
};

export const getHabitsWithoutCategory = async () => {
  try {
    const db = await getDatabase();
    return await db.getAllAsync(
      "SELECT id FROM habits WHERE is_active = 1 AND category IS NULL"
    ) || [];
  } catch { return []; }
};

// ── PAUSE / RESUME (Phase E) ──────────────────────────────────────────
export const getPausedHabits = async () => {
  try {
    const db = await getDatabase();
    return await db.getAllAsync(
      `SELECT * FROM habits WHERE is_active = 1 AND is_paused = 1 ORDER BY name`
    ) || [];
  } catch (e) { return []; }
};

export const pauseHabit = async (habitId) => {
  try {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE habits SET is_paused = 1, updated_at = datetime('now','localtime') WHERE id = ?`, [habitId]
    );
  } catch (e) { throw new Error(`Couldn't pause: ${e.message}`); }
};

export const resumeHabit = async (habitId) => {
  try {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE habits SET is_paused = 0, updated_at = datetime('now','localtime') WHERE id = ?`, [habitId]
    );
  } catch (e) { throw new Error(`Couldn't resume: ${e.message}`); }
};

// ── AUTO-SKIP (Phase E) ───────────────────────────────────────────────
export const getHabitsForAutoSkip = async () => {
  try {
    const db = await getDatabase();
    return await db.getAllAsync(`SELECT * FROM habits WHERE is_active = 1 AND is_paused = 0`) || [];
  } catch { return []; }
};

export const getCheckinForDate = async (habitId, date) => {
  try {
    const db = await getDatabase();
    return await db.getFirstAsync(
      `SELECT * FROM checkins WHERE habit_id = ? AND date = ?`, [habitId, date]
    ) || null;
  } catch { return null; }
};

export const insertAutoSkipCheckin = async (habitId, date) => {
  try {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR IGNORE INTO checkins (habit_id, date, status, created_at)
       VALUES (?, ?, 'auto_skipped', datetime('now','localtime'))`,
      [habitId, date]
    );
  } catch (e) { console.error('insertAutoSkipCheckin:', e.message); }
};

// ── CHECKINS ──────────────────────────────────────────────────────────
export const getTodayCheckins = async () => {
  try {
    const db = await getDatabase();
    return await db.getAllAsync('SELECT * FROM checkins WHERE date = ?', [getTodayDate()]) || [];
  } catch (error) { throw new Error(`Couldn't load today's check-ins: ${error.message}`); }
};

export const getCheckinsForHabit = async (habitId, limit = 90) => {
  if (!habitId) throw new Error('Habit ID required');
  try {
    const db = await getDatabase();
    return await db.getAllAsync(
      `SELECT * FROM checkins WHERE habit_id = ? ORDER BY date DESC LIMIT ?`, [habitId, limit]
    ) || [];
  } catch (error) { throw new Error(`Couldn't load habit history: ${error.message}`); }
};

// Phase E: auto_skipped added. Phase F: XP not capped at 0
export const checkIn = async (habitId, status, note = null, slipCount = 0) => {
  if (!habitId) throw new Error('Habit ID required for check-in');
  const validStatuses = ['done','missed','slip','resisted','skipped','auto_skipped'];
  if (!validStatuses.includes(status)) throw new Error(`Invalid status "${status}"`);
  if (note && note.length > 300)       throw new Error('Note must be under 300 characters');
  try {
    const db    = await getDatabase();
    const today = getTodayDate();  // TIMEZONE FIX: uses local date

    const existing = await db.getFirstAsync(
      'SELECT status FROM checkins WHERE habit_id = ? AND date = ?', [habitId, today]
    );
    const previousStatus = existing?.status || null;

    const xpAlreadyAwarded = await db.getFirstAsync(
      `SELECT id FROM xp_log WHERE habit_id = ? AND date(date) = ? AND xp > 0 LIMIT 1`,
      [habitId, today]
    );

    await db.runAsync(
      `INSERT INTO checkins (habit_id, date, status, note, slip_count)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(habit_id, date) DO UPDATE SET
         status     = excluded.status,
         note       = excluded.note,
         slip_count = excluded.slip_count`,
      [habitId, today, status, note, slipCount]
    );

    const xpChange = calculateCheckinXP(previousStatus, status);
    if (xpChange !== 0) {
      const shouldApply = xpChange < 0 || !xpAlreadyAwarded;
      if (shouldApply) {
        const habitData = await db.getFirstAsync('SELECT name FROM habits WHERE id = ?', [habitId]);
        const habitName = habitData?.name || `Habit #${habitId}`;
        const reason    = xpChange > 0 ? `${habitName} — ${status}` : `${habitName} — changed`;
        await awardXPForHabit(habitId, xpChange, reason);
      }
    }
  } catch (error) {
    if (
      error.message.includes('Invalid status') ||
      error.message.includes('required') ||
      error.message.includes('under 300')
    ) { throw error; }
    throw new Error(`Check-in failed: ${error.message}`);
  }
};

// XP FIX: Math.max(0,...) removed — XP can go negative
const awardXPForHabit = async (habitId, amount, reason) => {
  if (!amount || amount === 0) return 0;
  try {
    const db        = await getDatabase();
    const current   = await getSetting('total_xp');
    const currentXP = parseInt(current || '0');
    const newXP     = currentXP + amount;  // NO Math.max — XP can be negative
    await setSetting('total_xp', String(newXP));
    await db.runAsync(
      'INSERT INTO xp_log (habit_id, xp, reason, date) VALUES (?, ?, ?, datetime("now","localtime"))',
      [habitId, amount, reason || 'XP']
    );
    return newXP;
  } catch (error) {
    console.warn('awardXPForHabit error:', error.message);
    return 0;
  }
};

// ── EDIT PAST CHECKIN with XP correction ─────────────────────────────
const _calcEditXPDelta = (oldStatus, newStatus) => {
  const DONE_XP = 1, RES_XP = 2, AUTOSKIP_PENALTY = 2;
  const wasAutoSkip = oldStatus === 'auto_skipped';
  const wasDone     = oldStatus === 'done';
  const wasResisted = oldStatus === 'resisted';
  const nowDone     = newStatus === 'done';
  const nowResisted = newStatus === 'resisted';
  const nowPositive = nowDone || nowResisted;
  const wasPositive = wasDone || wasResisted;
  if (wasAutoSkip) {
    if (nowDone)     return AUTOSKIP_PENALTY + DONE_XP;
    if (nowResisted) return AUTOSKIP_PENALTY + RES_XP;
    return AUTOSKIP_PENALTY;
  }
  if (wasPositive && !nowPositive) return wasDone ? -DONE_XP : -RES_XP;
  if (!wasPositive && nowPositive) return nowDone ? DONE_XP : RES_XP;
  if (wasDone && nowResisted) return RES_XP - DONE_XP;
  if (wasResisted && nowDone) return DONE_XP - RES_XP;
  return 0;
};

export const editPastCheckin = async (habitId, date, newStatus, note = null) => {
  if (!habitId) throw new Error('Habit ID required');
  if (!date)    throw new Error('Date required');
  const target   = new Date(date + 'T00:00:00');
  const today    = new Date();
  const diffDays = Math.floor((today - target) / 86400000);
  if (diffDays > 3) throw new Error("Can't edit check-ins older than 3 days");
  if (diffDays < 0) throw new Error("Can't edit future dates");
  try {
    const db      = await getDatabase();
    const dateStr = getDateString(date);
    const existing = await db.getFirstAsync(
      'SELECT status FROM checkins WHERE habit_id = ? AND date = ?', [habitId, dateStr]
    );
    const oldStatus = existing?.status || null;
    await db.runAsync(
      `INSERT INTO checkins (habit_id, date, status, note, slip_count)
       VALUES (?, ?, ?, ?, 0)
       ON CONFLICT(habit_id, date) DO UPDATE SET status = excluded.status, note = excluded.note`,
      [habitId, dateStr, newStatus, note]
    );
    const xpDelta = _calcEditXPDelta(oldStatus, newStatus);
    if (xpDelta !== 0) {
      const habitData = await db.getFirstAsync('SELECT name FROM habits WHERE id = ?', [habitId]);
      const current   = await getSetting('total_xp');
      const newXP     = parseInt(current || '0') + xpDelta;
      await setSetting('total_xp', String(newXP));
      await db.runAsync(
        'INSERT INTO xp_log (habit_id, xp, reason, date) VALUES (?, ?, ?, ?)',
        [habitId, xpDelta, `Edit: ${habitData?.name || ''} ${oldStatus || 'none'} → ${newStatus}`, dateStr]
      );
    }
  } catch (error) {
    if (error.message.includes("Can't edit")) throw error;
    throw new Error(`Couldn't edit: ${error.message}`);
  }
};

// ── STREAKS ───────────────────────────────────────────────────────────
export const getStreak = async (habitId) => {
  if (!habitId) return { current: 0, longest: 0 };
  try {
    const db    = await getDatabase();
    const habit = await db.getFirstAsync('SELECT type, created_at FROM habits WHERE id = ?', [habitId]);
    if (!habit) return { current: 0, longest: 0 };
    const rows = await db.getAllAsync(
      `SELECT date, status FROM checkins WHERE habit_id = ? ORDER BY date DESC LIMIT 400`, [habitId]
    );
    if (!rows || rows.length === 0) return { current: 0, longest: 0 };

    const statusMap = {};
    rows.forEach(r => { statusMap[r.date] = r.status; });

    const today       = getTodayDate();  // TIMEZONE FIX
    const createdDate = new Date(habit.created_at || today);
    createdDate.setHours(0, 0, 0, 0);

    let current = 0, longest = 0, tempStreak = 0;
    let isCurrentStreak = true;

    const d = new Date();
    d.setHours(0, 0, 0, 0);

    while (true) {
      const dateStr = _localDate(d);  // TIMEZONE FIX: was d.toISOString().split('T')[0]
      const status  = statusMap[dateStr];

      if (d < createdDate) break;

      if (status === 'done' || status === 'resisted') {
        tempStreak++;
        if (isCurrentStreak) current++;
      } else if (status === 'skipped' || status === 'auto_skipped') {
        // Streak frozen — neither increments nor breaks
      } else if (status === 'missed' || status === 'slip') {
        if (isCurrentStreak) isCurrentStreak = false;
        if (tempStreak > longest) longest = tempStreak;
        tempStreak = 0;
      } else {
        if (dateStr === today) {
          // Today not yet logged — fine
        } else {
          if (isCurrentStreak) isCurrentStreak = false;
          if (tempStreak > longest) longest = tempStreak;
          tempStreak = 0;
        }
      }
      d.setDate(d.getDate() - 1);
      if (tempStreak > 1000) break;
    }

    if (tempStreak > longest) longest = tempStreak;
    return { current, longest };
  } catch (error) {
    console.warn('getStreak error:', error.message);
    return { current: 0, longest: 0 };
  }
};

export const getWeeklyCompletionRate = async (habitId) => {
  if (!habitId) return { done: 0, daysElapsed: 0, rate: 0 };
  try {
    const db          = await getDatabase();
    const today       = new Date();
    const dayOfWeek   = today.getDay();
    const daysFromMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday      = new Date(today);
    monday.setDate(today.getDate() - daysFromMon);

    const fromDate    = _localDate(monday);  // TIMEZONE FIX
    const todayDate   = _localDate(today);   // TIMEZONE FIX
    const daysElapsed = daysFromMon + 1;

    const done = await db.getFirstAsync(
      `SELECT COUNT(*) as count FROM checkins
       WHERE habit_id = ? AND date >= ? AND date <= ? AND status IN ('done','resisted')`,
      [habitId, fromDate, todayDate]
    );
    const doneCount = done?.count || 0;
    const rate      = daysElapsed > 0 ? Math.round((doneCount / daysElapsed) * 100) : 0;
    return { done: doneCount, daysElapsed, rate };
  } catch { return { done: 0, daysElapsed: 0, rate: 0 }; }
};

// ── PUNISHMENT ────────────────────────────────────────────────────────
export const getPunishmentLevel = async (habitId) => {
  if (!habitId) return 0;
  try {
    const db          = await getDatabase();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fromDate    = _localDate(sevenDaysAgo);  // TIMEZONE FIX
    const slips       = await db.getFirstAsync(
      `SELECT COUNT(*) as count FROM checkins WHERE habit_id = ? AND status = 'slip' AND date >= ?`,
      [habitId, fromDate]
    );
    const count = slips?.count || 0;
    if (count === 0) return 0;
    if (count <= 2)  return 1;
    if (count <= 4)  return 2;
    if (count <= 7)  return 3;
    return 4;
  } catch { return 0; }
};

// ── SETTINGS ──────────────────────────────────────────────────────────
export const getSetting = async (key) => {
  if (!key) throw new Error('Setting key required');
  try {
    const db  = await getDatabase();
    const row = await db.getFirstAsync('SELECT value FROM settings WHERE key = ?', [key]);
    return row?.value ?? null;
  } catch (error) { throw new Error(`Couldn't read "${key}": ${error.message}`); }
};

export const setSetting = async (key, value) => {
  if (!key) throw new Error('Setting key required');
  if (value === undefined || value === null) throw new Error(`Value for "${key}" cannot be null`);
  try {
    const db = await getDatabase();
    await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
  } catch (error) { throw new Error(`Couldn't save "${key}": ${error.message}`); }
};

export const getAllSettings = async () => {
  try {
    const db   = await getDatabase();
    const rows = await db.getAllAsync('SELECT key, value FROM settings');
    return Object.fromEntries((rows || []).map(r => [r.key, r.value]));
  } catch (error) { throw new Error(`Couldn't load settings: ${error.message}`); }
};

// ── STATS ─────────────────────────────────────────────────────────────
export const getTotalXP = async () => {
  try { return parseInt((await getSetting('total_xp')) || '0'); }
  catch { return 0; }
};

export const getOverallStats = async () => {
  try {
    const db    = await getDatabase();
    const today = getTodayDate();
    const [totalHabits, todayDone, totalXPVal] = await Promise.all([
      db.getFirstAsync("SELECT COUNT(*) as count FROM habits WHERE is_active = 1 AND is_paused = 0"),
      db.getFirstAsync("SELECT COUNT(*) as count FROM checkins WHERE date = ? AND status IN ('done','resisted')", [today]),
      getTotalXP(),
    ]);
    return {
      totalHabits: totalHabits?.count || 0,
      todayDone:   todayDone?.count   || 0,
      totalXP:     totalXPVal,
    };
  } catch { return { totalHabits: 0, todayDone: 0, totalXP: 0 }; }
};

// ── EXPORT ────────────────────────────────────────────────────────────
export const exportAllData = async () => {
  try {
    const db = await getDatabase();
    const [habits, checkins, settings, milestones, xpLog, journeyMilestones] = await Promise.all([
      db.getAllAsync('SELECT * FROM habits'),
      db.getAllAsync('SELECT * FROM checkins'),
      db.getAllAsync('SELECT * FROM settings'),
      db.getAllAsync('SELECT * FROM milestones'),
      db.getAllAsync('SELECT * FROM xp_log'),
      db.getAllAsync('SELECT * FROM journey_milestones'),
    ]);
    return {
      version: 3, exported_at: new Date().toISOString(),
      habits, checkins, settings, milestones, xpLog, journeyMilestones,
    };
  } catch (error) { throw new Error(`Export failed: ${error.message}`); }
};