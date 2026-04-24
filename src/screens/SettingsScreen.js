// ─── KARMA APP — SETTINGS SCREEN (PHASE C) ───────────────────────────
// Theme toggle now uses useTheme() — switches instantly, no restart.

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Switch, TextInput, Alert, ActivityIndicator,
  StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView }   from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, Typography, Spacing, Radius } from '../constants/colors';
import { getSetting, setSetting, getAllSettings } from '../database/habitService';
import {
  cancelAllNotifications, scheduleAllHabitNotifications,
  getNotificationPermissionStatus,
} from '../services/notificationService';
import { exportData, importData, clearAllData, getBackupInfo } from '../services/backupService';
import { getFullStats } from '../services/gamificationService';
import { SHLOKAS } from '../constants/shlokas';
import ShlokaDisplay from '../components/ShlokaDisplay';
import { sendDailyWhatsApp, sendWeeklyWhatsApp } from '../services/whatsappService';
import { getAllHabits, getTodayCheckins, getStreak } from '../database/habitService';

const SettingsScreen = () => {
  const { colors, isDark, toggleTheme } = useTheme();

  const [alterEgo,      setAlterEgo]      = useState('Neel');
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

  useFocusEffect(useCallback(() => { _loadSettings(); }, []));

  const _loadSettings = async () => {
    try {
      setLoading(true);
      const [settings, gam, info] = await Promise.all([
        getAllSettings(),
        getFullStats(),
        getBackupInfo(),
      ]);
      setAlterEgo(settings.alter_ego || 'Neel');
      setTempName(settings.alter_ego || 'Neel');
      setIdentityStmt(settings.identity_statement || 'I am Neel. My mind holds the reins. The horses do not rule me.');
      setTempId(settings.identity_statement || '');
      setNotifEnabled(settings.notification_master !== 'false');
      setWaDaily(settings.wa_daily !== 'false');
      setWaWeekly(settings.wa_weekly !== 'false');
      setWeekStart(settings.week_starts || 'monday');
      setGamStats(gam);
      setBackupInfo(info);
    } catch (err) {
      console.warn('Settings load:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const _saveAlterEgo = async () => {
    const name = tempName.trim();
    if (!name) { Alert.alert('Error', 'Name cannot be empty'); return; }
    if (name.length > 20) { Alert.alert('Error', 'Name must be under 20 characters'); return; }
    try {
      await setSetting('alter_ego', name);
      setAlterEgo(name);
      setEditingName(false);
    } catch (err) { Alert.alert('Error', err.message); }
  };

  const _saveIdentity = async () => {
    const stmt = tempId.trim();
    if (!stmt) { Alert.alert('Error', 'Declaration cannot be empty'); return; }
    if (stmt.length > 120) { Alert.alert('Error', 'Keep it under 120 characters'); return; }
    try {
      await setSetting('identity_statement', stmt);
      setIdentityStmt(stmt);
      setEditingId(false);
      Alert.alert('✅ Identity Declared', 'Karma will show this every morning.');
    } catch (err) { Alert.alert('Error', err.message); }
  };

  // ── LIVE THEME TOGGLE ─────────────────────────────────────────────
  const _toggleTheme = async (value) => {
    try {
      const theme = value ? 'dark' : 'light';
      await setSetting('app_theme', theme);
      toggleTheme(value); // Updates ThemeContext → re-renders all screens instantly
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const _toggleNotif = async (value) => {
    try {
      await setSetting('notification_master', value ? 'true' : 'false');
      setNotifEnabled(value);
      if (value) await scheduleAllHabitNotifications();
      else       await cancelAllNotifications();
    } catch (err) { Alert.alert('Error', err.message); }
  };

  const _toggleWaDaily  = async (v) => { await setSetting('wa_daily',  v ? 'true' : 'false'); setWaDaily(v); };
  const _toggleWaWeekly = async (v) => { await setSetting('wa_weekly', v ? 'true' : 'false'); setWaWeekly(v); };

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
        alterEgo, habits, checkins: cMap, streaks,
        totalXP: gamStats?.totalXP || 0, todayXP: 0,
        karmaScore: gamStats?.karmaScore || 0, levelInfo: gamStats?.levelInfo,
      });
    } catch (err) { Alert.alert('Error', err.message); }
    finally { setSendingWA(false); }
  };

  const _sendWeeklyNow = async () => {
    setSendingWA(true);
    try {
      await sendWeeklyWhatsApp({
        alterEgo, weeklyRate: 75, topStreaks: [],
        totalXP: gamStats?.totalXP || 0, weekXP: 0,
        karmaScore: gamStats?.karmaScore || 0, karmaScorePrev: 0,
        levelInfo: gamStats?.levelInfo,
        weekNumber: Math.ceil(new Date().getDate() / 7),
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
      if (r.success) { Alert.alert('✅ Restored', r.message); _loadSettings(); }
      else if (r.message !== 'Cancelled') { Alert.alert('Import Failed', r.message); }
    } catch (err) { Alert.alert('Import Failed', err.message); }
    finally { setImporting(false); }
  };

  const _clearData = () => {
    Alert.alert('⚠️ Clear All Data',
      'This permanently deletes all habits, streaks, and history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything', style: 'destructive',
          onPress: async () => {
            try { await clearAllData(); _loadSettings(); Alert.alert('Cleared', 'Start fresh, Neel.'); }
            catch (err) { Alert.alert('Error', err.message); }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  // Inline styles using live colors
  const s = makeStyles(colors);

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={s.header}>
        <Text style={s.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* IDENTITY */}
        <Text style={s.groupLabel}>IDENTITY ON THE BATTLEFIELD</Text>
        <View style={s.group}>
          {!editingName ? (
            <TouchableOpacity style={s.row} onPress={() => { setTempName(alterEgo); setEditingName(true); }}>
              <View>
                <Text style={s.rowLabel}>Name</Text>
                <Text style={s.rowDesc}>Karma calls you by this name</Text>
              </View>
              <View style={s.rowRight}>
                <Text style={s.rowValue}>{alterEgo}</Text>
                <Text style={s.rowArrow}>›</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={s.editRow}>
              <TextInput
                style={s.textInput}
                value={tempName}
                onChangeText={setTempName}
                maxLength={20}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={_saveAlterEgo}
                placeholderTextColor={colors.textPlaceholder}
              />
              <TouchableOpacity style={s.saveBtn} onPress={_saveAlterEgo}>
                <Text style={s.saveBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingName(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={s.separator} />

          {!editingId ? (
            <TouchableOpacity style={s.row} onPress={() => { setTempId(identityStmt); setEditingId(true); }}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>Morning Declaration</Text>
                <Text style={s.rowDesc} numberOfLines={2}>{identityStmt}</Text>
              </View>
              <Text style={s.rowArrow}>›</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.editIdSection}>
              <Text style={s.editIdLabel}>Write who you are becoming. Shown every morning.</Text>
              <TextInput
                style={[s.textInput, { height: 80, textAlignVertical: 'top' }]}
                value={tempId}
                onChangeText={setTempId}
                maxLength={120}
                multiline
                autoFocus
                placeholderTextColor={colors.textPlaceholder}
                placeholder="I am Neel. My mind holds the reins..."
              />
              <View style={s.editBtnRow}>
                <TouchableOpacity style={s.saveBtn} onPress={_saveIdentity}>
                  <Text style={s.saveBtnText}>Save Declaration</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditingId(false)}>
                  <Text style={s.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={s.separator} />
          <View style={s.row}>
            <Text style={s.rowLabel}>Karma Level</Text>
            <Text style={[s.rowValue, { color: gamStats?.levelInfo?.color }]}>
              {gamStats?.levelInfo?.icon} {gamStats?.levelInfo?.title} · {gamStats?.totalXP} XP
            </Text>
          </View>
          <View style={s.separator} />
          <View style={s.row}>
            <Text style={s.rowLabel}>Karma Score</Text>
            <Text style={[s.rowValue, { color: colors.gold }]}>{gamStats?.karmaScore || 0}/1000</Text>
          </View>
        </View>

        {/* APPEARANCE — LIVE THEME TOGGLE */}
        <Text style={s.groupLabel}>APPEARANCE</Text>
        <View style={s.group}>
          <View style={s.row}>
            <View>
              <Text style={s.rowLabel}>
                {isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}
              </Text>
              <Text style={s.rowDesc}>
                {isDark
                  ? 'Kurukshetra at night — tap to switch to light'
                  : 'Dawn on the battlefield — tap to switch to dark'
                }
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={_toggleTheme}
              trackColor={{ false: colors.separator, true: colors.goldAlpha40 }}
              thumbColor={isDark ? colors.gold : colors.textMuted}
              ios_backgroundColor={colors.backgroundElevated}
            />
          </View>
        </View>

        {/* NOTIFICATIONS */}
        <Text style={s.groupLabel}>REMINDERS</Text>
        <View style={s.group}>
          <View style={s.row}>
            <View>
              <Text style={s.rowLabel}>All Notifications</Text>
              <Text style={s.rowDesc}>Master switch for all habit reminders</Text>
            </View>
            <Switch
              value={notifEnabled}
              onValueChange={_toggleNotif}
              trackColor={{ false: colors.separator, true: colors.goldAlpha40 }}
              thumbColor={notifEnabled ? colors.gold : colors.textMuted}
              ios_backgroundColor={colors.backgroundElevated}
            />
          </View>
        </View>

        {/* WHATSAPP */}
        <Text style={s.groupLabel}>WHATSAPP REPORTS</Text>
        <View style={s.group}>
          <View style={s.row}>
            <View>
              <Text style={s.rowLabel}>Daily Report</Text>
              <Text style={s.rowDesc}>Today's battlefield summary</Text>
            </View>
            <Switch
              value={waDaily}
              onValueChange={_toggleWaDaily}
              trackColor={{ false: colors.separator, true: 'rgba(37,211,102,0.4)' }}
              thumbColor={waDaily ? '#25D166' : colors.textMuted}
            />
          </View>
          <View style={s.separator} />
          <View style={s.row}>
            <View>
              <Text style={s.rowLabel}>Weekly Report</Text>
              <Text style={s.rowDesc}>Sunday — full week summary</Text>
            </View>
            <Switch
              value={waWeekly}
              onValueChange={_toggleWaWeekly}
              trackColor={{ false: colors.separator, true: 'rgba(37,211,102,0.4)' }}
              thumbColor={waWeekly ? '#25D166' : colors.textMuted}
            />
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

        {/* PREFERENCES */}
        <Text style={s.groupLabel}>PREFERENCES</Text>
        <View style={s.group}>
          <View style={s.row}>
            <Text style={s.rowLabel}>Week Starts On</Text>
            <View style={s.segRow}>
              {['monday','sunday'].map(d => (
                <TouchableOpacity
                  key={d}
                  style={[s.seg, weekStart === d && s.segActive]}
                  onPress={async () => { await setSetting('week_starts', d); setWeekStart(d); }}
                >
                  <Text style={[s.segText, weekStart === d && s.segTextActive]}>
                    {d === 'monday' ? 'Mon' : 'Sun'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* DATA */}
        <Text style={s.groupLabel}>DATA & BACKUP</Text>
        <View style={s.group}>
          {backupInfo && (
            <>
              <View style={s.backupInfoRow}>
                <Text style={s.backupInfoText}>
                  {backupInfo.habitCount} habits · {backupInfo.entryCount} entries · ~{backupInfo.sizeKB}KB
                </Text>
              </View>
              <View style={s.separator} />
            </>
          )}
          <TouchableOpacity style={s.row} onPress={_export} disabled={exporting}>
            <View>
              <Text style={s.rowLabel}>{exporting ? 'Exporting...' : 'Export Backup'}</Text>
              <Text style={s.rowDesc}>Save all karma as JSON</Text>
            </View>
            {exporting ? <ActivityIndicator size="small" color={colors.gold} /> : <Text style={[s.rowArrow, { color: colors.gold }]}>↑</Text>}
          </TouchableOpacity>
          <View style={s.separator} />
          <TouchableOpacity style={s.row} onPress={_import} disabled={importing}>
            <View>
              <Text style={s.rowLabel}>{importing ? 'Importing...' : 'Import & Restore'}</Text>
              <Text style={s.rowDesc}>Restore from backup file</Text>
            </View>
            {importing ? <ActivityIndicator size="small" color={colors.blue} /> : <Text style={[s.rowArrow, { color: colors.blue }]}>↓</Text>}
          </TouchableOpacity>
          <View style={s.separator} />
          <TouchableOpacity style={s.row} onPress={_clearData}>
            <View>
              <Text style={[s.rowLabel, { color: colors.red }]}>Clear All Data</Text>
              <Text style={s.rowDesc}>Permanently delete everything</Text>
            </View>
            <Text style={[s.rowArrow, { color: colors.red }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ABOUT */}
        <Text style={s.groupLabel}>THE KURUKSHETRA WITHIN</Text>
        <View style={[s.group, { padding: Spacing.xl, gap: Spacing.lg }]}>
          {SHLOKAS.chariot.lines.map((line, i) => (
            <View key={i} style={s.chariotRow}>
              <Text style={s.chariotLabel}>{line.label}</Text>
              <Text style={s.chariotDesc}>{line.desc}</Text>
            </View>
          ))}
          <View style={s.separator} />
          <Text style={s.chariotClosing}>{SHLOKAS.chariot.closing}</Text>
          <ShlokaDisplay shloka={SHLOKAS.identity[0]} variant="card" />
        </View>

        <Text style={s.groupLabel}>ABOUT</Text>
        <View style={s.group}>
          <View style={s.row}>
            <Text style={s.rowLabel}>App</Text>
            <Text style={s.rowValue}>Karma ☸ v1.0</Text>
          </View>
          <View style={s.separator} />
          <View style={s.row}>
            <Text style={s.rowLabel}>Built for</Text>
            <Text style={[s.rowValue, { color: colors.gold }]}>{alterEgo}</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// Dynamic styles based on live colors
const makeStyles = (colors) => StyleSheet.create({
  screen:        { flex: 1, backgroundColor: colors.background },
  header:        { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.separator },
  headerTitle:   { ...Typography.title2, color: colors.textPrimary },
  scroll:        { flex: 1 },
  scrollContent: { paddingVertical: Spacing.xl },
  groupLabel: {
    ...Typography.caption2, color: colors.textDim, letterSpacing: 1.5,
    marginHorizontal: Spacing.xl, marginBottom: Spacing.xs, marginTop: Spacing.lg,
  },
  group: {
    backgroundColor: colors.backgroundCard, borderRadius: Radius.lg,
    marginHorizontal: Spacing.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.separator,
  },
  separator: { height: 1, backgroundColor: colors.separator, marginHorizontal: Spacing.lg },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, minHeight: 54,
  },
  rowLabel:  { ...Typography.callout, color: colors.textPrimary },
  rowDesc:   { ...Typography.caption1, color: colors.textDim, marginTop: 3 },
  rowRight:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rowValue:  { ...Typography.callout, color: colors.textMuted },
  rowArrow:  { ...Typography.title3, color: colors.textDim, fontWeight: '300' },
  editRow:   { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
  editIdSection: { padding: Spacing.lg, gap: Spacing.md },
  editIdLabel:   { ...Typography.caption1, color: colors.textDim },
  editBtnRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  textInput: {
    flex: 1, ...Typography.callout, color: colors.textPrimary,
    backgroundColor: colors.backgroundElevated, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    borderWidth: 1, borderColor: colors.separator,
  },
  saveBtn:      { backgroundColor: colors.gold, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 10 },
  saveBtnText:  { ...Typography.footnote, color: '#000', fontWeight: '700' },
  cancelText:   { ...Typography.footnote, color: colors.textMuted },
  segRow: {
    flexDirection: 'row', backgroundColor: colors.backgroundElevated,
    borderRadius: Radius.md, padding: 2, gap: 2,
  },
  seg:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.sm },
  segActive:     { backgroundColor: colors.backgroundCard },
  segText:       { ...Typography.footnote, color: colors.textMuted },
  segTextActive: { ...Typography.footnote, color: colors.textPrimary, fontWeight: '600' },
  backupInfoRow: { backgroundColor: colors.goldAlpha15, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backupInfoText:{ ...Typography.caption1, color: colors.gold },
  chariotRow:    { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  chariotLabel:  { ...Typography.subheadline, color: colors.gold, fontWeight: '700', minWidth: 100 },
  chariotDesc:   { ...Typography.subheadline, color: colors.textMuted, flex: 1, lineHeight: 22 },
  chariotClosing:{ ...Typography.callout, color: colors.gold, fontStyle: 'italic', textAlign: 'center' },
});

export default SettingsScreen;