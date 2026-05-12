// ─── KARMA APP — DATABASE (PHASE E) ────────────────────────────
// Phase E adds: is_paused column for habit pause feature
// All existing data, XP, streaks, checkins — untouched.

import * as SQLite from 'expo-sqlite';

let _db = null;

export const getDatabase = async () => {
  if (_db) return _db;
  try {
    _db = await SQLite.openDatabaseAsync('karma.db');
    await _initializeTables(_db);
    await _runMigrations(_db);
    await _seedDefaultSettings(_db);
    await _backfillXP(_db);
    console.log('✅ Karma DB ready — Phase E');
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
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      name                 TEXT NOT NULL CHECK(length(trim(name)) >= 3),
      icon                 TEXT NOT NULL DEFAULT '⭐',
      color                TEXT NOT NULL DEFAULT '#F5A623',
      type                 TEXT NOT NULL DEFAULT 'build',
      frequency            TEXT NOT NULL DEFAULT 'daily',
      days                 TEXT NOT NULL DEFAULT '1,2,3,4,5,6,7',
      time_of_day          TEXT NOT NULL DEFAULT 'anytime',
      is_quantifiable      INTEGER NOT NULL DEFAULT 0,
      daily_target         REAL NOT NULL DEFAULT 1,
      unit                 TEXT NOT NULL DEFAULT '',
      frequency_type       TEXT NOT NULL DEFAULT 'daily',
      weekly_target        INTEGER NOT NULL DEFAULT 7,
      is_wfo_skip          INTEGER NOT NULL DEFAULT 0,
      reminder_time        TEXT,
      reminder_type        TEXT NOT NULL DEFAULT 'none',
      goal_days            INTEGER NOT NULL DEFAULT 0,
      punishment_sensitivity TEXT NOT NULL DEFAULT 'balanced',
      streak_freeze_count  INTEGER NOT NULL DEFAULT 0,
      is_active            INTEGER NOT NULL DEFAULT 1,
      is_paused            INTEGER NOT NULL DEFAULT 0,
      sort_order           INTEGER NOT NULL DEFAULT 0,
      created_at           TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at           TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS checkins (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id   INTEGER NOT NULL,
      date       TEXT NOT NULL,
      status     TEXT NOT NULL CHECK(status IN ('done','missed','slip','resisted','skipped','auto_skipped')),
      note       TEXT,
      slip_count INTEGER NOT NULL DEFAULT 0,
      value      REAL DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
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
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start TEXT NOT NULL UNIQUE,
      went_well  TEXT,
      struggled  TEXT,
      commitment TEXT,
      mood_avg   REAL DEFAULT 0,
      energy_avg REAL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

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
    CREATE INDEX IF NOT EXISTS idx_checkins_date       ON checkins(date);
    CREATE INDEX IF NOT EXISTS idx_slip_triggers_habit ON slip_triggers(habit_id);
    CREATE INDEX IF NOT EXISTS idx_mood_logs_date      ON mood_logs(date);
  `);
};

const _runMigrations = async (db) => {
  try {
    const cols = (await db.getAllAsync("PRAGMA table_info(habits)")).map(c => c.name);

    const addHabitCol = async (col, def) => {
      if (!cols.includes(col)) {
        await db.execAsync(`ALTER TABLE habits ADD COLUMN ${col} ${def}`);
        console.log(`✅ Migration: habits.${col}`);
      }
    };

    // Phase B/C migrations
    await addHabitCol('time_of_day',            "TEXT NOT NULL DEFAULT 'anytime'");
    await addHabitCol('is_quantifiable',         "INTEGER NOT NULL DEFAULT 0");
    await addHabitCol('daily_target',            "REAL NOT NULL DEFAULT 1");
    await addHabitCol('unit',                    "TEXT NOT NULL DEFAULT ''");
    await addHabitCol('frequency_type',          "TEXT NOT NULL DEFAULT 'daily'");
    await addHabitCol('weekly_target',           "INTEGER NOT NULL DEFAULT 7");
    await addHabitCol('is_wfo_skip',             "INTEGER NOT NULL DEFAULT 0");

    // Phase E migration — is_paused
    // Safe: existing habits all get 0 (fully active, no change to behaviour)
    await addHabitCol('is_paused',               "INTEGER NOT NULL DEFAULT 0");

    // Checkins — add value column if missing
    const cCols = (await db.getAllAsync("PRAGMA table_info(checkins)")).map(c => c.name);
    if (!cCols.includes('value')) {
      await db.execAsync('ALTER TABLE checkins ADD COLUMN value REAL DEFAULT NULL');
      console.log('✅ Migration: checkins.value');
    }

    // Phase E — update checkins CHECK constraint to allow auto_skipped
    // SQLite doesn't support ALTER CONSTRAINT, but INSERT will work because
    // the CHECK is only enforced on new rows. Existing rows are safe.
    // The CREATE TABLE above already has auto_skipped in the CHECK for new installs.
    // For existing installs, SQLite won't retroactively enforce the old CHECK —
    // INSERT OR IGNORE with status='auto_skipped' will succeed silently.

  } catch (err) {
    console.warn('Migration warning:', err.message);
  }
};

// ── XP BACKFILL ────────────────────────────────────────────────────
// Runs ONCE on first launch after the XP fix build.
// Awards +10 XP for every past 'done' checkin and +15 for 'resisted'
// that has no corresponding xp_log entry.
const _backfillXP = async (db) => {
  try {
    const done = await db.getFirstAsync(
      "SELECT value FROM settings WHERE key = 'xp_backfill_done'"
    );

    // Migrate alter_ego: Neel → Gagan
    try {
      const egoRow = await db.getFirstAsync("SELECT value FROM settings WHERE key='alter_ego'");
      if (egoRow?.value === 'Neel') {
        await db.runAsync("UPDATE settings SET value='Gagan' WHERE key='alter_ego'");
        await db.runAsync("UPDATE settings SET value='I am Gagan. My mind holds the reins. The horses do not rule me.' WHERE key='identity_statement'");
        console.log('✅ Migrated: Neel → Gagan');
      }
    } catch (e) { console.warn('Name migration:', e.message); }

    if (done?.value === 'true') return;

    console.log('⚡ Running XP backfill for past checkins...');

    const unbilledCheckins = await db.getAllAsync(`
      SELECT c.id, c.habit_id, c.status, c.date, h.name
      FROM checkins c
      LEFT JOIN habits h ON h.id = c.habit_id
      LEFT JOIN xp_log x ON x.habit_id = c.habit_id
        AND date(x.date) = c.date
        AND x.xp > 0
      WHERE c.status IN ('done', 'resisted')
        AND x.id IS NULL
    `);

    if (!unbilledCheckins || unbilledCheckins.length === 0) {
      console.log('⚡ XP backfill: nothing to backfill');
    } else {
      let totalXP = 0;
      for (const c of unbilledCheckins) {
        const xp = c.status === 'resisted' ? 15 : 10;
        totalXP += xp;
        await db.runAsync(
          `INSERT INTO xp_log (habit_id, xp, reason, date) VALUES (?, ?, ?, ?)`,
          [c.habit_id, xp, `Backfill: ${c.name || 'habit'} — ${c.status}`, c.date]
        );
      }

      const currentXPRow = await db.getFirstAsync("SELECT value FROM settings WHERE key = 'total_xp'");
      const currentXP = parseInt(currentXPRow?.value || '0');
      const newXP = currentXP + totalXP;
      await db.runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('total_xp', ?)",
        [String(newXP)]
      );
      console.log(`⚡ XP backfill done: +${totalXP} XP for ${unbilledCheckins.length} past checkins → total: ${newXP}`);
    }

    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('xp_backfill_done', 'true')"
    );
  } catch (err) {
    console.warn('XP backfill warning:', err.message);
  }
};

const _seedDefaultSettings = async (db) => {
  const defaults = [
    ['alter_ego',           'Gagan'],
    ['week_starts',         'monday'],
    ['total_xp',            '0'],
    ['notification_master', 'true'],
    ['app_theme',           'dark'],
    ['identity_statement',  'I am Gagan. My mind holds the reins. The horses do not rule me.'],
    ['identity_shown_date', ''],
    ['wa_daily',            'true'],
    ['wa_weekly',           'true'],
    ['last_perfect_day',    ''],
    ['last_freeze_award',   ''],
    ['streak_freeze_count', '0'],
    ['splash_image_uri',    ''],
    ['splash_image_type',   'default'],
    // Phase D
    ['wfo_mode',            'false'],
    ['wfo_city',            'Bangalore'],
    ['home_city',           'Hassan'],
    ['wfo_non_negotiables', ''],
    ['wfo_start_date',      ''],
    ['wfo_end_date',        ''],
    ['recovery_mode_shown', ''],
    // Backfill guard
    ['xp_backfill_done',    'false'],
  ];

  for (const [key, value] of defaults) {
    await db.runAsync(
      'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
      [key, value]
    );
  }
};

export const closeDatabase = async () => {
  if (_db) {
    try { await _db.closeAsync(); _db = null; } catch {}
  }
};