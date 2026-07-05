import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Typography, Spacing, Radius } from '../constants/colors';
import { LETTERS, DAILY_READS, GITA_CHAPTERS } from '../constants/motivationContent';

const TABS = [
  { key: 'daily',  label: 'Daily Read' },
  { key: 'letters', label: 'Letters' },
  { key: 'gita',  label: 'Gita' },
];

const MotivationScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [activeTab,     setActiveTab]     = useState('daily');
  const [openLetter,    setOpenLetter]    = useState(null);
  const [openGita,      setOpenGita]      = useState(null);
  const [dailyIndex,    setDailyIndex]    = useState(() => new Date().getDay() % DAILY_READS.length);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const _switchTab = (key) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
      setActiveTab(key);
      setOpenLetter(null);
      setOpenGita(null);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const daily = DAILY_READS[dailyIndex];

  const _renderDaily = () => (
    <View style={{ gap: Spacing.lg }}>
      {/* Today's read */}
      <View style={[styles.dailyCard, { backgroundColor: colors.backgroundCard, borderColor: colors.goldAlpha40 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
          <Text style={[styles.sectionTag, { color: colors.gold }]}>TODAY'S READ</Text>
          <TouchableOpacity onPress={() => setDailyIndex(i => (i + 1) % DAILY_READS.length)}>
            <Text style={[styles.nextTag, { color: colors.textDim }]}>shuffle →</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.dailyTitle, { color: colors.textPrimary }]}>{daily.title}</Text>
        <Text style={[styles.dailyText, { color: colors.textSecondary }]}>{daily.text}</Text>
      </View>

      {/* All daily reads */}
      <Text style={[styles.groupLabel, { color: colors.textDim }]}>ALL DAILY READS</Text>
      {DAILY_READS.map((item, i) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.readRow, { backgroundColor: colors.backgroundCard, borderColor: i === dailyIndex ? colors.goldAlpha40 : colors.separator }]}
          onPress={() => setDailyIndex(i)}
          activeOpacity={0.7}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.readTitle, { color: i === dailyIndex ? colors.gold : colors.textPrimary }]}>
              {item.title}
            </Text>
            <Text style={[styles.readPreview, { color: colors.textDim }]} numberOfLines={2}>
              {item.text}
            </Text>
          </View>
          {i === dailyIndex && <Text style={{ color: colors.gold, fontSize: 13, fontWeight: '700' }}>●</Text>}
        </TouchableOpacity>
      ))}
    </View>
  );

  const _renderLetters = () => {
    if (openLetter) {
      const letter = LETTERS.find(l => l.id === openLetter);
      return (
        <View style={{ gap: Spacing.lg }}>
          <TouchableOpacity onPress={() => setOpenLetter(null)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: colors.gold, fontSize: 18 }}>‹</Text>
            <Text style={[styles.backLabel, { color: colors.gold }]}>All Letters</Text>
          </TouchableOpacity>
          <View style={[styles.letterCard, { backgroundColor: colors.backgroundCard, borderColor: colors.separator }]}>
            <Text style={[styles.letterCategory, { color: colors.textDim }]}>{letter.category.toUpperCase()}</Text>
            <Text style={[styles.letterTitle, { color: colors.textPrimary }]}>{letter.title}</Text>
            <View style={[styles.divider, { backgroundColor: colors.separator }]} />
            <Text style={[styles.letterBody, { color: colors.textSecondary }]}>{letter.content}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={{ gap: Spacing.md }}>
        <Text style={[styles.introText, { color: colors.textDim }]}>
          Letters written from the man you are becoming — to the man you are right now.
        </Text>
        {LETTERS.map(letter => (
          <TouchableOpacity
            key={letter.id}
            style={[styles.letterRow, { backgroundColor: colors.backgroundCard, borderColor: colors.separator }]}
            onPress={() => setOpenLetter(letter.id)}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.letterCatSmall, { color: colors.textDim }]}>{letter.category}</Text>
              <Text style={[styles.letterRowTitle, { color: colors.textPrimary }]}>{letter.title}</Text>
              <Text style={[styles.letterMeta, { color: colors.textDim }]}>{letter.readTime} read</Text>
            </View>
            <Text style={{ color: colors.textDim, fontSize: 20, fontWeight: '300' }}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const _renderGita = () => {
    if (openGita) {
      const chapter = GITA_CHAPTERS.find(g => g.id === openGita);
      return (
        <View style={{ gap: Spacing.lg }}>
          <TouchableOpacity onPress={() => setOpenGita(null)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: colors.gold, fontSize: 18 }}>‹</Text>
            <Text style={[styles.backLabel, { color: colors.gold }]}>All Shlokas</Text>
          </TouchableOpacity>
          <View style={[styles.gitaCard, { backgroundColor: colors.backgroundCard, borderColor: colors.separator }]}>
            <Text style={[styles.gitaRef, { color: colors.gold }]}>{chapter.reference}</Text>
            <Text style={[styles.gitaSanskrit, { color: colors.textPrimary }]}>{chapter.sanskrit}</Text>
            <View style={[styles.divider, { backgroundColor: colors.separator }]} />
            <Text style={[styles.gitaMeaning, { color: colors.textSecondary }]}>{chapter.meaning}</Text>
            <View style={[styles.applicationBox, { backgroundColor: colors.goldAlpha15, borderColor: colors.goldAlpha40 }]}>
              <Text style={[styles.applicationLabel, { color: colors.gold }]}>TODAY'S APPLICATION</Text>
              <Text style={[styles.applicationText, { color: colors.textPrimary }]}>{chapter.application}</Text>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={{ gap: Spacing.md }}>
        <Text style={[styles.introText, { color: colors.textDim }]}>
          Selected verses from the Bhagavad Gita — the source behind the names you chose.
        </Text>
        {GITA_CHAPTERS.map(chapter => (
          <TouchableOpacity
            key={chapter.id}
            style={[styles.gitaRow, { backgroundColor: colors.backgroundCard, borderColor: colors.separator }]}
            onPress={() => setOpenGita(chapter.id)}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.gitaRef, { color: colors.gold }]}>{chapter.reference}</Text>
              <Text style={[styles.gitaSanskritSmall, { color: colors.textPrimary }]} numberOfLines={1}>{chapter.sanskrit}</Text>
              <Text style={[styles.gitaMeaningSmall, { color: colors.textDim }]} numberOfLines={2}>{chapter.meaning}</Text>
            </View>
            <Text style={{ color: colors.textDim, fontSize: 20, fontWeight: '300' }}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: Spacing.xs, minWidth: 60 }}>
          <Text style={{ ...Typography.body, color: colors.gold }}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={{ ...Typography.headline, color: colors.textPrimary }}>Read</Text>
        <View style={{ minWidth: 60 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { borderBottomColor: colors.separator }]}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && { borderBottomColor: colors.gold, borderBottomWidth: 2 }]}
            onPress={() => _switchTab(tab.key)}
          >
            <Text style={[styles.tabLabel, { color: activeTab === tab.key ? colors.gold : colors.textDim, fontWeight: activeTab === tab.key ? '700' : '400' }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'daily'   && _renderDaily()}
        {activeTab === 'letters' && _renderLetters()}
        {activeTab === 'gita'    && _renderGita()}

        {/* Clarity Journal entry */}
        <TouchableOpacity
          style={[styles.journalBtn, { backgroundColor: colors.backgroundCard, borderColor: colors.separator }]}
          onPress={() => navigation.navigate('ClarityJournal')}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[styles.journalBtnLabel, { color: colors.gold }]}>🪞 CLARITY JOURNAL</Text>
            <Text style={[styles.journalBtnSub, { color: colors.textPrimary }]}>Three questions. Every night.</Text>
            <Text style={[styles.journalBtnDesc, { color: colors.textDim }]}>What hard thing? What decision owned? What did I escape?</Text>
          </View>
          <Text style={{ color: colors.textDim, fontSize: 20, fontWeight: '300' }}>›</Text>
        </TouchableOpacity>
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  tabRow:           { flexDirection: 'row', borderBottomWidth: 1 },
  tab:              { flex: 1, alignItems: 'center', paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabLabel:         { ...Typography.callout },
  sectionTag:       { ...Typography.caption2, letterSpacing: 1.5, fontWeight: '700' },
  nextTag:          { ...Typography.caption1 },
  groupLabel:       { ...Typography.caption2, letterSpacing: 1.5, marginTop: Spacing.sm },
  introText:        { ...Typography.callout, lineHeight: 22, fontStyle: 'italic' },
  backLabel:        { ...Typography.callout, fontWeight: '600' },
  divider:          { height: 1, marginVertical: Spacing.lg },

  dailyCard:        { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.xl, gap: 8 },
  dailyTitle:       { ...Typography.title3, fontWeight: '700' },
  dailyText:        { ...Typography.callout, lineHeight: 24 },

  readRow:          { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.lg, gap: 6, flexDirection: 'row', alignItems: 'center' },
  readTitle:        { ...Typography.callout, fontWeight: '600' },
  readPreview:      { ...Typography.caption1, lineHeight: 18 },

  letterRow:        { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  letterCatSmall:   { ...Typography.caption2, letterSpacing: 1 },
  letterRowTitle:   { ...Typography.callout, fontWeight: '600' },
  letterMeta:       { ...Typography.caption2 },

  letterCard:       { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.xl, gap: Spacing.md },
  letterCategory:   { ...Typography.caption2, letterSpacing: 1.5, fontWeight: '700' },
  letterTitle:      { ...Typography.title3, fontWeight: '700' },
  letterBody:       { ...Typography.callout, lineHeight: 26 },

  gitaRow:          { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.lg, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  gitaCard:         { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.xl, gap: Spacing.md },
  gitaRef:          { ...Typography.caption2, letterSpacing: 1, fontWeight: '700' },
  gitaSanskrit:     { ...Typography.title3, fontWeight: '600', lineHeight: 30 },
  gitaSanskritSmall:{ ...Typography.callout, fontWeight: '500' },
  gitaMeaning:      { ...Typography.callout, lineHeight: 24, fontStyle: 'italic' },
  gitaMeaningSmall: { ...Typography.caption1, lineHeight: 18 },
  applicationBox:   { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.lg, gap: 8, marginTop: Spacing.sm },
  applicationLabel: { ...Typography.caption2, letterSpacing: 1.5, fontWeight: '700' },
  applicationText:  { ...Typography.callout, lineHeight: 24 },
  journalBtn:       { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.xl, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.xl },
  journalBtnLabel:  { ...Typography.caption2, letterSpacing: 1.5, fontWeight: '700' },
  journalBtnSub:    { ...Typography.callout, fontWeight: '600' },
  journalBtnDesc:   { ...Typography.caption1, lineHeight: 18 },
});

export default MotivationScreen;
