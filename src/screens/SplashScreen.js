// ─── KARMA APP — SPLASH SCREEN (GITA) ────────────────────────────────
// Dawn on Kurukshetra. The chariot is ready.
// Gold wheel. Gita shloka. Krishna is here.

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Animated, StyleSheet, StatusBar, Image,
} from 'react-native';
import { Colors, Typography, Spacing } from '../constants/colors';
import { SHLOKAS }    from '../constants/shlokas';
import { getDatabase } from '../database/database';
import { getSetting, setAppTheme } from '../database/habitService';
import ShlokaDisplay   from '../components/ShlokaDisplay';

const SplashScreen = ({ onReady }) => {
  const wheelSpin  = useRef(new Animated.Value(0)).current;
  const masterFade = useRef(new Animated.Value(0)).current;
  const logoScale  = useRef(new Animated.Value(0.7)).current;
  const shlokeFade = useRef(new Animated.Value(0)).current;
  const [error,    setError]   = useState(null);
  const [customBg, setCustomBg] = useState(null);

  const shloka = SHLOKAS.splash;

  useEffect(() => {
    _animate();
    _init();
  }, []);

  const _animate = () => {
    Animated.loop(
      Animated.timing(wheelSpin, { toValue: 1, duration: 6000, useNativeDriver: true })
    ).start();

    Animated.parallel([
      Animated.timing(masterFade, {
        toValue: 1, duration: 700, delay: 100, useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1, tension: 40, friction: 7, delay: 100, useNativeDriver: true,
      }),
    ]).start();

    // Shloka fades in later
    setTimeout(() => {
      Animated.timing(shlokeFade, {
        toValue: 1, duration: 600, useNativeDriver: true,
      }).start();
    }, 600);
  };

  const _init = async () => {
    try {
      await getDatabase();
      try {
        const theme = await getSetting('app_theme');
        if (theme && typeof setAppTheme === 'function') setAppTheme(theme);
        const uri  = await getSetting('splash_image_uri');
        const type = await getSetting('splash_image_type');
        if (type === 'custom' && uri) setCustomBg(uri);
      } catch {}
      await new Promise(r => setTimeout(r, 2400));
      onReady?.();
    } catch (err) {
      setError(err.message || 'The chariot could not start. Please restart.');
    }
  };

  const spin = wheelSpin.interpolate({
    inputRange: [0, 1], outputRange: ['0deg', '360deg'],
  });

  if (error) {
    return (
      <View style={styles.errorScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>The chariot could not start</Text>
        <Text style={styles.errorMsg}>{error}</Text>
        <Text style={styles.errorHint}>Please restart the app</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

      {customBg && (
        <Image
          source={{ uri: customBg }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      )}
      {customBg && <View style={styles.vignette} />}

      {/* Concentric rings — mandala effect */}
      {[220, 170, 120, 70].map((s, i) => (
        <View key={i} style={[styles.ring, {
          width: s, height: s, borderRadius: s / 2,
          opacity: 0.03 + i * 0.025,
        }]} />
      ))}

      <Animated.View style={[styles.content, {
        opacity:   masterFade,
        transform: [{ scale: logoScale }],
      }]}>
        {/* Spinning Dharmachakra */}
        <Animated.Text style={[styles.wheel, { transform: [{ rotate: spin }] }]}>
          ☸
        </Animated.Text>

        {/* App name */}
        <Text style={styles.appName}>KARMA</Text>

        {/* Tagline */}
        <Text style={styles.tagline}>
          Your charioteer. Your mirror. Your dharma.
        </Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Shloka */}
        <Animated.View style={{ opacity: shlokeFade, width: '100%' }}>
          <ShlokaDisplay shloka={shloka} variant="large" showDivider={false} />
        </Animated.View>
      </Animated.View>

      <Animated.Text style={[styles.version, { opacity: masterFade }]}>
        karma · v1.0
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex:           1,
    backgroundColor: '#000',
    alignItems:     'center',
    justifyContent: 'center',
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  ring: {
    position:    'absolute',
    borderWidth:  1,
    borderColor: Colors.gold,
  },
  content:  { alignItems: 'center', gap: Spacing.xl, paddingHorizontal: 32, width: '100%' },
  wheel: {
    fontSize:         88,
    color:            Colors.gold,
    textShadowColor:  Colors.gold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 28,
  },
  appName: {
    fontSize:     40,
    fontWeight:   '700',
    color:        Colors.white,
    letterSpacing: 12,
    textAlign:    'center',
  },
  tagline: {
    ...Typography.footnote,
    color:     Colors.textMuted,
    textAlign: 'center',
    letterSpacing: 0.5,
    fontStyle: 'italic',
  },
  divider: {
    width:           60,
    height:           1,
    backgroundColor: Colors.goldAlpha40,
  },
  version: {
    position:      'absolute',
    bottom:         44,
    ...Typography.caption2,
    color:          Colors.textDim,
    letterSpacing:  1,
  },
  errorScreen: {
    flex:           1,
    backgroundColor: '#000',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        32,
    gap:            14,
  },
  errorIcon:  { fontSize: 48 },
  errorTitle: { ...Typography.title3, color: Colors.white, textAlign: 'center' },
  errorMsg:   { ...Typography.body, color: Colors.red, textAlign: 'center' },
  errorHint:  { ...Typography.footnote, color: Colors.textDim },
});

export default SplashScreen;