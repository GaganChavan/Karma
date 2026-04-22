// ─── KARMA APP — SETTINGS SCREEN (GITA PHASE A) ──────────────────────
// Added: Identity statement field
// Added: WhatsApp daily/weekly toggles
// Added: Chariot framework in About
// Added: Daily/Weekly WhatsApp send buttons

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Switch, TextInput, Alert, ActivityIndicator,
  StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView }   from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radius, setAppTheme } from '../constants/colors';
import { getSetting, setSetting, getAllSettings } from '../database/habitService';
import {
  cancelAllNotifications, scheduleAllHabitNotifications,
  getNotificationPermissionStatus,
} from '../services/notificationService';
import { exportData, importData, clearAllData, getBackupInfo } from '../services/backupService';
import { getFullStats } from '../services/gamificationService';
import { SHLOKAS } from '../constants/shlokas';
import ShlokaDisplay from '../components/ShlokaDisplay';
import {
  sendDailyWhatsApp, sendWeeklyWhatsApp,
} from '../services/whatsappService';
import {
  getAllHabits, getTodayCheckins,
  getStreak,
} from '../database/habitService';

const SettingsScreen = () => {
  const [alterEgo,      setAlterEgo]      = useState('Neel');
  const [identityStmt,  setIdentityStmt]  = useState('');
  const [editingName,   setEditingName]   = useState(false);
  const [editingId,     setEditingId]     = useState(false);
  const [tempName,      setTempName]      = useState('');
  const [tempId,        setTempId]        = useState('');
  const [isDark,        setIsDark]        = useState(true);
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
      setIsDark((settings.app_theme || 'dark') === 'dark');
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
      Alert.alert('✅ Identity Declared', 'Karma will show this to you every morning.');
    } catch (err) { Alert.alert('Error', err.message); }
  };

  const _toggleTheme = async (value) => {
    try {
      const theme = value ? 'dark' : 'light';
      await setSetting('app_theme', theme);
      setIsDark(value);
      setAppTheme(theme);
      Alert.alert(
        value ? '🌙 Dark Mode' : '☀️ Light Mode',
        'Restart the app to apply fully.'
      );
    } catch (err) { Alert.alert('Error', err.message); }
  };

  const _toggleNotif = async (value) => {
    try {
      await setSetting('notification_master', value ? 'true' : 'false');
      setNotifEnabled(value);
      if (value) { await scheduleAllHabitNotifications(); }
      else        { await cancelAllNotifications(); }
    } catch (err) { Alert.alert('Error', err.message); }
  };

  const _toggleWaDaily  = async (v) => { await setSetting('wa_daily',  v ? 'true' : 'false'); setWaDaily(v);  };
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
        alterEgo,
        habits,
        checkins: cMap,
        streaks,
        totalXP:    gamStats?.totalXP || 0,
        todayXP:    0,
        karmaScore: gamStats?.karmaScore || 0,
        levelInfo:  gamStats?.levelInfo,
      });
    } catch (err) { Alert.alert('Error', err.message); }
    finally { setSendingWA(false); }
  };

  const _sendWeeklyNow = async () => {
    setSendingWA(true);
    try {
      await sendWeeklyWhatsApp({
        alterEgo,
        weeklyRate:  75,
        topStreaks:  [],
        totalXP:     gamStats?.totalXP || 0,
        weekXP:      0,
        karmaScore:  gamStats?.karmaScore || 0,
        karmaScorePrev: 0,
        levelInfo:   gamStats?.levelInfo,
        weekNumber:  Math.ceil(new Date().getDate() / 7),
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
    Alert.alert(
      '⚠️ Clear All Data',
      'This permanently deletes all habits, streaks, and history.\n\nExport a backup first.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything', style: 'destructive',
          onPress: async () => {
            try { await clearAllData(); _loadSettings(); Alert.alert('Cleared', 'Start fresh, Neel. The battlefield is clean.'); }
            catch (err) { Alert.alert('Error', err.message); }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <ActivityIndicator size="large" color={Colors.gold} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── IDENTITY ── */}
        <Text style={styles.groupLabel}>IDENTITY ON THE BATTLEFIELD</Text>
        <View style={styles.group}>
          {/* Alter ego name */}
          {!editingName ? (
            <TouchableOpacity
              style={styles.row}
              onPress={() => { setTempName(alterEgo); setEditingName(true); }}
            >
              <View>
                <Text style={styles.rowLabel}>Name</Text>
                <Text style={styles.rowDesc}>Karma calls you by this name</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{alterEgo}</Text>
                <Text style={styles.rowArrow}>›</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.editRow}>
              <TextInput
                style={styles.textInput}
                value={tempName}
                onChangeText={setTempName}
                maxLength={20}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={_saveAlterEgo}
                placeholderTextColor={Colors.textPlaceholder}
              />
              <TouchableOpacity style={styles.saveBtn} onPress={_saveAlterEgo}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingName(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.separator} />

          {/* Identity declaration */}
          {!editingId ? (
            <TouchableOpacity
              style={styles.row}
              onPress={() => { setTempId(identityStmt); setEditingId(true); }}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Morning Declaration</Text>
                <Text style={styles.rowDesc} numberOfLines={2}>{identityStmt}</Text>
              </View>
              <Text style={styles.rowArrow}>›</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editIdSection}>
              <Text style={styles.editIdLabel}>
                Write who you are becoming. Shown every morning.
              </Text>
              <TextInput
                style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                value={tempId}
                onChangeText={setTempId}
                maxLength={120}
                multiline
                autoFocus
                placeholderTextColor={Colors.textPlaceholder}
                placeholder="I am Neel. My mind holds the reins..."
              />
              <View style={styles.editBtnRow}>
                <TouchableOpacity style={styles.saveBtn} onPress={_saveIdentity}>
                  <Text style={styles.saveBtnText}>Save Declaration</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditingId(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.separator} />

          {/* Level and score — read only */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Karma Level</Text>
            <Text style={[styles.rowValue, { color: gamStats?.levelInfo?.color }]}>
              {gamStats?.levelInfo?.icon} {gamStats?.levelInfo?.title} · {gamStats?.totalXP} XP
            </Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Karma Score</Text>
            <Text style={[styles.rowValue, { color: Colors.gold }]}>
              {gamStats?.karmaScore || 0}/1000
            </Text>
          </View>
        </View>

        {/* ── APPEARANCE ── */}
        <Text style={styles.groupLabel}>APPEARANCE</Text>
        <View style={styles.group}>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>Dark Mode</Text>
              <Text style={styles.rowDesc}>{isDark ? 'Dark — Kurukshetra at night' : 'Light — Dawn on the battlefield'}</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={_toggleTheme}
              trackColor={{ false: Colors.separator, true: Colors.goldAlpha40 }}
              thumbColor={isDark ? Colors.gold : Colors.textMuted}
            />
          </View>
        </View>

        {/* ── NOTIFICATIONS ── */}
        <Text style={styles.groupLabel}>REMINDERS</Text>
        <View style={styles.group}>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>All Notifications</Text>
              <Text style={styles.rowDesc}>Master switch — all habit reminders</Text>
            </View>
            <Switch
              value={notifEnabled}
              onValueChange={_toggleNotif}
              trackColor={{ false: Colors.separator, true: Colors.goldAlpha40 }}
              thumbColor={notifEnabled ? Colors.gold : Colors.textMuted}
            />
          </View>
        </View>

        {/* ── WHATSAPP ── */}
        <Text style={styles.groupLabel}>WHATSAPP REPORTS</Text>
        <View style={styles.group}>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>Daily Report</Text>
              <Text style={styles.rowDesc}>Send today's battlefield report</Text>
            </View>
            <Switch
              value={waDaily}
              onValueChange={_toggleWaDaily}
              trackColor={{ false: Colors.separator, true: 'rgba(37,211,102,0.4)' }}
              thumbColor={waDaily ? '#25D166' : Colors.textMuted}
            />
          </View>
          <View style={styles.separator} />
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>Weekly Report</Text>
              <Text style={styles.rowDesc}>Sunday — full week summary</Text>
            </View>
            <Switch
              value={waWeekly}
              onValueChange={_toggleWaWeekly}
              trackColor={{ false: Colors.separator, true: 'rgba(37,211,102,0.4)' }}
              thumbColor={waWeekly ? '#25D166' : Colors.textMuted}
            />
          </View>
          <View style={styles.separator} />
          <TouchableOpacity
            style={styles.row}
            onPress={_sendDailyNow}
            disabled={sendingWA}
          >
            <Text style={styles.rowLabel}>Send Daily Now</Text>
            {sendingWA
              ? <ActivityIndicator size="small" color="#25D166" />
              : <Text style={[styles.rowArrow, { color: '#25D166' }]}>↑</Text>
            }
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity
            style={styles.row}
            onPress={_sendWeeklyNow}
            disabled={sendingWA}
          >
            <Text style={styles.rowLabel}>Send Weekly Now</Text>
            {sendingWA
              ? <ActivityIndicator size="small" color="#25D166" />
              : <Text style={[styles.rowArrow, { color: '#25D166' }]}>↑</Text>
            }
          </TouchableOpacity>
        </View>

        {/* ── PREFERENCES ── */}
        <Text style={styles.groupLabel}>PREFERENCES</Text>
        <View style={styles.group}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Week Starts On</Text>
            <View style={styles.segRow}>
              {['monday','sunday'].map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.seg, weekStart === d && styles.segActive]}
                  onPress={async () => {
                    await setSetting('week_starts', d);
                    setWeekStart(d);
                  }}
                >
                  <Text style={[styles.segText, weekStart === d && styles.segTextActive]}>
                    {d === 'monday' ? 'Mon' : 'Sun'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ── DATA ── */}
        <Text style={styles.groupLabel}>DATA & BACKUP</Text>
        <View style={styles.group}>
          {backupInfo && (
            <>
              <View style={styles.backupInfoRow}>
                <Text style={styles.backupInfoText}>
                  {backupInfo.habitCount} habits · {backupInfo.entryCount} entries · ~{backupInfo.sizeKB}KB
                </Text>
              </View>
              <View style={styles.separator} />
            </>
          )}
          <TouchableOpacity style={styles.row} onPress={_export} disabled={exporting}>
            <View>
              <Text style={styles.rowLabel}>{exporting ? 'Exporting...' : 'Export Backup'}</Text>
              <Text style={styles.rowDesc}>Save all karma as JSON file</Text>
            </View>
            {exporting ? <ActivityIndicator size="small" color={Colors.gold} /> : <Text style={[styles.rowArrow, { color: Colors.gold }]}>↑</Text>}
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity style={styles.row} onPress={_import} disabled={importing}>
            <View>
              <Text style={styles.rowLabel}>{importing ? 'Importing...' : 'Import & Restore'}</Text>
              <Text style={styles.rowDesc}>Restore from backup file</Text>
            </View>
            {importing ? <ActivityIndicator size="small" color={Colors.blue} /> : <Text style={[styles.rowArrow, { color: Colors.blue }]}>↓</Text>}
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity style={styles.row} onPress={_clearData}>
            <View>
              <Text style={[styles.rowLabel, { color: Colors.red }]}>Clear All Data</Text>
              <Text style={styles.rowDesc}>Permanently delete everything</Text>
            </View>
            <Text style={[styles.rowArrow, { color: Colors.red }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── ABOUT — Chariot ── */}
        <Text style={styles.groupLabel}>THE KURUKSHETRA WITHIN</Text>
        <View style={[styles.group, { padding: Spacing.xl, gap: Spacing.lg }]}>
          {SHLOKAS.chariot.lines.map((line, i) => (
            <View key={i} style={styles.chariotRow}>
              <Text style={styles.chariotLabel}>{line.label}</Text>
              <Text style={styles.chariotDesc}>{line.desc}</Text>
            </View>
          ))}
          <View style={styles.separator} />
          <Text style={styles.chariotClosing}>{SHLOKAS.chariot.closing}</Text>
          <ShlokaDisplay shloka={SHLOKAS.identity[0]} variant="card" />
        </View>

        {/* ── VERSION ── */}
        <Text style={styles.groupLabel}>ABOUT</Text>
        <View style={styles.group}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>App</Text>
            <Text style={styles.rowValue}>Karma ☸ v1.0</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Built for</Text>
            <Text style={[styles.rowValue, { color: Colors.gold }]}>{alterEgo}</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: Colors.background },
  center:        { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  header:        { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.separator },
  headerTitle:   { ...Typography.title2, color: Colors.textPrimary },
  scroll:        { flex: 1 },
  scrollContent: { paddingVertical: Spacing.xl },
  groupLabel: {
    ...Typography.caption2, color: Colors.textDim, letterSpacing: 1.5,
    marginHorizontal: Spacing.xl, marginBottom: Spacing.xs, marginTop: Spacing.lg,
  },
  group: {
    backgroundColor: Colors.backgroundCard, borderRadius: Radius.lg,
    marginHorizontal: Spacing.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.separator,
  },
  separator: { height: 1, backgroundColor: Colors.separator, marginHorizontal: Spacing.lg },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, minHeight: 54,
  },
  rowLabel:  { ...Typography.callout, color: Colors.textPrimary },
  rowDesc:   { ...Typography.caption1, color: Colors.textDim, marginTop: 3 },
  rowRight:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rowValue:  { ...Typography.callout, color: Colors.textMuted },
  rowArrow:  { ...Typography.title3, color: Colors.textDim, fontWeight: '300' },

  editRow:       { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
  editIdSection: { padding: Spacing.lg, gap: Spacing.md },
  editIdLabel:   { ...Typography.caption1, color: Colors.textDim },
  editBtnRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  textInput: {
    flex: 1, ...Typography.callout, color: Colors.textPrimary,
    backgroundColor: Colors.backgroundElevated, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    borderWidth: 1, borderColor: Colors.separator,
  },
  saveBtn:      { backgroundColor: Colors.gold, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 10 },
  saveBtnText:  { ...Typography.footnote, color: '#000', fontWeight: '700' },
  cancelText:   { ...Typography.footnote, color: Colors.textMuted },

  segRow: {
    flexDirection: 'row', backgroundColor: Colors.backgroundElevated,
    borderRadius: Radius.md, padding: 2, gap: 2,
  },
  seg:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.sm },
  segActive:     { backgroundColor: Colors.backgroundCard },
  segText:       { ...Typography.footnote, color: Colors.textMuted },
  segTextActive: { ...Typography.footnote, color: Colors.textPrimary, fontWeight: '600' },

  backupInfoRow: {
    backgroundColor: Colors.goldAlpha15,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  backupInfoText: { ...Typography.caption1, color: Colors.gold },

  chariotRow:    { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  chariotLabel:  { ...Typography.subheadline, color: Colors.gold, fontWeight: '700', minWidth: 100 },
  chariotDesc:   { ...Typography.subheadline, color: Colors.textMuted, flex: 1, lineHeight: 22 },
  chariotClosing:{ ...Typography.callout, color: Colors.gold, fontStyle: 'italic', textAlign: 'center' },
});

export default SettingsScreen;