// ─── KARMA APP — GAMIFICATION SERVICE (PHASE F-1) ────────────────────
// Phase F-1 complete rewrite:
// - New XP values: done=+1, resisted=+2, skipped=-1, missed=-2, slip=-5, auto_skipped=-2, perfect=+5
// - Karma Score: per-habit actual days, WFO skips excluded from denominator
// - Karma Titles based on Score (Seeker→Dhruv) — NOT XP-based levels
// - Journey Badges: overall achievement badges (separate from per-habit milestones)
// - LEVELS kept as secondary XP tracking (not homescreen title)
// - checkPerfectDay: respects WFO mode

import { getDatabase }          from '../database/database';
import { getSetting, setSetting } from '../database/habitService';

// ── APP BIRTH DATE ────────────────────────────────────────────────────
const APP_BIRTH = '2026-05-01';

// ── NEW XP VALUES (Phase F-1) ─────────────────────────────────────────
export const XP_VALUES = {
  habit_done:        1,
  habit_resisted:    2,
  habit_undo_done:  -1,
  habit_undo_resist:-2,
  skipped:          -1,   // intentional skip
  auto_skipped:     -2,   // forgot to log — system marked it
  missed:           -2,   // explicit miss
  slip:             -5,   // did the habit you were avoiding
  wfo_skipped:       0,   // WFO system skip — no penalty
  perfect_day:       5,
  // Per-habit milestone XP
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

// ── KARMA TITLES (based on Karma Score 0–1000) ─────────────────────────
// These are the primary homescreen titles.
// Note: names deliberately different from habit milestone titles and journey badge titles.
export const KARMA_TITLES = [
  { minScore:    0, title: 'Seeker',       icon: '🌱', color: '#8E8E93' },
  { minScore:  100, title: 'Awakening',    icon: '🔥', color: '#FF9F0A' },
  { minScore:  200, title: 'Consistent',   icon: '⭐', color: '#30D158' },
  { minScore:  400, title: 'Disciplined',  icon: '⚔️', color: '#0A84FF' },
  { minScore:  600, title: 'Unstoppable',  icon: '⚡', color: '#BF5AF2' },
  { minScore:  800, title: 'Transcendent', icon: '🔱', color: '#FFD700' },
  { minScore: 1000, title: 'Dhruv',        icon: '👑', color: '#FFD700' },
];

export const getKarmaTitle = (karmaScore) => {
  const score = Math.max(0, karmaScore || 0);
  let current = KARMA_TITLES[0];
  for (const t of KARMA_TITLES) {
    if (score >= t.minScore) current = t;
  }
  const next = KARMA_TITLES.find(t => t.minScore > score) || null;
  const progress = next
    ? (score - current.minScore) / (next.minScore - current.minScore)
    : 1;
  return {
    ...current,
    nextTitle: next,
    progress:  Math.min(1, Math.max(0, progress)),
    score,
  };
};

// ── LEGACY LEVELS (secondary, XP-based) ───────────────────────────────
// Kept for the XP section in Stats. Not shown as homescreen title.
export const LEVELS = [
  { level: 1, title: 'Seedling',    minXP:    0, icon: '🌱', color: '#8E8E93' },
  { level: 2, title: 'Kindled',     minXP:   50, icon: '🕯️', color: '#FF9F0A' },
  { level: 3, title: 'Practitioner',minXP:  200, icon: '📿', color: '#30D158' },
  { level: 4, title: 'Sadhaka',     minXP:  500, icon: '🧘', color: '#0A84FF' },
  { level: 5, title: 'Warrior',     minXP: 1000, icon: '⚔️', color: '#BF5AF2' },
  { level: 6, title: 'Yogi',        minXP: 2500, icon: '🔱', color: '#FFD700' },
  { level: 7, title: 'Akash',       minXP: 5000, icon: '👑', color: '#FFD700' },
];

export const getLevelFromXP = (xp) => {
  const totalXP = xp || 0;
  let currentLevel = LEVELS[0];
  for (const lvl of LEVELS) {
    if (totalXP >= lvl.minXP) currentLevel = lvl;
  }
  const nextLevel = LEVELS.find(l => l.minXP > Math.max(0, totalXP)) || null;
  const progress = nextLevel
    ? (Math.max(0, totalXP) - currentLevel.minXP) / (nextLevel.minXP - currentLevel.minXP)
    : 1;
  return {
    ...currentLevel,
    nextLevel,
    progress: Math.min(1, Math.max(0, progress)),
    totalXP,
  };
};

// ── CHECKIN XP CALCULATOR (single source of truth) ────────────────────
// Handles all status transitions. Used by checkIn AND editPastCheckin.
// Returns the XP delta for changing from previousStatus to newStatus.
export const calculateCheckinXP = (previousStatus, newStatus) => {
  if (previousStatus === newStatus) return 0;

  const getBaseXP = (status) => {
    switch (status) {
      case 'done':         return XP_VALUES.habit_done;       // +1
      case 'resisted':     return XP_VALUES.habit_resisted;   // +2
      case 'missed':       return XP_VALUES.missed;           // -2
      case 'slip':         return XP_VALUES.slip;             // -5
      case 'skipped':      return XP_VALUES.skipped;          // -1
      case 'auto_skipped': return XP_VALUES.auto_skipped;     // -2
      default:             return 0;
    }
  };

  const prevXP = previousStatus ? getBaseXP(previousStatus) : 0;
  const newXP  = newStatus      ? getBaseXP(newStatus)      : 0;

  return newXP - prevXP;
};

// ── AWARD XP ──────────────────────────────────────────────────────────
// XP can go negative — no floor applied anywhere.
export const awardXP = async (amount, reason, habitId = null) => {
  if (!amount || amount === 0) return 0;
  try {
    const db = await getDatabase();
    const current = await getSetting('total_xp');
    const currentXP = parseInt(current || '0');
    const newXP = currentXP + amount;
    await setSetting('total_xp', String(newXP));
    await db.runAsync(
      'INSERT INTO xp_log (habit_id, xp, reason, date) VALUES (?, ?, ?, datetime("now","localtime"))',
      [habitId, amount, reason || 'XP']
    );
    console.log(`⚡ XP: ${amount > 0 ? '+' : ''}${amount} → ${newXP}`);
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

    console.log(`⚠️ Auto-skip XP ${XP_VALUES.auto_skipped} for "${name}" on ${date} → ${newXP}`);
  } catch (e) {
    console.warn('deductAutoSkipXP:', e.message);
  }
};

// ── PERFECT DAY CHECK ─────────────────────────────────────────────────
// Phase F-1: Respects WFO mode — WFO-skip habits not required
export const checkPerfectDay = async () => {
  try {
    const db      = await getDatabase();
    const today   = new Date().toISOString().split('T')[0];
    const wfoMode = (await getSetting('wfo_mode')) === 'true';

    // Required habits: active, non-paused; in WFO mode exclude is_wfo_skip
    const requiredHabits = await db.getAllAsync(
      `SELECT id FROM habits WHERE is_active = 1 AND is_paused = 0 ${wfoMode ? 'AND is_wfo_skip = 0' : ''}`
    ) || [];

    if (requiredHabits.length === 0) return false;

    // Every required habit must have done/resisted today
    for (const h of requiredHabits) {
      const c = await db.getFirstAsync(
        'SELECT status FROM checkins WHERE habit_id = ? AND date = ?',
        [h.id, today]
      );
      if (c?.status !== 'done' && c?.status !== 'resisted') return false;
    }
    return true;
  } catch (e) {
    console.warn('checkPerfectDay:', e.message);
    return false;
  }
};

export const awardPerfectDayIfEligible = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const last  = await getSetting('last_perfect_day');
    if (last === today) return false;
    const isPerfect = await checkPerfectDay();
    if (!isPerfect) return false;
    await awardXP(XP_VALUES.perfect_day, 'Perfect day — all habits complete!');
    await setSetting('last_perfect_day', today);

    // Check journey badges after perfect day
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
      'SELECT id FROM milestones WHERE habit_id = ? AND milestone_days = ?',
      [habitId, currentStreak]
    );
    if (existing) return null;

    await db.runAsync(
      'INSERT INTO milestones (habit_id, milestone_days) VALUES (?, ?)',
      [habitId, currentStreak]
    );

    const xp = XP_VALUES[`milestone_${currentStreak}`] || 3;
    await awardXP(xp, `${currentStreak}-day milestone`, habitId);

    // Check journey badges (e.g., The Yogi requires all habits streaking)
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
      'SELECT * FROM milestones WHERE habit_id = ? ORDER BY milestone_days ASC',
      [habitId]
    ) || [];
  } catch { return []; }
};

// ── KARMA SCORE (0–1000) ──────────────────────────────────────────────
// Phase F-1 formula: per-habit actual days, skipped days excluded from denominator
// Skipped days (WFO or intentional) = user chose to skip, don't penalise
// Formula: avg of (done/possible) per habit × 1000
export const getKarmaScore = async () => {
  try {
    const db       = await getDatabase();
    const today    = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // 30-day window start
    const winStart = new Date(today);
    winStart.setDate(today.getDate() - 29);
    const winStartStr = winStart.toISOString().split('T')[0];
    const effectiveWindowStart = winStartStr > APP_BIRTH ? winStartStr : APP_BIRTH;

    const habits = await db.getAllAsync(
      "SELECT id, created_at FROM habits WHERE is_active = 1 AND is_paused = 0"
    ) || [];

    if (habits.length === 0) return 0;

    let totalPossible = 0;
    let totalDone     = 0;

    for (const habit of habits) {
      const habitBirth = (habit.created_at || APP_BIRTH).split('T')[0];
      const start = habitBirth > effectiveWindowStart ? habitBirth : effectiveWindowStart;

      // Days in window for this habit
      const startD = new Date(start   + 'T00:00:00');
      const endD   = new Date(todayStr + 'T00:00:00');
      const days   = Math.floor((endD - startD) / 86400000) + 1;
      if (days <= 0) continue;

      // Get checkin summary: done count + skipped count (excluded from denominator)
      const summary = await db.getFirstAsync(`
        SELECT
          SUM(CASE WHEN status IN ('done','resisted') THEN 1 ELSE 0 END) as done_count,
          SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END)            as skipped_count
        FROM checkins
        WHERE habit_id = ? AND date >= ? AND date <= ?
      `, [habit.id, start, todayStr]);

      const skipped  = summary?.skipped_count || 0;
      const done     = summary?.done_count    || 0;
      const possible = Math.max(0, days - skipped);

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

// Get XP earned from a specific habit (for HabitDetailScreen)
export const getHabitXPTotal = async (habitId) => {
  try {
    const db     = await getDatabase();
    const result = await db.getFirstAsync(
      'SELECT COALESCE(SUM(xp), 0) as total FROM xp_log WHERE habit_id = ?',
      [habitId]
    );
    return result?.total || 0;
  } catch { return 0; }
};

// ── JOURNEY BADGES ────────────────────────────────────────────────────
// Overall app achievements — separate from per-habit milestones.
// Names deliberately distinct from Karma Titles and habit milestone titles.
export const JOURNEY_BADGES = [
  {
    id:       'first_dawn',
    badge:    '🌅',
    title:    'First Dawn',
    desc:     'The battlefield was entered for the first time.',
    criteria: 'Complete your first habit check-in',
  },
  {
    id:       'first_resistance',
    badge:    '✊',
    title:    'First Resistance',
    desc:     'The first time you said no to yourself.',
    criteria: 'Resist a break habit for the first time',
  },
  {
    id:       'ten_battles',
    badge:    '🗡️',
    title:    'Ten Battles',
    desc:     'Ten acts of discipline. The path becomes visible.',
    criteria: '10 total habit completions',
  },
  {
    id:       'century',
    badge:    '💯',
    title:    'The Century',
    desc:     '100 acts of pure discipline. Most never get here.',
    criteria: '100 total habit completions',
  },
  {
    id:       'all_in_day',
    badge:    '🎯',
    title:    'All-In Day',
    desc:     'Every battle won in a single day. Not one horse broke free.',
    criteria: 'Complete a perfect day — all habits done',
  },
  {
    id:       'karma_200',
    badge:    '🔆',
    title:    'First Flame',
    desc:     'Karma Score crossed 200. The fire is real.',
    criteria: 'Reach Karma Score 200+',
  },
  {
    id:       'karma_400',
    badge:    '🛡️',
    title:    'The Shield',
    desc:     'Karma Score 400+. Discipline is becoming defence.',
    criteria: 'Reach Karma Score 400+',
  },
  {
    id:       'karma_600',
    badge:    '🌊',
    title:    'The Current',
    desc:     'Karma Score 600+. You move like water now.',
    criteria: 'Reach Karma Score 600+',
  },
  {
    id:       'karma_800',
    badge:    '🏔️',
    title:    'The Mountain',
    desc:     'Karma Score 800+. Immovable. Unshakeable.',
    criteria: 'Reach Karma Score 800+',
  },
  {
    id:       'the_yogi',
    badge:    '🧘',
    title:    'The Yogi',
    desc:     'All your habits aligned. Every horse in formation.',
    criteria: 'All active habits have a current streak',
  },
  {
    id:       'legend',
    badge:    '🌟',
    title:    'Legend',
    desc:     'You have become what most only dream of being.',
    criteria: 'Reach Karma Score 1000',
  },
];

export const getEarnedJourneyBadges = async () => {
  try {
    const db = await getDatabase();
    return await db.getAllAsync(
      'SELECT * FROM journey_milestones ORDER BY achieved_at ASC'
    ) || [];
  } catch { return []; }
};

// Check and award any newly-earned journey badges
// Call this after: check-ins, perfect day, milestone earned, karma score calculated
export const checkAndAwardJourneyBadges = async (currentKarmaScore = null) => {
  try {
    const db = await getDatabase();

    // Get already-earned badge IDs
    const earned = await db.getAllAsync('SELECT badge_id FROM journey_milestones') || [];
    const earnedIds = new Set(earned.map(e => e.badge_id));

    const newBadges = [];

    // Helper: award a badge
    const award = async (badge) => {
      if (earnedIds.has(badge.id)) return;
      await db.runAsync(
        'INSERT OR IGNORE INTO journey_milestones (badge_id) VALUES (?)',
        [badge.id]
      );
      earnedIds.add(badge.id);
      newBadges.push(badge);
      console.log(`🏅 Journey Badge earned: ${badge.title}`);
    };

    // 1. First Dawn: any done/resisted checkin exists
    if (!earnedIds.has('first_dawn')) {
      const first = await db.getFirstAsync(
        "SELECT id FROM checkins WHERE status IN ('done','resisted') LIMIT 1"
      );
      if (first) await award(JOURNEY_BADGES.find(b => b.id === 'first_dawn'));
    }

    // 2. First Resistance: any resisted checkin exists
    if (!earnedIds.has('first_resistance')) {
      const r = await db.getFirstAsync(
        "SELECT id FROM checkins WHERE status = 'resisted' LIMIT 1"
      );
      if (r) await award(JOURNEY_BADGES.find(b => b.id === 'first_resistance'));
    }

    // 3. Ten Battles: 10+ done/resisted
    if (!earnedIds.has('ten_battles')) {
      const count = await db.getFirstAsync(
        "SELECT COUNT(*) as cnt FROM checkins WHERE status IN ('done','resisted')"
      );
      if ((count?.cnt || 0) >= 10) await award(JOURNEY_BADGES.find(b => b.id === 'ten_battles'));
    }

    // 4. Century: 100+ done/resisted
    if (!earnedIds.has('century')) {
      const count = await db.getFirstAsync(
        "SELECT COUNT(*) as cnt FROM checkins WHERE status IN ('done','resisted')"
      );
      if ((count?.cnt || 0) >= 100) await award(JOURNEY_BADGES.find(b => b.id === 'century'));
    }

    // 5. All-In Day: last_perfect_day is set (means at least one perfect day happened)
    if (!earnedIds.has('all_in_day')) {
      const last = await getSetting('last_perfect_day');
      if (last) await award(JOURNEY_BADGES.find(b => b.id === 'all_in_day'));
    }

    // 6–11. Karma Score based badges
    const score = currentKarmaScore !== null ? currentKarmaScore : await getKarmaScore();
    const scoreChecks = [
      { id: 'karma_200', threshold: 200 },
      { id: 'karma_400', threshold: 400 },
      { id: 'karma_600', threshold: 600 },
      { id: 'karma_800', threshold: 800 },
      { id: 'legend',    threshold: 1000 },
    ];
    for (const sc of scoreChecks) {
      if (!earnedIds.has(sc.id) && score >= sc.threshold) {
        await award(JOURNEY_BADGES.find(b => b.id === sc.id));
      }
    }

    // 7. The Yogi: ALL active non-paused habits have current streak >= 1
    if (!earnedIds.has('the_yogi')) {
      const habits = await db.getAllAsync(
        "SELECT id FROM habits WHERE is_active = 1 AND is_paused = 0"
      ) || [];
      if (habits.length > 0) {
        const today     = new Date().toISOString().split('T')[0];
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
  try {
    const val = await getSetting('streak_freeze_count');
    return parseInt(val || '0');
  } catch { return 0; }
};

export const useStreakFreeze = async (habitId) => {
  try {
    const freezes = await getStreakFreezeCount();
    if (freezes <= 0) return { success: false, message: 'No streak freezes available.' };

    const db    = await getDatabase();
    const today = new Date().toISOString().split('T')[0];
    await db.runAsync(
      `INSERT INTO checkins (habit_id, date, status, note, slip_count)
       VALUES (?, ?, 'done', 'Streak freeze used', 0)
       ON CONFLICT(habit_id, date) DO UPDATE SET status='done', note='Streak freeze used'`,
      [habitId, today]
    );
    await setSetting('streak_freeze_count', String(freezes - 1));
    return { success: true, remaining: freezes - 1 };
  } catch (e) {
    return { success: false, message: e.message };
  }
};

export const checkAndAwardStreakFreeze = async () => {
  try {
    const today  = new Date();
    const todayStr = today.toISOString().split('T')[0];
    if (today.getDay() !== 0) return false;
    const last = await getSetting('last_freeze_award');
    if (last === todayStr) return false;

    const db = await getDatabase();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fromDate = sevenDaysAgo.toISOString().split('T')[0];

    const habits = await db.getAllAsync(
      "SELECT id FROM habits WHERE is_active = 1 AND is_paused = 0"
    ) || [];
    if (habits.length === 0) return false;

    const possible = habits.length * 7;
    const done = await db.getFirstAsync(
      `SELECT COUNT(*) as count FROM checkins
       WHERE date >= ? AND status IN ('done','resisted')`,
      [fromDate]
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
// Now returns both karmaTitle (primary) and levelInfo (secondary/XP)
export const getFullStats = async () => {
  try {
    const [xpStr, karmaScore, freezeCount] = await Promise.all([
      getSetting('total_xp'),
      getKarmaScore(),
      getStreakFreezeCount(),
    ]);
    const totalXP   = parseInt(xpStr || '0');
    const levelInfo = getLevelFromXP(totalXP);
    const karmaTitle = getKarmaTitle(karmaScore);

    // Check journey badges silently (non-blocking)
    checkAndAwardJourneyBadges(karmaScore).catch(() => {});

    return { totalXP, levelInfo, karmaScore, karmaTitle, freezeCount };
  } catch (e) {
    console.warn('getFullStats:', e.message);
    return {
      totalXP:    0,
      levelInfo:  getLevelFromXP(0),
      karmaScore: 0,
      karmaTitle: getKarmaTitle(0),
      freezeCount: 0,
    };
  }
};