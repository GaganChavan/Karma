// ─── KARMA APP — DATABASE (PHASE B) ──────────────────────────────────
// New tables: mood_logs, slip_triggers, weekly_reflections
// New columns: habits.time_of_day
// Safe migrations — ALTER TABLE only if column missing.

import * as SQLite from 'expo-sqlite';

let _db = null;

export const getDatabase = async () => {
  if (_db) return _db;
  try {
    _db = await SQLite.openDatabaseAsync('karma.db');
    await _initializeTables(_db);
    await _runMigrations(_db);
    await _seedDefaultSettings(_db);
    console.log('✅ Karma database ready (Phase B)');
    return _db;
  } catch (error) {
    console.error('❌ Database init failed:', error);
    _db = null;
    throw new Error(`Database failed to open: ${error.message}`);
  }
};

const _initializeTables = async (db) => {
  try {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS habits (
        id                     INTEGER PRIMARY KEY AUTOINCREMENT,
        name                   TEXT NOT NULL CHECK(length(trim(name)) >= 3),
        icon                   TEXT NOT NULL DEFAULT '⭐',
        color                  TEXT NOT NULL DEFAULT '#F5A623',
        type                   TEXT NOT NULL DEFAULT 'build'
                               CHECK(type IN ('build','break')),
        frequency              TEXT NOT NULL DEFAULT 'daily'
                               CHECK(frequency IN ('daily','specific_days')),
        days                   TEXT NOT NULL DEFAULT '1,2,3,4,5,6,7',
        time_of_day            TEXT NOT NULL DEFAULT 'anytime'
                               CHECK(time_of_day IN ('morning','afternoon','evening','anytime')),
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
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        habit_id       INTEGER NOT NULL,
        milestone_days INTEGER NOT NULL,
        achieved_at    TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
        UNIQUE(habit_id, milestone_days)
      );

      CREATE TABLE IF NOT EXISTS xp_log (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        habit_id INTEGER,
        xp       INTEGER NOT NULL DEFAULT 0,
        reason   TEXT,
        date     TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL DEFAULT ''
      );

      -- ── PHASE B NEW TABLES ────────────────────────────────────────

      CREATE TABLE IF NOT EXISTS mood_logs (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        date        TEXT NOT NULL,
        time_of_day TEXT NOT NULL CHECK(time_of_day IN ('morning','evening')),
        mood        INTEGER NOT NULL CHECK(mood BETWEEN 1 AND 5),
        energy      INTEGER NOT NULL CHECK(energy BETWEEN 1 AND 5),
        note        TEXT,
        created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        UNIQUE(date, time_of_day)
      );

      CREATE TABLE IF NOT EXISTS slip_triggers (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        habit_id   INTEGER NOT NULL,
        date       TEXT NOT NULL,
        trigger    TEXT NOT NULL,
        note       TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS weekly_reflections (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        week_start  TEXT NOT NULL UNIQUE,
        went_well   TEXT,
        struggled   TEXT,
        commitment  TEXT,
        mood_avg    REAL DEFAULT 0,
        energy_avg  REAL DEFAULT 0,
        created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );

      CREATE INDEX IF NOT EXISTS idx_checkins_habit_date
        ON checkins(habit_id, date);
      CREATE INDEX IF NOT EXISTS idx_checkins_date
        ON checkins(date);
      CREATE INDEX IF NOT EXISTS idx_slip_triggers_habit
        ON slip_triggers(habit_id);
      CREATE INDEX IF NOT EXISTS idx_mood_logs_date
        ON mood_logs(date);
    `);
  } catch (error) {
    console.error('❌ Table creation failed:', error);
    throw new Error(`Table setup failed: ${error.message}`);
  }
};

// Safe migrations — add columns to existing tables if missing
const _runMigrations = async (db) => {
  try {
    // Check and add time_of_day to habits
    const habitCols = await db.getAllAsync("PRAGMA table_info(habits)");
    const colNames  = habitCols.map(c => c.name);

    if (!colNames.includes('time_of_day')) {
      await db.execAsync(
        `ALTER TABLE habits ADD COLUMN time_of_day TEXT NOT NULL DEFAULT 'anytime'`
      );
      console.log('✅ Migration: added habits.time_of_day');
    }

    console.log('✅ Migrations complete');
  } catch (error) {
    // Non-fatal — log and continue
    console.warn('⚠️ Migration warning:', error.message);
  }
};

const _seedDefaultSettings = async (db) => {
  try {
    const defaults = [
      ['alter_ego',             'Neel'],
      ['week_starts',           'monday'],
      ['daily_reset_hour',      '0'],
      ['punishment_default',    'balanced'],
      ['splash_image_uri',      ''],
      ['splash_image_type',     'default'],
      ['total_xp',              '0'],
      ['user_level',            '1'],
      ['onboarded',             'false'],
      ['notification_master',   'true'],
      ['app_theme',             'dark'],
      ['identity_statement',    'I am Neel. My mind holds the reins. The horses do not rule me.'],
      ['identity_shown_date',   ''],
      ['wa_daily',              'true'],
      ['wa_weekly',             'true'],
      ['last_perfect_day',      ''],
      ['last_freeze_award',     ''],
      ['streak_freeze_count',   '0'],
    ];

    for (const [key, value] of defaults) {
      await db.runAsync(
        'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
        [key, value]
      );
    }
  } catch (error) {
    console.warn('⚠️ Could not seed settings:', error.message);
  }
};

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