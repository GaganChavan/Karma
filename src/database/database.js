// ─── KARMA APP — DATABASE (PHASE D FINAL) ────────────────────────────
// New columns: habits.is_wfo_skip (auto-skip during WFO)
// New settings: wfo_mode, wfo_non_negotiables, wfo_city
// New table: streak_recovery (tracks active recovery challenges)

import * as SQLite from 'expo-sqlite';

let _db = null;

export const getDatabase = async () => {
  if (_db) return _db;
  try {
    _db = await SQLite.openDatabaseAsync('karma.db');
    await _initializeTables(_db);
    await _runMigrations(_db);
    await _seedDefaultSettings(_db);
    console.log('✅ Karma DB ready — Phase D Final');
    return _db;
  } catch (error) {
    _db = null;
    throw new Error(`Database failed: ${error.message}`);
  }
};

const _initializeTables = async (db) => {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS habits (
      id                     INTEGER PRIMARY KEY AUTOINCREMENT,
      name                   TEXT NOT NULL CHECK(length(trim(name)) >= 3),
      icon                   TEXT NOT NULL DEFAULT '⭐',
      color                  TEXT NOT NULL DEFAULT '#F5A623',
      type                   TEXT NOT NULL DEFAULT 'build',
      frequency              TEXT NOT NULL DEFAULT 'daily',
      days                   TEXT NOT NULL DEFAULT '1,2,3,4,5,6,7',
      time_of_day            TEXT NOT NULL DEFAULT 'anytime',
      is_quantifiable        INTEGER NOT NULL DEFAULT 0,
      daily_target           REAL NOT NULL DEFAULT 1,
      unit                   TEXT NOT NULL DEFAULT '',
      frequency_type         TEXT NOT NULL DEFAULT 'daily',
      weekly_target          INTEGER NOT NULL DEFAULT 7,
      is_wfo_skip            INTEGER NOT NULL DEFAULT 0,
      reminder_time          TEXT,
      reminder_type          TEXT NOT NULL DEFAULT 'none',
      goal_days              INTEGER NOT NULL DEFAULT 0,
      punishment_sensitivity TEXT NOT NULL DEFAULT 'balanced',
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
      status      TEXT NOT NULL CHECK(status IN ('done','missed','slip','resisted','skipped')),
      note        TEXT,
      slip_count  INTEGER NOT NULL DEFAULT 0,
      value       REAL DEFAULT NULL,
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

    CREATE TABLE IF NOT EXISTS mood_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      date        TEXT NOT NULL,
      time_of_day TEXT NOT NULL,
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

    -- ── PHASE D ──────────────────────────────────────────────────────

    -- Streak recovery challenges
    CREATE TABLE IF NOT EXISTS streak_recovery (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id     INTEGER NOT NULL,
      lost_streak  INTEGER NOT NULL,
      target_days  INTEGER NOT NULL DEFAULT 2,
      done_days    INTEGER NOT NULL DEFAULT 0,
      started_at   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      completed_at TEXT,
      status       TEXT NOT NULL DEFAULT 'active',
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_checkins_habit_date ON checkins(habit_id, date);
    CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins(date);
    CREATE INDEX IF NOT EXISTS idx_slip_triggers_habit ON slip_triggers(habit_id);
    CREATE INDEX IF NOT EXISTS idx_mood_logs_date ON mood_logs(date);
  `);
};

const _runMigrations = async (db) => {
  try {
    const cols = (await db.getAllAsync("PRAGMA table_info(habits)")).map(c => c.name);
    const addCol = async (col, def) => {
      if (!cols.includes(col)) {
        await db.execAsync(`ALTER TABLE habits ADD COLUMN ${col} ${def}`);
        console.log(`✅ Migration: habits.${col}`);
      }
    };
    await addCol('time_of_day',     "TEXT NOT NULL DEFAULT 'anytime'");
    await addCol('is_quantifiable', "INTEGER NOT NULL DEFAULT 0");
    await addCol('daily_target',    "REAL NOT NULL DEFAULT 1");
    await addCol('unit',            "TEXT NOT NULL DEFAULT ''");
    await addCol('frequency_type',  "TEXT NOT NULL DEFAULT 'daily'");
    await addCol('weekly_target',   "INTEGER NOT NULL DEFAULT 7");
    await addCol('is_wfo_skip',     "INTEGER NOT NULL DEFAULT 0");

    const cCols = (await db.getAllAsync("PRAGMA table_info(checkins)")).map(c => c.name);
    if (!cCols.includes('value')) {
      await db.execAsync('ALTER TABLE checkins ADD COLUMN value REAL DEFAULT NULL');
    }
  } catch (err) {
    console.warn('Migration warning:', err.message);
  }
};

const _seedDefaultSettings = async (db) => {
  const defaults = [
    ['alter_ego',             'Neel'],
    ['week_starts',           'monday'],
    ['total_xp',              '0'],
    ['notification_master',   'true'],
    ['app_theme',             'dark'],
    ['identity_statement',    'I am Neel. My mind holds the reins. The horses do not rule me.'],
    ['identity_shown_date',   ''],
    ['wa_daily',              'true'],
    ['wa_weekly',             'true'],
    ['last_perfect_day',      ''],
    ['last_freeze_award',     ''],
    ['streak_freeze_count',   '0'],
    ['splash_image_uri',      ''],
    ['splash_image_type',     'default'],
    // Phase D
    ['wfo_mode',              'false'],
    ['wfo_city',              'Bangalore'],
    ['home_city',             'Hassan'],
    ['wfo_non_negotiables',   ''],  // comma-separated habit IDs
    ['wfo_start_date',        ''],
    ['wfo_end_date',          ''],
    ['recovery_mode_shown',   ''],
  ];
  for (const [key, value] of defaults) {
    await db.runAsync('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  }
};

export const closeDatabase = async () => {
  if (_db) { try { await _db.closeAsync(); _db = null; } catch {} }
};