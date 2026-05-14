// ─── KARMA APP — KNOW KARMA SCREEN (PHASE F-5) ───────────────────────
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Typography, Spacing, Radius } from '../constants/colors';
import { getSetting } from '../database/habitService';
import { getFullStats } from '../services/gamificationService';

const Section = ({ title, icon, children, colors }) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.separator, marginBottom: Spacing.md, overflow: 'hidden' }}>
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md }}
        onPress={() => setOpen(!open)}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 22 }}>{icon}</Text>
        <Text style={{ ...Typography.callout, color: colors.textPrimary, fontWeight: '600', flex: 1 }}>{title}</Text>
        <Text style={{ ...Typography.callout, color: colors.textDim }}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, borderTopWidth: 1, borderTopColor: colors.separator, paddingTop: Spacing.lg, gap: Spacing.md }}>
          {children}
        </View>
      )}
    </View>
  );
};

const Row = ({ label, value, color, colors }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: colors.separator + '60' }}>
    <Text style={{ ...Typography.callout, color: colors.textMuted, flex: 1 }}>{label}</Text>
    <Text style={{ ...Typography.callout, color: color || colors.gold, fontWeight: '700' }}>{value}</Text>
  </View>
);

const P = ({ children, colors }) => (
  <Text style={{ ...Typography.callout, color: colors.textMuted, lineHeight: 22 }}>{children}</Text>
);

const KnowKarmaScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [alterEgo, setAlterEgo] = useState('Gagan');
  const [stats,    setStats]    = useState(null);

  useEffect(() => {
    getSetting('alter_ego').then(v => setAlterEgo(v || 'Gagan')).catch(() => {});
    getFullStats().then(setStats).catch(() => {});
  }, []);

  const kt = stats?.karmaTitle;
  const lv = stats?.levelInfo;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: colors.separator }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ ...Typography.body, color: colors.gold }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ ...Typography.headline, color: colors.textPrimary }}>Know Karma ☸</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.xl }} showsVerticalScrollIndicator={false}>

        {/* Your current stats */}
        {stats && kt && (
          <View style={{ backgroundColor: colors.backgroundCard, borderRadius: Radius.xl, borderWidth: 1.5, borderColor: kt.color + '40', padding: Spacing.xl, marginBottom: Spacing.xl, gap: Spacing.sm }}>
            <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2 }}>YOUR CURRENT STATUS</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <Text style={{ fontSize: 36 }}>{kt.icon}</Text>
              <View>
                <Text style={{ ...Typography.title3, color: kt.color, fontWeight: '700' }}>{kt.title}</Text>
                <Text style={{ ...Typography.caption1, color: colors.textDim }}>Karma Score: {stats.karmaScore}/1000</Text>
              </View>
              <View style={{ marginLeft: 'auto', alignItems: 'flex-end' }}>
                <Text style={{ ...Typography.callout, color: colors.blue, fontWeight: '700' }}>⚡ {stats.totalXP} XP</Text>
                <Text style={{ ...Typography.caption2, color: colors.textDim }}>{lv?.icon} {lv?.title}</Text>
              </View>
            </View>
          </View>
        )}

        <Text style={{ ...Typography.caption2, color: colors.textDim, letterSpacing: 2, marginBottom: Spacing.md }}>
          TAP ANY SECTION TO EXPAND
        </Text>

        {/* XP */}
        <Section title="What is XP?" icon="⚡" colors={colors}>
          <P colors={colors}>XP (Experience Points) is your lifetime discipline counter. Every action earns or costs XP — it never resets.</P>
          <View style={{ gap: 0 }}>
            <Row label="Do a habit (build)"       value="+1 XP"  color={colors.green}   colors={colors} />
            <Row label="Resist a break habit"      value="+2 XP"  color={colors.green}   colors={colors} />
            <Row label="Perfect day (all habits)"  value="+5 XP"  color={colors.green}   colors={colors} />
            <Row label="Intentional skip"          value="–1 XP"  color={colors.orange}  colors={colors} />
            <Row label="Auto-skipped (forgot log)" value="–2 XP"  color={colors.orange}  colors={colors} />
            <Row label="Missed habit"              value="–2 XP"  color={colors.red}     colors={colors} />
            <Row label="Slip on break habit"       value="–5 XP"  color={colors.red}     colors={colors} />
            <Row label="WFO auto-skip"             value="0 XP"   color={colors.textDim} colors={colors} />
          </View>
          <P colors={colors}>XP can go negative. It is your honest lifetime score — no floor, no inflation.</P>
        </Section>

        {/* Karma Score */}
        <Section title="What is Karma Score?" icon="☸" colors={colors}>
          <P colors={colors}>Karma Score (0–1000) reflects your current form — how consistently you are doing ALL your active habits over the last 30 days. It rolls forward daily. No reset.</P>
          <P colors={colors}>Formula: (done check-ins ÷ possible days per habit) averaged across all habits × 1000. Skipped days and WFO days are excluded from the denominator — they don't hurt you.</P>
          <View style={{ gap: 0 }}>
            <Row label="Only doing 1 of 10 habits well" value="~100"  color={colors.textMuted} colors={colors} />
            <Row label="Half your habits consistently"  value="~500"  color={colors.gold}      colors={colors} />
            <Row label="All habits every day"           value="1000"  color={colors.green}     colors={colors} />
          </View>
          <P colors={colors}>When you archive or pause a habit, it is removed from the denominator immediately — your score reflects only active habits.</P>
          <P colors={colors}>Can you reach 1000? Yes — but only with 30 consecutive perfect days across all active habits. That is the point.</P>
        </Section>

        {/* Karma Titles */}
        <Section title="What are Karma Titles?" icon="🔱" colors={colors}>
          <P colors={colors}>Your Karma Title is the name of your current Karma Score bracket. It lives in the HomeScreen badge. Unlike XP levels, it can go down if your consistency drops.</P>
          <View style={{ gap: 0 }}>
            {[
              { score: '0–99',    title: 'Seeker',       icon: '🌱' },
              { score: '100–199', title: 'Awakening',    icon: '🔥' },
              { score: '200–399', title: 'Consistent',   icon: '⭐' },
              { score: '400–599', title: 'Disciplined',  icon: '⚔️' },
              { score: '600–799', title: 'Unstoppable',  icon: '⚡' },
              { score: '800–999', title: 'Transcendent', icon: '🔱' },
              { score: '1000',    title: 'Dhruv',        icon: '👑' },
            ].map((t, i) => (
              <Row key={i} label={`${t.icon}  ${t.title}`} value={`Score ${t.score}`} color={colors.gold} colors={colors} />
            ))}
          </View>
        </Section>

        {/* XP Levels */}
        <Section title="What are XP Levels?" icon="🪔" colors={colors}>
          <P colors={colors}>XP Levels are a secondary metric based on your total lifetime XP. Unlike Karma Titles they never go down — once earned, permanent. Shown in Stats and Settings.</P>
          <View style={{ gap: 0 }}>
            {[
              { xp: '0',    title: 'Seedling',     icon: '🌱' },
              { xp: '50',   title: 'Kindled',      icon: '🕯️' },
              { xp: '200',  title: 'Practitioner', icon: '📿' },
              { xp: '500',  title: 'Sadhaka',      icon: '🧘' },
              { xp: '1000', title: 'Warrior',      icon: '⚔️' },
              { xp: '2500', title: 'Yogi',         icon: '🔱' },
              { xp: '5000', title: 'Akash',        icon: '👑' },
            ].map((l, i) => (
              <Row key={i} label={`${l.icon}  ${l.title}`} value={`${l.xp}+ XP`} color={colors.blue} colors={colors} />
            ))}
          </View>
        </Section>

        {/* Milestone Badges */}
        <Section title="What are Milestone Badges?" icon="🏆" colors={colors}>
          <P colors={colors}>Each habit earns its own milestone badges as its streak grows. Once earned, permanent — even if the streak later breaks. Visible inside HabitDetailScreen for that habit.</P>
          <View style={{ gap: 0 }}>
            {[
              [3,'🌱','Seed Planted'], [7,'🔥','One Week'], [14,'⭐',"Dhruv's Path"],
              [21,'🧠','Neural Rewired'], [30,'🏆','Month of Karma'], [48,'⚡','Beyond Comfort'],
              [60,'🌊','Pisces Depth'], [75,'⚔️',"Warrior's Rest"], [90,'🔱','Identity Shift'],
              [180,'🌌','Half a Year'], [365,'👑','Akash — The Limitless'],
            ].map(([d, b, t], i) => (
              <Row key={i} label={`${b}  ${t}`} value={`${d}-day streak`} color={colors.gold} colors={colors} />
            ))}
          </View>
          <P colors={colors}>Milestones also award XP: 3d→+3, 7d→+5, 14d→+8, 21d→+10, 30d→+15, 90d→+30, 365d→+100.</P>
        </Section>

        {/* Journey Badges */}
        <Section title="What are Journey Badges?" icon="🎯" colors={colors}>
          <P colors={colors}>Journey Badges are overall app achievements — not per-habit. Harder to earn than milestone badges. Shown in Stats → Badges. Once earned, permanent.</P>
          <View style={{ gap: 0 }}>
            {[
              ['🌅','First Dawn',      'First habit logged'],
              ['✊','First Resistance', 'First break habit resisted'],
              ['🗡️','Ten Battles',     '10 total completions'],
              ['💯','The Century',      '100 total completions'],
              ['🎯','All-In Day',       'First perfect day (all habits)'],
              ['🔆','First Flame',      'Karma Score 200+'],
              ['🛡️','The Shield',      'Karma Score 400+'],
              ['🌊','The Current',      'Karma Score 600+'],
              ['🏔️','The Mountain',    'Karma Score 800+'],
              ['🧘','The Yogi',         'All habits have a streak today'],
              ['🌟','Legend',           'Karma Score 1000'],
            ].map(([b, t, c], i) => (
              <Row key={i} label={`${b}  ${t}`} value={c} color={colors.blue} colors={colors} />
            ))}
          </View>
        </Section>

        {/* SIP */}
        <Section title="What is SIP?" icon="🕉️" colors={colors}>
          <P colors={colors}>SIP organises your habits into 4 dimensions. Every habit belongs to one. HomeScreen groups habits by SIP so you see your holistic progress at a glance.</P>
          <View style={{ gap: 0 }}>
            <Row label="🕉️  Spiritual"    value="Soul practices"        color="#BF5AF2" colors={colors} />
            <Row label="📚  Intellectual" value="Mind & learning"        color="#0A84FF" colors={colors} />
            <Row label="💪  Physical"     value="Body & health"          color="#30D158" colors={colors} />
            <Row label="🔥  Conscious"    value="Habits to overcome"     color="#FF453A" colors={colors} />
          </View>
          <P colors={colors}>Any habit — build or break — can be assigned to any category. Edit a habit to change its category anytime.</P>
        </Section>

        {/* Auto-skip */}
        <Section title="What is Auto-Skip?" icon="⚠️" colors={colors}>
          <P colors={colors}>If you open the app and yesterday had habits you never logged, the system marks them as Auto-Skipped.</P>
          <P colors={colors}>Auto-skip costs –2 XP per habit. It does NOT break your streak — but it is a signal that you forgot to log. Check History within 3 days to correct if you actually did the habit (restores your XP).</P>
          <P colors={colors}>WFO habits auto-skip with 0 XP when you are in travel mode. Those do not count against you.</P>
        </Section>

        {/* Neural Rewiring */}
        <Section title="What is Neural Rewiring?" icon="🧠" colors={colors}>
          <P colors={colors}>Based on Phillippa Lally's UCL 2010 study: habits become automatic after an average of 66 practice sessions. This is NOT 66 consecutive days — it is 66 total repetitions. Missing days slows you but does not reset the count.</P>
          <View style={{ gap: 0 }}>
            <Row label="Sessions 0–21"  value="Forming"      color={colors.red}    colors={colors} />
            <Row label="Sessions 21–45" value="Strengthening" color={colors.orange} colors={colors} />
            <Row label="Sessions 45–66" value="Deepening"    color={colors.gold}   colors={colors} />
            <Row label="Sessions 66+"   value="Automatic"    color={colors.green}  colors={colors} />
          </View>
          <P colors={colors}>Your 15-year bad habits built thick neural highways. You cannot demolish them — you build a better road alongside and stop using the old one.</P>
        </Section>

        {/* Streak Freeze */}
        <Section title="What is a Streak Freeze?" icon="🧊" colors={colors}>
          <P colors={colors}>A streak freeze protects your streak for one day when you cannot complete a habit. It is earned automatically when your weekly consistency is 80% or higher. Maximum 3 freezes at a time.</P>
          <P colors={colors}>Use it from HabitDetailScreen. The day is marked done without a check-in. Your streak continues.</P>
        </Section>

        {/* Notifications */}
        <Section title="How do Notifications work?" icon="🔔" colors={colors}>
          <P colors={colors}>Karma has 4 smart notification types, fully configurable in Settings → Configure Notifications.</P>
          <View style={{ gap: 0 }}>
            <Row label="🌅  Morning Intention"  value="Daily reminder"        color={colors.gold} colors={colors} />
            <Row label="🌙  Evening Log"         value="Log before midnight"   color={colors.gold} colors={colors} />
            <Row label="🔥  Streak Protection"  value="Streak at risk alert"  color={colors.gold} colors={colors} />
            <Row label="📖  Sunday Reflection"  value="Weekly review prompt"  color={colors.gold} colors={colors} />
          </View>
          <P colors={colors}>Each notification can have custom time, custom message, and specific days. Add unlimited custom notifications. Tapping a notification opens the app directly.</P>
        </Section>

        {/* Chariot */}
        <Section title="The Chariot Framework" icon="☸" colors={colors}>
          <P colors={colors}>The soul of Karma — drawn from the Bhagavad Gita:</P>
          <View style={{ gap: 0 }}>
            <Row label="The Chariot"     value="Your body"        color={colors.textMuted} colors={colors} />
            <Row label="The Horses"      value="Your five senses" color={colors.textMuted} colors={colors} />
            <Row label="The Reins"       value="Your mind"        color={colors.textMuted} colors={colors} />
            <Row label="Arjuna"          value="Your ego"         color={colors.textMuted} colors={colors} />
            <Row label="Krishna"         value="Your intellect"   color={colors.gold}      colors={colors} />
            <Row label="The Battlefield" value="Every moment"     color={colors.textMuted} colors={colors} />
          </View>
          <P colors={colors}>Karma is Krishna. It shows the path. It does not fight for {alterEgo}. That is your dharma.</P>
          <Text style={{ ...Typography.callout, color: colors.gold, fontStyle: 'italic', textAlign: 'center', marginTop: Spacing.sm }}>
            "Nimitta matram bhava — Be merely an instrument." — Gita 11.33
          </Text>
        </Section>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default KnowKarmaScreen;