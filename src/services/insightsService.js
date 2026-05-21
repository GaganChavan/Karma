// ─── KARMA APP — INSIGHTS SERVICE (PHASE F-1) ────────────────────────
// Phase F-1 fix: denominator is now expected days (since habit created)
// not checkins.length (only logged days).
// Bug fixed: "7/7 days" false positive when 7 done out of 13 total days.

import { getDatabase } from '../database/database';

const APP_BIRTH = '2026-05-01';

const _localDate = (d) => {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

export const generateInsights = async () => {
  try {
    const db = await getDatabase();
    const insights = [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fromDate = _localDate(thirtyDaysAgo);

    const habits = await db.getAllAsync(
      "SELECT * FROM habits WHERE is_active = 1 AND is_paused = 0"
    ) || [];

    if (habits.length === 0) return [];

    const today = new Date();

    for (const habit of habits) {
      // Get all checkins in the 30-day window
      const checkins = await db.getAllAsync(
        `SELECT date, status FROM checkins
         WHERE habit_id = ? AND date >= ? ORDER BY date ASC`,
        [habit.id, fromDate]
      ) || [];

      // FIXED: denominator = expected days since habit was created (or window start)
      const habitBirth    = (habit.created_at || APP_BIRTH).split('T')[0];
      const effectiveStart = habitBirth > fromDate ? habitBirth : fromDate;
      const startD         = new Date(effectiveStart + 'T00:00:00');
      const expectedDays   = Math.floor((today - startD) / 86400000) + 1;

      // Need at least 5 expected days AND at least 3 logged entries for meaningful insight
      if (expectedDays < 5 || checkins.length < 3) continue;

      const done    = checkins.filter(c => c.status === 'done' || c.status === 'resisted').length;
      const rate    = expectedDays > 0 ? Math.round((done / expectedDays) * 100) : 0;

      if (habit.type === 'build') {
        const buildInsights = await _analyzeBuildHabit(habit, checkins, done, rate, expectedDays, db, fromDate);
        insights.push(...buildInsights);
      } else {
        const breakInsights = await _analyzeBreakHabit(habit, checkins, db, fromDate);
        insights.push(...breakInsights);
      }

      // Chronic auto-skip detection (Phase E)
      const autoSkipInsight = _detectChronicAutoSkip(habit, checkins);
      if (autoSkipInsight) insights.push(autoSkipInsight);
    }

    const overallInsights = await _analyzeOverall(habits, db, fromDate, today);
    insights.push(...overallInsights);

    return insights.sort((a, b) => b.priority - a.priority).slice(0, 6);
  } catch (e) {
    console.warn('generateInsights:', e.message);
    return [];
  }
};

const _analyzeBuildHabit = async (habit, checkins, done, rate, expectedDays, db, fromDate) => {
  const insights = [];

  // Day-of-week weakness analysis
  const dayMap   = { 0:'Sunday',1:'Monday',2:'Tuesday',3:'Wednesday',4:'Thursday',5:'Friday',6:'Saturday' };
  const dayStats = {};
  checkins.forEach(c => {
    const day = new Date(c.date + 'T12:00:00').getDay();
    if (!dayStats[day]) dayStats[day] = { done: 0, total: 0 };
    dayStats[day].total++;
    if (c.status === 'done' || c.status === 'resisted') dayStats[day].done++;
  });

  let weakestDay = null;
  let lowestRate = 100;
  Object.entries(dayStats).forEach(([day, stats]) => {
    if (stats.total >= 2) {
      const dayRate = (stats.done / stats.total) * 100;
      if (dayRate < lowestRate) { lowestRate = dayRate; weakestDay = parseInt(day); }
    }
  });

  if (weakestDay !== null && lowestRate < 50) {
    insights.push({
      type:      'weak_day',
      habitId:   habit.id,
      habitName: habit.name,
      icon:      habit.icon,
      color:     habit.color || '#F5A623',
      title:     `${dayMap[weakestDay]} is your weak day for "${habit.name}"`,
      detail:    `Only ${Math.round(lowestRate)}% completion on ${dayMap[weakestDay]}s. Plan what you'll do before that day arrives.`,
      priority:  8,
    });
  }

  // Momentum or struggle
  if (rate >= 70) {
    insights.push({
      type:      'momentum',
      habitId:   habit.id,
      habitName: habit.name,
      icon:      habit.icon,
      color:     '#30D158',
      title:     `"${habit.name}" — ${rate}% consistency`,
      detail:    `${done} done out of ${expectedDays} days. The rein is firm. This habit is taking root.`,
      priority:  5,
    });
  } else if (rate < 35 && expectedDays >= 10) {
    insights.push({
      type:      'struggling',
      habitId:   habit.id,
      habitName: habit.name,
      icon:      habit.icon,
      color:     '#FF453A',
      title:     `"${habit.name}" needs attention — ${rate}%`,
      detail:    `${done} done out of ${expectedDays} days. Is this the right time of day? Is the habit too ambitious right now?`,
      priority:  9,
    });
  }

  return insights;
};

const _analyzeBreakHabit = async (habit, checkins, db, fromDate) => {
  const insights = [];

  const triggers = await db.getAllAsync(
    `SELECT trigger, COUNT(*) as count FROM slip_triggers
     WHERE habit_id = ? AND date >= ?
     GROUP BY trigger ORDER BY count DESC`,
    [habit.id, fromDate]
  ) || [];

  if (triggers.length > 0 && triggers[0].count >= 2) {
    const topTrigger = triggers[0].trigger;
    const triggerLabels = {
      stress:'Stress', boredom:'Boredom', social:'Social situations',
      tired:'Tiredness', emotional:'Emotional states', automatic:'Automatic behaviour',
      night:'Late nights', hunger:'Hunger',
    };
    insights.push({
      type:      'trigger_pattern',
      habitId:   habit.id,
      habitName: habit.name,
      icon:      '🧠',
      color:     '#BF5AF2',
      title:     `${triggerLabels[topTrigger] || topTrigger} triggers "${habit.name}"`,
      detail:    `Battlefield intelligence: ${triggers[0].count} of your slips happen during ${triggerLabels[topTrigger] || topTrigger}. Prepare before it arrives.`,
      priority:  10,
    });
  }

  const resisted = checkins.filter(c => c.status === 'resisted').length;
  const slips    = checkins.filter(c => c.status === 'slip').length;

  if (resisted > 0 && slips === 0) {
    insights.push({
      type:      'clean',
      habitId:   habit.id,
      habitName: habit.name,
      icon:      habit.icon,
      color:     '#30D158',
      title:     `Zero slips — the rein holds perfectly`,
      detail:    `"${habit.name}" — ${resisted} days of resistance. The horse is learning.`,
      priority:  7,
    });
  }

  return insights;
};

// Phase E: Chronic auto-skip detection
const _detectChronicAutoSkip = (habit, checkins) => {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const cutoff = _localDate(fourteenDaysAgo);

  const recentAutoSkips = checkins.filter(
    c => c.status === 'auto_skipped' && c.date >= cutoff
  ).length;

  if (recentAutoSkips < 5) return null;

  return {
    type:      'chronic_auto_skip',
    habitId:   habit.id,
    habitName: habit.name,
    icon:      '⚠️',
    color:     '#FF9F0A',
    title:     `"${habit.name}" — ${recentAutoSkips} days unlogged`,
    detail:    `You haven't logged this habit ${recentAutoSkips} times in 2 weeks. Either recommit — open the app daily — or pause this habit until you're ready. Krishna doesn't track what isn't fought.`,
    priority:  11,
  };
};

const _analyzeOverall = async (habits, db, fromDate, today) => {
  const insights = [];

  // Best performing habit
  let bestHabit = null;
  let bestRate  = 0;

  for (const h of habits.filter(h => h.type === 'build')) {
    const habitBirth    = (h.created_at || fromDate).split('T')[0];
    const effectiveStart = habitBirth > fromDate ? habitBirth : fromDate;
    const startD         = new Date(effectiveStart + 'T00:00:00');
    const expectedDays   = Math.floor((today - startD) / 86400000) + 1;

    if (expectedDays < 5) continue;

    const stats = await db.getFirstAsync(
      `SELECT SUM(CASE WHEN status IN ('done','resisted') THEN 1 ELSE 0 END) as done
       FROM checkins WHERE habit_id = ? AND date >= ?`,
      [h.id, fromDate]
    );
    const rate = expectedDays > 0 ? ((stats?.done || 0) / expectedDays) * 100 : 0;
    if (rate > bestRate) { bestRate = rate; bestHabit = h; }
  }

  if (bestHabit && Math.round(bestRate) >= 60) {
    insights.push({
      type:      'best_habit',
      icon:      bestHabit.icon,
      color:     bestHabit.color,
      habitName: bestHabit.name,
      title:     `"${bestHabit.name}" is your anchor`,
      detail:    `${Math.round(bestRate)}% consistency over 30 days. This habit is the one holding everything together. Build on it.`,
      priority:  6,
    });
  }

  // Mood-energy correlation
  const moodData = await db.getAllAsync(
    `SELECT m.date, m.energy,
            SUM(CASE WHEN c.status IN ('done','resisted') THEN 1 ELSE 0 END) as habits_done
     FROM mood_logs m
     LEFT JOIN checkins c ON c.date = m.date
     WHERE m.date >= ? AND m.time_of_day = 'morning'
     GROUP BY m.date`,
    [fromDate]
  ) || [];

  if (moodData.length >= 7) {
    const high = moodData.filter(d => d.energy >= 4);
    const low  = moodData.filter(d => d.energy <= 2);
    if (high.length >= 3 && low.length >= 3) {
      const highAvg = high.reduce((s, d) => s + d.habits_done, 0) / high.length;
      const lowAvg  = low.reduce((s, d)  => s + d.habits_done, 0) / low.length;
      if (highAvg > lowAvg * 1.3) {
        insights.push({
          type:   'energy_correlation',
          icon:   '⚡',
          color:  '#F5A623',
          title:  'Energy drives your discipline',
          detail: `On high-energy mornings you complete ${Math.round(highAvg)} habits vs ${Math.round(lowAvg)} on low-energy days. Protect your sleep — it's not rest, it's strategy.`,
          priority: 7,
        });
      }
    }
  }

  return insights;
};