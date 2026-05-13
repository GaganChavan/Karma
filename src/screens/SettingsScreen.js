// ─── KARMA APP — SETTINGS SCREEN (PHASE E — FIXED) ───────────────────
// Fix: _sendWeeklyNow now calculates real weekly consistency rate
// Previously always sent weeklyRate: 75 (hardcoded)

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Switch, TextInput, Alert, ActivityIndicator,
  StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView }    from 'react-native-safe-area-context';
import { useFocusEffect }  from '@react-navigation/native';
import { useTheme, Typography, Spacing, Radius } from '../constants/colors';
import {
  getSetting, setSetting, getAllSettings,
  getAllHabits, getTodayCheckins, getStreak,
} from '../database/habitService';
import {
  cancelAllNotifications, scheduleAllHabitNotifications,
} from '../services/notificationService';
import { exportData, importData, clearAllData, getBackupInfo } from '../services/backupService';
import { getFullStats }    from '../services/gamificationService';
import { SHLOKAS }         from '../constants/shlokas';
import ShlokaDisplay       from '../components/ShlokaDisplay';
import { sendDailyWhatsApp, sendWeeklyWhatsApp } from '../services/whatsappService';
import { isWFOMode }       from '../services/wfoService';
import { getDatabase }     from '../database/database';
import { getTriggerPattern } from '../database/moodService';

const SettingsScreen = ({ navigation }) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const [alterEgo,      setAlterEgo]      = useState('Gagan');
  const [identityStmt,  setIdentityStmt]  = useState('');
  const [editingName,   setEditingName]   = useState(false);
  const [editingId,     setEditingId]     = useState(false);
  const [tempName,      setTempName]      = useState('');
  const [tempId,        setTempId]        = useState('');
  const [notifEnabled,  setNotifEnabled]  = useState(true);
  const [waDaily,       setWaDaily]       = useState(true);
  const [waWeekly,      setWaWeekly]      = useState(true);
  const [weekStart,     setWeekStart]     = useState('monday');
  const [gamStats,      setGamStats]      = useState(null);
  const [backupInfo,    setBackupInfo]    = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [exporting,     setExporting]     = useState(false);
  const [importing,     setImporting]     = useState(false);
  const [sendingWA,     setSendingWA]     = useState(false);
  const [wfoActive,     setWfoActive]     = useState(false);
  const [wfoCity,       setWfoCity]       = useState('Bangalore');
  const [homeCity,      setHomeCity]      = useState('Hassan');

  useFocusEffect(useCallback(() => { _loadSettings(); }, []));

  const _loadSettings = async () => {
    try {
      setLoading(true);
      const [settings, gam, info, wfo] = await Promise.all([
        getAllSettings(),
        getFullStats(),
        getBackupInfo(),
        isWFOMode(),
      ]);
      setAlterEgo(settings.alter_ego       || 'Gagan');
      setTempName(settings.alter_ego       || 'Gagan');
      setIdentityStmt(settings.identity_statement || '');
      setTempId(settings.identity_statement || '');
      setNotifEnabled(settings.notification_master !== 'false');
      setWaDaily(settings.wa_daily  !== 'false');
      setWaWeekly(settings.wa_weekly !== 'false');
      setWeekStart(settings.week_starts || 'monday');
      setGamStats(gam);
      setBackupInfo(info);
      setWfoActive(wfo);
      setWfoCity(settings.wfo_city  || 'Bangalore');
      setHomeCity(settings.home_city || 'Hassan');
    } catch (err) {
      console.warn('Settings load:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const _saveAlterEgo = async () => {
    const name = tempName.trim();
    if (!name) { Alert.alert('Error', 'Name cannot be empty'); return; }
    try {
      await setSetting('alter_ego', name);
      setAlterEgo(name);
      setEditingName(false);
    } catch (err) { Alert.alert('Error', err.message); }
  };

  const _saveIdentity = async () => {
    const stmt = tempId.trim();
    if (!stmt) { Alert.alert('Error', 'Declaration cannot be empty'); return; }
    try {
      await setSetting('identity_statement', stmt);
      setIdentityStmt(stmt);
      setEditingId(false);
      Alert.alert('✅ Identity Declared', 'Shown every morning.');
    } catch (err) { Alert.alert('Error', err.message); }
  };

  const _toggleTheme = async (value) => {
    try {
      await setSetting('app_theme', value ? 'dark' : 'light');
      toggleTheme(value);
    } catch (err) { Alert.alert('Error', err.message); }
  };

  const _toggleNotif = async (value) => {
    try {
      await setSetting('notification_master', value ? 'true' : 'false');
      setNotifEnabled(value);
      if (value) await scheduleAllHabitNotifications();
      else       await cancelAllNotifications();
    } catch (err) { Alert.alert('Error', err.message); }
  };

  const _sendDailyNow = async () => {
    setSendingWA(true);
    try {
      const habits   = await getAllHabits();
      const todayCIs = await getTodayCheckins();
      const cMap     = {};
      todayCIs.forEach(c => { cMap[c.habit_id] = c; });
      const streaks  = {};
      await Promise.all(habits.map(async h => {
        try { streaks[h.id] = await getStreak(h.id); } catch {}
      }));
      await sendDailyWhatsApp({
        alterEgo,
        habits,
        checkins: cMap,
        streaks,
        totalXP:    gamStats?.totalXP    || 0,
        todayXP:    0,
        karmaScore: gamStats?.karmaScore || 0,
        levelInfo:  gamStats?.levelInfo,
      });
    } catch (err) { Alert.alert('Error', err.message); }
    finally { setSendingWA(false); }
  };

  // FIX: Calculate real weekly stats before sending
  const _sendWeeklyNow = async () => {
    setSendingWA(true);
    try {
      const habits = await getAllHabits();
      const db     = await getDatabase();

      // Week dates (Mon–today)
      const today       = new Date();
      const dow         = today.getDay();
      const daysFromMon = dow === 0 ? 6 : dow - 1;
      const monday      = new Date(today);
      monday.setDate(today.getDate() - daysFromMon);
      const fromDate  = monday.toISOString().split('T')[0];
      const todayDate = today.toISOString().split('T')[0];

      // Actual weekly completion rate
      let weeklyRate = 0;
      if (habits.length > 0 && daysFromMon + 1 > 0) {
        const done = await db.getFirstAsync(
          `SELECT COUNT(*) as count FROM checkins
           WHERE date >= ? AND date <= ? AND status IN ('done','resisted')`,
          [fromDate, todayDate]
        );
        const possible = habits.length * (daysFromMon + 1);
        weeklyRate = possible > 0
          ? Math.round(((done?.count || 0) / possible) * 100)
          : 0;
      }

      // Top streaks this week
      const streakArr = await Promise.all(habits.map(async h => {
        try {
          const s = await getStreak(h.id);
          return { name: h.name, current: s.current };
        } catch { return { name: h.name, current: 0 }; }
      }));
      const topStreaks = streakArr
        .filter(s => s.current > 0)
        .sort((a, b) => b.current - a.current)
        .slice(0, 3);

      // Best and needs-work habit
      const habitRates = await Promise.all(habits.map(async h => {
        const done  = await db.getFirstAsync(
          `SELECT COUNT(*) as count FROM checkins
           WHERE habit_id = ? AND date >= ? AND status IN ('done','resisted')`,
          [h.id, fromDate]
        );
        const rate = daysFromMon + 1 > 0
          ? Math.round(((done?.count || 0) / (daysFromMon + 1)) * 100)
          : 0;
        return { name: h.name, rate };
      }));
      const buildRates = habitRates.filter((_, i) => habits[i]?.type === 'build');
      const bestHabit   = buildRates.length > 0
        ? buildRates.reduce((a, b) => a.rate >= b.rate ? a : b)
        : null;
      const needsWork   = buildRates.length > 0
        ? buildRates.reduce((a, b) => a.rate <= b.rate ? a : b)
        : null;

      // Top overall trigger this week
      const triggerCounts = {};
      for (const h of habits) {
        try {
          const result = await getTriggerPattern(h.id);
          if (result?.topTrigger) {
            triggerCounts[result.topTrigger] = (triggerCounts[result.topTrigger] || 0) + result.topCount;
          }
        } catch {}
      }
      const topTrigger = Object.keys(triggerCounts).length > 0
        ? Object.entries(triggerCounts).sort((a, b) => b[1] - a[1])[0][0]
        : null;

      await sendWeeklyWhatsApp({
        alterEgo,
        weeklyRate,
        bestHabit,
        needsWork:      bestHabit?.name !== needsWork?.name ? needsWork : null,
        topStreaks,
        totalXP:        gamStats?.totalXP    || 0,
        weekXP:         0,
        karmaScore:     gamStats?.karmaScore || 0,
        karmaScorePrev: 0,
        levelInfo:      gamStats?.levelInfo,
        topTrigger,
        weekNumber:     Math.ceil(today.getDate() / 7),
      });
    } catch (err) { Alert.alert('Error', err.message); }
    finally { setSendingWA(false); }
  };

  const _export = async () => {
    setExporting(true);
    try { await exportData(); }
    catch (err) { Alert.alert('Export Failed', err.message); }
    finally { setExporting(false); }
  };

  const _import = async () => {
    setImporting(true);
    try {
      const r = await importData();
      if (r.success) {
        Alert.alert('✅ Restored', r.message);
        _loadSettings();
      } else if (r.message !== 'Cancelled') {
        Alert.alert('Import Failed', r.message);
      }
    } catch (err) { Alert.alert('Import Failed', err.message); }
    finally { setImporting(false); }
  };

  const _clearData = () => {
    Alert.alert('⚠️ Clear All Data', 'Permanently deletes everything.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear Everything', style: 'destructive', onPress: async () => {
        try {
          await clearAllData();
          _loadSettings();
          Alert.alert('Cleared', `Start fresh, ${alterEgo}.`);
        } catch (err) { Alert.alert('Error', err.message); }
      }},
    ]);
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={colors.gold} />
    </View>
  );

  const s = makeStyles(colors);

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={s.header}><Text style={s.headerTitle}>Settings</Text></View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* IDENTITY */}
        <Text style={s.groupLabel}>IDENTITY</Text>
        <View style={s.group}>
          {!editingName ? (
            <TouchableOpacity style={s.row} onPress={() => { setTempName(alterEgo); setEditingName(true); }}>
              <View><Text style={s.rowLabel}>Name</Text><Text style={s.rowDesc}>Karma calls you by this name</Text></View>
              <View style={s.rowRight}><Text style={s.rowValue}>{alterEgo}</Text><Text style={s.rowArrow}>›</Text></View>
            </TouchableOpacity>
          ) : (
            <View style={s.editRow}>
              <TextInput style={s.textInput} value={tempName} onChangeText={setTempName} maxLength={20} autoFocus returnKeyType="done" onSubmitEditing={_saveAlterEgo} placeholderTextColor={colors.textPlaceholder} />
              <TouchableOpacity style={s.saveBtn} onPress={_saveAlterEgo}><Text style={s.saveBtnText}>Save</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingName(false)}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
            </View>
          )}
          <View style={s.separator} />
          {!editingId ? (
            <TouchableOpacity style={s.row} onPress={() => { setTempId(identityStmt); setEditingId(true); }}>
              <View style={{ flex: 1 }}><Text style={s.rowLabel}>Morning Declaration</Text><Text style={s.rowDesc} numberOfLines={2}>{identityStmt}</Text></View>
              <Text style={s.rowArrow}>›</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ padding: Spacing.lg, gap: Spacing.md }}>
              <Text style={{ ...Typography.caption1, color: colors.textDim }}>Write who you are becoming. Shown every morning.</Text>
              <TextInput style={[s.textInput, { height: 80, textAlignVertical: 'top' }]} value={tempId} onChangeText={setTempId} maxLength={120} multiline autoFocus placeholderTextColor={colors.textPlaceholder} placeholder={`I am ${alterEgo}. My mind holds the reins...`} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                <TouchableOpacity style={s.saveBtn} onPress={_saveIdentity}><Text style={s.saveBtnText}>Save Declaration</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setEditingId(false)}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
              </View>
            </View>
          )}
          <View style={s.separator} />
          <View style={s.row}>
            <Text style={s.rowLabel}>Level</Text>
            <Text style={[s.rowValue, { color: gamStats?.levelInfo?.color }]}>{gamStats?.levelInfo?.icon} {gamStats?.levelInfo?.title} · {gamStats?.totalXP} XP</Text>
          </View>
          <View style={s.separator} />
          <View style={s.row}>
            <Text style={s.rowLabel}>Karma Score</Text>
            <Text style={[s.rowValue, { color: colors.gold }]}>{gamStats?.karmaScore || 0}/1000</Text>
          </View>
        </View>

        {/* TRANSFORMATION TOOLS */}
        <Text style={s.groupLabel}>TRANSFORMATION TOOLS</Text>
        <View style={s.group}>
          <TouchableOpacity style={s.row} onPress={() => navigation.navigate('WFOMode')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <Text style={{ fontSize: 22 }}>{wfoActive ? '🏙️' : '🏡'}</Text>
              <View>
                <Text style={s.rowLabel}>Travel Mode</Text>
                <Text style={s.rowDesc}>{wfoActive ? `${wfoCity} mode active` : `${homeCity} → ${wfoCity} context switch`}</Text>
              </View>
            </View>
            <View style={s.rowRight}>
              {wfoActive && (
                <View style={{ backgroundColor: colors.blue + '25', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full }}>
                  <Text style={{ ...Typography.caption2, color: colors.blue, fontWeight: '700' }}>ACTIVE</Text>
                </View>
              )}
              <Text style={s.rowArrow}>›</Text>
            </View>
          </TouchableOpacity>
          <View style={s.separator} />
          <TouchableOpacity style={s.row} onPress={() => navigation.navigate('NeuralProgress')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <Text style={{ fontSize: 22 }}>🧠</Text>
              <View><Text style={s.rowLabel}>Neural Rewiring</Text><Text style={s.rowDesc}>66-day pathway progress per habit</Text></View>
            </View>
            <Text style={s.rowArrow}>›</Text>
          </TouchableOpacity>
          <View style={s.separator} />
          <TouchableOpacity style={s.row} onPress={() => navigation.navigate('BeforeNow')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <Text style={{ fontSize: 22 }}>📊</Text>
              <View><Text style={s.rowLabel}>Before vs Now</Text><Text style={s.rowDesc}>90-day transformation — unlocks at 90 days</Text></View>
            </View>
            <Text style={s.rowArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* APPEARANCE */}
        <Text style={s.groupLabel}>APPEARANCE</Text>
        <View style={s.group}>
          <View style={s.row}>
            <View>
              <Text style={s.rowLabel}>{isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}</Text>
              <Text style={s.rowDesc}>{isDark ? 'Tap to switch to light' : 'Tap to switch to dark'}</Text>
            </View>
            <Switch value={isDark} onValueChange={_toggleTheme} trackColor={{ false: colors.separator, true: colors.goldAlpha40 }} thumbColor={isDark ? colors.gold : colors.textMuted} />
          </View>
        </View>

        {/* REMINDERS */}
        <Text style={s.groupLabel}>REMINDERS</Text>
        <View style={s.group}>
          <View style={s.row}>
            <View><Text style={s.rowLabel}>All Notifications</Text><Text style={s.rowDesc}>Master switch</Text></View>
            <Switch value={notifEnabled} onValueChange={_toggleNotif} trackColor={{ false: colors.separator, true: colors.goldAlpha40 }} thumbColor={notifEnabled ? colors.gold : colors.textMuted} />
          </View>
        </View>

        {/* WHATSAPP */}
        <Text style={s.groupLabel}>WHATSAPP REPORTS</Text>
        <View style={s.group}>
          <View style={s.row}>
            <View><Text style={s.rowLabel}>Daily Report</Text><Text style={s.rowDesc}>Today's battlefield summary</Text></View>
            <Switch value={waDaily} onValueChange={async v => { await setSetting('wa_daily', v ? 'true' : 'false'); setWaDaily(v); }} trackColor={{ false: colors.separator, true: 'rgba(37,211,102,0.4)' }} thumbColor={waDaily ? '#25D166' : colors.textMuted} />
          </View>
          <View style={s.separator} />
          <View style={s.row}>
            <View><Text style={s.rowLabel}>Weekly Report</Text><Text style={s.rowDesc}>Sunday full summary</Text></View>
            <Switch value={waWeekly} onValueChange={async v => { await setSetting('wa_weekly', v ? 'true' : 'false'); setWaWeekly(v); }} trackColor={{ false: colors.separator, true: 'rgba(37,211,102,0.4)' }} thumbColor={waWeekly ? '#25D166' : colors.textMuted} />
          </View>
          <View style={s.separator} />
          <TouchableOpacity style={s.row} onPress={_sendDailyNow} disabled={sendingWA}>
            <Text style={s.rowLabel}>Send Daily Now</Text>
            {sendingWA ? <ActivityIndicator size="small" color="#25D166" /> : <Text style={[s.rowArrow, { color: '#25D166' }]}>↑</Text>}
          </TouchableOpacity>
          <View style={s.separator} />
          <TouchableOpacity style={s.row} onPress={_sendWeeklyNow} disabled={sendingWA}>
            <Text style={s.rowLabel}>Send Weekly Now</Text>
            {sendingWA ? <ActivityIndicator size="small" color="#25D166" /> : <Text style={[s.rowArrow, { color: '#25D166' }]}>↑</Text>}
          </TouchableOpacity>
        </View>

        {/* DATA */}
        <Text style={s.groupLabel}>DATA & BACKUP</Text>
        <View style={s.group}>
          {backupInfo && (
            <>
              <View style={s.backupInfoRow}>
                <Text style={s.backupInfoText}>{backupInfo.habitCount} habits · {backupInfo.entryCount} entries · ~{backupInfo.sizeKB}KB</Text>
              </View>
              <View style={s.separator} />
            </>
          )}
          <TouchableOpacity style={s.row} onPress={_export} disabled={exporting}>
            <View><Text style={s.rowLabel}>{exporting ? 'Exporting...' : 'Export Backup'}</Text><Text style={s.rowDesc}>Save as JSON</Text></View>
            {exporting ? <ActivityIndicator size="small" color={colors.gold} /> : <Text style={[s.rowArrow, { color: colors.gold }]}>↑</Text>}
          </TouchableOpacity>
          <View style={s.separator} />
          <TouchableOpacity style={s.row} onPress={_import} disabled={importing}>
            <View><Text style={s.rowLabel}>{importing ? 'Importing...' : 'Import & Restore'}</Text><Text style={s.rowDesc}>Restore from backup</Text></View>
            {importing ? <ActivityIndicator size="small" color={colors.blue} /> : <Text style={[s.rowArrow, { color: colors.blue }]}>↓</Text>}
          </TouchableOpacity>
          <View style={s.separator} />
          <TouchableOpacity style={s.row} onPress={_clearData}>
            <View><Text style={[s.rowLabel, { color: colors.red }]}>Clear All Data</Text><Text style={s.rowDesc}>Permanently delete everything</Text></View>
            <Text style={[s.rowArrow, { color: colors.red }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ABOUT */}
        <Text style={s.groupLabel}>THE KURUKSHETRA WITHIN</Text>
        <View style={[s.group, { padding: Spacing.xl, gap: Spacing.lg }]}>
          {SHLOKAS.chariot.lines.map((line, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: Spacing.md }}>
              <Text style={{ ...Typography.subheadline, color: colors.gold, fontWeight: '700', minWidth: 100 }}>{line.label}</Text>
              <Text style={{ ...Typography.subheadline, color: colors.textMuted, flex: 1, lineHeight: 22 }}>{line.desc}</Text>
            </View>
          ))}
          <View style={s.separator} />
          <Text style={{ ...Typography.callout, color: colors.gold, fontStyle: 'italic', textAlign: 'center' }}>{SHLOKAS.chariot.closing}</Text>
          <ShlokaDisplay shloka={SHLOKAS.identity[0]} variant="card" />
        </View>

        <Text style={s.groupLabel}>ABOUT</Text>
        <View style={s.group}>
          <View style={s.row}><Text style={s.rowLabel}>App</Text><Text style={s.rowValue}>Karma ☸ v1.0</Text></View>
          <View style={s.separator} />
          <View style={s.row}><Text style={s.rowLabel}>Built for</Text><Text style={[s.rowValue, { color: colors.gold }]}>{alterEgo}</Text></View>
          <View style={s.separator} />
          <View style={s.row}><Text style={s.rowLabel}>Cities</Text><Text style={s.rowValue}>{homeCity} · {wfoCity}</Text></View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  screen:         { flex: 1, backgroundColor: colors.background },
  header:         { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.separator },
  headerTitle:    { ...Typography.title2, color: colors.textPrimary },
  scroll:         { flex: 1 },
  scrollContent:  { paddingVertical: Spacing.xl },
  groupLabel:     { ...Typography.caption2, color: colors.textDim, letterSpacing: 1.5, marginHorizontal: Spacing.xl, marginBottom: Spacing.xs, marginTop: Spacing.lg },
  group:          { backgroundColor: colors.backgroundCard, borderRadius: Radius.lg, marginHorizontal: Spacing.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.separator },
  separator:      { height: 1, backgroundColor: colors.separator, marginHorizontal: Spacing.lg },
  row:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, minHeight: 54 },
  rowLabel:       { ...Typography.callout, color: colors.textPrimary },
  rowDesc:        { ...Typography.caption1, color: colors.textDim, marginTop: 3 },
  rowRight:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rowValue:       { ...Typography.callout, color: colors.textMuted },
  rowArrow:       { ...Typography.title3, color: colors.textDim, fontWeight: '300' },
  editRow:        { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
  textInput:      { flex: 1, ...Typography.callout, color: colors.textPrimary, backgroundColor: colors.backgroundElevated, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2, borderWidth: 1, borderColor: colors.separator },
  saveBtn:        { backgroundColor: colors.gold, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 10 },
  saveBtnText:    { ...Typography.footnote, color: '#000', fontWeight: '700' },
  cancelText:     { ...Typography.footnote, color: colors.textMuted },
  backupInfoRow:  { backgroundColor: colors.goldAlpha15, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backupInfoText: { ...Typography.caption1, color: colors.gold },
});

export default SettingsScreen;