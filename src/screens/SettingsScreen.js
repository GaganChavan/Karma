// ─── KARMA APP — SETTINGS SCREEN (PHASE 7) ───────────────────────────
// Apple Settings-inspired. Every row clean and purposeful.
// Alter ego, theme, notifications, data management, about.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Switch, TextInput, Alert, ActivityIndicator,
  StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView }   from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radius, setAppTheme } from '../constants/colors';
import {
  getSetting, setSetting, getAllSettings,
} from '../database/habitService';
import {
  cancelAllNotifications, scheduleAllHabitNotifications,
  getNotificationPermissionStatus,
} from '../services/notificationService';
import {
  exportData, importData, clearAllData, getBackupInfo,
} from '../services/backupService';
import { getFullStats } from '../services/gamificationService';

const SettingsScreen = () => {
  const [alterEgo,     setAlterEgo]     = useState('Neel');
  const [editingName,  setEditingName]  = useState(false);
  const [tempName,     setTempName]     = useState('');
  const [isDark,       setIsDark]       = useState(true);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [weekStart,    setWeekStart]    = useState('monday');
  const [gamStats,     setGamStats]     = useState(null);
  const [backupInfo,   setBackupInfo]   = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [exporting,    setExporting]    = useState(false);
  const [importing,    setImporting]    = useState(false);

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
      setIsDark((settings.app_theme || 'dark') === 'dark');
      setNotifEnabled(settings.notification_master !== 'false');
      setWeekStart(settings.week_starts || 'monday');
      setGamStats(gam);
      setBackupInfo(info);
    } catch (err) {
      console.warn('SettingsScreen load:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Alter Ego ─────────────────────────────────────────────────────

  const _saveAlterEgo = async () => {
    const name = tempName.trim();
    if (name.length === 0) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    if (name.length > 20) {
      Alert.alert('Error', 'Name must be under 20 characters');
      return;
    }
    try {
      await setSetting('alter_ego', name);
      setAlterEgo(name);
      setEditingName(false);
      Alert.alert('✅ Updated', `Karma will now call you ${name}.`);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  // ── Theme ─────────────────────────────────────────────────────────

  const _toggleTheme = async (value) => {
    try {
      const theme = value ? 'dark' : 'light';
      await setSetting('app_theme', theme);
      setIsDark(value);
      setAppTheme(theme);
      Alert.alert(
        value ? '🌙 Dark Mode' : '☀️ Light Mode',
        'Theme updated. Restart the app to apply fully.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  // ── Notifications ────────────────────────────────────────────────

  const _toggleNotifications = async (value) => {
    try {
      await setSetting('notification_master', value ? 'true' : 'false');
      setNotifEnabled(value);
      if (value) {
        await scheduleAllHabitNotifications();
        Alert.alert('🔔 Notifications On', 'All habit reminders re-enabled.');
      } else {
        await cancelAllNotifications();
        Alert.alert('🔕 Notifications Off', 'All reminders cancelled.');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  // ── Week Start ───────────────────────────────────────────────────

  const _setWeekStart = async (day) => {
    try {
      await setSetting('week_starts', day);
      setWeekStart(day);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  // ── Backup ───────────────────────────────────────────────────────

  const _export = async () => {
    setExporting(true);
    try {
      await exportData();
    } catch (err) {
      Alert.alert('Export Failed', err.message);
    } finally {
      setExporting(false);
    }
  };

  const _import = async () => {
    setImporting(true);
    try {
      const result = await importData();
      if (result.success) {
        Alert.alert('✅ Restored', result.message);
        await _loadSettings();
      } else if (result.message !== 'Cancelled') {
        Alert.alert('Import Failed', result.message);
      }
    } catch (err) {
      Alert.alert('Import Failed', err.message);
    } finally {
      setImporting(false);
    }
  };

  const _clearData = () => {
    Alert.alert(
      '⚠️ Clear All Data',
      'This permanently deletes all your habits, streaks, and history. This cannot be undone.\n\nExport a backup first.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text:  'Clear Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData();
              await _loadSettings();
              Alert.alert('Cleared', 'All data has been deleted. Start fresh, Neel.');
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle={Colors.statusBar} backgroundColor={Colors.background} />
        <ActivityIndicator size="large" color={Colors.gold} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle={Colors.statusBar} backgroundColor={Colors.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile ── */}
        <Text style={styles.groupLabel}>IDENTITY</Text>
        <View style={styles.group}>
          {!editingName ? (
            <TouchableOpacity
              style={styles.row}
              onPress={() => { setTempName(alterEgo); setEditingName(true); }}
            >
              <View>
                <Text style={styles.rowLabel}>Alter Ego</Text>
                <Text style={styles.rowDesc}>Karma calls you by this name</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{alterEgo}</Text>
                <Text style={styles.rowArrow}>›</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.editNameRow}>
              <TextInput
                style={styles.nameInput}
                value={tempName}
                onChangeText={setTempName}
                maxLength={20}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={_saveAlterEgo}
                placeholderTextColor={Colors.textPlaceholder}
              />
              <TouchableOpacity style={styles.saveNameBtn} onPress={_saveAlterEgo}>
                <Text style={styles.saveNameText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelNameBtn}
                onPress={() => setEditingName(false)}
              >
                <Text style={styles.cancelNameText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.separator} />
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>Level</Text>
              <Text style={styles.rowDesc}>{gamStats?.levelInfo?.title || 'Beginner'}</Text>
            </View>
            <Text style={styles.rowValue}>
              {gamStats?.levelInfo?.icon} {gamStats?.totalXP || 0} XP
            </Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>Karma Score</Text>
              <Text style={styles.rowDesc}>30-day consistency</Text>
            </View>
            <Text style={[styles.rowValue, { color: Colors.gold }]}>
              {gamStats?.karmaScore || 0}/1000
            </Text>
          </View>
        </View>

        {/* ── Appearance ── */}
        <Text style={styles.groupLabel}>APPEARANCE</Text>
        <View style={styles.group}>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>Dark Mode</Text>
              <Text style={styles.rowDesc}>
                {isDark ? 'Dark theme active' : 'Light theme active'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={_toggleTheme}
              trackColor={{ false: Colors.separator, true: Colors.gold + '80' }}
              thumbColor={isDark ? Colors.gold : Colors.textMuted}
              ios_backgroundColor={Colors.backgroundElevated}
            />
          </View>
        </View>

        {/* ── Notifications ── */}
        <Text style={styles.groupLabel}>NOTIFICATIONS</Text>
        <View style={styles.group}>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>All Reminders</Text>
              <Text style={styles.rowDesc}>Master switch for all habit alerts</Text>
            </View>
            <Switch
              value={notifEnabled}
              onValueChange={_toggleNotifications}
              trackColor={{ false: Colors.separator, true: Colors.gold + '80' }}
              thumbColor={notifEnabled ? Colors.gold : Colors.textMuted}
              ios_backgroundColor={Colors.backgroundElevated}
            />
          </View>
          <View style={styles.separator} />
          <TouchableOpacity
            style={styles.row}
            onPress={async () => {
              const status = await getNotificationPermissionStatus();
              Alert.alert('Permission Status', `Notifications are: ${status}`);
            }}
          >
            <Text style={styles.rowLabel}>Permission Status</Text>
            <Text style={styles.rowArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── App Preferences ── */}
        <Text style={styles.groupLabel}>PREFERENCES</Text>
        <View style={styles.group}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Week Starts On</Text>
            <View style={styles.segmentRow}>
              {['monday', 'sunday'].map(day => (
                <TouchableOpacity
                  key={day}
                  style={[styles.segment, weekStart === day && styles.segmentActive]}
                  onPress={() => _setWeekStart(day)}
                >
                  <Text style={[styles.segmentText,
                    weekStart === day && styles.segmentTextActive
                  ]}>
                    {day === 'monday' ? 'Mon' : 'Sun'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ── Backup & Data ── */}
        <Text style={styles.groupLabel}>DATA & BACKUP</Text>
        <View style={styles.group}>
          {/* Backup info */}
          {backupInfo && (
            <>
              <View style={styles.backupInfo}>
                <Text style={styles.backupInfoText}>
                  {backupInfo.habitCount} habits · {backupInfo.entryCount} entries · ~{backupInfo.sizeKB}KB
                </Text>
              </View>
              <View style={styles.separator} />
            </>
          )}

          {/* Export */}
          <TouchableOpacity style={styles.row} onPress={_export} disabled={exporting}>
            <View>
              <Text style={styles.rowLabel}>
                {exporting ? 'Exporting...' : 'Export Backup'}
              </Text>
              <Text style={styles.rowDesc}>Save all data as JSON file</Text>
            </View>
            {exporting
              ? <ActivityIndicator size="small" color={Colors.gold} />
              : <Text style={[styles.rowArrow, { color: Colors.gold }]}>↑</Text>
            }
          </TouchableOpacity>

          <View style={styles.separator} />

          {/* Import */}
          <TouchableOpacity style={styles.row} onPress={_import} disabled={importing}>
            <View>
              <Text style={styles.rowLabel}>
                {importing ? 'Importing...' : 'Import & Restore'}
              </Text>
              <Text style={styles.rowDesc}>Restore from a backup file</Text>
            </View>
            {importing
              ? <ActivityIndicator size="small" color={Colors.blue} />
              : <Text style={[styles.rowArrow, { color: Colors.blue }]}>↓</Text>
            }
          </TouchableOpacity>

          <View style={styles.separator} />

          {/* Clear */}
          <TouchableOpacity style={styles.row} onPress={_clearData}>
            <View>
              <Text style={[styles.rowLabel, { color: Colors.red }]}>Clear All Data</Text>
              <Text style={styles.rowDesc}>Permanently delete everything</Text>
            </View>
            <Text style={[styles.rowArrow, { color: Colors.red }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Splash Image ── */}
        <Text style={styles.groupLabel}>LAUNCH SCREEN</Text>
        <View style={styles.group}>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>Launch Image</Text>
              <Text style={styles.rowDesc}>Customise the splash screen background</Text>
            </View>
            <Text style={styles.rowValue}>Default ☸</Text>
          </View>
          <View style={styles.separator} />
          <TouchableOpacity
            style={styles.row}
            onPress={async () => {
              try {
                await setSetting('splash_image_type', 'default');
                await setSetting('splash_image_uri', '');
                Alert.alert('✅ Reset', 'Splash screen reset to default Karma design.');
              } catch (err) {
                Alert.alert('Error', err.message);
              }
            }}
          >
            <Text style={styles.rowLabel}>Reset to Default</Text>
            <Text style={styles.rowArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── About ── */}
        <Text style={styles.groupLabel}>ABOUT</Text>
        <View style={styles.group}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>App Name</Text>
            <Text style={styles.rowValue}>Karma ☸</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>1.0.0</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Built for</Text>
            <Text style={[styles.rowValue, { color: Colors.gold }]}>{alterEgo} · Neel</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Philosophy</Text>
            <Text style={[styles.rowValue, { color: Colors.textMuted, fontStyle: 'italic' }]}>
              कर्म ही पूजा है
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  center: {
    flex: 1, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical:   Spacing.lg,
    borderBottomWidth:  1,
    borderBottomColor:  Colors.separator,
  },
  headerTitle: { ...Typography.title2, color: Colors.textPrimary },

  scroll:        { flex: 1 },
  scrollContent: { paddingVertical: Spacing.xl },

  groupLabel: {
    ...Typography.caption2,
    color:            Colors.textDim,
    letterSpacing:    1.5,
    marginHorizontal: Spacing.xl,
    marginBottom:     Spacing.xs,
    marginTop:        Spacing.lg,
  },
  group: {
    backgroundColor:  Colors.backgroundCard,
    borderRadius:     Radius.lg,
    marginHorizontal: Spacing.xl,
    overflow:         'hidden',
    borderWidth:       1,
    borderColor:      Colors.separator,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.separator,
    marginHorizontal: Spacing.lg,
  },
  row: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.lg,
    minHeight:      54,
  },
  rowLabel: { ...Typography.callout, color: Colors.textPrimary },
  rowDesc:  { ...Typography.caption1, color: Colors.textDim, marginTop: 3 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rowValue: { ...Typography.callout, color: Colors.textMuted },
  rowArrow: { ...Typography.title3, color: Colors.textDim, fontWeight: '300' },

  // Edit name
  editNameRow: {
    flexDirection: 'row',
    alignItems:    'center',
    padding:       Spacing.md,
    gap:           Spacing.sm,
  },
  nameInput: {
    flex:            1,
    ...Typography.callout,
    color:           Colors.textPrimary,
    backgroundColor: Colors.backgroundElevated,
    borderRadius:    Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.sm + 2,
    borderWidth:     1,
    borderColor:     Colors.separator,
  },
  saveNameBtn: {
    backgroundColor: Colors.gold,
    borderRadius:    Radius.md,
    paddingHorizontal: 14,
    paddingVertical:   10,
  },
  saveNameText:   { ...Typography.footnote, color: '#000', fontWeight: '700' },
  cancelNameBtn:  { paddingHorizontal: 8, paddingVertical: 10 },
  cancelNameText: { ...Typography.footnote, color: Colors.textMuted },

  // Segment control
  segmentRow: {
    flexDirection:   'row',
    backgroundColor: Colors.backgroundElevated,
    borderRadius:    Radius.md,
    padding:          2,
    gap:              2,
  },
  segment: {
    paddingHorizontal: 14,
    paddingVertical:    7,
    borderRadius:      Radius.sm,
  },
  segmentActive: { backgroundColor: Colors.backgroundCard },
  segmentText:      { ...Typography.footnote, color: Colors.textMuted },
  segmentTextActive:{ ...Typography.footnote, color: Colors.textPrimary, fontWeight: '600' },

  // Backup
  backupInfo: {
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.md,
    backgroundColor:   Colors.goldAlpha15,
  },
  backupInfoText: { ...Typography.caption1, color: Colors.gold },
});

export default SettingsScreen;