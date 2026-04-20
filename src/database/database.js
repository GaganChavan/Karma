// ─── KARMA APP — DATABASE LAYER ─────────────────────────────────────
// expo-sqlite v15 async API. Room-equivalent for React Native.
// All tables, migrations, and initialization handled here.

import * as SQLite from 'expo-sqlite';

let _db = null;

// ── Open & Initialize ─────────────────────────────────────────────────

export const getDatabase = async () => {
  if (_db) return _db;
  try {
    _db = await SQLite.openDatabaseAsync('karma.db');
    await _initializeTables(_db);
    await _seedDefaultSettings(_db);
    console.log('✅ Karma database ready');
    return _db;
  } catch (error) {
    console.error('❌ Database init failed:', error);
    _db = null; // Reset so next call retries
    throw new Error(`Database failed to open: ${error.message}`);
  }
};

// ── Table Definitions ─────────────────────────────────────────────────

const _initializeTables = async (db) => {
  try {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS habits (
        id                     INTEGER PRIMARY KEY AUTOINCREMENT,
        name                   TEXT NOT NULL CHECK(length(trim(name)) >= 3),
        icon                   TEXT NOT NULL DEFAULT '⭐',
        color                  TEXT NOT NULL DEFAULT '#1E7FFF',
        type                   TEXT NOT NULL DEFAULT 'build'
                               CHECK(type IN ('build','break')),
        frequency              TEXT NOT NULL DEFAULT 'daily'
                               CHECK(frequency IN ('daily','specific_days')),
        days                   TEXT NOT NULL DEFAULT '1,2,3,4,5,6,7',
        reminder_time          TEXT,
        reminder_type          TEXT NOT NULL DEFAULT 'none'
                               CHECK(reminder_type IN ('soft','hard','none')),
        goal_days              INTEGER NOT NULL DEFAULT 0,
        punishment_sensitivity TEXT NOT NULL DEFAULT 'balanced'
                               CHECK(punishment_sensitivity IN ('soft','balanced','harsh')),
        streak_freeze_count    INTEGER NOT NULL DEFAULT 0,
        is_active              INTEGER NOT NULL DEFAULT 1,
        sort_order             INTEGER NOT NULL DEFAULT 0,
        created_at             TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        updated_at             TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );

      CREATE TABLE IF NOT EXISTS checkins (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        habit_id    INTEGER NOT NULL,
        date        TEXT NOT NULL,
        status      TEXT NOT NULL
                    CHECK(status IN ('done','missed','slip','resisted','skipped')),
        note        TEXT,
        slip_count  INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
        UNIQUE(habit_id, date)
      );

      CREATE TABLE IF NOT EXISTS milestones (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        habit_id      INTEGER NOT NULL,
        milestone_days INTEGER NOT NULL,
        achieved_at   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
        UNIQUE(habit_id, milestone_days)
      );

      CREATE TABLE IF NOT EXISTS xp_log (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        habit_id   INTEGER,
        xp         INTEGER NOT NULL DEFAULT 0,
        reason     TEXT,
        date       TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL DEFAULT ''
      );

      CREATE INDEX IF NOT EXISTS idx_checkins_habit_date
        ON checkins(habit_id, date);
      CREATE INDEX IF NOT EXISTS idx_checkins_date
        ON checkins(date);
    `);
  } catch (error) {
    console.error('❌ Table creation failed:', error);
    throw new Error(`Table setup failed: ${error.message}`);
  }
};

const _seedDefaultSettings = async (db) => {
  try {
    const defaults = [
      ['alter_ego',          'Neel'],
      ['week_starts',        'monday'],
      ['daily_reset_hour',   '0'],
      ['punishment_default', 'balanced'],
      ['splash_image_uri',   ''],
      ['splash_image_type',  'default'],
      ['total_xp',           '0'],
      ['user_level',         '1'],
      ['onboarded',          'false'],
      ['notification_master','true'],
    ];

    for (const [key, value] of defaults) {
      await db.runAsync(
        'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
        [key, value]
      );
    }
  } catch (error) {
    // Non-fatal — defaults not critical
    console.warn('⚠️ Could not seed default settings:', error.message);
  }
};

// ── Utility ───────────────────────────────────────────────────────────

export const closeDatabase = async () => {
  if (_db) {
    try {
      await _db.closeAsync();
      _db = null;
    } catch (error) {
      console.warn('⚠️ Error closing database:', error.message);
    }
  }
};