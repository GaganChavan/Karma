// ─── KARMA APP — NOTIFICATION & ALARM SERVICE ───────────────────────
// Handles all notifications and alarm scheduling.
// Uses expo-notifications for soft reminders.
// Uses expo-intent-launcher for hard alarms (OnePlus clock integration).
// WorkManager equivalent via expo-notifications background tasks.

import * as Notifications        from 'expo-notifications';
import * as IntentLauncher       from 'expo-intent-launcher';
import { Platform, Alert }       from 'react-native';
import { getAllHabits, getSetting } from '../database/habitService';

// ── Notification Handler Config ───────────────────────────────────────
// Must be called once at app startup (in App.js)
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
      ios: {
        allowAlert:  true,
        allowBadge:  false,
        allowSound:  true,
      },
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

// ── Schedule a Single Habit Notification ──────────────────────────────

export const scheduleHabitNotification = async (habit) => {
  if (!habit?.reminder_time || habit.reminder_type === 'none') return null;
  if (!habit.is_active) return null;

  try {
    // Parse HH:MM time string
    const [hourStr, minuteStr] = habit.reminder_time.split(':');
    const hour   = parseInt(hourStr,   10);
    const minute = parseInt(minuteStr, 10);

    if (isNaN(hour) || isNaN(minute)) {
      console.warn(`⚠️ Invalid reminder time for habit "${habit.name}": ${habit.reminder_time}`);
      return null;
    }

    // Cancel existing notification for this habit first
    await cancelHabitNotification(habit.id);

    if (habit.reminder_type === 'hard') {
      // Hard alarm — uses Android alarm clock
      await _scheduleHardAlarm(habit, hour, minute);
      return 'hard_alarm';
    }

    // Soft notification — daily repeating
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

    console.log(`✅ Soft notification scheduled for "${habit.name}" at ${habit.reminder_time} (id: ${notifId})`);
    return notifId;

  } catch (error) {
    console.error(`scheduleHabitNotification error for "${habit.name}":`, error);
    return null;
  }
};

// ── Hard Alarm via Android Intent ─────────────────────────────────────

const _scheduleHardAlarm = async (habit, hour, minute) => {
  try {
    if (Platform.OS !== 'android') {
      console.warn('Hard alarms only supported on Android');
      return;
    }

    // Open Android alarm clock with pre-filled details
    // This creates a real alarm in the phone's clock app
    await IntentLauncher.startActivityAsync(
      'android.intent.action.SET_ALARM',
      {
        extra: {
          'android.intent.extra.alarm.HOUR':             hour,
          'android.intent.extra.alarm.MINUTES':          minute,
          'android.intent.extra.alarm.MESSAGE':          `Karma — ${habit.name}`,
          'android.intent.extra.alarm.SKIP_UI':          false,
          'android.intent.extra.alarm.VIBRATE':          true,
          'android.intent.extra.alarm.DAYS':             _getDaysArray(habit.days),
        },
      }
    );

    console.log(`✅ Hard alarm intent sent for "${habit.name}" at ${hour}:${String(minute).padStart(2,'0')}`);
    Alert.alert(
      '⏰ Alarm Created',
      `A real alarm has been set for "${habit.name}" at ${habit.reminder_time}.\n\nIt will ring even when your phone is on silent.`,
      [{ text: 'Got It' }]
    );
  } catch (error) {
    console.error('_scheduleHardAlarm error:', error);
    // Fallback to soft notification if hard alarm fails
    console.log('Falling back to soft notification...');
    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏰ Karma — ${habit.name}`,
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
    Alert.alert(
      '⚠️ Alarm Fallback',
      `Couldn't create a system alarm. A notification reminder has been set instead for ${habit.reminder_time}.`,
      [{ text: 'OK' }]
    );
    return notifId;
  }
};

// ── Cancel a Habit's Notification ────────────────────────────────────

export const cancelHabitNotification = async (habitId) => {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel  = scheduled.filter(
      n => n.content?.data?.habitId === habitId
    );
    for (const notif of toCancel) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
    if (toCancel.length > 0) {
      console.log(`✅ Cancelled ${toCancel.length} notification(s) for habit ${habitId}`);
    }
  } catch (error) {
    console.error('cancelHabitNotification error:', error);
  }
};

// ── Schedule All Active Habits ────────────────────────────────────────

export const scheduleAllHabitNotifications = async () => {
  try {
    const masterEnabled = await getSetting('notification_master');
    if (masterEnabled === 'false') {
      console.log('Notifications disabled globally — skipping schedule');
      return;
    }

    const permitted = await requestNotificationPermission();
    if (!permitted) {
      console.warn('No notification permission — cannot schedule');
      return;
    }

    const habits = await getAllHabits();
    let scheduled = 0;

    for (const habit of habits) {
      if (habit.reminder_type !== 'none' && habit.reminder_time) {
        const result = await scheduleHabitNotification(habit);
        if (result) scheduled++;
      }
    }

    console.log(`✅ Scheduled ${scheduled} habit notifications`);
  } catch (error) {
    console.error('scheduleAllHabitNotifications error:', error);
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

// ── Special Notifications ─────────────────────────────────────────────

// Streak at risk — fires at 10 PM if habit not done
export const scheduleStreakWarning = async (habitName, streakDays) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🔥 Streak at Risk — ${streakDays} days!`,
        body:  `Neel, don't break your ${streakDays}-day streak on "${habitName}". You have until midnight.`,
        data:  { type: 'streak_warning' },
        sound: true,
      },
      trigger: {
        type:    Notifications.SchedulableTriggerInputTypes.DAILY,
        hour:    22,
        minute:  0,
        repeats: false, // One time only — resheduled daily by app
      },
    });
    console.log(`✅ Streak warning scheduled for "${habitName}"`);
  } catch (error) {
    console.error('scheduleStreakWarning error:', error);
  }
};

// Milestone celebration notification
export const showMilestoneNotification = async (habitName, days) => {
  try {
    const messages = {
      3:   `3 days of "${habitName}". The seed is planted, Neel! 🌱`,
      7:   `7 days! One week of karma earned on "${habitName}". 🔥`,
      14:  `14 days! Dhruv's path — you are the Pole Star. ⭐`,
      21:  `21 days! Your brain is rewiring, Neel. You're becoming it. 🧠`,
      30:  `30 days! One month of pure karma. The sky has witnessed every day. ☸`,
      48:  `48 days! You are now in the top 5%. Most people quit before this. ⚡`,
      60:  `60 days! Like Pisces water — quiet, persistent, unstoppable. 🌊`,
      90:  `90 days! This is no longer a habit, Neel. This is who you are. 🔱`,
      180: `180 days! Half a year of karma. Extraordinary. 🏆`,
      365: `365 days! A full year. The sky was always yours, Neel. 🌌`,
    };

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🏆 ${days}-Day Milestone Reached!`,
        body:  messages[days] || `${days} days strong, Neel! Keep building karma.`,
        data:  { type: 'milestone' },
        sound: true,
      },
      trigger: null, // Immediate
    });
  } catch (error) {
    console.error('showMilestoneNotification error:', error);
  }
};

// Daily summary — fires at 8 PM
export const scheduleDailySummary = async (doneCount, totalCount, alterEgo = 'Neel') => {
  try {
    const remaining = totalCount - doneCount;
    const body = remaining === 0
      ? `All ${totalCount} habits done today, ${alterEgo}! Your karma is strong. 🔥`
      : `${doneCount}/${totalCount} habits done. ${remaining} remaining — don't stop now, ${alterEgo}.`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '☸ Karma — Daily Summary',
        body,
        data:  { type: 'daily_summary' },
        sound: true,
      },
      trigger: {
        type:    Notifications.SchedulableTriggerInputTypes.DAILY,
        hour:    20,
        minute:  0,
        repeats: true,
      },
    });
  } catch (error) {
    console.error('scheduleDailySummary error:', error);
  }
};

// Punishment escalation notification
export const schedulePunishmentNotification = async (habitName, level, alterEgo = 'Neel') => {
  const messages = {
    2: `⚠️ ${alterEgo}, "${habitName}" — you've slipped 3-4 times this week. This is becoming a pattern.`,
    3: `🔴 HARSH: ${alterEgo}, "${habitName}" — 5+ slips. You are working against yourself.`,
    4: `⛔ MAXIMUM: ${alterEgo} — "${habitName}" requires your full attention. This is serious.`,
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
      trigger: null, // Immediate
    });
  } catch (error) {
    console.error('schedulePunishmentNotification error:', error);
  }
};

// ── Utility Helpers ───────────────────────────────────────────────────

const _getNotificationBody = (habit) => {
  const bodies = {
    build: [
      `Time for "${habit.name}", Neel. Your karma awaits.`,
      `Don't break the chain — "${habit.name}" is waiting.`,
      `☸ "${habit.name}" — every day counts.`,
      `Neel, your streak depends on this moment. "${habit.name}".`,
    ],
    break: [
      `Stay strong, Neel. Resist "${habit.name}" today.`,
      `Your discipline is being tested. Hold the line on "${habit.name}".`,
      `Every day you resist "${habit.name}" is karma earned.`,
    ],
  };

  const pool = bodies[habit.type] || bodies.build;
  return pool[Math.floor(Math.random() * pool.length)];
};

const _getDaysArray = (daysString) => {
  // Convert "1,2,3,4,5,6,7" to Android Calendar day constants
  // Android: 1=Sunday, 2=Monday ... 7=Saturday
  // Our format: 1=Monday ... 7=Sunday
  const dayMap = {
    '1': 2, // Monday → Calendar.MONDAY
    '2': 3, // Tuesday
    '3': 4, // Wednesday
    '4': 5, // Thursday
    '5': 6, // Friday
    '6': 7, // Saturday
    '7': 1, // Sunday
  };

  if (!daysString) return [2,3,4,5,6,7,1]; // All days
  return daysString.split(',').map(d => dayMap[d]).filter(Boolean);
};

// ── Check Notification Status ─────────────────────────────────────────

export const getScheduledNotifications = async () => {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled;
  } catch (error) {
    console.error('getScheduledNotifications error:', error);
    return [];
  }
};

export const getNotificationPermissionStatus = async () => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  } catch (error) {
    return 'unknown';
  }
};