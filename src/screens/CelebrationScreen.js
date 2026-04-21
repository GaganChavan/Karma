// ─── KARMA APP — CELEBRATION SCREEN (PHASE 6) ────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, StatusBar, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '../constants/colors';
import { getTodaySlogan }  from '../constants/slogans';
import { getFullStats }    from '../services/gamificationService';

const { width, height } = Dimensions.get('window');

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x:  10 + Math.random() * 80,
  y:  20 + Math.random() * 55,
  color: [Colors.gold, Colors.goldBright, Colors.green, Colors.blue, '#FF6B6B'][i % 5],
  size: 5 + (i % 4) * 3,
}));

const CelebrationScreen = ({ navigation, route }) => {
  const { xpEarned = 0, perfectDay = false, alterEgo = 'Neel' } = route?.params || {};
  const [stats, setStats] = useState(null);

  const spin   = useRef(new Animated.Value(0)).current;
  const fade   = useRef(new Animated.Value(0)).current;
  const scale  = useRef(new Animated.Value(0.6)).current;
  const slideY = useRef(new Animated.Value(30)).current;
  const particleAnims = useRef(PARTICLES.map(() => ({
    opacity: new Animated.Value(0),
    y:       new Animated.Value(0),
  }))).current;

  const slogan = getTodaySlogan();

  useEffect(() => {
    getFullStats().then(setStats).catch(() => {});
    _animate();
  }, []);

  const _animate = () => {
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 5000, useNativeDriver: true })).start();
    Animated.parallel([
      Animated.timing(fade,   { toValue: 1, duration: 600, delay: 100, useNativeDriver: true }),
      Animated.spring(scale,  { toValue: 1, tension: 50, friction: 7, delay: 100, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: 0, duration: 500, delay: 200, useNativeDriver: true }),
    ]).start();
    Animated.stagger(60, particleAnims.map((a, i) =>
      Animated.sequence([
        Animated.delay(i * 40),
        Animated.parallel([
          Animated.timing(a.opacity, { toValue: 0.9, duration: 300, useNativeDriver: true }),
          Animated.timing(a.y,       { toValue: -90, duration: 1000, useNativeDriver: true }),
        ]),
        Animated.timing(a.opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ])
    )).start();
  };

  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const levelInfo = stats?.levelInfo;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Rings */}
      {[240, 180, 120].map((s, i) => (
        <View key={i} style={[styles.ring, {
          width: s, height: s, borderRadius: s/2,
          top: height * 0.28 - s/2, left: width/2 - s/2,
          opacity: 0.05 + i * 0.04,
        }]} />
      ))}

      {/* Particles */}
      {PARTICLES.map((p, i) => (
        <Animated.View key={p.id} style={[styles.particle, {
          left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size,
          borderRadius: p.size / 2,
          backgroundColor: p.color,
          opacity: particleAnims[i].opacity,
          transform: [{ translateY: particleAnims[i].y }],
        }]} />
      ))}

      <SafeAreaView style={styles.safe} edges={['top','bottom']}>
        <Animated.View style={[styles.content, { opacity: fade }]}>

          {/* Wheel */}
          <Animated.View style={{ transform: [{ scale }, { rotate: spinDeg }] }}>
            <Text style={styles.wheel}>☸</Text>
          </Animated.View>

          {/* Text */}
          <Animated.View style={[styles.textBlock, { transform: [{ translateY: slideY }] }]}>
            <Text style={styles.karmaEarned}>KARMA EARNED</Text>
            <Text style={styles.title}>
              {perfectDay ? 'Perfect Day! 🌟' : 'All Done Today!'}
            </Text>
            <Text style={styles.subtitle}>
              {perfectDay
                ? `Every habit complete, ${alterEgo}. Extraordinary.`
                : `All habits done for today, ${alterEgo}.`
              }
            </Text>

            {/* XP */}
            <View style={styles.xpCard}>
              <Text style={styles.xpLabel}>TODAY'S XP</Text>
              <Text style={styles.xpValue}>+{xpEarned} ⚡</Text>
            </View>

            {/* Level */}
            {levelInfo && (
              <View style={styles.levelCard}>
                <Text style={styles.levelIcon}>{levelInfo.icon}</Text>
                <View>
                  <Text style={[styles.levelTitle, { color: levelInfo.color }]}>
                    Level {levelInfo.level} · {levelInfo.title}
                  </Text>
                  <Text style={styles.levelXP}>{levelInfo.totalXP} total XP</Text>
                </View>
              </View>
            )}

            {/* Karma score */}
            {stats?.karmaScore !== undefined && (
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>KARMA SCORE</Text>
                <Text style={styles.scoreValue}>{stats.karmaScore}</Text>
                <Text style={styles.scoreMax}>/1000</Text>
              </View>
            )}

            {/* Slogan */}
            <Text style={styles.slogan}>"{slogan}"</Text>
            <Text style={styles.sanskrit}>कर्म ही पूजा है</Text>

            {/* Continue */}
            <TouchableOpacity style={styles.continueBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
              <Text style={styles.continueBtnText}>Continue  →</Text>
            </TouchableOpacity>
          </Animated.View>

        </Animated.View>
      </SafeAreaView>
    </View>
  );
};

const celebStyles = StyleSheet.create({});

const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: '#000' },
  ring:     { position: 'absolute', borderWidth: 1, borderColor: Colors.gold },
  particle: { position: 'absolute' },
  safe:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  content:  { alignItems: 'center', width: '100%', gap: 0 },
  wheel: {
    fontSize: 80, color: Colors.gold,
    textShadowColor: Colors.gold, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 24,
    marginBottom: 20,
  },
  textBlock:     { alignItems: 'center', width: '100%', gap: 12 },
  karmaEarned:   { ...Typography.caption2, color: Colors.gold, letterSpacing: 4 },
  title:         { ...Typography.title1, color: Colors.textPrimary, textAlign: 'center' },
  subtitle:      { ...Typography.callout, color: Colors.textMuted, textAlign: 'center' },
  xpCard: {
    backgroundColor: Colors.goldAlpha15, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.goldAlpha40,
    paddingHorizontal: 40, paddingVertical: 14, alignItems: 'center',
  },
  xpLabel:    { ...Typography.caption2, color: Colors.gold, letterSpacing: 3, marginBottom: 4 },
  xpValue:    { fontSize: 32, fontWeight: '700', color: Colors.goldBright },
  levelCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.backgroundCard, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.separator,
    paddingHorizontal: 20, paddingVertical: 14, width: '100%',
  },
  levelIcon:  { fontSize: 32 },
  levelTitle: { ...Typography.headline },
  levelXP:    { ...Typography.caption1, color: Colors.textMuted, marginTop: 3 },
  scoreRow:   { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  scoreLabel: { ...Typography.caption2, color: Colors.textDim, letterSpacing: 2 },
  scoreValue: { fontSize: 32, fontWeight: '700', color: Colors.blue },
  scoreMax:   { ...Typography.callout, color: Colors.textDim },
  slogan: {
    ...Typography.callout, color: Colors.textMuted, fontStyle: 'italic',
    textAlign: 'center', lineHeight: 22,
  },
  sanskrit: { ...Typography.callout, color: Colors.gold, letterSpacing: 3, opacity: 0.7 },
  continueBtn: {
    backgroundColor: Colors.gold, borderRadius: Radius.lg,
    paddingHorizontal: 48, paddingVertical: 16, marginTop: 4,
  },
  continueBtnText: { ...Typography.headline, color: '#000' },
});

export default CelebrationScreen;