// ─── KARMA APP — TODO SERVICE (Hourly Planner) ───────────────────────
// CRUD + rollup queries for the todos table.
// TIMEZONE: local-date helpers only — toISOString() is UTC and gives the
// wrong date in IST before 05:30 (same fix already applied in habitService.js).

import { getDatabase } from './database';

// ── Timezone-safe date helpers ────────────────────────────────────────
const _localDate = (d) => {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const getTodayDate = () => _localDate(new Date());

// ── Validation ────────────────────────────────────────────────────────
const validateHour = (hour) => {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error('Hour must be an integer between 0 and 23');
  }
};

const validateTitle = (title) => {
  const trimmed = title?.trim() || '';
  if (trimmed.length === 0) throw new Error("Task title can't be empty");
  return trimmed;
};

// ── CRUD ──────────────────────────────────────────────────────────────

export const getTodosForDate = async (dateStr) => {
  try {
    const db = await getDatabase();
    return await db.getAllAsync(
      `SELECT * FROM todos WHERE date = ? ORDER BY hour ASC, sort_order ASC, id ASC`,
      [dateStr]
    ) || [];
  } catch (error) {
    console.error('getTodosForDate:', error.message);
    throw new Error(`Couldn't load your to-dos: ${error.message}`);
  }
};

export const addTodo = async (dateStr, hour, title) => {
  validateHour(hour);
  const cleanTitle = validateTitle(title);
  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync(
      `SELECT MAX(sort_order) as maxOrder FROM todos WHERE date = ? AND hour = ?`,
      [dateStr, hour]
    );
    const sortOrder = (row?.maxOrder ?? -1) + 1;
    const result = await db.runAsync(
      `INSERT INTO todos (date, hour, title, sort_order) VALUES (?, ?, ?, ?)`,
      [dateStr, hour, cleanTitle, sortOrder]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error('addTodo:', error.message);
    throw new Error(`Couldn't add that task: ${error.message}`);
  }
};

export const toggleTodoDone = async (id) => {
  if (!id) throw new Error('Todo ID is required');
  try {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE todos SET is_done = 1 - is_done, updated_at = datetime('now','localtime') WHERE id = ?`,
      [id]
    );
  } catch (error) {
    console.error('toggleTodoDone:', error.message);
    throw new Error(`Couldn't update that task: ${error.message}`);
  }
};

export const updateTodoTitle = async (id, title) => {
  if (!id) throw new Error('Todo ID is required');
  const cleanTitle = validateTitle(title);
  try {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE todos SET title = ?, updated_at = datetime('now','localtime') WHERE id = ?`,
      [cleanTitle, id]
    );
  } catch (error) {
    console.error('updateTodoTitle:', error.message);
    throw new Error(`Couldn't rename that task: ${error.message}`);
  }
};

export const deleteTodo = async (id) => {
  if (!id) throw new Error('Todo ID is required');
  try {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM todos WHERE id = ?`, [id]);
  } catch (error) {
    console.error('deleteTodo:', error.message);
    throw new Error(`Couldn't delete that task: ${error.message}`);
  }
};

// ── Rollups ───────────────────────────────────────────────────────────
// "Only planned slots count" — a day/hour with zero todos is neutral, never
// counted as missed and never folded into a rate as a 0. See TODO_PLANNER_PLAN.md.

export const getDaySummary = async (dateStr) => {
  try {
    const db  = await getDatabase();
    const row = await db.getFirstAsync(
      `SELECT COUNT(*) as planned, SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) as done
       FROM todos WHERE date = ?`,
      [dateStr]
    );
    const planned = row?.planned || 0;
    const done    = row?.done || 0;
    return { planned, done, rate: planned === 0 ? null : done / planned };
  } catch (error) {
    console.error('getDaySummary:', error.message);
    throw new Error(`Couldn't load today's summary: ${error.message}`);
  }
};

// Single grouped query — avoids N+1 per-day queries for Weekly/Monthly views.
// Dates with zero todos simply don't appear in the result; callers merge
// against the full date range and fill gaps as { planned: 0, done: 0 }.
export const getCountsForDateRange = async (fromDate, toDate) => {
  try {
    const db = await getDatabase();
    return await db.getAllAsync(
      `SELECT date,
              COUNT(*) as planned,
              SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) as done
       FROM todos
       WHERE date >= ? AND date <= ?
       GROUP BY date
       ORDER BY date ASC`,
      [fromDate, toDate]
    ) || [];
  } catch (error) {
    console.error('getCountsForDateRange:', error.message);
    throw new Error(`Couldn't load your planner stats: ${error.message}`);
  }
};

export const getRangeSummary = async (fromDate, toDate) => {
  const counts = await getCountsForDateRange(fromDate, toDate);
  // counts only contains dates that already have >=1 todo (GROUP BY drops
  // empty dates entirely), so trackedDays === counts.length always — total
  // days in the range has to be computed separately to get emptyDays right.
  const totalDays = Math.round((new Date(toDate) - new Date(fromDate)) / 86400000) + 1;
  let plannedTotal = 0;
  let doneTotal    = 0;
  const trackedDays = counts.length;
  for (const row of counts) {
    plannedTotal += row.planned;
    doneTotal    += row.done;
  }
  return {
    plannedTotal,
    doneTotal,
    rate: plannedTotal === 0 ? null : doneTotal / plannedTotal,
    trackedDays,
    emptyDays: Math.max(0, totalDays - trackedDays),
  };
};

export { getTodayDate };
