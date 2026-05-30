// ─── KARMA APP — INSIGHTS SERVICE (PHASE F-1) ────────────────────────
// Phase F-1 fix: denominator is now expected days (since habit created)
// not checkins.length (only logged days).
// Bug fixed: "7/7 days" false positive when 7 done out of 13 total days.

import { getDatabase } from '../database/database';

import { APP_BIRTH } from '../constants/appConfig';

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
        const missInsights = await _analyzeMissReasons(habit, db, fromDate);
        insights.push(...missInsights);
      } else {
        const breakInsights = await _analyzeBreakHabit(habit, checkins, db, fromDate);
        insights.push(...breakInsights);
      }

      // Chronic auto-skip detection
      const autoSkipInsight = _detectChronicAutoSkip(habit, checkins);
      if (autoSkipInsight) insights.push(autoSkipInsight);
    }

    const overallInsights = await _analyzeOverall(habits, db, fromDate, today);
    insights.push(...overallInsights);

    const crossInsights = await _analyzeCrossHabitCorrelation(habits, db, fromDate);
    insights.push(...crossInsights);

    return insights.sort((a, b) => b.priority - a.priority).slice(0, 8);
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
      night:'Late nights', hunger:'Hunger', lonely:'Loneliness',
      procrastin:'Avoiding tasks', restless:'Restlessness', reward:'Reward-seeking',
      alone:'Being alone', conflict:'Post-conflict',
    };
    insights.push({
      type:      'trigger_pattern',
      habitId:   habit.id,
      habitName: habit.name,
      icon:      '🧠',
      color:     '#BF5AF2',
      title:     `${triggerLabels[topTrigger] || topTrigger} is your pattern with "${habit.name}"`,
      detail:    `${triggers[0].count} of your slips share this trigger. Awareness is the first weapon — you now have it.`,
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
      title:     `Zero slips on "${habit.name}"`,
      detail:    `${resisted} days of choosing differently. This is identity being built, not willpower being spent.`,
      priority:  7,
    });
  }

  // Deep slip insights
  const deepInsights = await _analyzeDeepSlipData(habit, db, fromDate);
  insights.push(...deepInsights);

  // Slip streak predictor
  const predictorInsights = await _analyzeSlipStreak(habit, db);
  insights.push(...predictorInsights);

  return insights;
};

const _analyzeDeepSlipData = async (habit, db, fromDate) => {
  const insights = [];

  const deepLogs = await db.getAllAsync(
    `SELECT time_of_day, hours_slept, missed_alarm, mood_before
     FROM slip_triggers
     WHERE habit_id = ? AND date >= ?
       AND (time_of_day IS NOT NULL OR hours_slept IS NOT NULL
            OR missed_alarm IS NOT NULL OR mood_before IS NOT NULL)`,
    [habit.id, fromDate]
  ) || [];

  if (deepLogs.length < 3) return insights;

  // Sleep correlation
  const sleepLogs  = deepLogs.filter(d => d.hours_slept);
  if (sleepLogs.length >= 3) {
    const lowSleep = sleepLogs.filter(d => ['<4','5','6'].includes(d.hours_slept));
    const pct = Math.round((lowSleep.length / sleepLogs.length) * 100);
    if (pct >= 60) {
      insights.push({
        type:      'sleep_slip',
        habitId:   habit.id,
        habitName: habit.name,
        icon:      '😴',
        color:     '#5AC8FA',
        title:     `Sleep is your defence against "${habit.name}"`,
        detail:    `${pct}% of your slips follow short sleep (≤6h). Research is clear: sleep deprivation depletes self-control. Protect sleep like a weapon.`,
        priority:  11,
      });
    }
  }

  // Time of day
  const timeLogs = deepLogs.filter(d => d.time_of_day);
  if (timeLogs.length >= 3) {
    const timeCounts = {};
    timeLogs.forEach(d => { timeCounts[d.time_of_day] = (timeCounts[d.time_of_day] || 0) + 1; });
    const top    = Object.entries(timeCounts).sort((a, b) => b[1] - a[1])[0];
    const topPct = Math.round((top[1] / timeLogs.length) * 100);
    if (topPct >= 50) {
      const timeDetail = {
        'Morning':    'Win the first hour. That\'s when this battle is easiest to lose.',
        'Afternoon':  'Midday is your danger zone. Plan what you\'ll do at 2pm before it arrives.',
        'Evening':    '${topPct}% of slips happen in the evening. Schedule something else for that window.',
        'Late Night': 'Late nights are the enemy. Sleep earlier — that is the strategy.',
      };
      insights.push({
        type:      'time_slip',
        habitId:   habit.id,
        habitName: habit.name,
        icon:      '🕐',
        color:     '#FF9F0A',
        title:     `${top[0]} is your risk window for "${habit.name}"`,
        detail:    (timeDetail[top[0]] || `${topPct}% of slips happen in the ${top[0].toLowerCase()}.`).replace('${topPct}', topPct),
        priority:  10,
      });
    }
  }

  // Mood
  const moodLogs = deepLogs.filter(d => d.mood_before);
  if (moodLogs.length >= 3) {
    const moodCounts = {};
    moodLogs.forEach(d => { moodCounts[d.mood_before] = (moodCounts[d.mood_before] || 0) + 1; });
    const top    = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
    const topPct = Math.round((top[1] / moodLogs.length) * 100);
    if (topPct >= 50) {
      const moodDetail = {
        'Bored':    'Boredom is your trigger. Have a replacement ready — something physical, something immediate.',
        'Anxious':  'Anxiety drives you here. Exercise or breathe for 5 minutes first. The urge passes.',
        'Empty':    'Emptiness pulls you in. Call someone. Go outside. Do anything else for 10 minutes.',
        'Guilty':   'Guilt spirals into more guilt. Break the cycle — one clean decision right now.',
        'Stressed': 'Stress creates shortcuts. This shortcut costs more than the stress does.',
      };
      insights.push({
        type:      'mood_slip',
        habitId:   habit.id,
        habitName: habit.name,
        icon:      '😶',
        color:     '#BF5AF2',
        title:     `${top[0]} is your trigger emotion for "${habit.name}"`,
        detail:    moodDetail[top[0]] || `${topPct}% of slips happen when feeling ${top[0].toLowerCase()}.`,
        priority:  10,
      });
    }
  }

  // Missed alarm
  const alarmLogs = deepLogs.filter(d => d.missed_alarm !== null);
  if (alarmLogs.length >= 3) {
    const missedCount = alarmLogs.filter(d => d.missed_alarm === 1).length;
    const pct = Math.round((missedCount / alarmLogs.length) * 100);
    if (pct >= 60) {
      insights.push({
        type:      'alarm_slip',
        habitId:   habit.id,
        habitName: habit.name,
        icon:      '⏰',
        color:     '#FF453A',
        title:     `Missed alarm predicts a slip for "${habit.name}"`,
        detail:    `${pct}% of your slips followed a missed alarm. How the morning starts shapes the day. Protect the alarm.`,
        priority:  9,
      });
    }
  }

  return insights;
};

const _analyzeSlipStreak = async (habit, db) => {
  const insights = [];

  const slips = await db.getAllAsync(
    `SELECT date FROM checkins WHERE habit_id = ? AND status = 'slip' ORDER BY date DESC`,
    [habit.id]
  ) || [];

  if (slips.length < 3) return insights;

  const gaps = [];
  for (let i = 0; i < slips.length - 1; i++) {
    const d1 = new Date(slips[i].date + 'T00:00:00');
    const d2 = new Date(slips[i+1].date + 'T00:00:00');
    gaps.push(Math.abs(Math.floor((d1 - d2) / 86400000)));
  }
  const avgGap    = Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length);
  const lastSlip  = new Date(slips[0].date + 'T00:00:00');
  const today     = new Date();
  today.setHours(0,0,0,0);
  const daysSince = Math.floor((today - lastSlip) / 86400000);

  if (avgGap >= 3 && daysSince >= Math.floor(avgGap * 0.75)) {
    insights.push({
      type:      'slip_predictor',
      habitId:   habit.id,
      habitName: habit.name,
      icon:      '⚡',
      color:     '#FF9F0A',
      title:     `Day ${daysSince} clean on "${habit.name}" — stay sharp`,
      detail:    `Your data shows an average of ${avgGap} days between slips. Not a warning — just awareness. You decide what happens next.`,
      priority:  9,
    });
  } else if (daysSince >= 14) {
    insights.push({
      type:      'clean_streak',
      habitId:   habit.id,
      habitName: habit.name,
      icon:      habit.icon,
      color:     '#30D158',
      title:     `${daysSince} days clean on "${habit.name}"`,
      detail:    `Not luck. Not circumstance. ${daysSince} days of deciding differently, one at a time. This is who you are becoming.`,
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

const _analyzeMissReasons = async (habit, db, fromDate) => {
  const insights = [];
  const missLogs = await db.getAllAsync(
    `SELECT reason, COUNT(*) as count FROM miss_logs
     WHERE habit_id = ? AND date >= ? AND status = 'missed'
     GROUP BY reason ORDER BY count DESC`,
    [habit.id, fromDate]
  ) || [];

  if (missLogs.length === 0 || missLogs[0].count < 2) return insights;

  const top   = missLogs[0];
  const total = missLogs.reduce((s, r) => s + r.count, 0);
  const pct   = Math.round((top.count / total) * 100);

  const detail = {
    forgot:      'What isn\'t scheduled doesn\'t happen. Set a notification and treat it like a meeting.',
    no_time:     'Time isn\'t found — it\'s made. Block it the night before like any other appointment.',
    too_tired:   'Tired by evening is a pattern. Move it earlier — the energy is there in the morning.',
    sick:        'Illness is valid. The streak recovers. You don\'t need to punish yourself for it.',
    distracted:  'Remove the escape route before it\'s needed. Phone in another room. Barrier removed.',
    overwhelmed: 'On hard days, do 20% of the habit. Something always beats nothing.',
    just_didnt:  'The most honest answer. Now ask what made it easier not to — and remove that.',
  };

  insights.push({
    type:      'miss_reason',
    habitId:   habit.id,
    habitName: habit.name,
    icon:      habit.icon,
    color:     habit.color || '#F5A623',
    title:     `"${habit.name}" — the pattern behind the misses`,
    detail:    detail[top.reason] || `${pct}% of misses share the same root. Address the root, not the symptom.`,
    priority:  8,
  });

  return insights;
};

const _analyzeCrossHabitCorrelation = async (habits, db, fromDate) => {
  const buildHabits = habits.filter(h => h.type === 'build');
  if (buildHabits.length < 2) return [];

  for (let i = 0; i < buildHabits.length; i++) {
    for (let j = i + 1; j < buildHabits.length; j++) {
      const h1 = buildHabits[i];
      const h2 = buildHabits[j];

      const [m1, m2] = await Promise.all([
        db.getAllAsync(`SELECT date FROM checkins WHERE habit_id = ? AND date >= ? AND status IN ('missed','auto_skipped')`, [h1.id, fromDate]),
        db.getAllAsync(`SELECT date FROM checkins WHERE habit_id = ? AND date >= ? AND status IN ('missed','auto_skipped')`, [h2.id, fromDate]),
      ]);

      if (!m1 || m1.length < 3 || !m2 || m2.length < 3) continue;

      const dates2  = new Set(m2.map(m => m.date));
      const overlap = m1.filter(m => dates2.has(m.date)).length;
      const corr    = overlap / Math.min(m1.length, m2.length);

      if (corr >= 0.6 && overlap >= 3) {
        return [{
          type:   'cross_habit',
          icon:   '🔗',
          color:  '#FF9F0A',
          title:  `"${h1.name}" and "${h2.name}" fall on the same days`,
          detail: `${Math.round(corr * 100)}% of the time you miss one, you miss the other too. They share a root cause. Fix the environment and you fix both.`,
          priority: 8,
        }];
      }
    }
  }
  return [];
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