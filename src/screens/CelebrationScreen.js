// ─── KARMA APP — CELEBRATION SCREEN ─────────────────────────────────
// Full screen celebration when all habits are complete for the day.
// Pure React Native animations — no external libraries needed.

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, StatusBar, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors }       from '../constants/colors';
import { getTodaySlogan } from '../constants/slogans';
import { getFullStats }   from '../services/gamificationService';

const { width, height } = Dimensions.get('window');

// Particle positions for celebration burst
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id:    i,
  x:     Math.random() * width,
  y:     Math.random() * height * 0.6,
  color: [
    Colors.gold, Colors.blue, Colors.green,
    Colors.purple, '#FF6B6B', Colors.goldBright,
  ][i % 6],
  size:  4 + Math.random() * 8,
  shape: i % 3 === 0 ? 'circle' : i % 3 === 1 ? 'square' : 'diamond',
}));

const CelebrationScreen = ({ navigation, route }) => {
  const { xpEarned = 0, perfectDay = false, alterEgo = 'Neel' } = route?.params || {};

  const [stats, setStats] = useState(null);
  const slogan = getTodaySlogan();

  // Animations
  const wheelSpin   = useRef(new Animated.Value(0)).current;
  const fadeIn      = useRef(new Animated.Value(0)).current;
  const scaleIn     = useRef(new Animated.Value(0.5)).current;
  const titleSlide  = useRef(new Animated.Value(40)).current;
  const particleAnims = useRef(PARTICLES.map(() => ({
    opacity: new Animated.Value(0),
    y:       new Animated.Value(0),
  }))).current;

  useEffect(() => {
    _loadStats();
    _startAnimations();
  }, []);

  const _loadStats = async () => {
    try {
      const s = await getFullStats();
      setStats(s);
    } catch (error) {
      console.warn('CelebrationScreen stats load:', error.message);
    }
  };

  const _startAnimations = () => {
    // Spin the karma wheel
    Animated.loop(
      Animated.timing(wheelSpin, {
        toValue:         1,
        duration:        4000,
        useNativeDriver: true,
      })
    ).start();

    // Fade + scale main content in
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1, duration: 600, useNativeDriver: true,
      }),
      Animated.spring(scaleIn, {
        toValue: 1, tension: 60, friction: 8, useNativeDriver: true,
      }),
      Animated.timing(titleSlide, {
        toValue: 0, duration: 500, useNativeDriver: true,
      }),
    ]).start();

    // Stagger particles
    const particleAnimations = particleAnims.map((anim, i) =>
      Animated.sequence([
        Animated.delay(i * 60),
        Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 0.8, duration: 300, useNativeDriver: true,
          }),
          Animated.timing(anim.y, {
            toValue: -80, duration: 1200, useNativeDriver: true,
          }),
        ]),
        Animated.timing(anim.opacity, {
          toValue: 0, duration: 400, useNativeDriver: true,
        }),
      ])
    );

    Animated.stagger(80, particleAnimations).start();
  };

  const spinDeg = wheelSpin.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Cosmic background rings */}
      {[280, 220, 160, 100].map((size, i) => (
        <View key={i} style={[styles.ring, {
          width:       size,
          height:      size,
          borderRadius: size / 2,
          borderColor: `rgba(30,127,255,${0.04 + i * 0.03})`,
          top:         height * 0.3 - size / 2,
          left:        width  / 2   - size / 2,
        }]} />
      ))}

      {/* Particles */}
      {PARTICLES.map((p, i) => (
        <Animated.View
          key={p.id}
          style={[styles.particle, {
            left:            p.x,
            top:             p.y,
            width:           p.size,
            height:          p.size,
            borderRadius:    p.shape === 'circle' ? p.size / 2 : p.shape === 'square' ? 2 : 0,
            backgroundColor: p.color,
            opacity:         particleAnims[i].opacity,
            transform:       [{ translateY: particleAnims[i].y },
                              { rotate: p.shape === 'diamond' ? '45deg' : '0deg' }],
          }]}
        />
      ))}

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>

        {/* Spinning Karma Wheel */}
        <Animated.View style={[styles.wheelContainer, {
          opacity:   fadeIn,
          transform: [{ scale: scaleIn }],
        }]}>
          <Animated.Text style={[styles.wheel, { transform: [{ rotate: spinDeg }] }]}>
            ☸
          </Animated.Text>
        </Animated.View>

        {/* Main Content */}
        <Animated.View style={[styles.content, {
          opacity:   fadeIn,
          transform: [{ translateY: titleSlide }],
        }]}>
          <Text style={styles.karmaText}>KARMA EARNED</Text>
          <Text style={styles.titleText}>
            {perfectDay ? 'Perfect Day!' : 'All Done Today!'}
          </Text>
          <Text style={styles.subtitleText}>
            {perfectDay
              ? `Every single habit complete, ${alterEgo}.`
              : `All habits done for today, ${alterEgo}.`
            }
          </Text>

          {/* XP Badge */}
          {xpEarned > 0 && (
            <View style={styles.xpBadge}>
              <Text style={styles.xpLabel}>TODAY'S XP</Text>
              <Text style={styles.xpValue}>+{xpEarned} ⚡</Text>
            </View>
          )}

          {/* Perfect Day Bonus */}
          {perfectDay && (
            <View style={styles.bonusBadge}>
              <Text style={styles.bonusText}>🌟 +20 Perfect Day Bonus</Text>
            </View>
          )}

          {/* Level info */}
          {stats?.levelInfo && (
            <View style={styles.levelCard}>
              <Text style={styles.levelIcon}>{stats.levelInfo.icon}</Text>
              <View>
                <Text style={styles.levelTitle}>
                  Level {stats.levelInfo.level} — {stats.levelInfo.title}
                </Text>
                <Text style={styles.levelXP}>
                  {stats.totalXP} XP total
                </Text>
              </View>
            </View>
          )}

          {/* Karma Score */}
          {stats?.karmaScore !== undefined && (
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>KARMA SCORE</Text>
              <Text style={styles.scoreValue}>{stats.karmaScore}</Text>
              <Text style={styles.scoreMax}>/1000</Text>
            </View>
          )}

          {/* Slogan */}
          <View style={styles.sloganBox}>
            <Text style={styles.sloganText}>"{slogan}"</Text>
          </View>

          {/* Sanskrit */}
          <Text style={styles.sanskrit}>कर्म ही पूजा है</Text>

          {/* Continue Button */}
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>Continue →</Text>
          </TouchableOpacity>
        </Animated.View>

      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  ring: {
    position:   'absolute',
    borderWidth: 1,
  },
  particle: {
    position: 'absolute',
  },

  wheelContainer: {
    marginBottom: 8,
  },
  wheel: {
    fontSize:   72,
    color:      Colors.blue,
    textShadowColor:  Colors.blue,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius:  20,
  },

  content: {
    alignItems: 'center',
    width:      '100%',
  },
  karmaText: {
    fontSize:     10,
    color:        Colors.gold,
    letterSpacing: 4,
    marginBottom:  6,
  },
  titleText: {
    fontSize:     30,
    color:        Colors.textPrimary,
    fontWeight:   'bold',
    textAlign:    'center',
    marginBottom:  6,
  },
  subtitleText: {
    fontSize:    13,
    color:       Colors.textMuted,
    textAlign:   'center',
    marginBottom: 20,
    lineHeight:  20,
  },

  xpBadge: {
    backgroundColor: Colors.goldAlpha,
    borderRadius:    16,
    borderWidth:      1,
    borderColor:     Colors.borderGold,
    paddingHorizontal: 28,
    paddingVertical:   12,
    alignItems:       'center',
    marginBottom:     10,
  },
  xpLabel: {
    fontSize:     9,
    color:        Colors.gold,
    letterSpacing: 3,
    marginBottom:  2,
  },
  xpValue: {
    fontSize:   26,
    color:      Colors.goldBright,
    fontWeight: 'bold',
  },

  bonusBadge: {
    backgroundColor: Colors.greenAlpha,
    borderRadius:    12,
    paddingHorizontal: 16,
    paddingVertical:    8,
    marginBottom:      10,
  },
  bonusText: {
    fontSize:   12,
    color:      Colors.green,
    fontWeight: 'bold',
  },

  levelCard: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              12,
    backgroundColor:  Colors.backgroundCard,
    borderRadius:     14,
    borderWidth:       1,
    borderColor:      Colors.borderBlue,
    paddingHorizontal: 20,
    paddingVertical:   12,
    marginBottom:     10,
    width:            '100%',
  },
  levelIcon:  { fontSize: 28 },
  levelTitle: { fontSize: 14, color: Colors.textPrimary, fontWeight: 'bold' },
  levelXP:    { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  scoreRow: {
    flexDirection: 'row',
    alignItems:    'baseline',
    gap:            6,
    marginBottom:  16,
  },
  scoreLabel: { fontSize: 10, color: Colors.textDim, letterSpacing: 2 },
  scoreValue: { fontSize: 28, color: Colors.blue, fontWeight: 'bold' },
  scoreMax:   { fontSize: 14, color: Colors.textDim },

  sloganBox: {
    backgroundColor: Colors.backgroundCard,
    borderRadius:    12,
    borderWidth:      1,
    borderColor:     Colors.border,
    padding:         14,
    marginBottom:    12,
    width:          '100%',
  },
  sloganText: {
    fontSize:  12,
    color:     Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },

  sanskrit: {
    fontSize:     13,
    color:        Colors.blue,
    letterSpacing: 3,
    marginBottom:  20,
    opacity:       0.7,
  },

  continueBtn: {
    backgroundColor: Colors.blue,
    borderRadius:    16,
    paddingHorizontal: 48,
    paddingVertical:   14,
    shadowColor:     Colors.blue,
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.4,
    shadowRadius:    12,
    elevation:        6,
  },
  continueBtnText: {
    color:      Colors.white,
    fontSize:   16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

export default CelebrationScreen;