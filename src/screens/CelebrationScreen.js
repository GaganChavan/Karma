// ─── KARMA APP — CELEBRATION SCREEN (PHASE E — FIXED) ────────────────
// Fix: WhatsApp share now fetches real habits/checkins/streaks on demand
// Previously sent habits:[], checkins:{} → blank report

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, StatusBar, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView }  from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '../constants/colors';
import { SHLOKAS }       from '../constants/shlokas';
import { getFullStats }  from '../services/gamificationService';
import {
  getAllHabits, getTodayCheckins, getStreak, getSetting,
} from '../database/habitService';
import { sendDailyWhatsApp } from '../services/whatsappService';
import ShlokaDisplay     from '../components/ShlokaDisplay';

const { width, height } = Dimensions.get('window');

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id:    i,
  x:     10 + Math.random() * 80,
  y:     15 + Math.random() * 60,
  color: [Colors.gold, Colors.goldBright, Colors.green, Colors.blue, '#FF9F0A'][i % 5],
  size:  4 + (i % 5) * 3,
}));

const CelebrationScreen = ({ navigation, route }) => {
  const {
    xpEarned  = 0,
    perfectDay = false,
    alterEgo  = 'Neel',
  } = route?.params || {};

  const [stats,    setStats]    = useState(null);
  const [sending,  setSending]  = useState(false);

  const spin   = useRef(new Animated.Value(0)).current;
  const fade   = useRef(new Animated.Value(0)).current;
  const scale  = useRef(new Animated.Value(0.6)).current;
  const slideY = useRef(new Animated.Value(30)).current;

  const particleAnims = useRef(
    PARTICLES.map(() => ({
      opacity: new Animated.Value(0),
      y:       new Animated.Value(0),
    }))
  ).current;

  const shloka = SHLOKAS.allDone;

  useEffect(() => {
    getFullStats().then(setStats).catch(() => {});
    _animate();
  }, []);

  const _animate = () => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 5000, useNativeDriver: true })
    ).start();

    Animated.parallel([
      Animated.timing(fade,   { toValue: 1, duration: 600, delay: 100, useNativeDriver: true }),
      Animated.spring(scale,  { toValue: 1, tension: 50, friction: 7, delay: 100, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: 0, duration: 500, delay: 200, useNativeDriver: true }),
    ]).start();

    Animated.stagger(60,
      particleAnims.map((a, i) =>
        Animated.sequence([
          Animated.delay(i * 40),
          Animated.parallel([
            Animated.timing(a.opacity, { toValue: 0.9, duration: 300,  useNativeDriver: true }),
            Animated.timing(a.y,       { toValue: -80, duration: 1000, useNativeDriver: true }),
          ]),
          Animated.timing(a.opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      )
    ).start();
  };

  // FIX: Fetch real habits + checkins + streaks before sending WhatsApp
  const _sendWA = async () => {
    setSending(true);
    try {
      const habits    = await getAllHabits();
      const todayCIs  = await getTodayCheckins();
      const checkins  = {};
      todayCIs.forEach(c => { checkins[c.habit_id] = c; });
      const streaks   = {};
      await Promise.all(habits.map(async h => {
        try { streaks[h.id] = await getStreak(h.id); } catch {}
      }));
      const ego = await getSetting('alter_ego');
      await sendDailyWhatsApp({
        alterEgo:   ego || alterEgo,
        habits,
        checkins,
        streaks,
        totalXP:    stats?.totalXP   || 0,
        todayXP:    xpEarned,
        karmaScore: stats?.karmaScore || 0,
        levelInfo:  stats?.levelInfo,
      });
    } catch (err) {
      console.warn('CelebrationScreen WA error:', err.message);
    } finally {
      setSending(false);
    }
  };

  const spinDeg  = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const levelInfo = stats?.levelInfo;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Rings */}
      {[260, 200, 140].map((s, i) => (
        <View key={i} style={[styles.ring, {
          width: s, height: s, borderRadius: s / 2,
          top: height * 0.25 - s / 2,
          left: width / 2 - s / 2,
          opacity: 0.04 + i * 0.03,
        }]} />
      ))}

      {/* Particles */}
      {PARTICLES.map((p, i) => (
        <Animated.View key={p.id} style={[styles.particle, {
          left:            `${p.x}%`,
          top:             `${p.y}%`,
          width:           p.size,
          height:          p.size,
          borderRadius:    p.size / 2,
          backgroundColor: p.color,
          opacity:         particleAnims[i].opacity,
          transform:       [{ translateY: particleAnims[i].y }],
        }]} />
      ))}

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Animated.View style={[styles.content, { opacity: fade }]}>

          {/* Spinning wheel */}
          <Animated.View style={{ transform: [{ scale }, { rotate: spinDeg }] }}>
            <Text style={styles.wheel}>☸</Text>
          </Animated.View>

          <Animated.View style={[styles.textBlock, { transform: [{ translateY: slideY }] }]}>

            <Text style={styles.karmaLabel}>KARMA EARNED</Text>
            <Text style={styles.title}>
              {perfectDay ? 'The Chariot Was Flawless' : 'The Rein Held Today'}
            </Text>
            <Text style={styles.subtitle}>
              {perfectDay
                ? `Every battle won. Every sense mastered, ${alterEgo}.`
                : `All habits complete. The horses obeyed today, ${alterEgo}.`}
            </Text>

            {/* XP card */}
            <View style={styles.xpCard}>
              <Text style={styles.xpLabel}>TODAY'S XP</Text>
              <Text style={styles.xpValue}>+{xpEarned} ⚡</Text>
              {perfectDay && (
                <Text style={styles.bonusText}>+20 Perfect Day Bonus 🪔</Text>
              )}
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
                <View style={styles.levelRight}>
                  <Text style={styles.karmaScore}>{stats?.karmaScore || 0}</Text>
                  <Text style={styles.karmaScoreLabel}>/1000</Text>
                </View>
              </View>
            )}

            {/* Gita shloka */}
            <ShlokaDisplay shloka={shloka} variant="card" />

            {/* WhatsApp share — FIX: fetches real data on press */}
            <TouchableOpacity
              style={[styles.waBtn, { opacity: sending ? 0.7 : 1 }]}
              onPress={_sendWA}
              activeOpacity={0.8}
              disabled={sending}
            >
              {sending
                ? <ActivityIndicator size="small" color="#25D166" />
                : <Text style={styles.waBtnText}>📱 Share on WhatsApp</Text>
              }
            </TouchableOpacity>

            {/* Continue */}
            <TouchableOpacity
              style={styles.continueBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
            >
              <Text style={styles.continueBtnText}>Return to the Battlefield</Text>
            </TouchableOpacity>

          </Animated.View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: '#000' },
  ring:            { position: 'absolute', borderWidth: 1, borderColor: Colors.gold },
  particle:        { position: 'absolute' },
  safe:            { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content:         { alignItems: 'center', width: '100%', paddingHorizontal: Spacing.xxl },
  wheel:           { fontSize: 80, color: Colors.gold, textShadowColor: Colors.gold, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 24, marginBottom: Spacing.lg },
  textBlock:       { alignItems: 'center', width: '100%', gap: Spacing.lg },
  karmaLabel:      { ...Typography.caption2, color: Colors.gold, letterSpacing: 4 },
  title:           { ...Typography.title1, color: Colors.textPrimary, textAlign: 'center' },
  subtitle:        { ...Typography.callout, color: Colors.textMuted, textAlign: 'center' },
  xpCard:          { backgroundColor: Colors.goldAlpha15, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.goldAlpha40, paddingHorizontal: 36, paddingVertical: 14, alignItems: 'center', gap: Spacing.xs, width: '100%' },
  xpLabel:         { ...Typography.caption2, color: Colors.gold, letterSpacing: 3 },
  xpValue:         { fontSize: 32, fontWeight: '700', color: Colors.goldBright },
  bonusText:       { ...Typography.caption1, color: Colors.green },
  levelCard:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.backgroundCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.separator, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, width: '100%' },
  levelIcon:       { fontSize: 30 },
  levelTitle:      { ...Typography.headline },
  levelXP:         { ...Typography.caption1, color: Colors.textMuted, marginTop: 3 },
  levelRight:      { marginLeft: 'auto', alignItems: 'flex-end' },
  karmaScore:      { fontSize: 24, fontWeight: '700', color: Colors.blue },
  karmaScoreLabel: { ...Typography.caption2, color: Colors.textDim },
  waBtn:           { backgroundColor: 'rgba(37,211,102,0.12)', borderRadius: Radius.lg, borderWidth: 1, borderColor: 'rgba(37,211,102,0.30)', paddingVertical: 12, paddingHorizontal: 24, alignItems: 'center', width: '100%', minHeight: 46, justifyContent: 'center' },
  waBtnText:       { ...Typography.subheadline, color: '#25D166', fontWeight: '600' },
  continueBtn:     { backgroundColor: Colors.gold, borderRadius: Radius.lg, paddingHorizontal: 40, paddingVertical: 16, width: '100%', alignItems: 'center' },
  continueBtnText: { ...Typography.headline, color: '#000' },
});

export default CelebrationScreen;