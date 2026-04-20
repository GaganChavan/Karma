// ─── KARMA APP — HABIT SERVICE ──────────────────────────────────────
// All database operations for habits, checkins, streaks, settings.
// Every function validates input and throws descriptive errors.

import { getDatabase } from './database';

// ── Validation helpers ────────────────────────────────────────────────

const validateHabitInput = (habit) => {
  if (!habit) throw new Error('Habit data is required');
  const name = habit.name?.trim() || '';
  if (name.length === 0)  throw new Error("Habit name can't be empty, Neel");
  if (name.length < 3)    throw new Error('Habit name must be at least 3 characters');
  if (name.length > 50)   throw new Error('Habit name must be under 50 characters');
  if (!['build','break'].includes(habit.type)) {
    throw new Error('Habit type must be "build" or "break"');
  }
};

const getTodayDate = () => new Date().toISOString().split('T')[0];

const getDateString = (date) => {
  if (typeof date === 'string') return date;
  return date.toISOString().split('T')[0];
};

// ── HABITS — CRUD ─────────────────────────────────────────────────────

export const getAllHabits = async () => {
  try {
    const db = await getDatabase();
    const habits = await db.getAllAsync(
      `SELECT * FROM habits
       WHERE is_active = 1
       ORDER BY sort_order ASC, created_at ASC`
    );
    return habits || [];
  } catch (error) {
    console.error('getAllHabits:', error);
    throw new Error(`Couldn't load your habits: ${error.message}`);
  }
};

export const getHabitById = async (id) => {
  if (!id) throw new Error('Habit ID is required');
  try {
    const db = await getDatabase();
    const habit = await db.getFirstAsync(
      'SELECT * FROM habits WHERE id = ? AND is_active = 1',
      [id]
    );
    if (!habit) throw new Error('Habit not found');
    return habit;
  } catch (error) {
    throw new Error(`Couldn't find habit: ${error.message}`);
  }
};

export const createHabit = async (habit) => {
  validateHabitInput(habit);

  try {
    const db = await getDatabase();
    const existing = await db.getFirstAsync(
      'SELECT id FROM habits WHERE lower(trim(name)) = lower(?) AND is_active = 1',
      [habit.name.trim()]
    );
    if (existing) {
      throw new Error(`A habit named "${habit.name.trim()}" already exists, Neel`);
    }

    const count = await db.getFirstAsync(
      'SELECT COUNT(*) as count FROM habits WHERE is_active = 1'
    );
    const sortOrder = (count?.count || 0);

    const result = await db.runAsync(
      `INSERT INTO habits
        (name, icon, color, type, frequency, days,
         reminder_time, reminder_type, goal_days,
         punishment_sensitivity, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        habit.name.trim(),
        habit.icon            || '⭐',
        habit.color           || '#1E7FFF',
        habit.type,
        habit.frequency       || 'daily',
        habit.days            || '1,2,3,4,5,6,7',
        habit.reminder_time   || null,
        habit.reminder_type   || 'none',
        habit.goal_days       || 0,
        habit.punishment_sensitivity || 'balanced',
        sortOrder,
      ]
    );

    console.log(`✅ Habit created: "${habit.name}" (id: ${result.lastInsertRowId})`);
    // No XP awarded for creating a habit — only for completing it
    return result.lastInsertRowId;
  } catch (error) {
    if (error.message.includes("can't be empty") ||
        error.message.includes('already exists') ||
        error.message.includes('must be')) {
      throw error;
    }
    console.error('createHabit:', error);
    throw new Error(`Couldn't create habit: ${error.message}`);
  }
};

export const updateHabit = async (id, updates) => {
  if (!id) throw new Error('Habit ID is required to update');
  if (updates.name !== undefined) {
    const name = updates.name?.trim() || '';
    if (name.length === 0) throw new Error("Habit name can't be empty, Neel");
    if (name.length < 3)   throw new Error('Habit name must be at least 3 characters');
    if (name.length > 50)  throw new Error('Habit name must be under 50 characters');
  }

  try {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE habits SET
        name = COALESCE(?, name),
        icon = COALESCE(?, icon),
        color = COALESCE(?, color),
        reminder_time = ?,
        reminder_type = COALESCE(?, reminder_type),
        goal_days = COALESCE(?, goal_days),
        punishment_sensitivity = COALESCE(?, punishment_sensitivity),
        updated_at = datetime('now','localtime')
       WHERE id = ? AND is_active = 1`,
      [
        updates.name?.trim()           || null,
        updates.icon                   || null,
        updates.color                  || null,
        updates.reminder_time          ?? null,
        updates.reminder_type          || null,
        updates.goal_days              ?? null,
        updates.punishment_sensitivity || null,
        id,
      ]
    );
    console.log(`✅ Habit ${id} updated`);
  } catch (error) {
    if (error.message.includes("can't be empty") ||
        error.message.includes('must be')) {
      throw error;
    }
    throw new Error(`Couldn't update habit: ${error.message}`);
  }
};

export const archiveHabit = async (id) => {
  if (!id) throw new Error('Habit ID is required to archive');
  try {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE habits SET is_active = 0, updated_at = datetime('now','localtime')
       WHERE id = ?`,
      [id]
    );
    console.log(`✅ Habit ${id} archived`);
  } catch (error) {
    throw new Error(`Couldn't archive habit: ${error.message}`);
  }
};

export const reorderHabits = async (orderedIds) => {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) return;
  try {
    const db = await getDatabase();
    for (let i = 0; i < orderedIds.length; i++) {
      await db.runAsync(
        'UPDATE habits SET sort_order = ? WHERE id = ?',
        [i, orderedIds[i]]
      );
    }
  } catch (error) {
    throw new Error(`Couldn't reorder habits: ${error.message}`);
  }
};

// ── CHECKINS ──────────────────────────────────────────────────────────

export const getTodayCheckins = async () => {
  try {
    const db    = await getDatabase();
    const today = getTodayDate();
    return await db.getAllAsync(
      'SELECT * FROM checkins WHERE date = ?',
      [today]
    ) || [];
  } catch (error) {
    throw new Error(`Couldn't load today's check-ins: ${error.message}`);
  }
};

export const getCheckinsForDate = async (date) => {
  try {
    const db = await getDatabase();
    return await db.getAllAsync(
      'SELECT * FROM checkins WHERE date = ?',
      [getDateString(date)]
    ) || [];
  } catch (error) {
    throw new Error(`Couldn't load check-ins for date: ${error.message}`);
  }
};

export const getCheckinsForHabit = async (habitId, limit = 90) => {
  if (!habitId) throw new Error('Habit ID required');
  try {
    const db = await getDatabase();
    return await db.getAllAsync(
      `SELECT * FROM checkins
       WHERE habit_id = ?
       ORDER BY date DESC
       LIMIT ?`,
      [habitId, limit]
    ) || [];
  } catch (error) {
    throw new Error(`Couldn't load habit history: ${error.message}`);
  }
};

export const checkIn = async (habitId, status, note = null, slipCount = 0) => {
  if (!habitId) throw new Error('Habit ID is required for check-in');
  const validStatuses = ['done','missed','slip','resisted','skipped'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status "${status}". Must be one of: ${validStatuses.join(', ')}`);
  }
  if (note && note.length > 300) {
    throw new Error('Note must be under 300 characters');
  }

  try {
    const db    = await getDatabase();
    const today = getTodayDate();

    // ── XP Logic FIRST — before insert overwrites the old status ──────
    // Read current status for today BEFORE we change it
    const existing = await db.getFirstAsync(
      'SELECT status FROM checkins WHERE habit_id = ? AND date = ?',
      [habitId, today]
    );

    const wasComplete = existing?.status === 'done' || existing?.status === 'resisted';
    const nowComplete = status === 'done' || status === 'resisted';

    // Award XP only when transitioning TO complete for first time
    const xpToAward  = nowComplete && !wasComplete
      ? (status === 'done' ? 10 : 8)
      : 0;

    // Deduct XP when undoing a completion
    const xpToDeduct = !nowComplete && wasComplete
      ? (existing?.status === 'done' ? 10 : 8)
      : 0;

    if (xpToAward > 0 || xpToDeduct > 0) {
      const currentSetting = await db.getFirstAsync(
        "SELECT value FROM settings WHERE key = 'total_xp'"
      );
      const currentXP = parseInt(currentSetting?.value || '0');
      const newXP     = Math.max(0, currentXP + xpToAward - xpToDeduct);

      await db.runAsync(
        "UPDATE settings SET value = ? WHERE key = 'total_xp'",
        [String(newXP)]
      );

      if (xpToAward > 0) {
        await db.runAsync(
          'INSERT INTO xp_log (habit_id, xp, reason, date) VALUES (?, ?, ?, ?)',
          [habitId, xpToAward, `Habit ${status}`, today]
        );
      }
      console.log(`⚡ XP: +${xpToAward} -${xpToDeduct} → total ${newXP}`);
    }

    // ── Now do the actual check-in insert / update ─────────────────────
    await db.runAsync(
      `INSERT INTO checkins (habit_id, date, status, note, slip_count)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(habit_id, date) DO UPDATE SET
         status     = excluded.status,
         note       = excluded.note,
         slip_count = excluded.slip_count`,
      [habitId, today, status, note, slipCount]
    );

    console.log(`✅ Check-in: habit ${habitId} → ${status}`);
  } catch (error) {
    if (error.message.includes('Invalid status') ||
        error.message.includes('must be under') ||
        error.message.includes('required')) {
      throw error;
    }
    throw new Error(`Check-in failed: ${error.message}`);
  }
};

export const editPastCheckin = async (habitId, date, status, note = null) => {
  if (!habitId) throw new Error('Habit ID is required');
  if (!date)    throw new Error('Date is required to edit past check-in');

  const target   = new Date(date);
  const today    = new Date();
  const diffDays = Math.floor((today - target) / 86400000);
  if (diffDays > 3) {
    throw new Error("Can't edit check-ins older than 3 days, Neel — keeping data honest");
  }
  if (diffDays < 0) {
    throw new Error("Can't edit future dates");
  }

  try {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO checkins (habit_id, date, status, note, slip_count)
       VALUES (?, ?, ?, ?, 0)
       ON CONFLICT(habit_id, date) DO UPDATE SET
         status = excluded.status,
         note   = excluded.note`,
      [habitId, getDateString(date), status, note]
    );
  } catch (error) {
    if (error.message.includes("Can't edit")) throw error;
    throw new Error(`Couldn't edit past check-in: ${error.message}`);
  }
};

// ── STREAKS ───────────────────────────────────────────────────────────

export const getStreak = async (habitId) => {
  if (!habitId) throw new Error('Habit ID required for streak');
  try {
    const db    = await getDatabase();
    const habit = await db.getFirstAsync(
      'SELECT type FROM habits WHERE id = ?', [habitId]
    );
    if (!habit) return { current: 0, longest: 0 };

    const goodStatuses = habit.type === 'build'
      ? "('done')"
      : "('resisted')";

    const rows = await db.getAllAsync(
      `SELECT date FROM checkins
       WHERE habit_id = ? AND status IN ${goodStatuses}
       ORDER BY date DESC`,
      [habitId]
    );

    if (!rows || rows.length === 0) return { current: 0, longest: 0 };

    const today  = getTodayDate();
    let current  = 0;
    let longest  = 0;
    let temp     = 0;
    let checking = today;
    let countingCurrent = true;

    for (const row of rows) {
      if (row.date === checking) {
        temp++;
        if (countingCurrent) current++;
        const d = new Date(checking);
        d.setDate(d.getDate() - 1);
        checking = d.toISOString().split('T')[0];
      } else {
        countingCurrent = false;
        if (temp > longest) longest = temp;
        temp = 1;
        const d = new Date(row.date);
        d.setDate(d.getDate() - 1);
        checking = d.toISOString().split('T')[0];
      }
    }
    if (temp > longest) longest = temp;

    return { current, longest };
  } catch (error) {
    console.error('getStreak:', error);
    return { current: 0, longest: 0 };
  }
};

export const getWeeklyCompletionRate = async (habitId) => {
  if (!habitId) return 0;
  try {
    const db    = await getDatabase();
    const today = new Date();
    const days  = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }

    const checkins = await db.getAllAsync(
      `SELECT date, status FROM checkins
       WHERE habit_id = ? AND date >= ?`,
      [habitId, days[0]]
    );

    const done = checkins.filter(
      c => c.status === 'done' || c.status === 'resisted'
    ).length;

    return Math.round((done / 7) * 100);
  } catch (error) {
    return 0;
  }
};

// ── PUNISHMENT ────────────────────────────────────────────────────────

export const getPunishmentLevel = async (habitId) => {
  if (!habitId) return 0;
  try {
    const db = await getDatabase();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fromDate = sevenDaysAgo.toISOString().split('T')[0];

    const slips = await db.getFirstAsync(
      `SELECT COUNT(*) as count FROM checkins
       WHERE habit_id = ? AND status = 'slip' AND date >= ?`,
      [habitId, fromDate]
    );

    const count = slips?.count || 0;
    if (count === 0) return 0;
    if (count <= 2)  return 1;
    if (count <= 4)  return 2;
    if (count <= 7)  return 3;
    return 4;
  } catch (error) {
    return 0;
  }
};

// ── MILESTONES ────────────────────────────────────────────────────────

export const checkAndSaveMilestone = async (habitId, currentStreak) => {
  const milestones = [3, 7, 14, 21, 30, 48, 60, 75, 90, 180, 365];
  if (!milestones.includes(currentStreak)) return null;

  try {
    const db = await getDatabase();
    const existing = await db.getFirstAsync(
      'SELECT id FROM milestones WHERE habit_id = ? AND milestone_days = ?',
      [habitId, currentStreak]
    );
    if (existing) return null;

    await db.runAsync(
      'INSERT INTO milestones (habit_id, milestone_days) VALUES (?, ?)',
      [habitId, currentStreak]
    );
    console.log(`🏆 Milestone: ${currentStreak} days for habit ${habitId}`);
    return currentStreak;
  } catch (error) {
    console.warn('checkAndSaveMilestone:', error.message);
    return null;
  }
};

// ── SETTINGS ──────────────────────────────────────────────────────────

export const getSetting = async (key) => {
  if (!key) throw new Error('Setting key is required');
  try {
    const db  = await getDatabase();
    const row = await db.getFirstAsync(
      'SELECT value FROM settings WHERE key = ?',
      [key]
    );
    return row?.value ?? null;
  } catch (error) {
    throw new Error(`Couldn't read setting "${key}": ${error.message}`);
  }
};

export const setSetting = async (key, value) => {
  if (!key) throw new Error('Setting key is required');
  if (value === undefined || value === null) {
    throw new Error(`Setting value for "${key}" cannot be null`);
  }
  try {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [key, String(value)]
    );
  } catch (error) {
    throw new Error(`Couldn't save setting "${key}": ${error.message}`);
  }
};

export const getAllSettings = async () => {
  try {
    const db   = await getDatabase();
    const rows = await db.getAllAsync('SELECT key, value FROM settings');
    return Object.fromEntries((rows || []).map(r => [r.key, r.value]));
  } catch (error) {
    throw new Error(`Couldn't load settings: ${error.message}`);
  }
};

// ── STATS ─────────────────────────────────────────────────────────────

export const getTotalXP = async () => {
  try {
    const xp = await getSetting('total_xp');
    return parseInt(xp || '0');
  } catch {
    return 0;
  }
};

export const getOverallStats = async () => {
  try {
    const db    = await getDatabase();
    const today = getTodayDate();

    const totalHabits = await db.getFirstAsync(
      "SELECT COUNT(*) as count FROM habits WHERE is_active = 1"
    );
    const todayDone = await db.getFirstAsync(
      "SELECT COUNT(*) as count FROM checkins WHERE date = ? AND status IN ('done','resisted')",
      [today]
    );
    const totalXP = await getTotalXP();

    return {
      totalHabits: totalHabits?.count || 0,
      todayDone:   todayDone?.count   || 0,
      totalXP,
    };
  } catch (error) {
    return { totalHabits: 0, todayDone: 0, totalXP: 0 };
  }
};

// ── EXPORT / IMPORT ───────────────────────────────────────────────────

export const exportAllData = async () => {
  try {
    const db         = await getDatabase();
    const habits     = await db.getAllAsync('SELECT * FROM habits');
    const checkins   = await db.getAllAsync('SELECT * FROM checkins');
    const settings   = await db.getAllAsync('SELECT * FROM settings');
    const milestones = await db.getAllAsync('SELECT * FROM milestones');

    return {
      version:     1,
      exported_at: new Date().toISOString(),
      habits,
      checkins,
      settings,
      milestones,
    };
  } catch (error) {
    throw new Error(`Export failed: ${error.message}`);
  }
};