// ─── KARMA APP — INSIGHTS SERVICE (PHASE C) ──────────────────────────
// Karma speaks after 30 days of data.
// Plain language insights — no AI, pure SQL analysis.
// Krishna's battlefield intelligence delivered to Neel.

import { getDatabase } from '../database/database';

// ── Generate insights for all habits ─────────────────────────────────

export const generateInsights = async () => {
  try {
    const db = await getDatabase();
    const insights = [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fromDate = thirtyDaysAgo.toISOString().split('T')[0];

    const habits = await db.getAllAsync(
      "SELECT * FROM habits WHERE is_active = 1"
    ) || [];

    if (habits.length === 0) return [];

    for (const habit of habits) {
      const checkins = await db.getAllAsync(
        `SELECT date, status FROM checkins
         WHERE habit_id = ? AND date >= ? ORDER BY date ASC`,
        [habit.id, fromDate]
      ) || [];

      if (checkins.length < 7) continue; // Need at least a week of data

      if (habit.type === 'build') {
        const buildInsights = await _analyzeBuildHabit(habit, checkins, db, fromDate);
        insights.push(...buildInsights);
      } else {
        const breakInsights = await _analyzeBreakHabit(habit, checkins, db, fromDate);
        insights.push(...breakInsights);
      }
    }

    // Overall insights
    const overallInsights = await _analyzeOverall(habits, db, fromDate);
    insights.push(...overallInsights);

    // Sort by priority
    return insights.sort((a, b) => b.priority - a.priority).slice(0, 6);
  } catch (error) {
    console.warn('generateInsights error:', error.message);
    return [];
  }
};

const _analyzeBuildHabit = async (habit, checkins, db, fromDate) => {
  const insights = [];
  const total   = checkins.length;
  const done    = checkins.filter(c => c.status === 'done').length;
  const rate    = total > 0 ? Math.round((done / total) * 100) : 0;

  // Day of week analysis
  const dayMap = { 0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };
  const dayStats = {};
  checkins.forEach(c => {
    const day = new Date(c.date + 'T12:00:00').getDay();
    if (!dayStats[day]) dayStats[day] = { done: 0, total: 0 };
    dayStats[day].total++;
    if (c.status === 'done') dayStats[day].done++;
  });

  // Find weakest day
  let weakestDay = null;
  let lowestRate = 100;
  Object.entries(dayStats).forEach(([day, stats]) => {
    if (stats.total >= 3) {
      const dayRate = (stats.done / stats.total) * 100;
      if (dayRate < lowestRate) {
        lowestRate = dayRate;
        weakestDay = parseInt(day);
      }
    }
  });

  if (weakestDay !== null && lowestRate < 60) {
    insights.push({
      type:     'weak_day',
      habitId:  habit.id,
      habitName: habit.name,
      icon:     habit.icon,
      color:    habit.color || '#F5A623',
      title:    `${dayMap[weakestDay]} is your weak day`,
      detail:   `You complete "${habit.name}" only ${Math.round(lowestRate)}% of ${dayMap[weakestDay]}s. Plan something specific for this day.`,
      priority: 8,
    });
  }

  // Streak momentum
  if (rate >= 80) {
    insights.push({
      type:     'momentum',
      habitId:  habit.id,
      habitName: habit.name,
      icon:     habit.icon,
      color:    '#30D158',
      title:    `Strong momentum — ${rate}% completion`,
      detail:   `"${habit.name}" is working. You've completed it ${done}/${total} days. The rein is firm.`,
      priority: 5,
    });
  } else if (rate < 40 && total >= 14) {
    insights.push({
      type:     'struggling',
      habitId:  habit.id,
      habitName: habit.name,
      icon:     habit.icon,
      color:    '#FF453A',
      title:    `"${habit.name}" needs attention`,
      detail:   `Only ${rate}% completion over ${total} days. Consider: is this the right time of day? Is the habit too ambitious?`,
      priority: 9,
    });
  }

  return insights;
};

const _analyzeBreakHabit = async (habit, checkins, db, fromDate) => {
  const insights = [];

  // Get triggers
  const triggers = await db.getAllAsync(
    `SELECT trigger, COUNT(*) as count FROM slip_triggers
     WHERE habit_id = ? AND date >= ?
     GROUP BY trigger ORDER BY count DESC`,
    [habit.id, fromDate]
  ) || [];

  if (triggers.length > 0 && triggers[0].count >= 2) {
    const topTrigger = triggers[0].trigger;
    const triggerLabels = {
      stress: 'Stress', boredom: 'Boredom', social: 'Social situations',
      tired: 'Tiredness', emotional: 'Emotional states',
      automatic: 'Automatic behavior', night: 'Late nights', hunger: 'Hunger',
    };

    insights.push({
      type:     'trigger_pattern',
      habitId:  habit.id,
      habitName: habit.name,
      icon:     '🧠',
      color:    '#BF5AF2',
      title:    `${triggerLabels[topTrigger] || topTrigger} triggers "${habit.name}"`,
      detail:   `Your battlefield intelligence: ${triggers[0].count} of your slips happen during ${triggerLabels[topTrigger] || topTrigger}. Prepare for this specific state.`,
      priority: 10,
    });
  }

  // Clean streaks analysis
  const resisted = checkins.filter(c => c.status === 'resisted').length;
  const slips    = checkins.filter(c => c.status === 'slip').length;

  if (resisted > 0 && slips === 0) {
    insights.push({
      type:     'clean',
      habitId:  habit.id,
      habitName: habit.name,
      icon:     habit.icon,
      color:    '#30D158',
      title:    `Zero slips — the rein holds perfectly`,
      detail:   `"${habit.name}" — ${resisted} days of resistance. The horse is learning. Dhruv would approve.`,
      priority: 7,
    });
  }

  return insights;
};

const _analyzeOverall = async (habits, db, fromDate) => {
  const insights = [];

  // Best performing habit
  let bestHabit  = null;
  let bestRate   = 0;
  let worstHabit = null;
  let worstRate  = 100;

  for (const h of habits.filter(h => h.type === 'build')) {
    const stats = await db.getFirstAsync(
      `SELECT COUNT(*) as total,
       SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done
       FROM checkins WHERE habit_id = ? AND date >= ?`,
      [h.id, fromDate]
    );
    if (!stats || stats.total < 7) continue;
    const rate = (stats.done / stats.total) * 100;
    if (rate > bestRate)   { bestRate = rate;  bestHabit = h; }
    if (rate < worstRate)  { worstRate = rate; worstHabit = h; }
  }

  if (bestHabit && Math.round(bestRate) >= 70) {
    insights.push({
      type:     'best_habit',
      icon:     bestHabit.icon,
      color:    bestHabit.color,
      habitName: bestHabit.name,
      title:    `"${bestHabit.name}" is your strongest habit`,
      detail:   `${Math.round(bestRate)}% completion over 30 days. This is your anchor. Build on it.`,
      priority: 6,
    });
  }

  // Mood-performance correlation
  const moodData = await db.getAllAsync(
    `SELECT m.date, m.mood, m.energy,
     COUNT(c.id) as habits_done
     FROM mood_logs m
     LEFT JOIN checkins c ON c.date = m.date AND c.status IN ('done','resisted')
     WHERE m.date >= ? AND m.time_of_day = 'morning'
     GROUP BY m.date`,
    [fromDate]
  ) || [];

  if (moodData.length >= 7) {
    const highEnergy = moodData.filter(d => d.energy >= 4);
    const lowEnergy  = moodData.filter(d => d.energy <= 2);

    if (highEnergy.length >= 3 && lowEnergy.length >= 3) {
      const highAvg = highEnergy.reduce((s, d) => s + d.habits_done, 0) / highEnergy.length;
      const lowAvg  = lowEnergy.reduce((s, d)  => s + d.habits_done, 0) / lowEnergy.length;

      if (highAvg > lowAvg * 1.3) {
        insights.push({
          type:     'energy_correlation',
          icon:     '⚡',
          color:    '#F5A623',
          title:    'Energy drives your discipline',
          detail:   `On high-energy mornings you complete ${Math.round(highAvg)} habits vs ${Math.round(lowAvg)} on low-energy days. Protect your sleep — it's not rest, it's strategy.`,
          priority: 7,
        });
      }
    }
  }

  return insights;
};