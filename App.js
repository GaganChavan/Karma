// ─── KARMA APP — ROOT (PHASE C) ──────────────────────────────────────
// ThemeProvider wraps everything — live theme switching, no restart.
// Flow: Splash → Identity → App

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
import { getDatabase }  from './src/database/database';
import { getSetting, setSetting }   from './src/database/habitService';

configureNotifications();

const PHASE = { SPLASH: 'splash', IDENTITY: 'identity', APP: 'app' };

// Inner component has access to ThemeProvider
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
    try {
      const lastShown = await getSetting('identity_shown_date');
      const today     = new Date().toISOString().split('T')[0];
      setPhase(lastShown !== today ? PHASE.IDENTITY : PHASE.APP);
    } catch {
      setPhase(PHASE.IDENTITY);
    }
  };

  const _handleIdentityDismiss = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await setSetting('identity_shown_date', today);
    } catch {}
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

// Root reads saved theme before rendering
export default function App() {
  const [initialTheme, setInitialTheme] = useState(null);

  useEffect(() => {
    _loadTheme();
  }, []);

  const _loadTheme = async () => {
    try {
      await getDatabase();
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