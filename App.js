// ─── KARMA APP — ROOT ENTRY POINT (PHASE 3 UPDATE) ───────────────────
// Added: notification handler configuration at startup
// Added: notification response listener (tap notification → open app)

import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer }  from '@react-navigation/native';
import { StatusBar }            from 'expo-status-bar';
import { SafeAreaProvider }     from 'react-native-safe-area-context';
import * as Notifications       from 'expo-notifications';
import ErrorBoundary            from './src/components/ErrorBoundary';
import SplashScreen             from './src/screens/SplashScreen';
import AppNavigator             from './src/navigation/AppNavigator';
import { configureNotifications, scheduleAllHabitNotifications } from './src/services/notificationService';

// Configure how notifications appear when app is foregrounded
configureNotifications();

const KarmaNavTheme = {
  dark: true,
  colors: {
    primary:      '#1E7FFF',
    background:   '#020408',
    card:         '#050A18',
    text:         '#E8F0FF',
    border:       'rgba(30,127,255,0.2)',
    notification: '#FFB347',
  },
};

export default function App() {
  const [appReady, setAppReady]     = useState(false);
  const navigationRef               = useRef(null);
  const notifListenerRef            = useRef(null);
  const notifResponseListenerRef    = useRef(null);

  useEffect(() => {
    // Listen for notifications received while app is open
    notifListenerRef.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📩 Notification received:', notification.request.content.title);
    });

    // Listen for user tapping a notification
    notifResponseListenerRef.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('👆 Notification tapped:', data);

      // Navigate to relevant screen based on notification type
      if (data?.habitId && navigationRef.current) {
        navigationRef.current.navigate('HabitDetail', { habitId: data.habitId });
      }
    });

    return () => {
      // Cleanup listeners on unmount
      if (notifListenerRef.current) {
        Notifications.removeNotificationSubscription(notifListenerRef.current);
      }
      if (notifResponseListenerRef.current) {
        Notifications.removeNotificationSubscription(notifResponseListenerRef.current);
      }
    };
  }, []);

  const _handleAppReady = async () => {
    // Schedule all habit notifications after app initializes
    try {
      await scheduleAllHabitNotifications();
    } catch (error) {
      console.warn('Could not schedule notifications:', error.message);
    }
    setAppReady(true);
  };

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor="transparent" translucent />
        {!appReady ? (
          <SplashScreen onReady={_handleAppReady} />
        ) : (
          <NavigationContainer theme={KarmaNavTheme} ref={navigationRef}>
            <AppNavigator />
          </NavigationContainer>
        )}
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}