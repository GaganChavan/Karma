// ─── KARMA APP — NOTIFICATION SERVICE (PHASE F-4) ────────────────────
// Phase F-4 changes:
// - Configurable smart notifications system
// - 4 default notification types stored in settings as JSON:
//   morning_intention, evening_log, streak_protection, sunday_reflection
// - Each config: { id, name, enabled, time, message, days[] }
// - Days use Expo weekday format: 1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri, 7=Sat
// - scheduleConfigurableNotifications() schedules all active configs
// - All existing habit reminder functionality preserved unchanged

import * as Notifications from 'expo-notifications';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform, Alert }  from 'react-native';
import { getAllHabits, getSetting } from '../database/habitService';

// ── Notification Handler Config ───────────────────────────────────────
export const configureNotifications = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge:  false,
    }),
  });
};

// ── Permission Request ────────────────────────────────────────────────
export const requestNotificationPermission = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    });
    if (status !== 'granted') {
      console.warn('⚠️ Notification permission denied');
      return false;
    }
    return true;
  } catch (error) {
    console.error('requestNotificationPermission error:', error);
    return false;
  }
};

// ── Default Configurable Notification Configs ─────────────────────────
// These are the defaults. User edits them in NotificationSettingsScreen.
// Stored as JSON in settings key 'notification_configs'.
// Days: Expo weekday format — 1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri, 7=Sat
export const DEFAULT_NOTIFICATION_CONFIGS = [
  {
    id:      'morning_intention',
    name:    'Morning Intention',
    enabled: true,
    time:    '06:30',
    message: 'A new day. A new vote for who you are becoming. Show up.',
    days:    [2, 3, 4, 5, 6, 7, 1],  // All 7 days
  },
  {
    id:      'evening_log',
    name:    'Evening Log Reminder',
    enabled: true,
    time:    '21:00',
    message: 'Before you sleep — log today. Honesty tonight builds discipline tomorrow.',
    days:    [2, 3, 4, 5, 6],  // Mon–Fri default
  },
  {
    id:      'streak_protection',
    name:    'Streak Protection',
    enabled: true,
    time:    '21:30',
    message: "Don't let today break the chain. 60 seconds to log. Do it now.",
    days:    [2, 3, 4, 5, 6, 7, 1],  // All 7 days
  },
  {
    id:      'sunday_reflection',
    name:    'Sunday Reflection',
    enabled: true,
    time:    '20:00',
    message: 'The week is done. Before you close it — what did it teach you?',
    days:    [1],  // Sunday only
  },
  {
    id:      'pattern_warning',
    name:    'Evening Pattern Warning',
    enabled: true,
    time:    '19:00',
    message: 'Evening. This is when discipline breaks for most people. Your patterns know this. Stay sharp.',
    days:    [2, 3, 4, 5, 6, 7, 1],  // All 7 days
  },
];

// ── Load notification configs from settings ───────────────────────────
export const getNotificationConfigs = async () => {
  try {
    const raw = await getSetting('notification_configs');
    if (!raw) return DEFAULT_NOTIFICATION_CONFIGS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_NOTIFICATION_CONFIGS;
    return parsed;
  } catch {
    return DEFAULT_NOTIFICATION_CONFIGS;
  }
};

// ── Schedule all configurable notifications ───────────────────────────
// Called on app startup and after user saves changes in NotificationSettingsScreen.
// Each day in config.days gets its own weekly scheduled notification.
// Identifier format: `karma_config_{id}_{dayNumber}` — easy to cancel by pattern.
export const scheduleConfigurableNotifications = async () => {
  try {
    const masterEnabled = await getSetting('notification_master');
    if (masterEnabled === 'false') {
      console.log('Notifications disabled globally');
      return;
    }

    const permitted = await requestNotificationPermission();
    if (!permitted) return;

    const configs   = await getNotificationConfigs();
    const alterEgo  = (await getSetting('alter_ego')) || 'Gagan';

    // Cancel all existing configurable notifications first
    await cancelConfigurableNotifications();

    let scheduledCount = 0;

    for (const config of configs) {
      if (!config.enabled) continue;
      if (!config.time || !config.days || config.days.length === 0) continue;

      const [hourStr, minuteStr] = config.time.split(':');
      const hour   = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);
      if (isNaN(hour) || isNaN(minute)) continue;

      // Personalise message with alter ego name
      const message = (config.message || '').replace('Gagan', alterEgo);

      // Schedule one notification per selected day
      for (const weekday of config.days) {
        const identifier = `karma_config_${config.id}_${weekday}`;

        // Cancel existing before rescheduling
        try {
          await Notifications.cancelScheduledNotificationAsync(identifier);
        } catch {}

        await Notifications.scheduleNotificationAsync({
          identifier,
          content: {
            title:  '☸ Karma',
            body:   message,
            data:   { type: 'configurable', configId: config.id },
            sound:  true,
          },
          trigger: {
            type:    Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday, // 1=Sun, 2=Mon...7=Sat (Expo format)
            hour,
            minute,
            repeats: true,
          },
        });
        scheduledCount++;
      }
    }

    console.log(`✅ Scheduled ${scheduledCount} configurable notifications`);
  } catch (error) {
    console.error('scheduleConfigurableNotifications error:', error);
  }
};

// Cancel all karma configurable notifications (by identifier prefix pattern)
export const cancelConfigurableNotifications = async () => {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel  = scheduled.filter(n => n.identifier?.startsWith('karma_config_'));
    for (const n of toCancel) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
    if (toCancel.length > 0) {
      console.log(`Cancelled ${toCancel.length} configurable notifications`);
    }
  } catch (error) {
    console.error('cancelConfigurableNotifications error:', error);
  }
};

// ── Schedule All Notifications (habit + configurable) ─────────────────
// Called on app startup in App.js after splash
export const scheduleAllHabitNotifications = async () => {
  try {
    const masterEnabled = await getSetting('notification_master');
    if (masterEnabled === 'false') {
      console.log('Notifications disabled globally — skipping');
      return;
    }

    const permitted = await requestNotificationPermission();
    if (!permitted) {
      console.warn('No notification permission');
      return;
    }

    // Schedule per-habit reminders
    const habits = await getAllHabits();
    let scheduled = 0;
    for (const habit of habits) {
      if (habit.reminder_type !== 'none' && habit.reminder_time) {
        const result = await scheduleHabitNotification(habit);
        if (result) scheduled++;
      }
    }

    // Schedule configurable smart notifications
    await scheduleConfigurableNotifications();

    console.log(`✅ Scheduled ${scheduled} habit + configurable notifications`);
  } catch (error) {
    console.error('scheduleAllHabitNotifications error:', error);
  }
};

// ── Schedule a Single Habit Notification ─────────────────────────────
export const scheduleHabitNotification = async (habit) => {
  if (!habit?.reminder_time || habit.reminder_type === 'none') return null;
  if (!habit.is_active) return null;
  try {
    const [hourStr, minuteStr] = habit.reminder_time.split(':');
    const hour   = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    if (isNaN(hour) || isNaN(minute)) {
      console.warn(`Invalid reminder time for habit "${habit.name}": ${habit.reminder_time}`);
      return null;
    }

    await cancelHabitNotification(habit.id);

    if (habit.reminder_type === 'hard') {
      await _scheduleHardAlarm(habit, hour, minute);
      return 'hard_alarm';
    }

    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `☸ Karma — ${habit.name}`,
        body:  _getNotificationBody(habit),
        data:  { habitId: habit.id, type: 'habit_reminder' },
        sound: true,
      },
      trigger: {
        type:    Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        repeats: true,
      },
    });
    console.log(`✅ Notification scheduled for "${habit.name}" at ${habit.reminder_time}`);
    return notifId;
  } catch (error) {
    console.error(`scheduleHabitNotification error for "${habit.name}":`, error);
    return null;
  }
};

// ── Hard Alarm via Android Intent ────────────────────────────────────
const _scheduleHardAlarm = async (habit, hour, minute) => {
  if (Platform.OS !== 'android') {
    console.warn('Hard alarms only supported on Android');
    return;
  }

  const _tryIntent = async (withDays) => {
    const extra = {
      'android.intent.extra.alarm.HOUR':    hour,
      'android.intent.extra.alarm.MINUTES': minute,
      'android.intent.extra.alarm.MESSAGE': `Karma — ${habit.name}`,
      'android.intent.extra.alarm.SKIP_UI': false,
      'android.intent.extra.alarm.VIBRATE': true,
    };
    if (withDays) extra['android.intent.extra.alarm.DAYS'] = _getDaysArray(habit.days);
    await IntentLauncher.startActivityAsync('android.intent.action.SET_ALARM', { extra });
  };

  // Level 1: try with repeat days
  try {
    await _tryIntent(true);
    Alert.alert(
      '⏰ Alarm Created',
      `System alarm set for "${habit.name}" at ${habit.reminder_time}. It will ring even on silent.`,
      [{ text: 'Got It' }]
    );
    return;
  } catch {}

  // Level 2: some clock apps reject the DAYS extra — try without it
  try {
    await _tryIntent(false);
    Alert.alert(
      '⏰ Alarm Created',
      `System alarm set for "${habit.name}" at ${habit.reminder_time}.\n\nNote: repeat days couldn't be pre-set — please confirm days in your Clock app.`,
      [{ text: 'Got It' }]
    );
    return;
  } catch (error) {
    console.error('_scheduleHardAlarm error:', error);
  }

  // Level 3: full fallback to notification
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `⏰ Karma — ${habit.name}`,
      body:  _getNotificationBody(habit),
      data:  { habitId: habit.id, type: 'habit_reminder' },
      sound: true,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, repeats: true },
  });
  Alert.alert(
    '⚠️ Alarm Fallback',
    `Your phone's Clock app couldn't be reached.\nA notification reminder has been set for ${habit.reminder_time} instead.`,
    [{ text: 'OK' }]
  );
};

// ── Cancel a Habit's Notification ────────────────────────────────────
export const cancelHabitNotification = async (habitId) => {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel  = scheduled.filter(n => n.content?.data?.habitId === habitId);
    for (const notif of toCancel) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  } catch (error) {
    console.error('cancelHabitNotification error:', error);
  }
};

// ── Cancel All Notifications ──────────────────────────────────────────
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('✅ All notifications cancelled');
  } catch (error) {
    console.error('cancelAllNotifications error:', error);
  }
};

// ── Special Notifications (existing — unchanged) ──────────────────────

export const scheduleStreakWarning = async (habitName, streakDays) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🔥 Streak at Risk — ${streakDays} days!`,
        body:  `Don't break your ${streakDays}-day streak on "${habitName}". You have until midnight.`,
        data:  { type: 'streak_warning' },
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 22, minute: 0, repeats: false },
    });
  } catch (error) {
    console.error('scheduleStreakWarning error:', error);
  }
};

export const showMilestoneNotification = async (habitName, days) => {
  const messages = {
    3:   `3 days of "${habitName}". The seed is planted! 🌱`,
    7:   `7 days! One week of karma earned on "${habitName}". 🔥`,
    14:  `14 days! Dhruv's path — you are the Pole Star. ⭐`,
    21:  `21 days! Your brain is rewiring. You're becoming it. 🧠`,
    30:  `30 days! One month of pure karma. ☸`,
    48:  `48 days! You are now in the top 5%. Most quit before this. ⚡`,
    60:  `60 days! Quiet, persistent, unstoppable. 🌊`,
    90:  `90 days! This is no longer a habit. This is who you are. 🔱`,
    180: `180 days! Half a year of karma. Extraordinary. 🏆`,
    365: `365 days! A full year. The sky was always yours. 🌌`,
  };
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🏆 ${days}-Day Milestone Reached!`,
        body:  messages[days] || `${days} days strong! Keep building karma.`,
        data:  { type: 'milestone' },
        sound: true,
      },
      trigger: null,
    });
  } catch (error) {
    console.error('showMilestoneNotification error:', error);
  }
};

export const schedulePunishmentNotification = async (habitName, level, alterEgo = 'Gagan') => {
  const messages = {
    2: `⚠️ ${alterEgo}, "${habitName}" — you've slipped 3-4 times this week. Pattern forming.`,
    3: `🔴 HARSH: ${alterEgo}, "${habitName}" — 5+ slips. Working against yourself.`,
    4: `⛔ MAXIMUM: ${alterEgo} — "${habitName}" requires full attention. This is serious.`,
  };
  if (!messages[level]) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `☸ Karma — Accountability Check`,
        body:  messages[level],
        data:  { type: 'punishment' },
        sound: true,
      },
      trigger: null,
    });
  } catch (error) {
    console.error('schedulePunishmentNotification error:', error);
  }
};

// ── Utility Helpers ───────────────────────────────────────────────────
const _getNotificationBody = (habit) => {
  const bodies = {
    build: [
      `Time for "${habit.name}". Your karma awaits.`,
      `Don't break the chain — "${habit.name}" is waiting.`,
      `☸ "${habit.name}" — every day counts.`,
      `Your streak depends on this moment. "${habit.name}".`,
    ],
    break: [
      `Stay strong. Resist "${habit.name}" today.`,
      `Your discipline is being tested. Hold the line on "${habit.name}".`,
      `Every day you resist "${habit.name}" is karma earned.`,
    ],
  };
  const pool = bodies[habit.type] || bodies.build;
  return pool[Math.floor(Math.random() * pool.length)];
};

const _getDaysArray = (daysString) => {
  const dayMap = { '1': 2, '2': 3, '3': 4, '4': 5, '5': 6, '6': 7, '7': 1 };
  if (!daysString) return [2,3,4,5,6,7,1];
  return daysString.split(',').map(d => dayMap[d]).filter(Boolean);
};

export const getScheduledNotifications    = async () => {
  try { return await Notifications.getAllScheduledNotificationsAsync(); }
  catch { return []; }
};

export const getNotificationPermissionStatus = async () => {
  try { const { status } = await Notifications.getPermissionsAsync(); return status; }
  catch { return 'unknown'; }
};