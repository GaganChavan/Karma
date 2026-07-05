import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography, Spacing, Radius } from '../constants/colors';

const INTENT_LINES = [
  "The battlefield is ready. The question is — are you?",
  "Sthitaprajna does not wait for the right moment. He creates it.",
  "Today, one degree closer to the man you are becoming.",
  "The fog lifts when you move. Move first.",
  "Every small decision today is a vote for Jitendriya.",
  "Do not escape today. Stay in it. That is the whole practice.",
  "The horse will pull. The rein is yours.",
];

const COMMITMENTS = [
  "Today I hold the rein.",
  "Today I choose discipline over comfort.",
  "Today I stay present with discomfort.",
  "Today I act like the man I am becoming.",
  "Today I do the hard thing first.",
  "Today I do not escape — I stay.",
  "Today I am Jitendriya in the making.",
];

const DailyIntentScreen = ({ alterEgo, onDismiss }) => {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const intentLine   = INTENT_LINES[dayOfYear % INTENT_LINES.length];
  const commitment   = COMMITMENTS[dayOfYear % COMMITMENTS.length];

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const _dismiss = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => onDismiss());
  };

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#060606" />

        <Animated.View style={[styles.content, { transform: [{ translateY: slideAnim }] }]}>

          {/* Date */}
          <Text style={styles.dateText}>{dateStr.toUpperCase()}</Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Alter ego */}
          <Text style={styles.egoSmall}>YOU ARE</Text>
          <Text style={styles.egoName}>{alterEgo || 'Sthitaprajna'}</Text>

          {/* Intent line */}
          <Text style={styles.intentLine}>{intentLine}</Text>

          {/* Commitment */}
          <View style={styles.commitmentBox}>
            <Text style={styles.commitmentLabel}>TODAY'S COMMITMENT</Text>
            <Text style={styles.commitmentText}>{commitment}</Text>
          </View>

          {/* Rules */}
          <View style={styles.rulesBox}>
            {[
              '🧊  Cold shower — before anything else',
              '📵  No phone for first 30 minutes',
              '⚔️  One hard thing — before comfort',
            ].map((rule, i) => (
              <Text key={i} style={styles.ruleLine}>{rule}</Text>
            ))}
          </View>

        </Animated.View>

        {/* Begin button */}
        <View style={styles.btnWrap}>
          <TouchableOpacity style={styles.beginBtn} onPress={_dismiss} activeOpacity={0.85}>
            <Text style={styles.beginText}>Begin the Day  →</Text>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay:        { ...StyleSheet.absoluteFillObject, backgroundColor: '#060606', zIndex: 999 },
  root:           { flex: 1, justifyContent: 'space-between' },
  content:        { flex: 1, paddingHorizontal: Spacing.xxl, paddingTop: 60, gap: 20, justifyContent: 'center' },

  dateText:       { ...Typography.caption2, color: '#3A3A3C', letterSpacing: 3, textAlign: 'center' },
  divider:        { height: 1, backgroundColor: '#1C1C1E', marginVertical: 8 },

  egoSmall:       { ...Typography.caption2, color: '#3A3A3C', letterSpacing: 3, textAlign: 'center' },
  egoName:        { fontSize: 42, fontWeight: '800', color: '#F5A623', textAlign: 'center', letterSpacing: -1, lineHeight: 50 },

  intentLine:     { ...Typography.callout, color: '#8E8E93', textAlign: 'center', lineHeight: 24, fontStyle: 'italic', marginTop: 4 },

  commitmentBox:  { backgroundColor: '#111', borderRadius: Radius.xl, padding: Spacing.xl, borderWidth: 1, borderColor: '#F5A62320', gap: 10, marginTop: 8 },
  commitmentLabel:{ ...Typography.caption2, color: '#F5A623', letterSpacing: 2, fontWeight: '700' },
  commitmentText: { ...Typography.title3, color: '#E5E5EA', fontWeight: '700', lineHeight: 30 },

  rulesBox:       { gap: 10, marginTop: 4 },
  ruleLine:       { ...Typography.callout, color: '#48484A', lineHeight: 22 },

  btnWrap:        { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl },
  beginBtn:       { backgroundColor: '#F5A623', borderRadius: Radius.lg, paddingVertical: 18, alignItems: 'center' },
  beginText:      { ...Typography.headline, color: '#000', fontWeight: '800' },
});

export default DailyIntentScreen;
