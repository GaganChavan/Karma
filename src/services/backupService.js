// ─── KARMA APP — BACKUP SERVICE ──────────────────────────────────────
// FIX: FileSystem.EncodingType.UTF8 is undefined in some Expo versions
//      Use string literal 'utf8' directly — always works.

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';
import { getDatabase } from '../database/database';
import { exportAllData } from '../database/habitService';

// ── EXPORT ───────────────────────────────────────────────────────────
export const exportData = async () => {
  try {
    const data = await exportAllData();
    const json = JSON.stringify(data, null, 2);
    const date = new Date().toISOString().split('T')[0];
    const filename = `karma-backup-${date}.json`;
    const fileUri = FileSystem.documentDirectory + filename;

    // FIX: use 'utf8' string, not FileSystem.EncodingType.UTF8 (can be undefined)
    await FileSystem.writeAsStringAsync(fileUri, json, { encoding: 'utf8' });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert('✅ Backup Saved', `Saved to:\n${fileUri}`);
      return { success: true, path: fileUri };
    }
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Save Karma Backup',
      UTI: 'public.json',
    });
    console.log('✅ Backup exported:', filename);
    return { success: true, path: fileUri };
  } catch (error) {
    console.error('exportData error:', error);
    throw new Error(`Export failed: ${error.message}`);
  }
};

// ── IMPORT ───────────────────────────────────────────────────────────
export const importData = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) {
      return { success: false, message: 'Import cancelled' };
    }
    const asset = result.assets[0];
    // FIX: same here
    const json = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'utf8' });
    let data;
    try { data = JSON.parse(json); } catch { throw new Error('Invalid backup file — could not parse JSON'); }
    if (!data.habits || !data.checkins) throw new Error('Invalid backup file — missing required data');

    return new Promise((resolve) => {
      Alert.alert(
        '⚠️ Restore Backup?',
        `This will replace all current data with:\n\n• ${data.habits?.length || 0} habits\n• ${data.checkins?.length || 0} check-ins\n• Exported: ${data.exported_at?.split('T')[0] || 'unknown'}\n\nThis cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve({ success: false, message: 'Cancelled' }) },
          { text: 'Restore', style: 'destructive', onPress: async () => {
              try { await _restoreData(data); resolve({ success: true, message: 'Data restored!' }); }
              catch (err) { resolve({ success: false, message: err.message }); }
          }},
        ]
      );
    });
  } catch (error) {
    throw new Error(`Import failed: ${error.message}`);
  }
};

// ── RESTORE ──────────────────────────────────────────────────────────
const _restoreData = async (data) => {
  const db = await getDatabase();
  await db.execAsync(`DELETE FROM checkins; DELETE FROM habits; DELETE FROM milestones; DELETE FROM xp_log;`);

  if (data.habits?.length > 0) {
    for (const h of data.habits) {
      await db.runAsync(
        `INSERT OR IGNORE INTO habits
          (id,name,icon,color,type,frequency,days,time_of_day,is_quantifiable,daily_target,unit,
           frequency_type,weekly_target,is_wfo_skip,reminder_time,reminder_type,
           goal_days,punishment_sensitivity,streak_freeze_count,is_active,sort_order,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [h.id, h.name, h.icon||'⭐', h.color||'#F5A623', h.type||'build',
         h.frequency||'daily', h.days||'1,2,3,4,5,6,7', h.time_of_day||'anytime',
         h.is_quantifiable||0, h.daily_target||1, h.unit||'',
         h.frequency_type||'daily', h.weekly_target||7, h.is_wfo_skip||0,
         h.reminder_time||null, h.reminder_type||'none', h.goal_days||0,
         h.punishment_sensitivity||'balanced', h.streak_freeze_count||0,
         h.is_active??1, h.sort_order||0,
         h.created_at||new Date().toISOString(), h.updated_at||new Date().toISOString()]
      );
    }
  }
  if (data.checkins?.length > 0) {
    for (const c of data.checkins) {
      await db.runAsync(
        `INSERT OR IGNORE INTO checkins (id,habit_id,date,status,note,slip_count,value,created_at)
         VALUES (?,?,?,?,?,?,?,?)`,
        [c.id, c.habit_id, c.date, c.status, c.note||null, c.slip_count||0, c.value||null, c.created_at||new Date().toISOString()]
      );
    }
  }
  if (data.milestones?.length > 0) {
    for (const m of data.milestones) {
      await db.runAsync(
        'INSERT OR IGNORE INTO milestones (id,habit_id,milestone_days,achieved_at) VALUES (?,?,?,?)',
        [m.id, m.habit_id, m.milestone_days, m.achieved_at||new Date().toISOString()]
      );
    }
  }
  if (data.settings?.length > 0) {
    const preserve = ['splash_image_uri','splash_image_type','app_theme'];
    for (const s of data.settings) {
      if (!preserve.includes(s.key)) {
        await db.runAsync('INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)', [s.key, s.value]);
      }
    }
  }
  console.log('✅ Data restored');
};

// ── CLEAR ────────────────────────────────────────────────────────────
export const clearAllData = async () => {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM checkins; DELETE FROM habits; DELETE FROM milestones; DELETE FROM xp_log;
    UPDATE settings SET value='0' WHERE key='total_xp';
    UPDATE settings SET value='' WHERE key='last_perfect_day';
  `);
};

// ── INFO ─────────────────────────────────────────────────────────────
export const getBackupInfo = async () => {
  try {
    const data = await exportAllData();
    const json = JSON.stringify(data);
    return { sizeKB: Math.round(json.length / 1024), habitCount: data.habits?.length||0, entryCount: data.checkins?.length||0 };
  } catch { return { sizeKB: 0, habitCount: 0, entryCount: 0 }; }
};