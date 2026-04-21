// ─── KARMA APP — SPLASH SCREEN (PHASE 6) ─────────────────────────────
// Apple-quality launch screen. True black. Gold Karma wheel.
// Minimal. Purposeful. Every element earns its place.

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Animated, StyleSheet,
  StatusBar, Dimensions, Image,
} from 'react-native';
import { Colors, Typography } from '../constants/colors';
import { getDatabase }        from '../database/database';
import { getSetting }         from '../database/habitService';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ onReady }) => {
  const wheelSpin  = useRef(new Animated.Value(0)).current;
  const masterFade = useRef(new Animated.Value(0)).current;
  const logoScale  = useRef(new Animated.Value(0.7)).current;
  const textSlide  = useRef(new Animated.Value(20)).current;
  const [error,    setError]    = useState(null);
  const [customBg, setCustomBg] = useState(null);

  useEffect(() => {
    _animate();
    _init();
  }, []);

  const _animate = () => {
    // Continuous wheel spin
    Animated.loop(
      Animated.timing(wheelSpin, {
        toValue: 1, duration: 5000, useNativeDriver: true,
      })
    ).start();

    // Fade + scale entry
    Animated.parallel([
      Animated.timing(masterFade, {
        toValue: 1, duration: 700,
        delay: 100, useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1, tension: 40, friction: 7,
        delay: 100, useNativeDriver: true,
      }),
      Animated.timing(textSlide, {
        toValue: 0, duration: 500,
        delay: 300, useNativeDriver: true,
      }),
    ]).start();
  };

  const _init = async () => {
    try {
      await getDatabase();
      try {
        const uri  = await getSetting('splash_image_uri');
        const type = await getSetting('splash_image_type');
        if (type === 'custom' && uri) setCustomBg(uri);
      } catch {}
      await new Promise(r => setTimeout(r, 2000));
      onReady?.();
    } catch (err) {
      setError(err.message || 'Failed to start Karma');
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
        <Text style={styles.errorTitle}>Couldn't start Karma</Text>
        <Text style={styles.errorMsg}>{error}</Text>
        <Text style={styles.errorHint}>Please restart the app</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

      {/* Custom background image if set */}
      {customBg && (
        <Image
          source={{ uri: customBg }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      )}

      {/* Subtle vignette overlay */}
      {customBg && <View style={styles.vignette} />}

      {/* Very subtle concentric rings */}
      {[200, 150, 100].map((s, i) => (
        <View key={i} style={[styles.ring, {
          width: s, height: s, borderRadius: s / 2,
          opacity: 0.04 + i * 0.02,
        }]} />
      ))}

      <Animated.View style={[styles.content, {
        opacity:   masterFade,
        transform: [{ scale: logoScale }],
      }]}>
        {/* Spinning wheel */}
        <Animated.Text style={[styles.wheel, { transform: [{ rotate: spin }] }]}>
          ☸
        </Animated.Text>

        {/* App name */}
        <Animated.View style={{ transform: [{ translateY: textSlide }], alignItems: 'center' }}>
          <Text style={styles.appName}>KARMA</Text>
          <Text style={styles.sanskrit}>कर्म ही पूजा है</Text>
          <View style={styles.divider} />
          <Text style={styles.tagline}>Discipline. Identity. Consistency.</Text>
        </Animated.View>
      </Animated.View>

      {/* Version — bottom */}
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
    position:   'absolute',
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  content:  { alignItems: 'center', gap: 20 },
  wheel: {
    fontSize:         88,
    color:            Colors.gold,
    textShadowColor:  Colors.gold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 28,
  },
  appName: {
    fontSize:     44,
    fontWeight:   '700',
    color:        Colors.white,
    letterSpacing: 14,
    marginBottom:  8,
  },
  sanskrit: {
    fontSize:     16,
    color:        Colors.gold,
    letterSpacing: 3,
    marginBottom:  16,
    opacity:       0.85,
  },
  divider: {
    width:           48,
    height:           1,
    backgroundColor: 'rgba(245,166,35,0.3)',
    marginBottom:    16,
  },
  tagline: {
    fontSize:     13,
    color:        Colors.textMuted,
    letterSpacing: 2,
  },
  version: {
    position:      'absolute',
    bottom:         44,
    fontSize:       12,
    color:          Colors.textDim,
    letterSpacing:  1,
  },
  errorScreen: {
    flex:           1,
    backgroundColor: '#000',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        32,
    gap:            12,
  },
  errorIcon:  { fontSize: 48 },
  errorTitle: { fontSize: 20, color: Colors.white, fontWeight: '700' },
  errorMsg:   { fontSize: 14, color: Colors.red, textAlign: 'center' },
  errorHint:  { fontSize: 13, color: Colors.textDim },
});

export default SplashScreen;