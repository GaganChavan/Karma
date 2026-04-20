// ─── KARMA APP — SPLASH SCREEN ──────────────────────────────────────
// Animated Karma wheel + Sanskrit text.
// Loads the database while displaying animation.
// Supports customizable background image from settings.

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Animated, StyleSheet, StatusBar,
  Image, ImageBackground, Dimensions,
} from 'react-native';
import { Colors } from '../constants/colors';
import { getDatabase } from '../database/database';
import { getSetting }   from '../database/habitService';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ onReady }) => {
  const spinAnim    = useRef(new Animated.Value(0)).current;
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const scaleAnim   = useRef(new Animated.Value(0.8)).current;
  const textFade    = useRef(new Animated.Value(0)).current;

  const [splashImageUri,  setSplashImageUri]  = useState(null);
  const [splashImageType, setSplashImageType] = useState('default');
  const [error,           setError]           = useState(null);

  useEffect(() => {
    _startAnimations();
    _initializeApp();
  }, []);

  const _startAnimations = () => {
    // Spin the Karma wheel continuously
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue:         1,
        duration:        6000,
        useNativeDriver: true,
      })
    ).start();

    // Fade in main content
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue:         1,
        duration:        800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue:         1,
        tension:         50,
        friction:        7,
        useNativeDriver: true,
      }),
    ]).start();

    // Text fades in after wheel
    setTimeout(() => {
      Animated.timing(textFade, {
        toValue:         1,
        duration:        600,
        useNativeDriver: true,
      }).start();
    }, 400);
  };

  const _initializeApp = async () => {
    try {
      // Initialize database (this creates all tables)
      await getDatabase();

      // Load splash image preference
      try {
        const imageUri  = await getSetting('splash_image_uri');
        const imageType = await getSetting('splash_image_type');
        setSplashImageUri(imageUri  || null);
        setSplashImageType(imageType || 'default');
      } catch {
        // Non-fatal — use default
      }

      // Minimum splash duration for branding
      await new Promise(resolve => setTimeout(resolve, 2200));

      // Navigate to main app
      onReady && onReady();

    } catch (err) {
      console.error('❌ App initialization failed:', err);
      setError(err.message || 'Failed to initialize Karma. Please restart.');
    }
  };

  const spin = spinAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const BackgroundWrapper = ({ children }) => {
    if (splashImageType === 'custom' && splashImageUri) {
      return (
        <ImageBackground
          source={{ uri: splashImageUri }}
          style={styles.container}
          resizeMode="cover"
        >
          <View style={styles.container}>
          </View>
          
          {children}
        </ImageBackground>
      );
    }
    return (
      <View style={styles.container}>
        {children}
      </View>
    );
  };

  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Karma couldn't start</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Text style={styles.errorHint}>Please restart the app</Text>
      </View>
    );
  }

  return (
    <BackgroundWrapper>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Cosmic rings */}
      {[220, 170, 120, 70].map((size, i) => (
        <View key={i} style={[styles.ring, {
          width: size, height: size, borderRadius: size / 2,
          borderColor: `rgba(30,127,255,${0.04 + i * 0.03})`,
          position: 'absolute',
        }]} />
      ))}

      <Animated.View style={[styles.content, {
        opacity:   fadeAnim,
        transform: [{ scale: scaleAnim }],
      }]}>

        {/* Spinning Karma Wheel */}
        <Animated.Text style={[styles.wheel, { transform: [{ rotate: spin }] }]}>
          ☸
        </Animated.Text>

        {/* App Name */}
        <Animated.View style={{ opacity: textFade }}>
          <Text style={styles.appName}>KARMA</Text>
          <Text style={styles.sanskrit}>कर्म ही पूजा है</Text>
          <Text style={styles.translation}>Action is worship</Text>

          <View style={styles.divider} />

          <Text style={styles.welcome}>WELCOME BACK, NEEL</Text>
        </Animated.View>
      </Animated.View>

      {/* Bottom branding */}
      <Animated.Text style={[styles.version, { opacity: textFade }]}>
        karma v1.0
      </Animated.Text>
    </BackgroundWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: Colors.background,
  },
  errorContainer: {
    backgroundColor: Colors.background,
    padding:         32,
  },
  ring: {
    borderWidth: 1,
    position:    'absolute',
  },
  content: {
    alignItems: 'center',
  },
  wheel: {
    fontSize:    80,
    marginBottom: 16,
    color:       Colors.blue,
    textShadowColor:  Colors.blue,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  appName: {
    fontSize:     40,
    fontWeight:   'bold',
    color:        Colors.textPrimary,
    letterSpacing: 10,
    textAlign:    'center',
    marginBottom:  8,
  },
  sanskrit: {
    fontSize:     16,
    color:        Colors.blue,
    letterSpacing: 3,
    textAlign:    'center',
    marginBottom:  4,
  },
  translation: {
    fontSize:  12,
    color:     Colors.textMuted,
    textAlign: 'center',
    letterSpacing: 1,
  },
  divider: {
    width:         60,
    height:         1,
    backgroundColor: Colors.borderBlue,
    marginVertical:  20,
    alignSelf:       'center',
  },
  welcome: {
    fontSize:     11,
    color:        Colors.textDim,
    letterSpacing: 4,
    textAlign:    'center',
  },
  version: {
    position:      'absolute',
    bottom:         40,
    fontSize:       11,
    color:          Colors.textDim,
    letterSpacing:  2,
  },
  errorIcon: {
    fontSize:    48,
    textAlign:   'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize:    20,
    color:       Colors.textPrimary,
    fontWeight:  'bold',
    textAlign:   'center',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize:    13,
    color:       Colors.red,
    textAlign:   'center',
    marginBottom: 12,
    lineHeight:  20,
  },
  errorHint: {
    fontSize:  12,
    color:     Colors.textMuted,
    textAlign: 'center',
  },
});

export default SplashScreen;