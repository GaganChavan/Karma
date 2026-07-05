// ─── KARMA APP — GAMIFICATION SERVICE (PHASE F-1 + TIMEZONE FIX) ────
// TIMEZONE FIX: all toISOString().split('T')[0] replaced with _localDate()
// Affected functions: checkPerfectDay, awardPerfectDayIfEligible,
//   getKarmaScore, useStreakFreeze, checkAndAwardStreakFreeze,
//   checkAndAwardJourneyBadges
// WFO FIX: getKarmaScore now excludes is_wfo_skip habits when WFO mode is on
// PERF FIX: getKarmaScore replaced N+1 per-habit queries with a single GROUP BY query

import { getDatabase }          from '../database/database';
import { getSetting, setSetting } from '../database/habitService';
import { APP_BIRTH, GOAL_NAME }  from '../constants/appConfig';

// ── Timezone-safe local date helper ──────────────────────────────────
// toISOString() returns UTC — gives YESTERDAY in IST before 5:30 AM
const _localDate = (d) => {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};
const _today = () => _localDate(new Date());

// Days elapsed since APP_BIRTH (0 on birth day, 1 the day after, etc.)
// Used to time-gate karma titles and karma journey badges.
const _daysSinceBirth = () => {
  const birth = new Date(APP_BIRTH + 'T00:00:00');
  return Math.max(0, Math.floor((new Date() - birth) / 86400000));
};

// ── XP VALUES ─────────────────────────────────────────────────────────
export const XP_VALUES = {
  habit_done:        1,
  habit_resisted:    2,
  habit_undo_done:  -1,
  habit_undo_resist:-2,
  skipped:           0,
  auto_skipped:     -2,
  missed:           -1,
  slip:             -5,
  wfo_skipped:       0,
  perfect_day:       5,
  milestone_3:       3,
  milestone_7:       5,
  milestone_14:      8,
  milestone_21:     10,
  milestone_30:     15,
  milestone_48:     10,
  milestone_60:     20,
  milestone_75:     15,
  milestone_90:     30,
  milestone_180:    50,
  milestone_365:   100,
};

// ── KARMA TITLES (based on Karma Score 0–1000 AND days since APP_BIRTH) ──
// Both minScore AND minDays must be met to unlock a title.
// This prevents day-1 shortcuts — Jitendriya requires 90 days of proven discipline.
export const KARMA_TITLES = [
  { minScore:    0, minDays:  0, title: 'Seeker',       icon: '🌱', color: '#8E8E93' },
  { minScore:  300, minDays:  7, title: 'Awakening',    icon: '🔥', color: '#FF9F0A' },
  { minScore:  500, minDays: 14, title: 'Consistent',   icon: '⭐', color: '#30D158' },
  { minScore:  650, minDays: 21, title: 'Disciplined',  icon: '⚔️', color: '#0A84FF' },
  { minScore:  800, minDays: 30, title: 'Unstoppable',  icon: '⚡', color: '#BF5AF2' },
  { minScore:  930, minDays: 60, title: 'Transcendent', icon: '🔱', color: '#FFD700' },
  { minScore: 1000, minDays: 90, title: GOAL_NAME,       icon: '👑', color: '#FFD700' },
];

// daysSinceBirth: pass explicitly for efficiency when already computed, or omit to auto-calculate.
export const getKarmaTitle = (karmaScore, goalName = null, daysSinceBirth = null) => {
  const score  = Math.max(0, karmaScore || 0);
  const days   = daysSinceBirth !== null ? daysSinceBirth : _daysSinceBirth();
  const titles = goalName
    ? KARMA_TITLES.map(t => t.minScore === 1000 ? { ...t, title: goalName } : t)
    : KARMA_TITLES;

  // Current: highest title where BOTH score AND day requirements are met
  let currentIdx = 0;
  for (let i = 0; i < titles.length; i++) {
    if (score >= titles[i].minScore && days >= titles[i].minDays) currentIdx = i;
  }
  const current = titles[currentIdx];

  // Next: the step immediately above current (may be gated by score, days, or both)
  const next = currentIdx < titles.length - 1 ? titles[currentIdx + 1] : null;

  // Progress: bottleneck of score progress and days progress toward next title
  let progress = 1;
  if (next) {
    const scoreRange = next.minScore - current.minScore;
    const daysRange  = next.minDays  - current.minDays;
    const scoreP = scoreRange > 0 ? Math.min(1, (score - current.minScore) / scoreRange) : 1;
    const daysP  = daysRange  > 0 ? Math.min(1, (days  - current.minDays)  / daysRange)  : 1;
    progress = Math.min(scoreP, daysP);
  }

  // daysToNextTitle: how many more days until the time-gate lifts (0 = already past)
  const daysToNextTitle = next ? Math.max(0, next.minDays - days) : 0;

  return {
    ...current,
    nextTitle: next,
    progress: Math.min(1, Math.max(0, progress)),
    score,
    daysToNextTitle,
  };
};

// ── LEGACY LEVELS (secondary, XP-based) ───────────────────────────────
export const LEVELS = [
  { level: 1, title: 'Seedling',     minXP:    0, icon: '🌱', color: '#8E8E93' },
  { level: 2, title: 'Kindled',      minXP:   50, icon: '🕯️', color: '#FF9F0A' },
  { level: 3, title: 'Practitioner', minXP:  200, icon: '📿', color: '#30D158' },
  { level: 4, title: 'Sadhaka',      minXP:  500, icon: '🧘', color: '#0A84FF' },
  { level: 5, title: 'Warrior',      minXP: 1000, icon: '⚔️', color: '#BF5AF2' },
  { level: 6, title: 'Yogi',         minXP: 2500, icon: '🔱', color: '#FFD700' },
  { level: 7, title: 'Akash',        minXP: 5000, icon: '👑', color: '#FFD700' },
];

export const getLevelFromXP = (xp) => {
  const totalXP = xp || 0;
  let currentLevel = LEVELS[0];
  for (const lvl of LEVELS) {
    if (totalXP >= lvl.minXP) currentLevel = lvl;
  }
  const nextLevel = LEVELS.find(l => l.minXP > Math.max(0, totalXP)) || null;
  const progress  = nextLevel
    ? (Math.max(0, totalXP) - currentLevel.minXP) / (nextLevel.minXP - currentLevel.minXP)
    : 1;
  return { ...currentLevel, nextLevel, progress: Math.min(1, Math.max(0, progress)), totalXP };
};

// ── CHECKIN XP CALCULATOR (single source of truth) ────────────────────
export const calculateCheckinXP = (previousStatus, newStatus) => {
  if (previousStatus === newStatus) return 0;
  const getBaseXP = (status) => {
    switch (status) {
      case 'done':         return XP_VALUES.habit_done;
      case 'resisted':     return XP_VALUES.habit_resisted;
      case 'missed':       return XP_VALUES.missed;
      case 'slip':         return XP_VALUES.slip;
      case 'skipped':      return XP_VALUES.skipped;
      case 'auto_skipped': return XP_VALUES.auto_skipped;
      default:             return 0;
    }
  };
  return getBaseXP(newStatus) - (previousStatus ? getBaseXP(previousStatus) : 0);
};

// ── AWARD XP — no floor, XP can go negative ───────────────────────────
export const awardXP = async (amount, reason, habitId = null) => {
  if (!amount || amount === 0) return 0;
  try {
    const db       = await getDatabase();
    const current  = await getSetting('total_xp');
    const newXP    = parseInt(current || '0') + amount;
    await setSetting('total_xp', String(newXP));
    await db.runAsync(
      'INSERT INTO xp_log (habit_id, xp, reason, date) VALUES (?, ?, ?, datetime("now","localtime"))',
      [habitId, amount, reason || 'XP']
    );
    return newXP;
  } catch (e) {
    console.warn('awardXP:', e.message);
    return 0;
  }
};

// Deduct XP for auto-skipped habits (called from App.js runAutoSkip)
export const deductAutoSkipXP = async (habitId, date) => {
  try {
    const db       = await getDatabase();
    const habitRow = await db.getFirstAsync('SELECT name FROM habits WHERE id = ?', [habitId]);
    const name     = habitRow?.name || `Habit #${habitId}`;
    await db.runAsync(
      'INSERT INTO xp_log (habit_id, xp, reason, date) VALUES (?, ?, ?, ?)',
      [habitId, XP_VALUES.auto_skipped, `Auto-skipped: ${name}`, date]
    );
    const current = await getSetting('total_xp');
    const newXP   = parseInt(current || '0') + XP_VALUES.auto_skipped;
    await setSetting('total_xp', String(newXP));
  } catch (e) {
    console.warn('deductAutoSkipXP:', e.message);
  }
};

// ── PERFECT DAY CHECK ─────────────────────────────────────────────────
// FIX: was new Date().toISOString().split('T')[0] → wrong date in IST
export const checkPerfectDay = async () => {
  try {
    const db      = await getDatabase();
    const today   = _today();  // TIMEZONE FIX
    const wfoMode = (await getSetting('wfo_mode')) === 'true';
    const requiredHabits = await db.getAllAsync(
      `SELECT id FROM habits WHERE is_active = 1 AND is_paused = 0 ${wfoMode ? 'AND is_wfo_skip = 0' : ''}`
    ) || [];
    if (requiredHabits.length === 0) return false;
    for (const h of requiredHabits) {
      const c = await db.getFirstAsync(
        'SELECT status FROM checkins WHERE habit_id = ? AND date = ?', [h.id, today]
      );
      if (c?.status !== 'done' && c?.status !== 'resisted') return false;
    }
    return true;
  } catch (e) {
    console.warn('checkPerfectDay:', e.message);
    return false;
  }
};

// FIX: was new Date().toISOString().split('T')[0]
export const awardPerfectDayIfEligible = async () => {
  try {
    const today = _today();  // TIMEZONE FIX
    const last  = await getSetting('last_perfect_day');
    if (last === today) return false;
    const isPerfect = await checkPerfectDay();
    if (!isPerfect) return false;
    await awardXP(XP_VALUES.perfect_day, 'Perfect day — all habits complete!');
    await setSetting('last_perfect_day', today);
    await checkAndAwardJourneyBadges();
    return true;
  } catch (e) {
    console.warn('awardPerfectDayIfEligible:', e.message);
    return false;
  }
};

// ── PER-HABIT MILESTONES ──────────────────────────────────────────────
export const MILESTONE_DAYS = [3, 7, 14, 21, 30, 48, 60, 75, 90, 180, 365];

export const MILESTONE_INFO = {
  3:   { badge: '🌱', title: 'Seed Planted',          desc: 'The journey of 1000 days begins.' },
  7:   { badge: '🔥', title: 'One Week',               desc: 'Seven sunrises. Seven choices. Unbroken.' },
  14:  { badge: '⭐', title: "Dhruv's Path",           desc: 'The Pole Star watched every day.' },
  21:  { badge: '🧠', title: 'Neural Rewired',         desc: 'Science says your brain is changing.' },
  30:  { badge: '🏆', title: 'Month of Karma',         desc: 'One month. The sky has witnessed it all.' },
  48:  { badge: '⚡', title: 'Beyond Comfort',         desc: 'Top 5%. Most quit before this.' },
  60:  { badge: '🌊', title: 'Pisces Depth',           desc: 'Quiet. Persistent. Unstoppable.' },
  75:  { badge: '⚔️', title: "Warrior's Rest",         desc: "The hardest phase. You're still here." },
  90:  { badge: '🔱', title: 'Identity Shift',         desc: 'This is no longer a habit. This is you.' },
  180: { badge: '🌌', title: 'Half a Year',            desc: 'Six months of pure karma.' },
  365: { badge: '👑', title: 'Akash — The Limitless', desc: 'The sky was always yours, Gagan.' },
};

export const checkMilestone = async (habitId, currentStreak) => {
  if (!MILESTONE_DAYS.includes(currentStreak)) return null;
  try {
    const db       = await getDatabase();
    const existing = await db.getFirstAsync(
      'SELECT id FROM milestones WHERE habit_id = ? AND milestone_days = ?', [habitId, currentStreak]
    );
    if (existing) return null;
    await db.runAsync('INSERT INTO milestones (habit_id, milestone_days) VALUES (?, ?)', [habitId, currentStreak]);
    const xp = XP_VALUES[`milestone_${currentStreak}`] || 3;
    await awardXP(xp, `${currentStreak}-day milestone`, habitId);
    await checkAndAwardJourneyBadges();
    return { days: currentStreak, xp, ...MILESTONE_INFO[currentStreak] };
  } catch (e) {
    console.warn('checkMilestone:', e.message);
    return null;
  }
};

export const getHabitMilestones = async (habitId) => {
  try {
    const db = await getDatabase();
    return await db.getAllAsync(
      'SELECT * FROM milestones WHERE habit_id = ? ORDER BY milestone_days ASC', [habitId]
    ) || [];
  } catch { return []; }
};

// ── KARMA SCORE (0–1000) ──────────────────────────────────────────────
// FIX: was today.toISOString().split('T')[0] and winStart.toISOString()...
// FIX: WFO mode now excluded (mirrors checkPerfectDay); N+1 queries → 2 queries
export const getKarmaScore = async () => {
  try {
    const db       = await getDatabase();
    const today    = new Date();
    const todayStr = _today();  // TIMEZONE FIX

    const winStart = new Date(today);
    winStart.setDate(today.getDate() - 29);
    const winStartStr          = _localDate(winStart);  // TIMEZONE FIX
    const effectiveWindowStart = winStartStr > APP_BIRTH ? winStartStr : APP_BIRTH;

    // WFO fix: exclude WFO-skippable habits when WFO mode is on (mirrors checkPerfectDay)
    const wfoMode = (await getSetting('wfo_mode')) === 'true';
    const habits  = await db.getAllAsync(
      `SELECT id, created_at, frequency, days FROM habits WHERE is_active = 1 AND is_paused = 0${wfoMode ? ' AND is_wfo_skip = 0' : ''}`
    ) || [];
    if (habits.length === 0) return 0;

    // Single batch query instead of one query per habit
    const habitIds     = habits.map(h => h.id);
    const placeholders = habitIds.map(() => '?').join(',');
    const rows = await db.getAllAsync(`
      SELECT
        habit_id,
        SUM(CASE WHEN status IN ('done','resisted') THEN 1 ELSE 0 END) as done_count,
        SUM(CASE WHEN status = 'skipped'            THEN 1 ELSE 0 END) as skipped_count
      FROM checkins
      WHERE habit_id IN (${placeholders}) AND date >= ? AND date <= ?
      GROUP BY habit_id
    `, [...habitIds, effectiveWindowStart, todayStr]) || [];

    const summaryMap = {};
    for (const row of rows) summaryMap[row.habit_id] = row;

    let totalPossible = 0;
    let totalDone     = 0;

    for (const habit of habits) {
      const habitBirth = (habit.created_at || APP_BIRTH).substring(0, 10);
      const start      = habitBirth > effectiveWindowStart ? habitBirth : effectiveWindowStart;
      const startD     = new Date(start    + 'T00:00:00');
      const endD       = new Date(todayStr + 'T00:00:00');

      // Count only days the habit was actually scheduled — rest days don't count against you
      let scheduledDays = 0;
      if (!habit.frequency || habit.frequency === 'daily') {
        scheduledDays = Math.floor((endD - startD) / 86400000) + 1;
      } else {
        const scheduledWeekdays = (habit.days || '1,2,3,4,5,6,7')
          .split(',').map(s => parseInt(s.trim(), 10));
        const d = new Date(startD);
        while (d <= endD) {
          const jsDay  = d.getDay();
          const appDay = jsDay === 0 ? 7 : jsDay;
          if (scheduledWeekdays.includes(appDay)) scheduledDays++;
          d.setDate(d.getDate() + 1);
        }
      }
      if (scheduledDays <= 0) continue;

      const summary  = summaryMap[habit.id];
      const skipped  = summary?.skipped_count || 0;
      const done     = summary?.done_count    || 0;
      const possible = Math.max(0, scheduledDays - skipped);
      totalPossible += possible;
      totalDone     += done;
    }

    if (totalPossible <= 0) return 0;
    return Math.min(1000, Math.round((totalDone / totalPossible) * 1000));
  } catch (e) {
    console.warn('getKarmaScore:', e.message);
    return 0;
  }
};

// Get XP earned from a specific habit
export const getHabitXPTotal = async (habitId) => {
  try {
    const db     = await getDatabase();
    const result = await db.getFirstAsync(
      'SELECT COALESCE(SUM(xp), 0) as total FROM xp_log WHERE habit_id = ?', [habitId]
    );
    return result?.total || 0;
  } catch { return 0; }
};

// ── JOURNEY BADGES ────────────────────────────────────────────────────
export const JOURNEY_BADGES = [
  { id: 'first_dawn',       badge: '🌅', title: 'First Dawn',       desc: 'The battlefield was entered for the first time.',       criteria: 'Complete your first habit check-in' },
  { id: 'first_resistance', badge: '✊', title: 'First Resistance', desc: 'The first time you said no to yourself.',                criteria: 'Resist a break habit for the first time' },
  { id: 'ten_battles',      badge: '🗡️', title: 'Ten Battles',      desc: 'Ten acts of discipline. The path becomes visible.',     criteria: '10 total habit completions' },
  { id: 'century',          badge: '💯', title: 'The Century',       desc: '100 acts of pure discipline. Most never get here.',    criteria: '100 total habit completions' },
  { id: 'all_in_day',       badge: '🎯', title: 'All-In Day',        desc: 'Every battle won in a single day.',                    criteria: 'Complete a perfect day — all habits done' },
  { id: 'karma_200',        badge: '🔆', title: 'First Flame',       desc: 'Karma Score crossed 300. The fire is real.',           criteria: 'Reach Karma Score 300+' },
  { id: 'karma_400',        badge: '🛡️', title: 'The Shield',        desc: 'Karma Score 500+. Discipline is becoming defence.',    criteria: 'Reach Karma Score 500+' },
  { id: 'karma_600',        badge: '🌊', title: 'The Current',       desc: 'Karma Score 650+. You move like water now.',           criteria: 'Reach Karma Score 650+' },
  { id: 'karma_800',        badge: '🏔️', title: 'The Mountain',      desc: 'Karma Score 800+. Immovable. Unshakeable.',            criteria: 'Reach Karma Score 800+' },
  { id: 'the_yogi',         badge: '🧘', title: 'The Yogi',          desc: 'All your habits aligned. Every horse in formation.',   criteria: 'All active habits have a current streak' },
  { id: 'legend',           badge: '🌟', title: 'Legend',            desc: 'You have become what most only dream of being.',       criteria: 'Reach Karma Score 1000' },
];

export const getEarnedJourneyBadges = async () => {
  try {
    const db = await getDatabase();
    return await db.getAllAsync('SELECT * FROM journey_milestones ORDER BY achieved_at ASC') || [];
  } catch { return []; }
};

// FIX: was new Date().toISOString().split('T')[0] in The Yogi check
// DATE FIX: award() now accepts achievedAt so badges reflect the real event date,
//           not the date checkAndAwardJourneyBadges happened to run.
//           correctDate() self-heals already-inserted records with wrong timestamps.
export const checkAndAwardJourneyBadges = async (currentKarmaScore = null, daysSinceBirth = null) => {
  try {
    const db        = await getDatabase();
    const earned    = await db.getAllAsync('SELECT badge_id FROM journey_milestones') || [];
    const earnedIds = new Set(earned.map(e => e.badge_id));
    const newBadges = [];

    const award = async (badge, achievedAt = null) => {
      if (!badge || earnedIds.has(badge.id)) return;
      const dateVal = achievedAt || _today();
      await db.runAsync(
        'INSERT OR IGNORE INTO journey_milestones (badge_id, achieved_at) VALUES (?, ?)',
        [badge.id, dateVal]
      );
      earnedIds.add(badge.id);
      newBadges.push(badge);
    };

    // Correct an already-stored date if we can prove the real event happened earlier
    const correctDate = async (badgeId, achievedAt) => {
      if (!achievedAt) return;
      await db.runAsync(
        'UPDATE journey_milestones SET achieved_at = ? WHERE badge_id = ? AND achieved_at > ?',
        [achievedAt, badgeId, achievedAt]
      );
    };

    if (!earnedIds.has('first_dawn')) {
      const r = await db.getFirstAsync("SELECT MIN(date) as d FROM checkins WHERE status IN ('done','resisted')");
      if (r?.d) await award(JOURNEY_BADGES.find(b => b.id === 'first_dawn'), r.d);
    } else {
      const r = await db.getFirstAsync("SELECT MIN(date) as d FROM checkins WHERE status IN ('done','resisted')");
      await correctDate('first_dawn', r?.d);
    }

    if (!earnedIds.has('first_resistance')) {
      const r = await db.getFirstAsync("SELECT MIN(date) as d FROM checkins WHERE status = 'resisted'");
      if (r?.d) await award(JOURNEY_BADGES.find(b => b.id === 'first_resistance'), r.d);
    } else {
      const r = await db.getFirstAsync("SELECT MIN(date) as d FROM checkins WHERE status = 'resisted'");
      await correctDate('first_resistance', r?.d);
    }

    if (!earnedIds.has('ten_battles')) {
      const r = await db.getFirstAsync(
        "SELECT date FROM checkins WHERE status IN ('done','resisted') ORDER BY date ASC LIMIT 1 OFFSET 9"
      );
      if (r?.date) await award(JOURNEY_BADGES.find(b => b.id === 'ten_battles'), r.date);
    } else {
      const r = await db.getFirstAsync(
        "SELECT date FROM checkins WHERE status IN ('done','resisted') ORDER BY date ASC LIMIT 1 OFFSET 9"
      );
      await correctDate('ten_battles', r?.date);
    }

    if (!earnedIds.has('century')) {
      const r = await db.getFirstAsync(
        "SELECT date FROM checkins WHERE status IN ('done','resisted') ORDER BY date ASC LIMIT 1 OFFSET 99"
      );
      if (r?.date) await award(JOURNEY_BADGES.find(b => b.id === 'century'), r.date);
    } else {
      const r = await db.getFirstAsync(
        "SELECT date FROM checkins WHERE status IN ('done','resisted') ORDER BY date ASC LIMIT 1 OFFSET 99"
      );
      await correctDate('century', r?.date);
    }

    if (!earnedIds.has('all_in_day')) {
      const last = await getSetting('last_perfect_day');
      if (last) await award(JOURNEY_BADGES.find(b => b.id === 'all_in_day'), last);
    } else {
      const last = await getSetting('last_perfect_day');
      await correctDate('all_in_day', last);
    }

    const score = currentKarmaScore !== null ? currentKarmaScore : await getKarmaScore();
    const days  = daysSinceBirth !== null ? daysSinceBirth : _daysSinceBirth();
    // minDays mirrors the KARMA_TITLES time-gates — score alone is not enough
    for (const sc of [
      { id: 'karma_200', threshold: 300,  minDays:  7 },
      { id: 'karma_400', threshold: 500,  minDays: 14 },
      { id: 'karma_600', threshold: 650,  minDays: 21 },
      { id: 'karma_800', threshold: 800,  minDays: 30 },
      { id: 'legend',    threshold: 1000, minDays: 90 },
    ]) {
      if (!earnedIds.has(sc.id) && score >= sc.threshold && days >= sc.minDays) {
        await award(JOURNEY_BADGES.find(b => b.id === sc.id));
      }
    }

    // The Yogi — FIX: was toISOString().split('T')[0]
    if (!earnedIds.has('the_yogi')) {
      const habits = await db.getAllAsync("SELECT id FROM habits WHERE is_active = 1 AND is_paused = 0") || [];
      if (habits.length > 0) {
        const today = _today();  // TIMEZONE FIX
        let allStreaking = true;
        for (const h of habits) {
          const c = await db.getFirstAsync(
            "SELECT status FROM checkins WHERE habit_id = ? AND date = ? AND status IN ('done','resisted')",
            [h.id, today]
          );
          if (!c) { allStreaking = false; break; }
        }
        if (allStreaking) await award(JOURNEY_BADGES.find(b => b.id === 'the_yogi'));
      }
    }

    return newBadges;
  } catch (e) {
    console.warn('checkAndAwardJourneyBadges:', e.message);
    return [];
  }
};

// ── STREAK FREEZE ─────────────────────────────────────────────────────
export const getStreakFreezeCount = async () => {
  try { return parseInt((await getSetting('streak_freeze_count')) || '0'); }
  catch { return 0; }
};

// FIX: was new Date().toISOString().split('T')[0]
export const useStreakFreeze = async (habitId) => {
  try {
    const freezes = await getStreakFreezeCount();
    if (freezes <= 0) return { success: false, message: 'No streak freezes available.' };
    const db    = await getDatabase();
    const today = _today();  // TIMEZONE FIX
    await db.runAsync(
      `INSERT INTO checkins (habit_id, date, status, note, slip_count)
       VALUES (?, ?, 'done', 'Streak freeze used', 0)
       ON CONFLICT(habit_id, date) DO UPDATE SET status='done', note='Streak freeze used'`,
      [habitId, today]
    );
    await setSetting('streak_freeze_count', String(freezes - 1));
    return { success: true, remaining: freezes - 1 };
  } catch (e) { return { success: false, message: e.message }; }
};

// FIX: was today.toISOString().split('T')[0] and sevenDaysAgo.toISOString()...
export const checkAndAwardStreakFreeze = async () => {
  try {
    const today    = new Date();
    const todayStr = _today();  // TIMEZONE FIX
    if (today.getDay() !== 0) return false;
    const last = await getSetting('last_freeze_award');
    if (last === todayStr) return false;

    const db           = await getDatabase();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fromDate = _localDate(sevenDaysAgo);  // TIMEZONE FIX

    const habits = await db.getAllAsync("SELECT id FROM habits WHERE is_active = 1 AND is_paused = 0") || [];
    if (habits.length === 0) return false;

    const possible = habits.length * 7;
    const done     = await db.getFirstAsync(
      `SELECT COUNT(*) as count FROM checkins WHERE date >= ? AND status IN ('done','resisted')`, [fromDate]
    );
    const rate = (done?.count || 0) / possible;

    if (rate >= 0.8) {
      const current = await getStreakFreezeCount();
      await setSetting('streak_freeze_count', String(Math.min(current + 1, 3)));
      await setSetting('last_freeze_award', todayStr);
      return true;
    }
    return false;
  } catch (e) {
    console.warn('checkAndAwardStreakFreeze:', e.message);
    return false;
  }
};

// ── FULL STATS ─────────────────────────────────────────────────────────
export const getFullStats = async () => {
  try {
    const [xpStr, karmaScore, freezeCount, goalName] = await Promise.all([
      getSetting('total_xp'),
      getKarmaScore(),
      getStreakFreezeCount(),
      getSetting('goal_name'),
    ]);
    const daysSinceBirth = _daysSinceBirth();
    const totalXP    = parseInt(xpStr || '0');
    const levelInfo  = getLevelFromXP(totalXP);
    const gn         = goalName || GOAL_NAME;
    const karmaTitle = getKarmaTitle(karmaScore, gn, daysSinceBirth);
    checkAndAwardJourneyBadges(karmaScore, daysSinceBirth).catch(() => {});
    return { totalXP, levelInfo, karmaScore, karmaTitle, freezeCount, goalName: gn, daysSinceBirth };
  } catch (e) {
    console.warn('getFullStats:', e.message);
    const daysSinceBirth = _daysSinceBirth();
    return {
      totalXP:    0,
      levelInfo:  getLevelFromXP(0),
      karmaScore: 0,
      karmaTitle: getKarmaTitle(0, null, daysSinceBirth),
      freezeCount: 0,
      daysSinceBirth,
    };
  }
};