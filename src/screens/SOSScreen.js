import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Animated, ScrollView,
  StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography, Spacing, Radius } from '../constants/colors';
import { getSetting } from '../database/habitService';

const SOS_READS = [
  {
    from: 'Sthitaprajna',
    text: "You're reading this because the urge is loud right now. Good — that means you caught it before it won. The urge peaks in the next few minutes and then fades. You just need to stay here for 15. Breathe. I've done it. You can too.",
  },
  {
    from: 'Sthitaprajna',
    text: "The man who runs from this moment is not you. He is the old pattern. You are the one who stays. The discomfort you feel right now is not danger — it is the battlefield. And you showed up to it. That already makes you different.",
  },
  {
    from: 'Sthitaprajna',
    text: "Every time you close this screen having held the line, you become more of the man you are meant to be. Not later. Right now — in this moment. This is the work. This is where Jitendriya is built. One held moment at a time.",
  },
  {
    from: 'Bhagavad Gita 2.14',
    text: '"O son of Kunti, the fleeting perceptions of happiness and distress arise from contact between the senses and sense objects. They come and go like winter and summer. They are non-permanent. Learn to tolerate them without being disturbed." — Krishna to Arjuna on the battlefield.',
  },
  {
    from: 'Sthitaprajna',
    text: "You built this app. You chose this name. You know exactly what you are becoming. The screen you almost opened — that is the fog. This — staying here, breathing, reading this — this is clarity. This is Sthitaprajna. You are already him.",
  },
  {
    from: 'Bhagavad Gita 6.5',
    text: '"Let a man raise himself by his own self; let him not lower himself. For the self alone is the friend of the self, and the self alone is the enemy of the self." — You are both the battlefield and the warrior. Choose which self wins today.',
  },
  {
    from: 'Sthitaprajna',
    text: "Here is what happens if you hold for 15 minutes: the urge fades, you feel pride, your streak lives, your brain gets one more day of healing, and you go to sleep as the man you want to be. Here is what happens if you don't: the opposite of all of that. You already know which one you want.",
  },
];

const TOTAL_SECONDS = 15 * 60;
const PHASE_DURATION = 4000;
const BREATH_LABELS = ['BREATHE IN', 'HOLD', 'BREATHE OUT', 'HOLD'];

const SOSScreen = ({ navigation }) => {
  const [alterEgo,    setAlterEgo]    = useState('Sthitaprajna');
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [breathPhase, setBreathPhase] = useState(0);
  const [readIndex,   setReadIndex]   = useState(0);
  const [held,        setHeld]        = useState(false);

  const circleAnim = useRef(new Animated.Value(0)).current;
  const timerRef   = useRef(null);
  const breathRef  = useRef(null);

  useEffect(() => {
    getSetting('alter_ego').then(ego => { if (ego) setAlterEgo(ego); }).catch(() => {});
    _startBreathing();
    _startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (breathRef.current) breathRef.current.stop();
    };
  }, []);

  const _startBreathing = () => {
    let phase = 0;
    const runPhase = () => {
      setBreathPhase(phase);
      const toValue = (phase === 0 || phase === 1) ? 1 : 0;
      const anim = Animated.timing(circleAnim, {
        toValue,
        duration: PHASE_DURATION,
        useNativeDriver: false,
      });
      breathRef.current = anim;
      anim.start(({ finished }) => {
        if (finished) {
          phase = (phase + 1) % 4;
          runPhase();
        }
      });
    };
    runPhase();
  };

  const _startTimer = () => {
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(timerRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  const _fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const circleSize = circleAnim.interpolate({ inputRange: [0, 1], outputRange: [110, 200] });
  const circleOpacity = circleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.65] });

  const pct = 1 - (secondsLeft / TOTAL_SECONDS);
  const currentRead = SOS_READS[readIndex % SOS_READS.length];
  const isDone = secondsLeft === 0;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#080808" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.holdLabel}>HOLD THE LINE</Text>
            <Text style={styles.egoLabel}>{alterEgo} · stay present</Text>
          </View>
          <View style={styles.timerBox}>
            <Text style={[styles.timerText, isDone && { color: '#30D158' }]}>
              {_fmt(secondsLeft)}
            </Text>
            <Text style={styles.timerSub}>remaining</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(pct * 100)}%` }]} />
        </View>

        {/* Breathing circle */}
        <View style={styles.breathZone}>
          <Animated.View style={[styles.circle, { width: circleSize, height: circleSize, borderRadius: 200, opacity: circleOpacity }]} />
          <View style={styles.breathLabelBox}>
            <Text style={styles.breathLabel}>{BREATH_LABELS[breathPhase]}</Text>
            <Text style={styles.breathSub}>4 · 4 · 4 · 4</Text>
          </View>
        </View>

        {/* Letter card */}
        <View style={styles.card}>
          <Text style={styles.cardFrom}>FROM {currentRead.from.toUpperCase()}</Text>
          <Text style={styles.cardText}>{currentRead.text}</Text>
          <TouchableOpacity onPress={() => setReadIndex(i => i + 1)} style={styles.nextBtn}>
            <Text style={styles.nextText}>next read →</Text>
          </TouchableOpacity>
        </View>

        {/* Physical redirect */}
        <View style={styles.physicalCard}>
          <Text style={styles.physicalLabel}>PHYSICAL REDIRECT</Text>
          <Text style={styles.physicalAction}>Get up. Do 20 pushups. Right now.</Text>
          <Text style={styles.physicalSub}>Move the body. Break the mental loop. The urge cannot survive movement.</Text>
        </View>

        {/* Cost reminder */}
        <View style={styles.costCard}>
          <Text style={styles.costLabel}>WHAT'S AT STAKE</Text>
          <View style={{ gap: 6 }}>
            {[
              '🧠  Days of dopamine healing reset to zero',
              '🔥  Streak gone — start the count again',
              '🪞  Distance from the man you are becoming',
              '⚡  Brain fog returns for 3-4 days',
            ].map((line, i) => (
              <Text key={i} style={styles.costLine}>{line}</Text>
            ))}
          </View>
        </View>

        {/* Bottom actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.heldBtn, held || isDone ? styles.heldBtnDone : styles.heldBtnWaiting]}
            onPress={() => { setHeld(true); navigation.goBack(); }}
          >
            <Text style={[styles.heldBtnText, held || isDone ? { color: '#000' } : { color: '#30D158' }]}>
              {held || isDone ? '✓  I held the line' : 'I held the line · exit early'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.closeText}>close</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#080808' },
  scroll:        { paddingBottom: 40 },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  holdLabel:     { ...Typography.caption2, color: '#FF453A', letterSpacing: 2.5, fontWeight: '800' },
  egoLabel:      { ...Typography.caption2, color: '#3A3A3C', marginTop: 3, letterSpacing: 0.5 },
  timerBox:      { alignItems: 'flex-end' },
  timerText:     { fontSize: 36, fontWeight: '800', color: '#FF453A', letterSpacing: -1 },
  timerSub:      { ...Typography.caption2, color: '#3A3A3C', marginTop: 2 },
  progressTrack: { height: 2, backgroundColor: '#1A1A1A', marginHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  progressFill:  { height: '100%', backgroundColor: '#FF453A', borderRadius: 1 },

  breathZone:    { alignItems: 'center', justifyContent: 'center', height: 240, marginBottom: Spacing.xl },
  circle:        { position: 'absolute', backgroundColor: '#FF453A' },
  breathLabelBox:{ alignItems: 'center', gap: 6 },
  breathLabel:   { ...Typography.caption2, color: '#fff', letterSpacing: 3, fontWeight: '800', fontSize: 13 },
  breathSub:     { ...Typography.caption2, color: '#3A3A3C', letterSpacing: 2 },

  card:          { marginHorizontal: Spacing.xl, backgroundColor: '#111', borderRadius: Radius.xl, padding: Spacing.xl, borderWidth: 1, borderColor: '#FF453A18', marginBottom: Spacing.md, gap: 12 },
  cardFrom:      { ...Typography.caption2, color: '#FF453A', letterSpacing: 1.5, fontWeight: '700' },
  cardText:      { ...Typography.callout, color: '#C7C7CC', lineHeight: 24, fontStyle: 'italic' },
  nextBtn:       { alignSelf: 'flex-end', marginTop: 4 },
  nextText:      { ...Typography.caption1, color: '#3A3A3C' },

  physicalCard:  { marginHorizontal: Spacing.xl, backgroundColor: '#0D1A0D', borderRadius: Radius.lg, padding: Spacing.xl, borderWidth: 1, borderColor: '#30D15825', marginBottom: Spacing.md, gap: 6 },
  physicalLabel: { ...Typography.caption2, color: '#30D158', letterSpacing: 1.5, fontWeight: '700' },
  physicalAction:{ ...Typography.headline, color: '#E5E5EA' },
  physicalSub:   { ...Typography.caption1, color: '#48484A', lineHeight: 18 },

  costCard:      { marginHorizontal: Spacing.xl, backgroundColor: '#111', borderRadius: Radius.lg, padding: Spacing.xl, borderWidth: 1, borderColor: '#1C1C1E', marginBottom: Spacing.xl, gap: 10 },
  costLabel:     { ...Typography.caption2, color: '#636366', letterSpacing: 1.5, fontWeight: '700', marginBottom: 4 },
  costLine:      { ...Typography.caption1, color: '#48484A', lineHeight: 20 },

  actions:       { paddingHorizontal: Spacing.xl, gap: Spacing.sm },
  heldBtn:       { borderRadius: Radius.lg, paddingVertical: 18, alignItems: 'center', borderWidth: 1 },
  heldBtnDone:   { backgroundColor: '#30D158', borderColor: '#30D158' },
  heldBtnWaiting:{ backgroundColor: '#0D1A0D', borderColor: '#30D15840' },
  heldBtnText:   { ...Typography.headline },
  closeBtn:      { alignItems: 'center', paddingVertical: 14 },
  closeText:     { ...Typography.caption1, color: '#2C2C2E' },
});

export default SOSScreen;
