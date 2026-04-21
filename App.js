// ─── KARMA APP — ROOT (PHASE 7 FINAL) ────────────────────────────────
// Reads theme preference from DB before first render.
// Applies theme to Colors object — all screens pick it up.

import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer }  from '@react-navigation/native';
import { StatusBar }            from 'expo-status-bar';
import { SafeAreaProvider }     from 'react-native-safe-area-context';
import * as Notifications       from 'expo-notifications';
import ErrorBoundary            from './src/components/ErrorBoundary';
import SplashScreen             from './src/screens/SplashScreen';
import AppNavigator             from './src/navigation/AppNavigator';
import { Colors, setAppTheme }  from './src/constants/colors';
import {
  configureNotifications,
  scheduleAllHabitNotifications,
} from './src/services/notificationService';
import { getDatabase }    from './src/database/database';
import { getSetting }     from './src/database/habitService';

configureNotifications();

export default function App() {
  const [ready,      setReady]      = useState(false);
  const [appVisible, setAppVisible] = useState(false);
  const navRef                       = useRef(null);
  const responseListenerRef          = useRef(null);

  useEffect(() => {
    _applyThemeEarly();
    _setupNotifListener();
    return () => {
      if (responseListenerRef.current) {
        Notifications.removeNotificationSubscription(responseListenerRef.current);
      }
    };
  }, []);

  // Apply theme before splash even shows — prevents flash
  const _applyThemeEarly = async () => {
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
          console.warn('Notification response error:', err.message);
        }
      }
    );
  };

  const _handleAppReady = async () => {
    try {
      await scheduleAllHabitNotifications();
    } catch (err) {
      console.warn('Could not schedule notifications:', err.message);
    }
    setAppVisible(true);
  };

  const navTheme = {
    dark: Colors.isDark,
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
          style={Colors.isDark ? 'light' : 'dark'}
          backgroundColor="transparent"
          translucent
        />
        {!appVisible ? (
          <SplashScreen onReady={_handleAppReady} />
        ) : (
          <NavigationContainer theme={navTheme} ref={navRef}>
            <AppNavigator />
          </NavigationContainer>
        )}
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}