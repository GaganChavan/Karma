// ─── KARMA APP — WHATSAPP SERVICE (PHASE E) ──────────────────────────
// Phase E: handles auto_skipped status in daily report
// auto_skipped = ⚠️ Not logged (shown as accountability nudge)

import { Linking, Alert } from 'react-native';
import { getDailyHomeShloka } from '../constants/shlokas';

// ── Format helpers ────────────────────────────────────────────────────

const _todayStr = () => {
  const d = new Date();
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

const _dayName = () =>
  ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];

const _weekRange = () => {
  const end   = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  return `${start.getDate()}/${start.getMonth()+1} – ${end.getDate()}/${end.getMonth()+1}`;
};

const _encode = (text) => encodeURIComponent(text);

// ── DAILY REPORT ─────────────────────────────────────────────────────

export const sendDailyWhatsApp = async (reportData) => {
  const {
    alterEgo  = 'Gagan',
    habits    = [],
    checkins  = {},
    streaks   = {},
    totalXP   = 0,
    todayXP   = 0,
    karmaScore= 0,
    levelInfo = null,
  } = reportData;

  const shloka      = getDailyHomeShloka();
  const buildHabits = habits.filter(h => h.type === 'build');
  const breakHabits = habits.filter(h => h.type === 'break');

  const doneCount = habits.filter(h => {
    const c = checkins[h.id];
    return c?.status === 'done' || c?.status === 'resisted';
  }).length;

  // Build habits section
  // Phase E: added auto_skipped case — shown as ⚠️ accountability nudge
  const buildLines = buildHabits.map(h => {
    const c      = checkins[h.id];
    const streak = streaks[h.id]?.current || 0;
    if (c?.status === 'done')         return `✅ ${h.name} — ${streak}d streak 🪔`;
    if (c?.status === 'missed')       return `❌ ${h.name} — missed`;
    if (c?.status === 'skipped')      return `⏭ ${h.name} — skipped`;
    if (c?.status === 'auto_skipped') return `⚠️ ${h.name} — not logged (-2 XP)`;
    return `⬜ ${h.name} — not checked`;
  }).join('\n');

  // Break habits section
  const breakLines = breakHabits.map(h => {
    const c      = checkins[h.id];
    const streak = streaks[h.id]?.current || 0;
    if (c?.status === 'resisted')     return `✊ ${h.name} — ${streak}d clean`;
    if (c?.status === 'slip')         return `😔 ${h.name} — slipped (${c?.slip_count || 1}×)`;
    if (c?.status === 'auto_skipped') return `⚠️ ${h.name} — not logged (-2 XP)`;
    return `⬜ ${h.name} — not checked`;
  }).join('\n');

  const level = levelInfo ? `${levelInfo.icon} ${levelInfo.title}` : '—';

  const message =
`☸ *Karma — Daily Report*
${_dayName()}, ${_todayStr()}

*${alterEgo} — ${doneCount}/${habits.length} habits complete*

${buildHabits.length > 0 ? `*BUILD HABITS:*\n${buildLines}\n` : ''}${breakHabits.length > 0 ? `\n*BREAK HABITS:*\n${breakLines}\n` : ''}
━━━━━━━━━━━━━━
🪔 Level: ${level}
⚡ XP today: +${todayXP}
🔱 Karma Score: ${karmaScore}/1000
━━━━━━━━━━━━━━

_${shloka.sanskrit}_
_${shloka.roman}_
"${shloka.meaning}"
— ${shloka.reference}

The battlefield was today.
${alterEgo} showed up.`;

  await _openWhatsApp(message);
};

// ── WEEKLY REPORT ─────────────────────────────────────────────────────

export const sendWeeklyWhatsApp = async (weekData) => {
  const {
    alterEgo       = 'Gagan',
    weeklyRate     = 0,
    bestHabit      = null,
    needsWork      = null,
    topStreaks     = [],
    totalXP        = 0,
    weekXP         = 0,
    karmaScore     = 0,
    karmaScorePrev = 0,
    topTrigger     = null,
    levelInfo      = null,
    weekNumber     = 0,
  } = weekData;

  const streakLines = topStreaks.slice(0, 3).map(
    s => `🪔 ${s.name} — ${s.current} days`
  ).join('\n');

  const scoreDiff  = karmaScore - karmaScorePrev;
  const scoreArrow = scoreDiff > 0 ? `↑ +${scoreDiff}` : scoreDiff < 0 ? `↓ ${scoreDiff}` : '→ steady';

  const message =
`☸ *Karma — Weekly Report*
Week ${weekNumber} · ${_weekRange()}

*${alterEgo} — ${weeklyRate}% consistent this week*

${bestHabit ? `💪 Best habit: ${bestHabit.name} (${bestHabit.rate}%)\n` : ''}${needsWork ? `⚠️ Needs work: ${needsWork.name} (${needsWork.rate}%)\n` : ''}
*STREAKS THIS WEEK:*
${streakLines || '—'}

━━━━━━━━━━━━━━
${levelInfo ? `${levelInfo.icon} ${levelInfo.title}\n` : ''}⚡ XP this week: +${weekXP}
🔱 Karma Score: ${karmaScorePrev} → ${karmaScore} (${scoreArrow})
━━━━━━━━━━━━━━
${topTrigger ? `\n🧠 *Your top trigger this week:* ${topTrigger}\n` : ''}
_अभ्यासेन तु कौन्तेय_
_वैराग्येण च गृह्यते_
"By practice and detachment,
the mind is mastered"
— Bhagavad Gita 6.35

The reins held this week, ${alterEgo}.
The horses are learning.`;

  await _openWhatsApp(message);
};

// ── Open WhatsApp ─────────────────────────────────────────────────────

const _openWhatsApp = async (message) => {
  try {
    const url       = `whatsapp://send?text=${_encode(message)}`;
    const canOpen   = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      const webUrl    = `https://wa.me/?text=${_encode(message)}`;
      const canOpenWeb= await Linking.canOpenURL(webUrl);
      if (canOpenWeb) {
        await Linking.openURL(webUrl);
      } else {
        Alert.alert(
          'WhatsApp Not Found',
          'WhatsApp is not installed. Install it to share your Karma reports.',
          [{ text: 'OK' }]
        );
      }
    }
  } catch (error) {
    console.error('WhatsApp open error:', error.message);
    Alert.alert('Error', `Could not open WhatsApp: ${error.message}`);
  }
};

// ── Prompt helpers ────────────────────────────────────────────────────

export const WHATSAPP_DAILY_HOUR  = 21; // 9 PM
export const WHATSAPP_WEEKLY_HOUR = 20; // 8 PM Sunday

export const shouldShowDailyPrompt = () => {
  const h = new Date().getHours();
  return h >= 20 && h <= 22;
};

export const shouldShowWeeklyPrompt = () => {
  const d = new Date();
  return d.getDay() === 0 && d.getHours() >= 19;
};