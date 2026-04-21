// ─── KARMA APP — BACKUP SERVICE ──────────────────────────────────────
// Export all data to JSON file — share via any app.
// Import from JSON file — full restore.
// Uses expo-file-system + expo-sharing + expo-document-picker.

import * as FileSystem    from 'expo-file-system';
import * as Sharing       from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert }          from 'react-native';
import { getDatabase }    from '../database/database';
import { exportAllData }  from '../database/habitService';

// ── EXPORT ────────────────────────────────────────────────────────────

export const exportData = async () => {
  try {
    // Get all data
    const data = await exportAllData();
    const json = JSON.stringify(data, null, 2);

    // Write to temp file
    const date     = new Date().toISOString().split('T')[0];
    const filename = `karma-backup-${date}.json`;
    const fileUri  = FileSystem.documentDirectory + filename;

    await FileSystem.writeAsStringAsync(fileUri, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Check sharing available
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert(
        '✅ Backup Saved',
        `Backup saved to:\n${fileUri}\n\nSharing is not available on this device.`
      );
      return { success: true, path: fileUri };
    }

    // Share the file
    await Sharing.shareAsync(fileUri, {
      mimeType:   'application/json',
      dialogTitle: 'Save Karma Backup',
      UTI:         'public.json',
    });

    console.log('✅ Backup exported:', filename);
    return { success: true, path: fileUri };

  } catch (error) {
    console.error('exportData error:', error);
    throw new Error(`Export failed: ${error.message}`);
  }
};

// ── IMPORT ────────────────────────────────────────────────────────────

export const importData = async () => {
  try {
    // Pick a JSON file
    const result = await DocumentPicker.getDocumentAsync({
      type:      'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) {
      return { success: false, message: 'Import cancelled' };
    }

    const asset = result.assets[0];

    // Read the file
    const json = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    let data;
    try {
      data = JSON.parse(json);
    } catch {
      throw new Error('Invalid backup file — could not parse JSON');
    }

    // Validate structure
    if (!data.habits || !data.checkins) {
      throw new Error('Invalid backup file — missing required data');
    }

    // Confirm before restore
    return new Promise((resolve) => {
      Alert.alert(
        '⚠️ Restore Backup?',
        `This will replace all current data with:\n\n• ${data.habits?.length || 0} habits\n• ${data.checkins?.length || 0} check-ins\n• Exported: ${data.exported_at?.split('T')[0] || 'unknown date'}\n\nThis cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve({ success: false, message: 'Cancelled' }) },
          {
            text:  'Restore',
            style: 'destructive',
            onPress: async () => {
              try {
                await _restoreData(data);
                resolve({ success: true, message: 'Data restored successfully!' });
              } catch (err) {
                resolve({ success: false, message: err.message });
              }
            },
          },
        ]
      );
    });

  } catch (error) {
    console.error('importData error:', error);
    throw new Error(`Import failed: ${error.message}`);
  }
};

// ── Restore ───────────────────────────────────────────────────────────

const _restoreData = async (data) => {
  const db = await getDatabase();

  try {
    // Clear existing data
    await db.execAsync(`
      DELETE FROM checkins;
      DELETE FROM habits;
      DELETE FROM milestones;
      DELETE FROM xp_log;
    `);

    // Restore habits
    if (data.habits?.length > 0) {
      for (const h of data.habits) {
        await db.runAsync(
          `INSERT OR IGNORE INTO habits
            (id, name, icon, color, type, frequency, days,
             reminder_time, reminder_type, goal_days,
             punishment_sensitivity, streak_freeze_count,
             is_active, sort_order, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            h.id, h.name, h.icon || '⭐', h.color || '#F5A623',
            h.type || 'build', h.frequency || 'daily',
            h.days || '1,2,3,4,5,6,7',
            h.reminder_time || null, h.reminder_type || 'none',
            h.goal_days || 0, h.punishment_sensitivity || 'balanced',
            h.streak_freeze_count || 0, h.is_active ?? 1,
            h.sort_order || 0,
            h.created_at || new Date().toISOString(),
            h.updated_at || new Date().toISOString(),
          ]
        );
      }
    }

    // Restore checkins
    if (data.checkins?.length > 0) {
      for (const c of data.checkins) {
        await db.runAsync(
          `INSERT OR IGNORE INTO checkins
            (id, habit_id, date, status, note, slip_count, created_at)
           VALUES (?,?,?,?,?,?,?)`,
          [
            c.id, c.habit_id, c.date, c.status,
            c.note || null, c.slip_count || 0,
            c.created_at || new Date().toISOString(),
          ]
        );
      }
    }

    // Restore milestones
    if (data.milestones?.length > 0) {
      for (const m of data.milestones) {
        await db.runAsync(
          `INSERT OR IGNORE INTO milestones
            (id, habit_id, milestone_days, achieved_at)
           VALUES (?,?,?,?)`,
          [m.id, m.habit_id, m.milestone_days, m.achieved_at || new Date().toISOString()]
        );
      }
    }

    // Restore settings (selective — don't overwrite device-specific settings)
    if (data.settings?.length > 0) {
      const preserveKeys = ['splash_image_uri', 'splash_image_type', 'app_theme'];
      for (const s of data.settings) {
        if (!preserveKeys.includes(s.key)) {
          await db.runAsync(
            'INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)',
            [s.key, s.value]
          );
        }
      }
    }

    console.log('✅ Data restored successfully');
  } catch (error) {
    console.error('_restoreData error:', error);
    throw new Error(`Restore failed: ${error.message}`);
  }
};

// ── Clear All Data ────────────────────────────────────────────────────

export const clearAllData = async () => {
  const db = await getDatabase();
  try {
    await db.execAsync(`
      DELETE FROM checkins;
      DELETE FROM habits;
      DELETE FROM milestones;
      DELETE FROM xp_log;
      UPDATE settings SET value = '0' WHERE key = 'total_xp';
      UPDATE settings SET value = 'false' WHERE key = 'onboarded';
      UPDATE settings SET value = '' WHERE key = 'last_perfect_day';
    `);
    console.log('✅ All data cleared');
  } catch (error) {
    throw new Error(`Clear failed: ${error.message}`);
  }
};

// ── Backup Size Info ──────────────────────────────────────────────────

export const getBackupInfo = async () => {
  try {
    const data        = await exportAllData();
    const json        = JSON.stringify(data);
    const sizeKB      = Math.round(json.length / 1024);
    const habitCount  = data.habits?.length || 0;
    const entryCount  = data.checkins?.length || 0;
    return { sizeKB, habitCount, entryCount };
  } catch {
    return { sizeKB: 0, habitCount: 0, entryCount: 0 };
  }
};