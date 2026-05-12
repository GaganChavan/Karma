// ─── KARMA APP — GAMIFICATION SERVICE (PHASE E) ─────────────────────
// Phase E changes:
// - awardXP: removed Math.max(0) — XP can go negative
// - getKarmaScore: excludes paused habits (AND is_paused = 0)
// - checkPerfectDay: excludes paused habits
// - NEW: deductAutoSkipXP — -3 XP for auto_skipped checkins

import { getDatabase } from '../database/database';
import { getSetting, setSetting } from '../database/habitService';

// ── LEVEL SYSTEM ──────────────────────────────────────────────────────

export const LEVELS = [
  { level: 1, title: 'Beginner',     minXP: 0,    icon: '🌱', color: '#667799' },
  { level: 2, title: 'Consistent',   minXP: 100,  icon: '🔥', color: '#00D4AA' },
  { level: 3, title: 'Disciplined',  minXP: 300,  icon: '⭐', color: '#1E7FFF' },
  { level: 4, title: 'Unstoppable',  minXP: 700,  icon: '⚡', color: '#FFB347' },
  { level: 5, title: 'Legend',       minXP: 1500, icon: '🔱', color: '#FFD700' },
];

export const getLevelFromXP = (xp) => {
  const totalXP = xp || 0; // Allow negative — no clamp
  let currentLevel = LEVELS[0];
  for (const lvl of LEVELS) {
    if (totalXP >= lvl.minXP) currentLevel = lvl;
  }
  const nextLevel = LEVELS.find(l => l.minXP > Math.max(0, totalXP)) || null;
  const progress = nextLevel
    ? (Math.max(0, totalXP) - currentLevel.minXP) / (nextLevel.minXP - currentLevel.minXP)
    : 1;
  return { ...currentLevel, nextLevel, progress: Math.min(1, Math.max(0, progress)), totalXP };
};

// ── XP VALUES ────────────────────────────────────────────────────────

export const XP_VALUES = {
  habit_done:       10,
  habit_resisted:   8,
  habit_undo_done:  -10,
  habit_undo_resist:-8,
  perfect_day:      20,
  auto_skipped:     -3,   // Phase E: forgot to log
  milestone_3:      15,
  milestone_7:      25,
  milestone_14:     35,
  milestone_21:     50,
  milestone_30:     75,
  milestone_48:     50,
  milestone_60:     100,
  milestone_75:     75,
  milestone_90:     150,
  milestone_180:    200,
  milestone_365:    500,
};

// ── AWARD / DEDUCT XP ────────────────────────────────────────────────

// Phase E: Removed Math.max(0, ...) — XP can go negative
export const awardXP = async (amount, reason) => {
  if (!amount || amount === 0) return 0;
  try {
    const db = await getDatabase();
    const current = await getSetting('total_xp');
    const currentXP = parseInt(current || '0');
    const newXP = currentXP + amount; // No floor — negative is allowed
    await setSetting('total_xp', String(newXP));
    await db.runAsync(
      'INSERT INTO xp_log (xp, reason, date) VALUES (?, ?, datetime("now","localtime"))',
      [amount, reason || 'XP awarded']
    );
    console.log(`⚡ XP: ${amount > 0 ? '+' : ''}${amount} (${reason}) → total: ${newXP}`);
    return newXP;
  } catch (error) {
    console.warn('awardXP error:', error.message);
    return 0;
  }
};

// Phase E: Deduct 3 XP for auto_skipped checkins (forgot to log)
export const deductAutoSkipXP = async (habitId, date) => {
  try {
    const db = await getDatabase();
    const habitData = await db.getFirstAsync('SELECT name FROM habits WHERE id = ?', [habitId]);
    const habitName = habitData?.name || `Habit #${habitId}`;

    await db.runAsync(
      `INSERT INTO xp_log (habit_id, xp, reason, date) VALUES (?, ?, ?, ?)`,
      [habitId, XP_VALUES.auto_skipped, `Auto-skipped: ${habitName}`, date]
    );

    const current = await getSetting('total_xp');
    const currentXP = parseInt(current || '0');
    const newXP = currentXP + XP_VALUES.auto_skipped; // -3, no floor
    await setSetting('total_xp', String(newXP));

    console.log(`⚠️ Auto-skip XP: ${XP_VALUES.auto_skipped} for "${habitName}" on ${date} → total: ${newXP}`);
  } catch (e) {
    console.warn('deductAutoSkipXP error:', e.message);
    // Never crash app for XP deduction
  }
};

// ── CHECKIN XP — called from checkIn function ─────────────────────────

export const calculateCheckinXP = (previousStatus, newStatus) => {
  const wasDone = previousStatus === 'done';
  const wasResisted = previousStatus === 'resisted';
  const nowDone = newStatus === 'done';
  const nowResisted = newStatus === 'resisted';

  if (nowDone && !wasDone && !wasResisted)       return XP_VALUES.habit_done;
  if (nowResisted && !wasDone && !wasResisted)    return XP_VALUES.habit_resisted;
  if (!nowDone && !nowResisted && wasDone)        return XP_VALUES.habit_undo_done;
  if (!nowDone && !nowResisted && wasResisted)    return XP_VALUES.habit_undo_resist;
  return 0;
};

// ── PERFECT DAY CHECK ─────────────────────────────────────────────────
// Phase E: Excludes paused habits from the count

export const checkPerfectDay = async () => {
  try {
    const db = await getDatabase();
    const today = new Date().toISOString().split('T')[0];

    // Phase E: only count active non-paused habits
    const totalHabits = await db.getFirstAsync(
      "SELECT COUNT(*) as count FROM habits WHERE is_active = 1 AND is_paused = 0"
    );
    if (!totalHabits?.count || totalHabits.count === 0) return false;

    const doneToday = await db.getFirstAsync(
      `SELECT COUNT(*) as count FROM checkins
       WHERE date = ? AND status IN ('done','resisted')`,
      [today]
    );
    return (doneToday?.count || 0) >= totalHabits.count;
  } catch (error) {
    console.warn('checkPerfectDay error:', error.message);
    return false;
  }
};

export const awardPerfectDayIfEligible = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const lastPerfect = await getSetting('last_perfect_day');
    if (lastPerfect === today) return false;
    const isPerfect = await checkPerfectDay();
    if (!isPerfect) return false;
    await awardXP(XP_VALUES.perfect_day, 'Perfect day — all habits complete!');
    await setSetting('last_perfect_day', today);
    console.log('🌟 Perfect day bonus awarded!');
    return true;
  } catch (error) {
    console.warn('awardPerfectDayIfEligible error:', error.message);
    return false;
  }
};

// ── MILESTONES ────────────────────────────────────────────────────────

export const MILESTONE_DAYS = [3, 7, 14, 21, 30, 48, 60, 75, 90, 180, 365];

export const MILESTONE_INFO = {
  3:   { badge: '🌱', title: 'Seed Planted',     desc: 'The journey of 1000 days begins.' },
  7:   { badge: '🔥', title: 'One Week',          desc: 'Seven sunrises. Seven choices. Unbroken.' },
  14:  { badge: '⭐', title: "Dhruv's Path",      desc: 'The Pole Star watched every day.' },
  21:  { badge: '🧠', title: 'Neural Rewired',    desc: 'Science says your brain is changing.' },
  30:  { badge: '🏆', title: 'Month of Karma',    desc: 'One month. The sky has witnessed it all.' },
  48:  { badge: '⚡', title: 'Beyond Comfort',    desc: 'Top 5%. Most quit before this.' },
  60:  { badge: '🌊', title: 'Pisces Depth',      desc: 'Quiet. Persistent. Unstoppable.' },
  75:  { badge: '⚔️', title: "Warrior's Rest",    desc: "The hardest phase. You're still here." },
  90:  { badge: '🔱', title: 'Identity Shift',    desc: 'This is no longer a habit. This is you.' },
  180: { badge: '🌌', title: 'Half a Year',       desc: 'Six months of pure karma.' },
  365: { badge: '👑', title: 'Akash — The Limitless', desc: 'The sky was always yours, Neel.' },
};

export const checkMilestone = async (habitId, currentStreak) => {
  if (!MILESTONE_DAYS.includes(currentStreak)) return null;
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

    const xpKey = `milestone_${currentStreak}`;
    const xp = XP_VALUES[xpKey] || 25;
    await awardXP(xp, `${currentStreak}-day milestone on habit #${habitId}`);

    console.log(`🏆 Milestone: ${currentStreak} days for habit ${habitId} → +${xp} XP`);
    return {
      days: currentStreak,
      xp,
      ...MILESTONE_INFO[currentStreak],
    };
  } catch (error) {
    console.warn('checkMilestone error:', error.message);
    return null;
  }
};

export const getHabitMilestones = async (habitId) => {
  try {
    const db = await getDatabase();
    return await db.getAllAsync(
      'SELECT * FROM milestones WHERE habit_id = ? ORDER BY milestone_days ASC',
      [habitId]
    ) || [];
  } catch (error) {
    return [];
  }
};

// ── KARMA SCORE (0 – 1000) ────────────────────────────────────────────
// Phase E: Excludes paused habits from denominator

export const getKarmaScore = async () => {
  try {
    const db = await getDatabase();
    const today = new Date();
    const dates = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    // Phase E: AND is_paused = 0
    const habits = await db.getAllAsync(
      "SELECT id FROM habits WHERE is_active = 1 AND is_paused = 0"
    );
    if (!habits || habits.length === 0) return 0;

    const possible = habits.length * 30;
    if (possible === 0) return 0;

    const done = await db.getFirstAsync(
      `SELECT COUNT(*) as count FROM checkins
       WHERE date >= ? AND status IN ('done','resisted')`,
      [dates[0]]
    );

    const raw = ((done?.count || 0) / possible) * 1000;
    return Math.min(1000, Math.round(raw));
  } catch (error) {
    console.warn('getKarmaScore error:', error.message);
    return 0;
  }
};

// ── STREAK FREEZE ────────────────────────────────────────────────────

export const getStreakFreezeCount = async () => {
  try {
    const val = await getSetting('streak_freeze_count');
    return parseInt(val || '0');
  } catch {
    return 0;
  }
};

export const useStreakFreeze = async (habitId) => {
  try {
    const freezes = await getStreakFreezeCount();
    if (freezes <= 0) {
      return { success: false, message: 'No streak freezes available.' };
    }
    const db = await getDatabase();
    const today = new Date().toISOString().split('T')[0];
    await db.runAsync(
      `INSERT INTO checkins (habit_id, date, status, note, slip_count)
       VALUES (?, ?, 'done', 'Streak freeze used', 0)
       ON CONFLICT(habit_id, date) DO UPDATE SET
         status = 'done', note = 'Streak freeze used'`,
      [habitId, today]
    );
    await setSetting('streak_freeze_count', String(freezes - 1));
    console.log(`🧊 Streak freeze used for habit ${habitId}. Remaining: ${freezes - 1}`);
    return {
      success: true,
      remaining: freezes - 1,
      message: `Streak freeze used! ${freezes - 1} remaining.`,
    };
  } catch (error) {
    console.warn('useStreakFreeze error:', error.message);
    return { success: false, message: `Freeze failed: ${error.message}` };
  }
};

export const checkAndAwardStreakFreeze = async () => {
  try {
    const today = new Date();
    const lastAward = await getSetting('last_freeze_award');
    const todayStr = today.toISOString().split('T')[0];
    if (today.getDay() !== 0) return false;
    if (lastAward === todayStr) return false;

    const db = await getDatabase();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fromDate = sevenDaysAgo.toISOString().split('T')[0];

    // Phase E: exclude paused habits
    const habits = await db.getAllAsync(
      "SELECT id FROM habits WHERE is_active = 1 AND is_paused = 0"
    );
    if (!habits || habits.length === 0) return false;

    const possible = habits.length * 7;
    const done = await db.getFirstAsync(
      `SELECT COUNT(*) as count FROM checkins
       WHERE date >= ? AND status IN ('done','resisted')`,
      [fromDate]
    );

    const rate = (done?.count || 0) / possible;
    if (rate >= 0.8) {
      const current = await getStreakFreezeCount();
      const newCount = Math.min(current + 1, 3);
      await setSetting('streak_freeze_count', String(newCount));
      await setSetting('last_freeze_award', todayStr);
      console.log(`🧊 Streak freeze awarded! Total: ${newCount}`);
      return true;
    }
    return false;
  } catch (error) {
    console.warn('checkAndAwardStreakFreeze error:', error.message);
    return false;
  }
};

// ── FULL STATS ────────────────────────────────────────────────────────

export const getFullStats = async () => {
  try {
    const [xpStr, karmaScore, freezeCount] = await Promise.all([
      getSetting('total_xp'),
      getKarmaScore(),
      getStreakFreezeCount(),
    ]);
    const totalXP = parseInt(xpStr || '0');
    const levelInfo = getLevelFromXP(totalXP);
    return { totalXP, levelInfo, karmaScore, freezeCount };
  } catch (error) {
    console.warn('getFullStats error:', error.message);
    return {
      totalXP: 0,
      levelInfo: getLevelFromXP(0),
      karmaScore: 0,
      freezeCount: 0,
    };
  }
};