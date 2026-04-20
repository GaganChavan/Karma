// ─── KARMA APP — ROOT ENTRY POINT ────────────────────────────────────
// Manages: Splash → Main app flow.
// Wraps everything in ErrorBoundary.
// NavigationContainer at root.

import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ErrorBoundary from './src/components/ErrorBoundary';
import SplashScreen  from './src/screens/SplashScreen';
import AppNavigator  from './src/navigation/AppNavigator';

// Navigation theme — pure dark
const KarmaNavTheme = {
  dark: true,
  colors: {
    primary:       '#1E7FFF',
    background:    '#020408',
    card:          '#050A18',
    text:          '#E8F0FF',
    border:        'rgba(30,127,255,0.2)',
    notification:  '#FFB347',
  },
};

export default function App() {
  const [appReady, setAppReady] = useState(false);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor="transparent" translucent />

        {!appReady ? (
          <SplashScreen onReady={() => setAppReady(true)} />
        ) : (
          <NavigationContainer theme={KarmaNavTheme}>
            <AppNavigator />
          </NavigationContainer>
        )}
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}