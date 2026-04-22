// ─── KARMA APP — ROOT (GITA PHASE A) ─────────────────────────────────
// Flow: Splash → Identity Declaration → Main App
// Identity screen shown once per day.

import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer }  from '@react-navigation/native';
import { StatusBar }            from 'expo-status-bar';
import { SafeAreaProvider }     from 'react-native-safe-area-context';
import * as Notifications       from 'expo-notifications';
import ErrorBoundary            from './src/components/ErrorBoundary';
import SplashScreen             from './src/screens/SplashScreen';
import IdentityScreen           from './src/screens/IdentityScreen';
import AppNavigator             from './src/navigation/AppNavigator';
import { Colors, setAppTheme }  from './src/constants/colors';
import {
  configureNotifications,
  scheduleAllHabitNotifications,
} from './src/services/notificationService';
import { getDatabase }  from './src/database/database';
import { getSetting }   from './src/database/habitService';

configureNotifications();

const PHASE = {
  SPLASH:   'splash',
  IDENTITY: 'identity',
  APP:      'app',
};

export default function App() {
  const [phase,   setPhase]   = useState(PHASE.SPLASH);
  const navRef                 = useRef(null);
  const responseListenerRef    = useRef(null);

  useEffect(() => {
    _applyTheme();
    _setupNotifListener();
    return () => {
      if (responseListenerRef.current) {
        Notifications.removeNotificationSubscription(responseListenerRef.current);
      }
    };
  }, []);

  const _applyTheme = async () => {
    try {
      await getDatabase();
      const theme = await getSetting('app_theme');
      setAppTheme(theme || 'dark');
    } catch {
      setAppTheme('dark');
    }
  };

  const _setupNotifListener = () => {
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
  };

  const _handleSplashReady = async () => {
    try {
      await scheduleAllHabitNotifications();
    } catch (err) {
      console.warn('Could not schedule notifications:', err.message);
    }

    // Check if identity screen was shown today
    try {
      const lastShown = await getSetting('identity_shown_date');
      const today     = new Date().toISOString().split('T')[0];
      if (lastShown !== today) {
        setPhase(PHASE.IDENTITY);
      } else {
        setPhase(PHASE.APP);
      }
    } catch {
      setPhase(PHASE.IDENTITY);
    }
  };

  const _handleIdentityDismiss = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { setSetting } = require('./src/database/habitService');
      await setSetting('identity_shown_date', today);
    } catch {}
    setPhase(PHASE.APP);
  };

  const navTheme = {
    dark: Colors.isDark !== false,
    colors: {
      primary:      Colors.gold,
      background:   Colors.background,
      card:         Colors.backgroundCard,
      text:         Colors.textPrimary,
      border:       Colors.separator,
      notification: Colors.gold,
    },
  };

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar
          style={Colors.isDark !== false ? 'light' : 'dark'}
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
            <AppNavigator />
          </NavigationContainer>
        )}

      </SafeAreaProvider>
    </ErrorBoundary>
  );
}