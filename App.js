// ─── KARMA APP — ROOT (PHASE E) ──────────────────────────────────────
// Phase E additions:
// - runAutoSkip() after DB init — marks yesterday's unlogged habits
// - _wasScheduledOn() fixed: comma-separated days + correct day numbering
// - Auto-skip toast: Alert if habits were missed without logging
// - Everything else identical to Phase C

import React, { useState, useEffect, useRef } from 'react';
import { Alert }                    from 'react-native';
import { NavigationContainer }      from '@react-navigation/native';
import { StatusBar }                from 'expo-status-bar';
import { SafeAreaProvider }         from 'react-native-safe-area-context';
import * as Notifications           from 'expo-notifications';
import ErrorBoundary                from './src/components/ErrorBoundary';
import SplashScreen                 from './src/screens/SplashScreen';
import IdentityScreen               from './src/screens/IdentityScreen';
import AppNavigator                 from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme, updateStaticColors } from './src/constants/ThemeContext';
import { configureNotifications, scheduleAllHabitNotifications } from './src/services/notificationService';
import { getDatabase }              from './src/database/database';
import {
  getSetting,
  getHabitsForAutoSkip,
  getCheckinForDate,
  insertAutoSkipCheckin,
} from './src/database/habitService';
import { deductAutoSkipXP }         from './src/services/gamificationService';

configureNotifications();

const PHASE = { SPLASH: 'splash', IDENTITY: 'identity', APP: 'app' };

// ── Phase E: Auto-skip helpers ────────────────────────────────────────

// Returns yesterday's date as YYYY-MM-DD string
const _getYesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Returns true if a habit was scheduled to run on dateStr.
// FIX: days stored as comma-separated '1,2,3,4,5,6,7'
//      app format: 1=Mon, 2=Tue ... 6=Sat, 7=Sun
//      getDay() returns: 0=Sun, 1=Mon ... 6=Sat
//      conversion: getDay()===0 → appDay=7, else appDay=getDay()
const _wasScheduledOn = (habit, dateStr) => {
  if (habit.frequency === 'daily') return true;

  if (habit.frequency === 'specific_days') {
    try {
      const days = habit.days;
      if (!days) return false;
      const scheduledDays = days.split(',').map(s => parseInt(s.trim(), 10));
      const jsDay  = new Date(dateStr + 'T00:00:00').getDay(); // 0=Sun..6=Sat
      const appDay = jsDay === 0 ? 7 : jsDay;                  // 1=Mon..7=Sun
      return scheduledDays.includes(appDay);
    } catch { return false; }
  }

  // Weekly (X/week) — can't determine which specific day was required
  return false;
};

// Scans yesterday's habits. Marks unlogged ones as auto_skipped and deducts 3 XP.
// Returns count of habits that were auto-skipped (for the toast).
// INSERT OR IGNORE guarantees existing checkins (done/missed/etc) are NEVER touched.
const runAutoSkip = async () => {
  try {
    const yesterday = _getYesterdayStr();
    const habits    = await getHabitsForAutoSkip(); // active + not paused
    let skippedCount = 0;
    const skippedNames = [];

    for (const habit of habits) {
      if (!_wasScheduledOn(habit, yesterday)) continue;
      // WFO-skip habits handled by wfoService — don't double-insert
      if (habit.is_wfo_skip === 1) continue;
      // Already has a checkin — don't touch
      const existing = await getCheckinForDate(habit.id, yesterday);
      if (existing) continue;
      // Nothing logged — auto_skip + deduct XP
      await insertAutoSkipCheckin(habit.id, yesterday);
      await deductAutoSkipXP(habit.id, yesterday);
      skippedCount++;
      skippedNames.push(habit.name);
    }

    if (skippedCount > 0) {
      console.log(`⚠️ Phase E: auto-skipped ${skippedCount} habit(s) for ${yesterday}`);
    }

    return { skippedCount, skippedNames };
  } catch (e) {
    console.warn('runAutoSkip error:', e.message);
    return { skippedCount: 0, skippedNames: [] };
  }
};

// ── Inner component (has access to ThemeProvider) ─────────────────────

const AppInner = ({ autoSkipResult }) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const [phase,  setPhase]  = useState(PHASE.SPLASH);
  const navRef               = useRef(null);
  const responseListenerRef  = useRef(null);
  const toastShownRef        = useRef(false);

  useEffect(() => {
    updateStaticColors(colors);
  }, [colors]);

  useEffect(() => {
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(
      response => {
        try {
          const data = response.notification.request.content.data;
          if (data?.habitId && navRef.current) {
            navRef.current.navigate('HabitDetail', { habitId: data.habitId });
          }
        } catch (err) {
          console.warn('Notification tap error:', err.message);
        }
      }
    );
    return () => {
      if (responseListenerRef.current) {
        Notifications.removeNotificationSubscription(responseListenerRef.current);
      }
    };
  }, []);

  const _handleSplashReady = async () => {
    try {
      await scheduleAllHabitNotifications();
    } catch (err) {
      console.warn('Could not schedule notifications:', err.message);
    }
    setPhase(PHASE.IDENTITY);
  };

  const _handleIdentityDismiss = () => {
    setPhase(PHASE.APP);

    // Show auto-skip accountability toast AFTER entering the app
    // Only once per session, only if there were actual auto-skips
    if (!toastShownRef.current && autoSkipResult?.skippedCount > 0) {
      toastShownRef.current = true;
      const { skippedCount, skippedNames } = autoSkipResult;
      const xpLost = skippedCount * 3;
      const habitList = skippedNames.slice(0, 3).join(', ') +
        (skippedNames.length > 3 ? ` +${skippedNames.length - 3} more` : '');

      setTimeout(() => {
        Alert.alert(
          '⚠️ Yesterday — Not Logged',
          `${skippedCount} habit${skippedCount > 1 ? 's' : ''} had no log yesterday:\n\n${habitList}\n\n-${xpLost} XP deducted.\n\nLog your habits daily. Krishna watches.`,
          [{ text: 'Acknowledged', style: 'default' }]
        );
      }, 800); // slight delay so home screen loads first
    }
  };

  const navTheme = {
    dark: isDark,
    colors: {
      primary:      colors.gold,
      background:   colors.background,
      card:         colors.backgroundCard,
      text:         colors.textPrimary,
      border:       colors.separator,
      notification: colors.gold,
    },
  };

  return (
    <>
      <StatusBar
        style={isDark ? 'light' : 'dark'}
        backgroundColor="transparent"
        translucent
      />

      {phase === PHASE.SPLASH && (
        <SplashScreen onReady={_handleSplashReady} />
      )}

      {phase === PHASE.IDENTITY && (
        <IdentityScreen onDismiss={_handleIdentityDismiss} />
      )}

      {phase === PHASE.APP && (
        <NavigationContainer theme={navTheme} ref={navRef}>
          <AppNavigator toggleTheme={toggleTheme} />
        </NavigationContainer>
      )}
    </>
  );
};

// ── Root — init DB, run auto-skip, load theme, then render ────────────

export default function App() {
  const [initialTheme,    setInitialTheme]    = useState(null);
  const [autoSkipResult,  setAutoSkipResult]  = useState(null);

  useEffect(() => {
    _initApp();
  }, []);

  const _initApp = async () => {
    try {
      // 1. Init DB — runs all migrations including Phase E is_paused + checkins rebuild
      await getDatabase();

      // 2. Phase E: Auto-skip scan for yesterday
      //    Runs after DB ready, result shown after identity screen dismisses
      const result = await runAutoSkip();
      setAutoSkipResult(result);

      // 3. Load saved theme
      const saved = await getSetting('app_theme');
      setInitialTheme(saved || 'dark');
    } catch {
      setInitialTheme('dark');
      setAutoSkipResult({ skippedCount: 0, skippedNames: [] });
    }
  };

  // Wait until theme loaded to avoid flash
  if (!initialTheme) return null;

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider initialTheme={initialTheme}>
          <AppInner autoSkipResult={autoSkipResult} />
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}