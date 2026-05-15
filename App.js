// ─── KARMA APP — ROOT (PHASE F-1) ────────────────────────────────────
// Phase F-1 additions:
// - SIP migration flow: SPLASH → IDENTITY → SIP_MIGRATION (once) → APP
// - Auto-skip XP updated to -2 (from -3)
// - Auto-skip toast updated (was "3 XP", now "2 XP per habit")
// - Everything else identical to Phase E

import React, { useState, useEffect, useRef } from 'react';
import { Alert }                    from 'react-native';
import { NavigationContainer }      from '@react-navigation/native';
import { StatusBar }                from 'expo-status-bar';
import { SafeAreaProvider }         from 'react-native-safe-area-context';
import * as Notifications           from 'expo-notifications';
import ErrorBoundary                from './src/components/ErrorBoundary';
import SplashScreen                 from './src/screens/SplashScreen';
import IdentityScreen               from './src/screens/IdentityScreen';
import SIPMigrationScreen           from './src/screens/SIPMigrationScreen';
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

const PHASE = {
  SPLASH:         'splash',
  IDENTITY:       'identity',
  SIP_MIGRATION:  'sip_migration',  // Phase F-1: one-time SIP categorisation
  APP:            'app',
};

// ── Auto-skip helpers ─────────────────────────────────────────────────

const _getYesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// days stored as comma-separated '1,2,3,4,5,6,7' (1=Mon...7=Sun, app format)
// getDay() returns 0=Sun...6=Sat → convert: 0→7, else keep
const _wasScheduledOn = (habit, dateStr) => {
  if (habit.frequency === 'daily') return true;
  if (habit.frequency === 'specific_days') {
    try {
      const days = habit.days;
      if (!days) return false;
      const scheduledDays = days.split(',').map(s => parseInt(s.trim(), 10));
      const jsDay  = new Date(dateStr + 'T00:00:00').getDay();
      const appDay = jsDay === 0 ? 7 : jsDay;
      return scheduledDays.includes(appDay);
    } catch { return false; }
  }
  return false;
};

const runAutoSkip = async () => {
  try {
    const yesterday = _getYesterdayStr();
    const habits    = await getHabitsForAutoSkip();
    let skippedCount = 0;
    const skippedNames = [];

    for (const habit of habits) {
      if (!_wasScheduledOn(habit, yesterday)) continue;
      if (habit.is_wfo_skip === 1) continue;
      const existing = await getCheckinForDate(habit.id, yesterday);
      if (existing) continue;
      await insertAutoSkipCheckin(habit.id, yesterday);
      await deductAutoSkipXP(habit.id, yesterday);  // -2 XP (Phase F-1)
      skippedCount++;
      skippedNames.push(habit.name);
    }

    return { skippedCount, skippedNames };
  } catch (e) {
    console.warn('runAutoSkip:', e.message);
    return { skippedCount: 0, skippedNames: [] };
  }
};

// ── Inner component ───────────────────────────────────────────────────

const AppInner = ({ autoSkipResult, needsSIPMigration, onSIPComplete }) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const [phase,  setPhase]  = useState(PHASE.SPLASH);
  const navRef              = useRef(null);
  const responseListenerRef = useRef(null);
  const toastShownRef       = useRef(false);

  useEffect(() => { updateStaticColors(colors); }, [colors]);

  useEffect(() => {
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(
      response => {
        try {
          const data = response.notification.request.content.data;
          if (data?.habitId && navRef.current) {
            navRef.current.navigate('HabitDetail', { habitId: data.habitId });
          }
        } catch (err) {
          console.warn('Notification tap:', err.message);
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
    try { await scheduleAllHabitNotifications(); } catch {}
    setPhase(PHASE.IDENTITY);
  };

  const _enterApp = () => {
    setPhase(PHASE.APP);
    // Auto-skip accountability toast — once per session
    if (!toastShownRef.current && autoSkipResult?.skippedCount > 0) {
      toastShownRef.current = true;
      const { skippedCount, skippedNames } = autoSkipResult;
      const xpLost   = skippedCount * 2;  // -2 XP per auto-skip (Phase F-1)
      const habitList = skippedNames.slice(0, 3).join(', ') +
        (skippedNames.length > 3 ? ` +${skippedNames.length - 3} more` : '');
      setTimeout(() => {
        Alert.alert(
          '⚠️ Yesterday — Not Logged',
          `${skippedCount} habit${skippedCount > 1 ? 's' : ''} had no log yesterday:\n\n${habitList}\n\n-${xpLost} XP deducted.\n\nLog your habits daily. Krishna watches.`,
          [{ text: 'Acknowledged' }]
        );
      }, 800);
    }
  };

  const _handleIdentityDismiss = () => {
    // Phase F-1: show SIP migration if needed, otherwise go straight to app
    if (needsSIPMigration) {
      setPhase(PHASE.SIP_MIGRATION);
    } else {
      _enterApp();
    }
  };

  const _handleSIPComplete = () => {
    onSIPComplete();
    _enterApp();
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

      {/* Phase F-1: one-time SIP category assignment */}
      {phase === PHASE.SIP_MIGRATION && (
        <SIPMigrationScreen onComplete={_handleSIPComplete} />
      )}

      {phase === PHASE.APP && (
        <NavigationContainer theme={navTheme} ref={navRef}>
          <AppNavigator toggleTheme={toggleTheme} />
        </NavigationContainer>
      )}
    </>
  );
};

// ── Root ──────────────────────────────────────────────────────────────

export default function App() {
  const [initialTheme,      setInitialTheme]      = useState(null);
  const [autoSkipResult,    setAutoSkipResult]    = useState(null);
  const [needsSIPMigration, setNeedsSIPMigration] = useState(false);

  useEffect(() => { _initApp(); }, []);

  const _initApp = async () => {
    try {
      // 1. Init DB — runs all Phase F-1 migrations including XP v2 recalculation
      await getDatabase();

      // 2. Auto-skip scan for yesterday
      const result = await runAutoSkip();
      setAutoSkipResult(result);

      // 3. Check if SIP migration needed (existing habits with no category)
      const sipDone = await getSetting('sip_migration_done');
      if (sipDone !== 'true') {
        const { getDatabase: getDB } = require('./src/database/database');
        const db = await getDatabase();
        const unhcategorised = await db.getFirstAsync(
          "SELECT id FROM habits WHERE is_active = 1 AND category IS NULL LIMIT 1"
        );
        setNeedsSIPMigration(!!unhcategorised);
      }

      // 4. Load saved theme
      const saved = await getSetting('app_theme');
      setInitialTheme(saved || 'dark');
    } catch {
      setInitialTheme('dark');
      setAutoSkipResult({ skippedCount: 0, skippedNames: [] });
    }
  };

  if (!initialTheme) return null;

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider initialTheme={initialTheme}>
          <AppInner
            autoSkipResult={autoSkipResult}
            needsSIPMigration={needsSIPMigration}
            onSIPComplete={() => setNeedsSIPMigration(false)}
          />
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}