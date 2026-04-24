// ─── KARMA APP — WFO MODE SERVICE (PHASE D) ──────────────────────────
// Handles the Hassan vs Bangalore context switch.
// WFO Mode: auto-skips non-essential habits, protects non-negotiables.
// Streak Recovery: miss after 30+ days? Redemption offered.

import { getDatabase } from '../database/database';
import { getAllHabits, getSetting, setSetting } from '../database/habitService';

// ── WFO MODE ──────────────────────────────────────────────────────────

export const isWFOMode = async () => {
  try {
    const val = await getSetting('wfo_mode');
    return val === 'true';
  } catch { return false; }
};

export const enableWFOMode = async () => {
  try {
    const db = await getDatabase();
    await setSetting('wfo_mode', 'true');
    await setSetting('wfo_start_date', new Date().toISOString().split('T')[0]);

    // Auto-skip all habits marked as wfo_skip for today
    const habits = await getAllHabits();
    const today  = new Date().toISOString().split('T')[0];

    for (const h of habits) {
      if (h.is_wfo_skip) {
        await db.runAsync(
          `INSERT INTO checkins (habit_id, date, status, note)
           VALUES (?, ?, 'skipped', 'WFO Mode — auto skipped')
           ON CONFLICT(habit_id, date) DO NOTHING`,
          [h.id, today]
        );
      }
    }
    console.log('✅ WFO Mode enabled');
  } catch (err) {
    throw new Error(`WFO enable failed: ${err.message}`);
  }
};

export const disableWFOMode = async () => {
  try {
    await setSetting('wfo_mode', 'false');
    await setSetting('wfo_end_date', new Date().toISOString().split('T')[0]);
    console.log('✅ WFO Mode disabled — Hassan mode active');
  } catch (err) {
    throw new Error(`WFO disable failed: ${err.message}`);
  }
};

// Get WFO summary stats for the current WFO trip
export const getWFOStats = async () => {
  try {
    const db        = await getDatabase();
    const startDate = await getSetting('wfo_start_date');
    if (!startDate) return null;

    const today = new Date().toISOString().split('T')[0];

    // Days since WFO started
    const start     = new Date(startDate);
    const now       = new Date(today);
    const wfoDays   = Math.floor((now - start) / 86400000) + 1;

    // Non-negotiables completion rate
    const nnRaw     = await getSetting('wfo_non_negotiables');
    const nnIds     = nnRaw ? nnRaw.split(',').filter(Boolean).map(Number) : [];

    let nnRate = 0;
    if (nnIds.length > 0) {
      const nnDone = await db.getFirstAsync(
        `SELECT COUNT(*) as count FROM checkins
         WHERE habit_id IN (${nnIds.join(',')})
         AND date >= ? AND status IN ('done','resisted')`,
        [startDate]
      );
      const nnTotal = nnIds.length * wfoDays;
      nnRate = nnTotal > 0 ? Math.round(((nnDone?.count || 0) / nnTotal) * 100) : 0;
    }

    return { wfoDays, startDate, nnIds, nnRate };
  } catch { return null; }
};

// Toggle a habit's WFO skip status
export const toggleHabitWFOSkip = async (habitId) => {
  try {
    const db = await getDatabase();
    const habit = await db.getFirstAsync('SELECT is_wfo_skip FROM habits WHERE id = ?', [habitId]);
    const newVal = habit?.is_wfo_skip ? 0 : 1;
    await db.runAsync('UPDATE habits SET is_wfo_skip = ? WHERE id = ?', [newVal, habitId]);
    return newVal === 1;
  } catch (err) {
    throw new Error(`Toggle WFO skip failed: ${err.message}`);
  }
};

// Auto-skip WFO habits for today if WFO mode is on
export const applyWFOSkipsForToday = async () => {
  try {
    const wfo = await isWFOMode();
    if (!wfo) return;

    const db     = await getDatabase();
    const habits = await getAllHabits();
    const today  = new Date().toISOString().split('T')[0];

    for (const h of habits) {
      if (h.is_wfo_skip) {
        await db.runAsync(
          `INSERT INTO checkins (habit_id, date, status, note)
           VALUES (?, ?, 'skipped', 'WFO — auto skipped')
           ON CONFLICT(habit_id, date) DO NOTHING`,
          [h.id, today]
        );
      }
    }
  } catch (err) {
    console.warn('applyWFOSkipsForToday:', err.message);
  }
};

// ── STREAK RECOVERY ───────────────────────────────────────────────────

// Call this when a streak breaks — offers recovery if streak was 30+
export const offerStreakRecovery = async (habitId, lostStreak) => {
  if (lostStreak < 21) return null; // Only offer for meaningful streaks

  try {
    const db = await getDatabase();

    // Check no active recovery for this habit
    const existing = await db.getFirstAsync(
      "SELECT * FROM streak_recovery WHERE habit_id = ? AND status = 'active'",
      [habitId]
    );
    if (existing) return existing;

    // Create recovery challenge
    const targetDays = lostStreak >= 90 ? 3 : lostStreak >= 30 ? 2 : 2;

    const result = await db.runAsync(
      `INSERT INTO streak_recovery (habit_id, lost_streak, target_days, done_days, status)
       VALUES (?, ?, ?, 0, 'active')`,
      [habitId, lostStreak, targetDays]
    );

    return {
      id:         result.lastInsertRowId,
      habitId,
      lostStreak,
      targetDays,
      doneDays:   0,
      status:     'active',
    };
  } catch (err) {
    console.warn('offerStreakRecovery:', err.message);
    return null;
  }
};

// Mark one day done in recovery challenge
export const progressRecovery = async (habitId) => {
  try {
    const db = await getDatabase();
    const recovery = await db.getFirstAsync(
      "SELECT * FROM streak_recovery WHERE habit_id = ? AND status = 'active'",
      [habitId]
    );
    if (!recovery) return null;

    const newDays = recovery.done_days + 1;

    if (newDays >= recovery.target_days) {
      // Recovery complete — restore streak
      await db.runAsync(
        `UPDATE streak_recovery
         SET done_days = ?, status = 'completed', completed_at = datetime('now','localtime')
         WHERE id = ?`,
        [newDays, recovery.id]
      );
      return { completed: true, lostStreak: recovery.lost_streak };
    } else {
      await db.runAsync(
        'UPDATE streak_recovery SET done_days = ? WHERE id = ?',
        [newDays, recovery.id]
      );
      return { completed: false, doneDays: newDays, targetDays: recovery.target_days };
    }
  } catch (err) {
    console.warn('progressRecovery:', err.message);
    return null;
  }
};

export const getActiveRecovery = async (habitId) => {
  try {
    const db = await getDatabase();
    return await db.getFirstAsync(
      "SELECT * FROM streak_recovery WHERE habit_id = ? AND status = 'active'",
      [habitId]
    ) || null;
  } catch { return null; }
};

// ── NEURAL REWIRING PROGRESS ──────────────────────────────────────────
// Science: 66 days to form a habit (Phillippa Lally, UCL 2010)
// 21 days = early pathway forming
// 45 days = pathway strengthening
// 66 days = automatic behavior

export const getNeuralProgress = async (habitId) => {
  try {
    const db = await getDatabase();

    // Get total completed days
    const result = await db.getFirstAsync(
      `SELECT COUNT(*) as count FROM checkins
       WHERE habit_id = ? AND status IN ('done','resisted')`,
      [habitId]
    );
    const completedDays = result?.count || 0;
    const TARGET_DAYS   = 66;

    const pct   = Math.min(Math.round((completedDays / TARGET_DAYS) * 100), 100);
    const phase  =
      completedDays === 0   ? 'not_started' :
      completedDays < 21    ? 'forming' :
      completedDays < 45    ? 'strengthening' :
      completedDays < 66    ? 'deepening' : 'automatic';

    const phaseInfo = {
      not_started:   { label: 'Not Started',      color: '#8E8E93',  desc: 'The neural road does not exist yet.' },
      forming:       { label: 'Pathway Forming',   color: '#FF9F0A',  desc: 'New neural connections being made. Willpower still required.' },
      strengthening: { label: 'Strengthening',     color: '#F5A623',  desc: 'The pathway widens. Habit begins to feel natural.' },
      deepening:     { label: 'Deepening',         color: '#30D158',  desc: 'Myelin sheath forming. Nearly automatic.' },
      automatic:     { label: 'Automatic',         color: '#30D158',  desc: 'The new road is built. The old one is fading.' },
    };

    return {
      completedDays,
      targetDays:  TARGET_DAYS,
      percentage:  pct,
      phase,
      phaseInfo:   phaseInfo[phase],
      daysLeft:    Math.max(0, TARGET_DAYS - completedDays),
    };
  } catch { return null; }
};

// ── BEFORE vs NOW (90 days) ───────────────────────────────────────────

export const getBeforeNowData = async (alterEgo = 'Neel') => {
  try {
    const db    = await getDatabase();
    const today = new Date();

    // First 30 days vs last 30 days
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(today.getDate() - 90);
    const sixtyDaysAgo = new Date(today);
    sixtyDaysAgo.setDate(today.getDate() - 60);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const fmt = (d) => d.toISOString().split('T')[0];

    // Early completion rate (days 1-30)
    const earlyResult = await db.getFirstAsync(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status IN ('done','resisted') THEN 1 ELSE 0 END) as done
       FROM checkins WHERE date >= ? AND date < ?`,
      [fmt(ninetyDaysAgo), fmt(sixtyDaysAgo)]
    );
    const earlyRate = earlyResult?.total > 0
      ? Math.round((earlyResult.done / earlyResult.total) * 100)
      : 0;

    // Recent completion rate (last 30 days)
    const recentResult = await db.getFirstAsync(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status IN ('done','resisted') THEN 1 ELSE 0 END) as done
       FROM checkins WHERE date >= ?`,
      [fmt(thirtyDaysAgo)]
    );
    const recentRate = recentResult?.total > 0
      ? Math.round((recentResult.done / recentResult.total) * 100)
      : 0;

    // Total completions
    const totalResult = await db.getFirstAsync(
      "SELECT COUNT(*) as count FROM checkins WHERE status IN ('done','resisted')"
    );

    // Longest current streak
    const habits     = await db.getAllAsync("SELECT id FROM habits WHERE is_active = 1") || [];
    const { getStreak } = require('../database/habitService');
    const allStreaks  = await Promise.all(habits.map(h => getStreak(h.id)));
    const bestCurrent = allStreaks.reduce((max, s) => s.current > max ? s.current : max, 0);
    const bestEver    = allStreaks.reduce((max, s) => s.longest > max ? s.longest : max, 0);

    // Break habit improvement
    const slips90 = await db.getFirstAsync(
      "SELECT COUNT(*) as count FROM checkins WHERE status = 'slip' AND date >= ?",
      [fmt(ninetyDaysAgo)]
    );
    const slips30 = await db.getFirstAsync(
      "SELECT COUNT(*) as count FROM checkins WHERE status = 'slip' AND date >= ?",
      [fmt(thirtyDaysAgo)]
    );

    // XP total
    const xpTotal = await getSetting('total_xp');

    const improvement = recentRate - earlyRate;

    return {
      earlyRate,
      recentRate,
      improvement,
      totalDone:    totalResult?.count || 0,
      bestCurrent,
      bestEver,
      totalSlips90: slips90?.count || 0,
      recentSlips:  slips30?.count || 0,
      totalXP:      parseInt(xpTotal) || 0,
      alterEgo,
    };
  } catch (err) {
    console.warn('getBeforeNowData:', err.message);
    return null;
  }
};

const getSetting = async (key) => {
  try {
    const db = await getDatabase();
    const r  = await db.getFirstAsync('SELECT value FROM settings WHERE key = ?', [key]);
    return r?.value || null;
  } catch { return null; }
};