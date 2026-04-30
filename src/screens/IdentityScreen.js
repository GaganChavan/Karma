// ─── KARMA APP — IDENTITY SCREEN ─────────────────────────────────────
// Shows every morning before home screen.
// Neel's identity declaration + daily shloka.
// Chariot framework — the soul of the app.
// Auto-dismisses after 4 seconds. Skippable.

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, StatusBar, Dimensions,
} from 'react-native';
import { SafeAreaView }          from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '../constants/colors';
import { getDailyIdentityShloka, SHLOKAS } from '../constants/shlokas';
import { getSetting }            from '../database/habitService';
import ShlokaDisplay             from '../components/ShlokaDisplay';

const { height } = Dimensions.get('window');
const IdentityScreen = ({ onDismiss }) => {
  const [identityStatement, setIdentityStatement] = useState(
    'I am Neel. My mind holds the reins. The horses do not rule me.'
  );
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const shloka  = getDailyIdentityShloka();
  const chariot = SHLOKAS.chariot;

  useEffect(() => {
    _loadIdentity();
    _animate();
  }, []);

  const _loadIdentity = async () => {
    try {
      const saved = await getSetting('identity_statement');
      if (saved && saved.trim().length > 0) setIdentityStatement(saved);
    } catch {}
  };

  const _animate = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 700, useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0, duration: 600, useNativeDriver: true,
      }),
    ]).start();
  };

  const _dismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0, duration: 300, useNativeDriver: true,
    }).start(() => onDismiss?.());
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Subtle rings */}
      {[200, 140, 80].map((s, i) => (
        <View key={i} style={[styles.ring, {
          width: s, height: s, borderRadius: s / 2,
          top: height * 0.22 - s / 2,
          left: '50%',
          marginLeft: -s / 2,
          opacity: 0.04 + i * 0.03,
        }]} />
      ))}

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Animated.View style={[styles.content, {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }]}>

          {/* Dharma wheel */}
          <Text style={styles.wheel}>☸</Text>

          {/* Battlefield label */}
          <Text style={styles.battlefieldLabel}>
            THE BATTLEFIELD — {new Date().toLocaleDateString('en-IN', {
              weekday: 'long', day: 'numeric', month: 'long'
            }).toUpperCase()}
          </Text>

          {/* Identity statement */}
          <View style={styles.identityCard}>
            <Text style={styles.identityLabel}>YOUR DECLARATION, NEEL</Text>
            <Text style={styles.identityText}>"{identityStatement}"</Text>
          </View>

          {/* Chariot framework — compact */}
          <View style={styles.chariotCard}>
            <Text style={styles.chariotTitle}>{chariot.title}</Text>
            <View style={styles.chariotLines}>
              {chariot.lines.slice(0, 4).map((line, i) => (
                <View key={i} style={styles.chariotRow}>
                  <Text style={styles.chariotLabel}>{line.label}</Text>
                  <Text style={styles.chariotDesc}>{line.desc}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.chariotClosing}>{chariot.closing}</Text>
          </View>

          {/* Daily shloka */}
          <ShlokaDisplay shloka={shloka} variant="inline" />

          {/* Dismiss */}
          <TouchableOpacity style={styles.enterBtn} onPress={_dismiss} activeOpacity={0.8}>
            <Text style={styles.enterBtnText}>Enter the Battlefield</Text>
          </TouchableOpacity>

        </Animated.View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: '#000',
  },
  ring: {
    position:   'absolute',
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  safe:    { flex: 1, justifyContent: 'center' },
  content: {
    alignItems:        'center',
    paddingHorizontal: Spacing.xxl,
    gap:               Spacing.xl,
  },
  wheel: {
    fontSize:         56,
    color:            Colors.gold,
    textShadowColor:  Colors.gold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  battlefieldLabel: {
    ...Typography.caption2,
    color:         Colors.textDim,
    letterSpacing: 2,
    textAlign:     'center',
  },

  // Identity card
  identityCard: {
    backgroundColor: Colors.goldAlpha15,
    borderRadius:    Radius.lg,
    borderWidth:      1,
    borderColor:     Colors.goldAlpha40,
    padding:         Spacing.xl,
    width:           '100%',
    gap:             Spacing.sm,
  },
  identityLabel: {
    ...Typography.caption2,
    color:         Colors.gold,
    letterSpacing: 2,
    textAlign:     'center',
  },
  identityText: {
    ...Typography.callout,
    color:     Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
    fontStyle: 'italic',
  },

  // Chariot card
  chariotCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius:    Radius.lg,
    borderWidth:      1,
    borderColor:     Colors.separator,
    padding:         Spacing.lg,
    width:           '100%',
    gap:             Spacing.sm,
  },
  chariotTitle: {
    ...Typography.footnote,
    color:         Colors.gold,
    fontWeight:    '700',
    letterSpacing:  1,
    marginBottom:   Spacing.xs,
  },
  chariotLines: { gap: Spacing.xs },
  chariotRow:   { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  chariotLabel: {
    ...Typography.caption2,
    color:      Colors.textSecondary,
    fontWeight: '700',
    minWidth:   80,
  },
  chariotDesc: {
    ...Typography.caption2,
    color:    Colors.textDim,
    flex:     1,
    lineHeight: 16,
  },
  chariotClosing: {
    ...Typography.caption1,
    color:     Colors.gold,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop:  Spacing.sm,
    opacity:   0.8,
  },

  // Dismiss button
  enterBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               Spacing.sm,
    backgroundColor:   Colors.gold,
    borderRadius:      Radius.full,
    paddingHorizontal: 32,
    paddingVertical:   14,
  },
  enterBtnText:  { ...Typography.headline, color: '#000' },
});

export default IdentityScreen;