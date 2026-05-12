// ─── KARMA APP — ROOT (PHASE E) ──────────────────────────────────────
// Phase E additions:
// - runAutoSkip() called after getDatabase() in _loadTheme
// - Marks yesterday's unlogged habits as auto_skipped (-3 XP)
// - Paused habits are excluded from auto-skip automatically
// - Everything else unchanged

import React, { useState, useEffect, useRef } from 'react';
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
import { getSetting, setSetting, getHabitsForAutoSkip, getCheckinForDate, insertAutoSkipCheckin } from './src/database/habitService';
import { deductAutoSkipXP }         from './src/services/gamificationService';

configureNotifications();

const PHASE = { SPLASH: 'splash', IDENTITY: 'identity', APP: 'app' };

// ── Phase E: Auto-skip helpers ────────────────────────────────────────

// Returns yesterday's date as YYYY-MM-DD
const _getYesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Returns true if habit was scheduled to run on a given date
const _wasScheduledOn = (habit, dateStr) => {
  if (habit.frequency === 'daily') return true;
  if (habit.frequency === 'specific_days') {
    try {
      const scheduledDays = JSON.parse(habit.days || '[]');
      const date = new Date(dateStr + 'T00:00:00');
      return scheduledDays.includes(date.getDay());
    } catch { return false; }
  }
  // Weekly (X/week) — skip auto-skip logic, can't determine which day was required
  return false;
};

// Scans yesterday and marks unlogged active non-paused habits as auto_skipped
// INSERT OR IGNORE guarantees existing checkins (done/missed/etc) are never touched
const runAutoSkip = async () => {
  try {
    const yesterday = _getYesterdayStr();
    const habits    = await getHabitsForAutoSkip(); // active, not paused

    for (const habit of habits) {
      // Not scheduled for yesterday — skip
      if (!_wasScheduledOn(habit, yesterday)) continue;

      // WFO-skip habits handled by wfoService — don't double-insert
      if (habit.is_wfo_skip === 1) continue;

      // Already has a checkin for yesterday — don't touch
      const existing = await getCheckinForDate(habit.id, yesterday);
      if (existing) continue;

      // Nothing logged — auto_skip + deduct 3 XP
      await insertAutoSkipCheckin(habit.id, yesterday);
      await deductAutoSkipXP(habit.id, yesterday);
    }

    console.log('✅ Phase E: auto-skip scan complete for', yesterday);
  } catch (e) {
    // Never crash the app over this
    console.warn('runAutoSkip error:', e.message);
  }
};

// ── Inner component (has access to ThemeProvider) ─────────────────────

const AppInner = () => {
  const { colors, isDark, toggleTheme } = useTheme();
  const [phase,  setPhase]  = useState(PHASE.SPLASH);
  const navRef               = useRef(null);
  const responseListenerRef  = useRef(null);

  // Keep static Colors in sync for non-React files
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

// ── Root — reads saved theme, runs auto-skip, then renders ────────────

export default function App() {
  const [initialTheme, setInitialTheme] = useState(null);

  useEffect(() => {
    _initApp();
  }, []);

  const _initApp = async () => {
    try {
      // 1. Init DB (migrations run inside, including Phase E is_paused column)
      await getDatabase();

      // 2. Phase E: Auto-skip scan — mark yesterday's unlogged habits
      //    Runs after DB is ready, before any screen renders
      await runAutoSkip();

      // 3. Load saved theme
      const saved = await getSetting('app_theme');
      setInitialTheme(saved || 'dark');
    } catch {
      setInitialTheme('dark');
    }
  };

  // Wait until theme loaded to avoid flash
  if (!initialTheme) return null;

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider initialTheme={initialTheme}>
          <AppInner />
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}